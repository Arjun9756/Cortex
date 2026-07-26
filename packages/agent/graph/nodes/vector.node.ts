import { AgentStateType } from "../state.js";
import { generateEmbeddings } from "../../../llm/providers/gemini.js";
import { searchSimilar } from "../../../database/vector/qdrant.repository.js";

interface QdrantSearchResult {
    payload?: {
        summary?: any;
        entities?: any;
        relationships?: any;
        eventId?: any;
        provider?: any;
    };
}

export async function vectorNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
        const embedding = await generateEmbeddings(state.query)
        if (!embedding) {
            return { vectorResult: [] }
        }

        const result = await searchSimilar(embedding) as QdrantSearchResult[]
        const vectorResult = result?.map((r)=>({
            summary: r.payload?.summary,
            entities: r.payload?.entities,
            relationships: r.payload?.relationships,
            eventId: r.payload?.eventId,
            provider: r.payload?.provider
        }))

        return {vectorResult}
    }
    catch(error:any){
        return {
            vectorResult:[]
        }
    }
}