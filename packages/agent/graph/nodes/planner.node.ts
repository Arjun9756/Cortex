import { AgentStateType, ToolCall, SubGoal } from "../state.js";
import { createGroqChatCompletion, PRIMARY_MODEL, FALLBACK_MODEL, DECOMPOSE_MODEL, PLANNER_MODEL } from "../../../llm/providers/groq.js";
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
    const response = await createGroqChatCompletion({
        model: DECOMPOSE_MODEL,
        temperature: 0,
        max_completion_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'system',
                content: `You are a precision query decomposition engine for an engineering knowledge graph.
Enumerate EVERY distinct, independently answerable sub-question or ask embedded in the user query as a JSON array of strings.
Do NOT artificially cap the number of asks — if the query contains 1, 3, 6, or 10 distinct questions/clauses joined by "and", commas, or separate sentences, identify and output ALL of them.
CRITICAL RULE: Never combine multiple entity types, targets, or resources (e.g. "repositories and technologies" or "Elena and Marcus") into a single ask — always split them into separate distinct asks (e.g. "How many total repositories are there?" and "How many total technologies are there?").
Preserve exact entity names and specific conditions.
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
    if (asks.length === 0) throw new Error('Decomposer returned empty asks array');
    console.log(`[Planner] DECOMPOSED_ASKS_JSON (${asks.length} asks): ${JSON.stringify(asks)}`);
    return asks;
}

/**
 * Maps each tool name to the SubGoal type that best describes its purpose.
 */
function toolNameToSubgoalType(toolName: string): SubGoal['type'] {
    if (toolName.startsWith('graph_')) return 'entity_lookup';
    if (toolName === 'vector_search') return 'semantic_explanation';
    if (toolName === 'sql_search') return 'metric_count';
    if (toolName === 'knowledge_risk') return 'risk_analysis';
    return 'entity_lookup';
}

/**
 * Maps tool name to the source preference for subgoal tracking.
 */
function toolNameToSource(toolName: string): ('graph' | 'vector' | 'sql' | 'analytics') {
    if (toolName.startsWith('graph_')) return 'graph';
    if (toolName === 'vector_search') return 'vector';
    if (toolName === 'sql_search') return 'sql';
    if (toolName === 'knowledge_risk') return 'analytics';
    return 'graph';
}

export async function plannerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now();
    const startIso = new Date().toISOString();
    console.log(`[Timing] [plannerNode] Started at ${startIso}`);

    let pendingToolCalls: ToolCall[] = [];
    const entitiesSet = new Set<string>();
    let vectorQuery: string = '';
    let decomposedAsks: string[] = [state.query];

    try {
        console.log(`[Planner] Processing query: "${state.query}"`);

        // Fetch live schema
        let labels: string[] = [];
        let relations: string[] = [];
        try {
            const schema = await getGraphSchema();
            labels = schema.nodeLabels;
            relations = schema.relationshipTypes;
            console.log(`[Planner] Live schema: ${labels.length} labels [${labels.join(', ')}], ${relations.length} relations`);
        } catch (schemaError: any) {
            console.warn(`[Planner] Schema fetch warning: ${schemaError?.message}`);
        }

        // 1. Decompose into distinct asks
        try {
            decomposedAsks = await decomposeQuery(state.query);
        } catch (error: any) {
            console.warn(`[Planner] Decomposer fallback: ${error?.message}`);
            decomposedAsks = [state.query];
        }
        const asks = decomposedAsks;

        // 2. Plan tool calls for each ask independently
        const schemaContext = (labels.length > 0)
            ? `\nLIVE GRAPH LABELS: [${labels.join(', ')}]\nLIVE GRAPH RELATIONS: [${relations.join(', ')}]`
            : '';

        const systemPrompt = `You are the Cortex Retrieval Planner.
Your job is to plan the exact retrieval tool calls needed to gather verified evidence for EVERY decomposed ask.

${schemaContext}

AVAILABLE TOOLS & RULES:
1. "graph_count_by_label": {"label": "REPOSITORY"|"TECHNOLOGY"|"PERSON"|"COMMIT"} -> Use for counting total number of repositories, technologies, or people.
2. "sql_search": {"queryType": "repos_by_bus_factor", "params": {"threshold": 1}} -> Use for repositories with bus factor <= 1, Single Point of Failure (SPOF) repos, or repo risk ranking.
3. "knowledge_risk": {"personName": "<name>"|"ALL"} -> Use for questions about engineer departure/leaving, knowledge loss, what breaks if someone quits, sole maintainers, and successors.
4. "graph_list_nodes": {"entity": "<name>", "relation": "USES"|"WORKS_ON", "targetLabel": "TECHNOLOGY"|"REPOSITORY"} -> Use for what technologies an engineer uses or which repos an engineer works on.
5. "graph_describe_entity": {"entity": "<name>"} -> Use for entity profile, email, role, description.
6. "vector_search": {"query": "<search query>"} -> Use for semantic/architectural rationale ("why was X replaced with Y and when?", decisions, Slack discussions, incident reasons).
7. "graph_repository_summary": {"repositoryName": "<repo>"|"ALL"} -> Use for repository contributors and commit overview.
8. "graph_dependency_analysis": {"entity": "<service>"} -> Use for service/repo dependency trees.
9. "graph_impact_analysis": {"entity": "<service>"} -> Use for blast radius of changes.
10. "graph_shortest_path": {"from": "<A>", "to": "<B>"} -> Use for shortest path/connections between 2 entities.
11. "graph_expertise_analysis": {"entity": "<tech/topic>"} -> Use for who is the top expert / who knows the most about a topic.

INSTRUCTIONS:
- For EACH ask listed below, plan one or more tool calls that directly answer it.
- Return JSON strictly in this format:
{"calls": [
  {"subgoalId": "subgoal_1", "name": "tool_name", "args": {...}},
  {"subgoalId": "subgoal_2", "name": "tool_name", "args": {...}}
]}
- Ensure EVERY ask has its own corresponding tool call(s) with the correct "subgoalId".
- Do not omit or merge asks.

DECOMPOSED ASKS:
${asks.map((ask, i) => `subgoal_${i + 1}: "${ask}"`).join('\n')}`;

        const planningResponse = await createGroqChatCompletion({
            model: PLANNER_MODEL,
            temperature: 0,
            response_format: { type: 'json_object' },
            max_completion_tokens: 4096,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: state.query },
            ],
        });

        const message = planningResponse.choices[0]?.message;
        let jsonPlan: any = {};
        try {
            jsonPlan = JSON.parse(message?.content || '{}');
        } catch (error: any) {
            console.error(`[Planner] Plan JSON parse failed: ${error?.message}`);
        }

        const rawCalls: any[] = Array.isArray(jsonPlan.calls) ? jsonPlan.calls : [];
        console.log(`[Planner] Planned ${rawCalls.length} tool call(s) for ${asks.length} decomposed ask(s)`);

        if (rawCalls.length === 0) {
            const textContent = message?.content?.trim() ?? '';
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
                let subgoalId = callItem.subgoalId;
                if (!subgoalId || !asks.some((_, idx) => subgoalId === `subgoal_${idx + 1}`)) {
                    subgoalId = `subgoal_${Math.min(i + 1, asks.length)}`;
                }

                console.log(`[Planner] Call [${subgoalId}] -> ${toolName}(${JSON.stringify(args)})`);
                pendingToolCalls.push({
                    id: `call_${subgoalId}_${pendingToolCalls.length + 1}`,
                    subgoalId,
                    name: toolName,
                    args,
                });

                // Entity extraction for state tracking
                if (typeof args.entity === 'string' && args.entity.trim()) {
                    entitiesSet.add(args.entity.trim());
                }
                if (Array.isArray(args.startEntities)) {
                    for (const e of args.startEntities) {
                        if (typeof e === 'string' && e.trim()) entitiesSet.add(e.trim());
                    }
                }
                if (Array.isArray(args.entities)) {
                    for (const e of args.entities) {
                        if (typeof e === 'string' && e.trim()) entitiesSet.add(e.trim());
                    }
                }
                if (typeof args.from === 'string' && args.from.trim()) entitiesSet.add(args.from.trim());
                if (typeof args.to === 'string' && args.to.trim()) entitiesSet.add(args.to.trim());
                if (typeof args.personName === 'string' && args.personName.trim() && args.personName.toUpperCase() !== 'ALL') {
                    entitiesSet.add(args.personName.trim());
                }
                if (typeof args.searchTerm === 'string' && args.searchTerm.trim()) entitiesSet.add(args.searchTerm.trim());
                if (toolName === 'vector_search' && typeof args.query === 'string' && args.query.trim()) {
                    vectorQuery = args.query.trim();
                }
            }
        }

        const entities = Array.from(entitiesSet);
        pendingToolCalls = deduplicateToolCalls(pendingToolCalls);

        if (!vectorQuery) {
            const vCall = pendingToolCalls.find(c => c.name === 'vector_search');
            if (vCall) vectorQuery = vCall.args?.query || state.query;
        }

        // Construct SubGoal tracking array
        const subgoals: SubGoal[] = asks.map((ask, idx) => {
            const callsForAsk = pendingToolCalls.filter(call => call.subgoalId === `subgoal_${idx + 1}`);
            return {
                id: `subgoal_${idx + 1}`,
                description: ask,
                type: callsForAsk[0] ? toolNameToSubgoalType(callsForAsk[0].name) : 'semantic_explanation',
                targetSourcePreference: callsForAsk.length > 0
                    ? [...new Set(callsForAsk.map(call => toolNameToSource(call.name)))]
                    : ['graph', 'vector', 'sql', 'analytics'],
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
        const failedSubgoals: SubGoal[] = decomposedAsks.map((description, index) => ({
            id: `subgoal_${index + 1}`,
            description,
            type: 'semantic_explanation',
            targetSourcePreference: [],
            status: 'unreachable',
            retries: 0,
        }));
        return {
            plan: [],
            pendingTools: [],
            subgoals: failedSubgoals,
            clarificationQuestion: '',
            entities: [],
            vectorQuery: state.query,
        };
    } finally {
        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [plannerNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`);
    }
}
