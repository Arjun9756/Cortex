import { AgentStateType, ToolCall, SubGoal } from "../state.js";
import { executeAgentTurnWithToolCalling, isDataQuestion, createGroqChatCompletion, DECOMPOSE_MODEL } from "../../../llm/providers/groq.js";
import { TOOL_DEFINITIONS } from "../../tools/toolDefinitions.js";
import { getGraphSchema } from '../../../database/neo4j/schemaCache.js';

export function deduplicateToolCalls(calls: ToolCall[]): ToolCall[] {
    const seen = new Set<string>();
    const result: ToolCall[] = [];
    for (const call of calls) {
        const key = `${call.subgoalId || ''}:${call.name}:${JSON.stringify(call.args || {})}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(call);
        }
    }
    return result;
}

async function decomposeQuery(query: string): Promise<string[]> {
    try {
        const response = await createGroqChatCompletion({
            model: DECOMPOSE_MODEL,
            temperature: 0,
            max_completion_tokens: 1024,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: `You are a precision query decomposition engine for an engineering knowledge graph.
Enumerate EVERY distinct, independently answerable sub-question or ask embedded in the user query as a JSON array of strings.
Do NOT artificially cap the number of asks — if the query contains multiple distinct questions/clauses joined by "and", commas, or separate sentences, identify and output ALL of them.
CRITICAL RULE: Never combine multiple entity types, targets, or resources into a single ask — always split them into separate distinct asks.
Preserve exact entity names and specific conditions. For queries in Hindi/Hinglish, translate or preserve the core ask accurately.
Return JSON only: {"asks":["ask 1", "ask 2", ...]}`
                },
                { role: 'user', content: query },
            ],
        });
        const raw = response.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw);
        const asks = Array.isArray(parsed?.asks)
            ? parsed.asks.filter((ask: unknown): ask is string => typeof ask === 'string' && ask.trim().length > 0).map((ask: string) => ask.trim())
            : [];
        if (asks.length > 0) {
            console.log(`[Planner] DECOMPOSED_ASKS_JSON (${asks.length} asks): ${JSON.stringify(asks)}`);
            return asks;
        }
    } catch (e: any) {
        console.warn(`[Planner] Decomposer warning: ${e?.message}`);
    }
    return [query];
}

/**
 * Maps each tool name to the SubGoal type that best describes its purpose.
 */
function toolNameToSubgoalType(toolName: string): SubGoal['type'] {
    if (toolName === 'get_commit_count' || toolName === 'get_bus_factor' || toolName === 'get_ownership' || toolName === 'sql_search' || toolName === 'recent_activity' || toolName === 'get_recent_changes') return 'metric_count';
    if (toolName === 'get_successor_recommendation' || toolName === 'knowledge_risk') return 'risk_analysis';
    if (toolName === 'search_evidence' || toolName === 'vector_search') return 'semantic_explanation';
    return 'entity_lookup';
}

/**
 * Maps tool name to the source preference for subgoal tracking.
 */
function toolNameToSource(toolName: string): ('graph' | 'vector' | 'sql' | 'analytics') {
    if (toolName.startsWith('graph_') || toolName === 'get_related_entities') return 'graph';
    if (toolName === 'vector_search' || toolName === 'search_evidence') return 'vector';
    if (toolName === 'knowledge_risk' || toolName === 'get_successor_recommendation') return 'analytics';
    return 'sql';
}

export async function plannerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now();
    const startIso = new Date().toISOString();
    console.log(`[Timing] [plannerNode] Started at ${startIso}`);

    // 1. Check for Out-of-Scope / purely conversational non-data query
    if (!isDataQuestion(state.query)) {
        console.log(`[Planner] Non-data / out-of-scope query detected: "${state.query}". Returning polite decline.`);
        const declineAnswer = "I am Cortex, an engineering knowledge intelligence assistant. I can only answer questions about your organization's codebases, repositories, commits, developers, architecture, dependencies, and risk.";
        return {
            answer: declineAnswer,
            pendingTools: [],
            plan: [],
            subgoals: [],
            clarificationQuestion: '',
            entities: [],
            metrics: {
                ...state.metrics,
                plannerLatencyMs: Date.now() - tStart,
            }
        };
    }

    let pendingToolCalls: ToolCall[] = [];
    const entitiesSet = new Set<string>();
    let vectorQuery: string = '';
    let decomposedAsks: string[] = [state.query];

    try {
        console.log(`[Planner] Processing query: "${state.query}"`);

        // Fetch live schema (best effort)
        try {
            const schema = await getGraphSchema();
            console.log(`[Planner] Live schema: ${schema.nodeLabels.length} labels, ${schema.relationshipTypes.length} relations`);
        } catch {}

        // Decompose into distinct asks
        decomposedAsks = await decomposeQuery(state.query);
        const asks = decomposedAsks;

        // 2. Call Groq with native tool-calling, retries, and fallback cascade
        const planningResult = await executeAgentTurnWithToolCalling(state.query, TOOL_DEFINITIONS);

        const rawCalls = planningResult.toolCalls || [];
        console.log(`[Planner] Planned ${rawCalls.length} tool call(s) for query "${state.query}" using model (${planningResult.modelUsed})`);

        if (rawCalls.length === 0) {
            const textContent = planningResult.content?.trim() ?? '';
            if (textContent.includes('?') && textContent.length < 200) {
                return { clarificationQuestion: textContent };
            }
            console.warn(`[Planner] No tool calls generated for query "${state.query}"`);
        } else {
            for (let i = 0; i < rawCalls.length; i++) {
                const callItem = rawCalls[i];
                if (!callItem || typeof callItem.name !== 'string') continue;

                const toolName = callItem.name;
                const args = (typeof callItem.args === 'object' && callItem.args !== null) ? callItem.args : {};

                // Match or assign subgoalId
                let subgoalId = `subgoal_${Math.min(i + 1, asks.length)}`;

                console.log(`[Planner] Call [${subgoalId}] -> ${toolName}(${JSON.stringify(args)})`);
                pendingToolCalls.push({
                    id: `call_${subgoalId}_${pendingToolCalls.length + 1}`,
                    subgoalId,
                    name: toolName,
                    args,
                });

                // Extract entities for state tracking
                if (typeof args.repo === 'string' && args.repo.trim()) entitiesSet.add(args.repo.trim());
                if (typeof args.repository === 'string' && args.repository.trim()) entitiesSet.add(args.repository.trim());
                if (typeof args.person === 'string' && args.person.trim()) entitiesSet.add(args.person.trim());
                if (typeof args.personName === 'string' && args.personName.trim() && args.personName.toUpperCase() !== 'ALL') {
                    entitiesSet.add(args.personName.trim());
                }
                if (typeof args.alias === 'string' && args.alias.trim()) entitiesSet.add(args.alias.trim());
                if (typeof args.entity === 'string' && args.entity.trim()) entitiesSet.add(args.entity.trim());
                if (typeof args.query === 'string' && args.query.trim()) vectorQuery = args.query.trim();
            }
        }

        const entities = Array.from(entitiesSet);
        pendingToolCalls = deduplicateToolCalls(pendingToolCalls);

        // Construct SubGoal tracking array
        const subgoals: SubGoal[] = asks.map((ask, idx) => {
            const callsForAsk = pendingToolCalls.filter(call => call.subgoalId === `subgoal_${idx + 1}`);
            return {
                id: `subgoal_${idx + 1}`,
                description: ask,
                type: callsForAsk[0] ? toolNameToSubgoalType(callsForAsk[0].name) : 'metric_count',
                targetSourcePreference: callsForAsk.length > 0
                    ? [...new Set(callsForAsk.map(call => toolNameToSource(call.name)))]
                    : ['sql', 'graph', 'analytics', 'vector'],
                status: 'pending',
                requiredEntities: entities,
                retries: 0,
            };
        });

        const elapsed = Date.now() - tStart;
        return {
            plan: pendingToolCalls,
            pendingTools: pendingToolCalls,
            subgoals,
            clarificationQuestion: '',
            entities,
            vectorQuery: vectorQuery || state.query,
            metrics: {
                ...state.metrics,
                plannerLatencyMs: elapsed,
            }
        };
    } catch (error: any) {
        console.error(`[Planner] Error in plannerNode: ${error?.message}`);
        return {
            plan: [],
            pendingTools: [],
            subgoals: decomposedAsks.map((d, i) => ({
                id: `subgoal_${i + 1}`,
                description: d,
                type: 'semantic_explanation',
                targetSourcePreference: [],
                status: 'unreachable',
                retries: 0,
            })),
            clarificationQuestion: '',
            entities: [],
            vectorQuery: state.query,
        };
    } finally {
        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [plannerNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`);
    }
}
