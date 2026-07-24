import sql from '../../../apps/api/config/postgres.js'
import { normalizeGithubEvent } from './normalize.js'
import { extractFromEvent } from '../../extraction/extractor.js'
import { saveExtractionToGraph } from '../../extraction/processExtraction.js'
import { upsertVector } from '../../database/vector/qdrant.repository.js'
import { generateEmbeddings } from '../../llm/providers/gemini.js'
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

        // 2.Normalized The Payload
        const normalizedPayload = normalizeGithubEvent(event.payload, event.event_type) // This is Object convert to string while sending to AI
        // LLM Train
        if (!normalizedPayload)
            return

        // 3.Convert Into Text
        const cleanEventText = JSON.stringify(normalizedPayload)

        // 4.Extract From LLm
        const { entities, newEntities, relationships, newRelations, summary } = await extractFromEvent(cleanEventText)

        //5. Save Onto Graph Database
        await saveExtractionToGraph(entities, newEntities, relationships, newRelations)

        // 6.Process The Summary To Create Vector Embeddings For Semantic Search

        const vectorEmbedding: number[] | null | undefined = await generateEmbeddings(summary)

        if (vectorEmbedding) {
            const allEntities = [...entities, ...newEntities.map((e:any)=>{return { name: e.name, type: e.suggestedType }})]
            const allRelations = [...relationships, ...newRelations.map((r:any)=>{return { from: r.from, to: r.to, type: r.suggestedType }})]

            await upsertVector(crypto.randomUUID(), vectorEmbedding, {
                eventID,
                summary,
                entities:allEntities,
                relationships:allRelations,
                provider:"github",
                repository:normalizedPayload.repository,
                timestamp:normalizedPayload.timestamp,
                author:normalizedPayload.author
            })
        }

        console.log(`Event ${eventID} processed. Summary: ${summary}`)
    }
    catch (error: any) {
        console.log(`Error While Processing Github Events Through Queue Workers ${error?.message}`)
        throw new Error(error?.message || "Not Able To Proceed Further Github Events Through Queue Workers")
    }
}