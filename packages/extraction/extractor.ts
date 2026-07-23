import { callLLMEntityExtract } from "../llm/providers/groq.js"
import { RELATION_TYPES, ENTITY_TYPES } from "./ontology.js"
import { buildExtractionPrompt } from "../llm/prompts/extraction.prompt.js"
import { getExistingEntityName, getUsedRelationship } from "../database/neo4j/graph.repository.js"

export async function extractFromEvent(cleanEventText: string) {
    try {
        
        const existingEntities = await getExistingEntityName(30) // limit 30
        const existingRelation = await getUsedRelationship()

        const prompt = buildExtractionPrompt(cleanEventText , existingEntities , existingRelation)
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