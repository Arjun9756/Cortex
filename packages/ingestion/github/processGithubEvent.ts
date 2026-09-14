import sql from '../../../apps/api/config/postgres.js'
import { normalizeGithubEvent } from './normalize.js'
import { extractFromEvent } from '../../extraction/extractor.js'
import { saveExtractionToGraph, PersonMetadata } from '../../extraction/processExtraction.js'
import { resolveIdentity } from '../../identity/canonicalPerson.service.js'
import { upsertVector } from '../../database/vector/qdrant.repository.js'
import { generateEmbeddings } from '../../llm/providers/gemini.js'
import { rollbackEventRelations } from '../../database/neo4j/graph.repository.js'
import crypto from 'crypto'
import { ContentEmbedding } from '@google/genai'

export async function processGithubEvent(eventID: string) {
    try {
        // 1.Get Payload From Database
        const [event] = await sql`SELECT *FROM events WHERE id=${eventID}`
        if (!event) {
            console.log(`Event With Event ID For Github ${eventID} Not Found in Database`)
            return null
        }

        const rawPayload = typeof event.payload === 'string' ? JSON.parse(event.payload) : (event.payload ?? {})

        // 2.Normalized The Payload
        const normalizedPayload = normalizeGithubEvent(rawPayload, event.event_type) // This is Object convert to string while sending to AI
        // LLM Train
        if (!normalizedPayload)
            return

        // 3.Convert Into Text
        const cleanEventText = JSON.stringify(normalizedPayload)

        // 4.Extract From LLM with Deterministic Fast-Fallback for resilience against 429 rate limits
        let entities: any[] = []
        let newEntities: any[] = []
        let relationships: any[] = []
        let newRelations: any[] = []
        let summary = ''

        try {
            const extracted = await extractFromEvent(cleanEventText, 'github')
            entities = extracted.entities || []
            newEntities = extracted.newEntities || []
            relationships = extracted.relationships || []
            newRelations = extracted.newRelations || []
            summary = extracted.summary || ''
        } catch (llmErr: any) {
            console.warn(`[GitHub Ingestion] LLM extraction failed (${llmErr?.message}) — executing deterministic graph extraction fallback.`)
            
            // Deterministic Fast-Path: extract core entities strictly adhering to ontology.ts
            if (normalizedPayload.author && normalizedPayload.repository) {
                entities.push({ name: normalizedPayload.author, type: 'PERSON' })
                entities.push({ name: normalizedPayload.repository, type: 'REPOSITORY' })
                relationships.push({
                    from: normalizedPayload.author,
                    to: normalizedPayload.repository,
                    type: 'WORKS_ON',
                    evidence: 'pushed code'
                })

                if (Array.isArray(normalizedPayload.commits)) {
                    for (const c of normalizedPayload.commits.slice(0, 10)) {
                        const commitName = c.message || c.id || `commit_${Date.now()}`
                        entities.push({ name: commitName, type: 'COMMIT' })
                        relationships.push({
                            from: normalizedPayload.author,
                            to: commitName,
                            type: 'AUTHORED',
                            evidence: 'git commit'
                        })
                        relationships.push({
                            from: commitName,
                            to: normalizedPayload.repository,
                            type: 'PART_OF',
                            evidence: 'repo commit'
                        })
                    }
                }
            }
            summary = `GitHub ${normalizedPayload.eventType || 'push'} by ${normalizedPayload.author || 'contributor'} in ${normalizedPayload.repository || 'repository'}`
        }

        // 5. Resolve canonical identity and build person metadata
        const rawExternalId = rawPayload.sender?.id 
            ?? rawPayload.pull_request?.user?.id 
            ?? rawPayload.issue?.user?.id 
            ?? rawPayload.comment?.user?.id 
            ?? rawPayload.sender?.login 
            ?? rawPayload.head_commit?.author?.username 
            ?? (normalizedPayload.author !== 'unknown' ? normalizedPayload.author : undefined)
        
        const externalId = rawExternalId ? String(rawExternalId) : `github_${normalizedPayload.author || 'unknown'}`
        const username = rawPayload.sender?.login 
            ?? rawPayload.pull_request?.user?.login 
            ?? rawPayload.issue?.user?.login 
            ?? rawPayload.head_commit?.author?.username 
            ?? (normalizedPayload.author !== 'unknown' ? normalizedPayload.author : undefined)
        const displayName = rawPayload.head_commit?.author?.name 
            ?? rawPayload.pusher?.name 
            ?? (normalizedPayload.author !== 'unknown' ? normalizedPayload.author : undefined) 
            ?? username
        const email = normalizedPayload.authorEmail 
            ?? rawPayload.head_commit?.author?.email 
            ?? rawPayload.pusher?.email 
            ?? rawPayload.sender?.email 
            ?? undefined

        let canonicalPersonId: string | null = null
        const hasAuthorInfo = Boolean(
            (rawExternalId && rawExternalId !== 'unknown') ||
            email ||
            (username && username !== 'unknown') ||
            (displayName && displayName !== 'unknown')
        )

        if (hasAuthorInfo) {
            try {
                const identityRes = await resolveIdentity({
                    provider: 'github',
                    externalId,
                    username,
                    email,
                    displayName,
                })
                canonicalPersonId = identityRes.canonicalPersonId

                if (identityRes.matchedBy === 'NEW_PERSON') {
                    console.log(`[IdentityResolution] [GitHub] Created new canonical person: ${identityRes.canonicalPersonId} for ${displayName || username || externalId} (externalId: ${externalId})`)
                } else {
                    console.log(`[IdentityResolution] [GitHub] Linked existing canonical person: ${identityRes.canonicalPersonId} for ${displayName || username || externalId} via ${identityRes.matchedBy} (confidence: ${identityRes.confidence}, reason: ${identityRes.reason})`)
                }
            } catch (idErr: any) {
                console.warn(`[GitHub Ingestion] Identity resolution warning for ${externalId}: ${idErr?.message}`)
            }
        }

        const personMetadata: PersonMetadata[] = [{
            name: normalizedPayload.author,
            email: email ?? normalizedPayload.authorEmail ?? null,
            role: null, // GitHub does not expose role via webhooks
            externalId,
            canonicalPersonId,
        }]

        // Build entity metadata (issue / PR status)
        const entityMetadata: Array<{ name: string; properties: Record<string, any> }> = []
        if (normalizedPayload.eventType === 'issues' && normalizedPayload.title) {
            entityMetadata.push({
                name: normalizedPayload.title,
                properties: {
                    status: normalizedPayload.action === 'closed' ? 'closed' : 'open'
                }
            })
        } else if (normalizedPayload.eventType === 'pull_request' && normalizedPayload.title) {
            entityMetadata.push({
                name: normalizedPayload.title,
                properties: {
                    status: normalizedPayload.merged ? 'merged' : (normalizedPayload.action === 'closed' ? 'closed' : 'open')
                }
            })

            // Automatic Self-Healing: If a Pull Request was CLOSED WITHOUT MERGE (Rejected/Declined PR),
            // automatically rollback speculative relations created during PR open/update events!
            if (normalizedPayload.action === 'closed' && !normalizedPayload.merged) {
                const prId = String(rawPayload.pull_request?.id || rawPayload.number || '');
                if (prId) {
                    try {
                        const previousEvents = await sql`
                            SELECT id FROM events 
                            WHERE provider = 'github' 
                              AND (payload->'pull_request'->>'id' = ${prId} OR payload->>'number' = ${prId})
                              AND id != ${eventID}
                        `;
                        for (const prev of previousEvents) {
                            const deleted = await rollbackEventRelations(prev.id);
                            if (deleted > 0) {
                                console.log(`[GitHub Ingestion] Auto-rollback: PR #${prId} was closed without merge. Rolled back ${deleted} relations from previous event ${prev.id}.`);
                            }
                        }
                    } catch (rbErr: any) {
                        console.warn(`[GitHub Ingestion] Warning during PR auto-rollback: ${rbErr?.message}`);
                    }
                }
            }
        }

        // 6. Save Onto Graph Database (with enriched PERSON and ENTITY metadata + rollback traceability)
        await saveExtractionToGraph(
            entities,
            newEntities,
            relationships,
            newRelations,
            personMetadata,
            entityMetadata,
            { sourceEventId: eventID, confidence: 1.0 }
        )

        // 7.Process The Summary To Create Vector Embeddings For Semantic Search
        const effectiveSummary = summary && summary.trim().length > 0 
            ? summary.trim() 
            : `GitHub ${normalizedPayload.eventType || 'event'} by ${normalizedPayload.author || 'unknown'} in repository ${normalizedPayload.repository || 'unknown'}: ${normalizedPayload.message || 'code change'}`

        const vectorEmbedding: number[] | null | undefined = await generateEmbeddings(effectiveSummary)

        if (vectorEmbedding) {
            const allEntities = [...entities, ...newEntities.map((e: any) => { return { name: e.name, type: e.suggestedType } })]
            const allRelations = [...relationships, ...newRelations.map((r: any) => { return { from: r.from, to: r.to, type: r.suggestedType } })]

            await upsertVector(crypto.randomUUID(), vectorEmbedding, {
                eventID,
                summary: effectiveSummary,
                entities: allEntities,
                relationships: allRelations,
                provider: "github",
                repository: normalizedPayload.repository,
                timestamp: normalizedPayload.timestamp,
                author: normalizedPayload.author
            })
            console.log('Vector Embedding Created')
        }

        console.log(`Event ${eventID} processed. Summary: ${summary}`)
    }
    catch (error: any) {
        console.log(`Error While Processing Github Events Through Queue Workers ${error?.message}`)
        throw new Error(error?.message || "Not Able To Proceed Further Github Events Through Queue Workers")
    }
}