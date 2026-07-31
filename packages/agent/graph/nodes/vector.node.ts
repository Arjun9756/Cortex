import { AgentStateType } from "../state.js";
import { generateEmbeddings } from "../../../llm/providers/gemini.js";
import { searchSimilar } from "../../../database/vector/qdrant.repository.js";

interface QdrantSearchResult {
    payload?: {
        summary?: any;
        entities?: any;
        relationships?: any;
        eventID?: any;
        eventId?: any;
        provider?: any;
        channel?: any;
        timestamp?: any;
        author?: any;
        repository?: any;
        text?: any;
        issueKey?: any;
        status?: any;
    };
}

export async function vectorNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const pendingTools = state.pendingTools.filter((tool) => tool !== 'vector_search')
    const executedTools = [...new Set([...state.executedTools, 'vector_search'])]
    try {
        const embedding = await generateEmbeddings(state.vectorQuery || state.query)
        if (!embedding) {
            return { vectorResult: [], pendingTools, executedTools }
        }

        const result = await searchSimilar(embedding) as QdrantSearchResult[]
        const vectorResult = result?.map((r) => ({
            summary: r.payload?.summary,
            entities: r.payload?.entities,
            relationships: r.payload?.relationships,
            eventId: r.payload?.eventID ?? r.payload?.eventId,
            provider: r.payload?.provider,
            channel: r.payload?.channel,
            timestamp: r.payload?.timestamp,
            author: r.payload?.author,
            repository: r.payload?.repository,
            text: r.payload?.text,
            issueKey: r.payload?.issueKey,
            status: r.payload?.status,
        }))

        return { vectorResult, pendingTools, executedTools }
    }
    catch (error: any) {
        return {
            vectorResult: [], pendingTools, executedTools
        }
    }
}
