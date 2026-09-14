import sql from '../../../apps/api/config/postgres.js'
import { normalizeSlackEvent } from './normalize.js'
import { extractFromEvent } from '../../extraction/extractor.js'
import { saveExtractionToGraph, PersonMetadata } from '../../extraction/processExtraction.js'
import { resolveIdentity } from '../../identity/canonicalPerson.service.js'
import { upsertVector } from '../../database/vector/qdrant.repository.js'
import { generateEmbeddings } from '../../llm/providers/gemini.js'
import crypto from 'crypto'

export async function processSlackEvent(eventID: string) {
    try {
        // 1. Get Payload From Database
        const [event] = await sql`SELECT *FROM events WHERE id=${eventID}`
        if (!event) {
            console.log(`Event With Event ID For Slack ${eventID} Not Found in Database`)
            return null
        }

        const rawPayload = typeof event.payload === 'string' ? JSON.parse(event.payload) : (event.payload ?? {})

        // 2. Normalize The Payload (async — resolves Slack user profile)
        const normalizedPayload = await normalizeSlackEvent(rawPayload, event.event_type)
        if (normalizedPayload == null)
            return

        // 3. Convert Into Text
        const cleanEventText = JSON.stringify(normalizedPayload)

        // 4. Extract Entities and Relationships
        const { entities, newEntities, relationships, newRelations, summary } = await extractFromEvent(cleanEventText , 'slack')

        // 5. Resolve canonical identity and build person metadata
        const slackUserId = rawPayload.event?.user ?? rawPayload.user ?? rawPayload.event?.user_id
        const externalId = slackUserId ? String(slackUserId) : `slack_${normalizedPayload.author || 'unknown'}`
        const username = rawPayload.event?.username ?? rawPayload.user_name ?? (slackUserId ? String(slackUserId) : undefined)
        const displayName = (normalizedPayload.author && normalizedPayload.author !== 'unknown') 
            ? normalizedPayload.author 
            : (username || externalId)
        const email = normalizedPayload.authorEmail ?? undefined

        let canonicalPersonId: string | null = null
        const hasAuthorInfo = Boolean(
            (slackUserId && slackUserId !== 'unknown') ||
            email ||
            (displayName && displayName !== 'unknown')
        )

        if (hasAuthorInfo) {
            try {
                const identityRes = await resolveIdentity({
                    provider: 'slack',
                    externalId,
                    username,
                    email,
                    displayName,
                })
                canonicalPersonId = identityRes.canonicalPersonId

                if (identityRes.matchedBy === 'NEW_PERSON') {
                    console.log(`[IdentityResolution] [Slack] Created new canonical person: ${identityRes.canonicalPersonId} for ${displayName || username || externalId} (externalId: ${externalId})`)
                } else {
                    console.log(`[IdentityResolution] [Slack] Linked existing canonical person: ${identityRes.canonicalPersonId} for ${displayName || username || externalId} via ${identityRes.matchedBy} (confidence: ${identityRes.confidence}, reason: ${identityRes.reason})`)
                }
            } catch (idErr: any) {
                console.warn(`[Slack Ingestion] Identity resolution warning for ${externalId}: ${idErr?.message}`)
            }
        }

        const personMetadata: PersonMetadata[] = [{
            name: normalizedPayload.author,
            email: normalizedPayload.authorEmail ?? null,
            role: normalizedPayload.authorRole ?? null,
            externalId,
            canonicalPersonId,
        }]

        // 6. Save to Graph Database (with enriched PERSON metadata)
        await saveExtractionToGraph(entities, newEntities, relationships, newRelations, personMetadata)

        // 7. Process The Summary To Create Vector Embeddings For Semantic Search
        const effectiveSummary = summary && summary.trim().length > 0
            ? summary.trim()
            : `Slack message in #${normalizedPayload.channel || 'general'} by ${normalizedPayload.author || 'unknown'}: ${normalizedPayload.text || 'discussion'}`

        const vectorEmbedding: number[] | null | undefined = await generateEmbeddings(effectiveSummary)
        if (vectorEmbedding) {
            const allEntities = [...entities, ...newEntities.map((e: any) => { return { name: e.name, type: e.suggestedType } })]
            const allRelations = [...relationships, ...newRelations.map((r: any) => { return { from: r.from, to: r.to, type: r.suggestedType } })]

            await upsertVector(crypto.randomUUID(), vectorEmbedding, {
                eventID,
                summary: effectiveSummary,
                entities: allEntities,
                relationships: allRelations,
                provider: 'slack',
                text:normalizedPayload.text,
                author:normalizedPayload.author,
                channel:normalizedPayload.channel,
                timestamp:normalizedPayload.timestamp,
                eventType:normalizedPayload.eventType
            })
        }
        console.log(`Event ${eventID} processed. Summary: ${effectiveSummary}`)
    }
    catch (error: any) {
        console.log(`Error While Processing Slack Event`)
        throw error
    }
}