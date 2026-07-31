import { callLLMEntityExtract } from "../llm/providers/groq.js"
import { buildGithubExtractionPrompt } from "../llm/prompts/extraction.prompt.github.js"
import { buildSlackExtractionPrompt } from "../llm/prompts/extraction.prompt.slack.js"

/**
 * Streamlined Information Extraction Engine:
 * Sends text directly to LLM with standard Ontology Rules without pre-querying Neo4j DB.
 * Post-extraction entity resolution (email / provider ID / exact name merge) is handled
 * downstream in saveExtractionToGraph / entityResolver.ts.
 */
export async function extractFromEvent(cleanEventText: string, provider: "github" | "slack" | 'jira' = "github") {
    try {
        const prompt = provider === "slack"
            ? buildSlackExtractionPrompt(cleanEventText)
            : buildGithubExtractionPrompt(cleanEventText)

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
        console.error(`[Extractor] Error during entity extraction:`, error?.message)
        throw new Error(error?.message || "Error While Generating The LLM Response")
    }
}