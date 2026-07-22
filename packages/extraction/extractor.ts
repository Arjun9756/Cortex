import { callLLMEntityExtract } from "../llm/providers/groq.js"
import { RELATION_TYPES, ENTITY_TYPES } from "./ontology.js"
import { buildExtractionPrompt } from "../llm/prompts/extraction.prompt.js"

export async function extractFromEvent(cleanEventText: string) {
    try {
        const prompt = buildExtractionPrompt(cleanEventText)
        const extraction = await callLLMEntityExtract(prompt)

        return {
            entities: extraction.entities,
            newEntities: extraction.newEntities,
            relationships: extraction.relationships,
            newRelations: extraction.newRelations,
            summary: extraction.summary
        }
    }
    catch (error: any) {
        console.log(error?.message)
        throw new Error(error?.message || "Error While Generating The LLM Response")
    }
}