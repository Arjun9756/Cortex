import sql from '../../../apps/api/config/postgres.js'
import { upsertRelation } from '../../database/neo4j/graph.repository.js'
import { upsertVector } from '../../database/vector/qdrant.repository.js'
import { extractFromEvent } from '../../extraction/extractor.js'
import { saveExtractionToGraph, PersonMetadata } from '../../extraction/processExtraction.js'
import { resolveIdentity } from '../../identity/canonicalPerson.service.js'
import { generateEmbeddings } from '../../llm/providers/gemini.js'
import { ICleanEvent, normalizeJiraEvent } from './normalize.js'
import crypto from 'crypto'

export async function processJiraEvent(eventID: string) {
    try {
        // 1.Fetch Data From Database
        const [event] = await sql`SELECT *FROM events WHERE id=${eventID}`
        if (!event) {
            console.log(`Event ID ${eventID} Not Found in Database`)
            return null
        }

        const rawPayload = typeof event.payload === 'string' ? JSON.parse(event.payload) : (event.payload ?? {})

        // 2.Normalize Payload
        const normalizedPayload: ICleanEvent | null = normalizeJiraEvent(rawPayload, event.event_type)
        if (normalizedPayload == null)
            return

        // 3.Convert to String
        const cleanEventText = JSON.stringify(normalizedPayload)

        // 4.Get The Entities and relation from LLM
        const { entities, newEntities, relationships, newRelations, summary } = await extractFromEvent(cleanEventText, 'jira')

        // 5. Resolve canonical identity and build person metadata
        const issueFields = rawPayload.issue?.fields ?? {}
        const userObj = rawPayload.user ?? issueFields.reporter ?? issueFields.assignee ?? {}

        const rawExternalId = userObj.accountId 
            ?? issueFields.reporter?.accountId 
            ?? issueFields.assignee?.accountId 
            ?? userObj.key 
            ?? userObj.name 
            ?? (normalizedPayload.author !== 'Unknown' && normalizedPayload.author !== 'unknown' ? normalizedPayload.author : undefined)

        const externalId = rawExternalId ? String(rawExternalId) : `jira_${normalizedPayload.author || 'unknown'}`
        const username = userObj.name ?? issueFields.reporter?.name ?? issueFields.assignee?.name ?? undefined
        const displayName = (normalizedPayload.author !== 'Unknown' && normalizedPayload.author !== 'unknown') 
            ? normalizedPayload.author 
            : (userObj.displayName ?? username ?? externalId)
        const email = normalizedPayload.authorEmail 
            ?? userObj.emailAddress 
            ?? issueFields.reporter?.emailAddress 
            ?? issueFields.assignee?.emailAddress 
            ?? undefined

        let canonicalPersonId: string | null = null
        const hasAuthorInfo = Boolean(
            (rawExternalId && rawExternalId !== 'unknown' && rawExternalId !== 'Unknown') ||
            email ||
            (username && username !== 'unknown' && username !== 'Unknown') ||
            (displayName && displayName !== 'unknown' && displayName !== 'Unknown')
        )

        if (hasAuthorInfo) {
            try {
                const identityRes = await resolveIdentity({
                    provider: 'jira',
                    externalId,
                    username,
                    email,
                    displayName,
                })
                canonicalPersonId = identityRes.canonicalPersonId

                if (identityRes.matchedBy === 'NEW_PERSON') {
                    console.log(`[IdentityResolution] [Jira] Created new canonical person: ${identityRes.canonicalPersonId} for ${displayName || username || externalId} (externalId: ${externalId})`)
                } else {
                    console.log(`[IdentityResolution] [Jira] Linked existing canonical person: ${identityRes.canonicalPersonId} for ${displayName || username || externalId} via ${identityRes.matchedBy} (confidence: ${identityRes.confidence}, reason: ${identityRes.reason})`)
                }
            } catch (idErr: any) {
                console.warn(`[Jira Ingestion] Identity resolution warning for ${externalId}: ${idErr?.message}`)
            }
        }

        const personMetadata: PersonMetadata[] = [{
            name: normalizedPayload.author,
            email: email ?? normalizedPayload.authorEmail ?? null,
            role: null, // Jira role not available from issue webhook payload
            externalId,
            canonicalPersonId,
        }]

        // Build entity metadata for Jira issue status
        const entityMetadata: Array<{ name: string; properties: Record<string, any> }> = []
        if (normalizedPayload.issueKey) {
            entityMetadata.push({
                name: normalizedPayload.issueKey,
                properties: { status: normalizedPayload.status || 'open' }
            })
        }
        if (normalizedPayload.summary) {
            entityMetadata.push({
                name: normalizedPayload.summary,
                properties: { status: normalizedPayload.status || 'open' }
            })
        }

        // 6. Save to Graph Database (with enriched PERSON and ENTITY metadata)
        await saveExtractionToGraph(entities, newEntities, relationships, newRelations, personMetadata, entityMetadata)

        // 7.Generate vector embedding
        const effectiveSummary = summary && summary.trim().length > 0
            ? summary.trim()
            : `Jira issue ${normalizedPayload.issueKey || 'ticket'} reported by ${normalizedPayload.author || 'unknown'}: ${normalizedPayload.description || 'issue update'}`

        const vectorEmbedding: number[] | null | undefined = await generateEmbeddings(effectiveSummary)
        if (vectorEmbedding) {
            const allEntities = [...entities, ...newEntities.map((e: any) => { return { name: e.name, type: e.suggestedType } })]
            const allRelations = [...relationships, ...newRelations.map((r: any) => { return { from: r.from, to: r.to, type: r.suggestedType } })]

            await upsertVector(crypto.randomUUID(), vectorEmbedding, {
                eventID,
                summary: effectiveSummary,
                entities: allEntities,
                relationships: allRelations,
                provider: normalizedPayload.provider,
                issueKey: normalizedPayload.issueKey,
                author: normalizedPayload.author,
                timestamp: normalizedPayload.timestamp,
                status: normalizedPayload.status,
                description: normalizedPayload.description
            })
            console.log(`Event ${eventID} processed. Summary: ${effectiveSummary}`)
        }
    }
    catch (error: any) {
        throw new Error(error?.message || "Error While Processing Jira Event")
    }
}