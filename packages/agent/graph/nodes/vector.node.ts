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
    const tStart = Date.now()
    const startIso = new Date().toISOString()
    console.log(`[Timing] [vectorNode] Started at ${startIso}`)

    const remainingPendingTools = state.pendingTools.filter((tool) => (typeof tool === 'string' ? tool : tool.name) !== 'vector_search')
    const executedTools = [...new Set([...state.executedTools, 'vector_search'])]

    const vectorCalls = state.pendingTools.filter((tool) => (typeof tool === 'string' ? tool : tool.name) === 'vector_search')
        .map(tool => typeof tool === 'string' ? { name: 'vector_search', args: { query: state.vectorQuery || state.query } } : tool);

    if (vectorCalls.length === 0) {
        vectorCalls.push({ name: 'vector_search', args: { query: state.vectorQuery || state.query } });
    }

    const aggregatedVectorResults: any[] = [];

    try {
        for (const call of vectorCalls) {
            const vQuery = typeof call.args?.query === 'string' && call.args.query.trim()
                ? call.args.query.trim()
                : (state.vectorQuery || state.query);

            console.log(`[vectorNode] Executing vector search query: "${vQuery}"`);
            const embedding = await generateEmbeddings(vQuery);
            if (!embedding) continue;

            const result = await searchSimilar(embedding) as QdrantSearchResult[];
            const mappedResults = result?.map((r) => ({
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
            })) ?? [];
            aggregatedVectorResults.push(...mappedResults);
        }

        const combinedVectorResults = [...state.vectorResult, ...aggregatedVectorResults];
        return { vectorResult: combinedVectorResults, pendingTools: remainingPendingTools, executedTools };
    }
    catch (error: any) {
        console.log(`Error in vectorNode: ${error?.message}`);
        return { vectorResult: state.vectorResult, pendingTools: remainingPendingTools, executedTools };
    } finally {
        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [vectorNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`);
    }
}
