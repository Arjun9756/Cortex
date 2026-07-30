import { callLLMEntityExtract } from "../llm/providers/groq.js"
import { RELATION_TYPES, ENTITY_TYPES } from "./ontology.js"
import { buildGithubExtractionPrompt } from "../llm/prompts/extraction.prompt.github.js"
import { getExistingEntityName, getUsedRelationship } from "../database/neo4j/graph.repository.js"
import { buildSlackExtractionPrompt } from "../llm/prompts/extraction.prompt.slack.js"

export async function extractFromEvent(cleanEventText: string , provider:"github" | "slack" | 'jira' = "github") {
    try {
        
        const existingEntities = await getExistingEntityName(30) // limit 30
        const existingRelation = await getUsedRelationship()

        console.log(`Exist relation neo4j ${existingRelation}`)
        console.log(`Exits enity neo4j ` , JSON.stringify(existingEntities))

        const prompt = provider === "slack"
            ? buildSlackExtractionPrompt(cleanEventText, existingEntities, existingRelation)
            : buildGithubExtractionPrompt(cleanEventText, existingEntities, existingRelation)

        const extraction = await callLLMEntityExtract(prompt)

        return {
            entities: extraction.entities ?? [],
            newEntities: extraction.newEntities ?? [],
            relationships: extraction.relationships ?? [],
            newRelations: extraction.newRelations ?? [],
            summary: extraction.summary ?? ""
        }
    }
    catch (error: any) {
        console.log(error?.message)
        throw new Error(error?.message || "Error While Generating The LLM Response")
    }
}