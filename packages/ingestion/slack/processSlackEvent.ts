import sql from '../../../apps/api/config/postgres.js'
import { normalizeSlackEvent } from './normalize.js'
import { extractFromEvent } from '../../extraction/extractor.js'
import { saveExtractionToGraph, PersonMetadata } from '../../extraction/processExtraction.js'
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

        // 2. Normalize The Payload (async — resolves Slack user profile)
        const normalizedPayload = await normalizeSlackEvent(event.payload, event.event_type)
        if (normalizedPayload == null)
            return

        // 3. Convert Into Text
        const cleanEventText = JSON.stringify(normalizedPayload)

        // 4. Extract Entities and Relationships
        const { entities, newEntities, relationships, newRelations, summary } = await extractFromEvent(cleanEventText , 'slack')

        // 5. Build person metadata from resolved Slack profile (includes email + role)
        const personMetadata: PersonMetadata[] = [{
            name: normalizedPayload.author,
            email: normalizedPayload.authorEmail ?? null,
            role: normalizedPayload.authorRole ?? null,
        }]

        // 6. Save to Graph Database (with enriched PERSON metadata)
        await saveExtractionToGraph(entities, newEntities, relationships, newRelations, personMetadata)

        // 7. Process The Summary To Create Vector Embeddings For Semantic Search
        const vectorEmbedding: number[] | null | undefined = await generateEmbeddings(summary)
        if (vectorEmbedding) {
            const allEntities = [...entities, ...newEntities.map((e: any) => { return { name: e.name, type: e.suggestedType } })]
            const allRelations = [...relationships, ...newRelations.map((r: any) => { return { from: r.from, to: r.to, type: r.suggestedType } })]

            await upsertVector(crypto.randomUUID(), vectorEmbedding, {
                eventID,
                summary,
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
        console.log(`Event ${eventID} processed. Summary: ${summary}`)
    }
    catch (error: any) {
        console.log(`Error While Processing Slack Event`)
        throw error
    }
}