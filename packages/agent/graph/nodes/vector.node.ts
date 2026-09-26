import { AgentStateType, StructuredEvidence } from "../state.js";
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
    const tStart = Date.now();
    const startIso = new Date().toISOString();
    console.log(`[Timing] [vectorNode] Started at ${startIso}`);

    const remainingPendingTools = state.pendingTools.filter(
        (tool) => (typeof tool === 'string' ? tool : tool.name) !== 'vector_search'
    );
    const executedTools = [...new Set([...state.executedTools, 'vector_search'])];

    const vectorCalls = state.pendingTools
        .filter((tool) => (typeof tool === 'string' ? tool : tool.name) === 'vector_search')
        .map(tool => typeof tool === 'string' ? { name: 'vector_search', args: { query: state.vectorQuery || state.query } } : tool);

    if (vectorCalls.length === 0) {
        vectorCalls.push({ name: 'vector_search', args: { query: state.vectorQuery || state.query } });
    }

    const aggregatedVectorResults: any[] = [];
    const newStructuredEvidence: StructuredEvidence[] = [];

    try {
        const results = await Promise.all(vectorCalls.map(async (call, callIdx) => {
            const vQuery = typeof call.args?.query === 'string' && call.args.query.trim()
                ? call.args.query.trim()
                : (state.vectorQuery || state.query);
            const subgoalId = call.subgoalId || `subgoal_${callIdx + 1}`;

            console.log(`[vectorNode] Executing [${subgoalId}] vector search query: "${vQuery}"`);
            const embedding = await generateEmbeddings(vQuery);
            if (!embedding) return { results: [], evidence: [] };

            const mappedResults = rawResult?.map((r, rIdx) => {
                const p: any = r.payload || {};
                const summaryText = p.summary || p.text || p.message || p.description || p.title || (p.repository ? `Event in ${p.repository}` : `Codebase discussion snippet #${rIdx + 1}`);
                const authorName = p.author || p.user || p.pusher || p.actor || 'Engineering Contributor';
                const providerName = p.provider || (p.repository ? 'github' : p.channel ? 'slack' : p.issueKey ? 'jira' : 'github');
                const eventId = p.eventID ?? p.eventId ?? p.id ?? (r as any).id;
                const repo = p.repository ?? p.repo ?? undefined;
                const timestamp = p.timestamp ?? p.created_at ?? p.date ?? undefined;

                return {
                    summary: summaryText,
                    entities: p.entities || [],
                    relationships: p.relationships || [],
                    eventId,
                    provider: providerName,
                    channel: p.channel,
                    timestamp,
                    author: authorName,
                    repository: repo,
                    text: summaryText,
                    issueKey: p.issueKey,
                    status: p.status,
                    score: (r as any).score ?? 0.85
                };
            }) ?? [];

            const callEvidence: StructuredEvidence[] = [];
            if (mappedResults.length > 0) {
                const extractedEntities = mappedResults
                    .flatMap(r => (r.entities ?? []).map((e: any) => typeof e === 'string' ? e : e?.name))
                    .filter(Boolean);

                callEvidence.push({
                    id: `vector_${call.id || Date.now()}_${callIdx}`,
                    subgoalId,
                    toolCallId: subgoalId,
                    sourceType: 'vector',
                    confidence: 0.90,
                    summary: `Vector semantic search for "${vQuery}" returned ${mappedResults.length} text snippet(s).`,
                    rawPayload: mappedResults,
                    entitiesFound: extractedEntities,
                    queryExplanation: `Executed Qdrant vector embedding search for query "${vQuery}"`,
                });
            }

            return { results: mappedResults, evidence: callEvidence };
        }));

        for (const res of results) {
            aggregatedVectorResults.push(...res.results);
            newStructuredEvidence.push(...res.evidence);
        }

        const combinedVectorResults = [...state.vectorResult, ...aggregatedVectorResults];
        const elapsed = Date.now() - tStart;
        return {
            vectorResult: combinedVectorResults,
            structuredEvidence: [...state.structuredEvidence, ...newStructuredEvidence],
            pendingTools: remainingPendingTools,
            executedTools,
            metrics: {
                ...state.metrics,
                toolLatencies: { ...state.metrics?.toolLatencies, vectorNode: elapsed },
                toolOrder: [...(state.metrics?.toolOrder || []), 'vectorNode'],
            }
        };
    }
    catch (error: any) {
        console.error(`Error in vectorNode: ${error?.message}`);
        return { vectorResult: state.vectorResult, pendingTools: remainingPendingTools, executedTools };
    } finally {
        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [vectorNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`);
    }
}
