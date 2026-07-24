import sql from '../../../apps/api/config/postgres.js'
import { CleanSlackEvent, normalizeSlackEvent } from './normalize.js'
import { extractFromEvent } from '../../extraction/extractor.js'
import { saveExtractionToGraph } from '../../extraction/processExtraction.js'
import { upsertVector } from '../../database/vector/qdrant.repository.js'
import { generateEmbeddings } from '../../llm/providers/gemini.js'

export async function processSlackEvent(eventID: string) {
    try {
        // 1. Get Payload From Database
        const [event] = await sql`SELECT *FROM events WHERE id=${eventID}`
        if (!event) {
            console.log(`Event With Event ID For Slack ${eventID} Not Found in Database`)
            return null
        }

        // 2. Normalize The Payload
        const normalizedPayload: CleanSlackEvent | null = normalizeSlackEvent(event.payload, event.event_type)
        if (normalizedPayload == null)
            return

        // 3. Convert Into Text
        const cleanEventText = JSON.stringify(normalizedPayload)

        // 4. Extract Enities and Relationships
        const { entities, newEntities, relationships, newRelations, summary } = await extractFromEvent(cleanEventText)

        await saveExtractionToGraph(entities, newEntities, relationships, newRelations)

        // 6.Process The Summary To Create Vector Embeddings For Semantic Search
        const vectorEmbedding: number[] | null | undefined = await generateEmbeddings(summary)
        if (vectorEmbedding) {
            const allEntities = [...entities, ...newEntities.map((e: any) => { return { name: e.name, type: e.suggestedType } })]
            const allRelations = [...relationships, ...newRelations.map((r: any) => { return { from: r.from, to: r.to, type: r.suggestedType } })]

            await upsertVector(crypto.randomUUID(), vectorEmbedding, {
                eventID,
                summary,
                entities: allEntities,
                relationships: allRelations,
                provder:'slack',
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