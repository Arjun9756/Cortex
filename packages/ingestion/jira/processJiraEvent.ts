import sql from '../../../apps/api/config/postgres.js'
import { upsertRelation } from '../../database/neo4j/graph.repository.js'
import { upsertVector } from '../../database/vector/qdrant.repository.js'
import { extractFromEvent } from '../../extraction/extractor.js'
import { saveExtractionToGraph } from '../../extraction/processExtraction.js'
import { generateEmbeddings } from '../../llm/providers/gemini.js'
import { ICleanEvent, normalizeJiraEvent } from './normalize.js'

export async function processJiraEvent(eventID: string) {
    try {
        // 1.Fetch Data From Database
        const [event] = await sql`SELECT *FROM events WHERE id=${eventID}`
        if (!event) {
            console.log(`Event ID ${eventID} Not Found in Database`)
            return null
        }

        // 2.Normalize Payload
        const normalizedPayload: ICleanEvent | null = normalizeJiraEvent(event.payload, event.event_type)
        if (normalizedPayload == null)
            return

        // 3.Convert to String
        const cleanEventText = JSON.stringify(normalizedPayload)

        // 4.Get The Entities and relation from LLM
        const { entities, newEntities, relationships, newRelations, summary } = await extractFromEvent(cleanEventText, 'jira')

        // 5.Save to Graph Database
        await saveExtractionToGraph(entities, newEntities, relationships, newRelations)

        // 6.Generate vector embedding
        const vectorEmbedding: number[] | null | undefined = await generateEmbeddings(summary)
        if (vectorEmbedding) {
            const allEntities = [...entities, ...newEntities.map((e: any) => { return { name: e.name, type: e.suggestedType } })]
            const allRelations = [...relationships, ...newRelations.map((r: any) => { return { from: r.from, to: r.to, type: r.suggestedType } })]

            upsertVector(crypto.randomUUID(), vectorEmbedding, {
                eventID,
                summary,
                entities: allEntities,
                relationships: allRelations,
                provder: normalizedPayload.provider,
                issueKey: normalizedPayload.issueKey,
                author: normalizedPayload.author,
                timestamp: normalizedPayload.timestamp,
                status:normalizedPayload.status,
                description:normalizedPayload.description
            })
            console.log(`Event ${eventID} processed. Summary: ${summary}`)
        }
    }
    catch (error: any) {
        throw new Error(error?.message || "Error While Processing Jira Event")
    }
}