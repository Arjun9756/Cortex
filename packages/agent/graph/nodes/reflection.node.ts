import { AgentStateType, ToolCall } from "../state.js";
import { createGroqChatCompletion, PRIMARY_MODEL, VERIFY_MODEL } from "../../../llm/providers/groq.js";
import { getGraphSchema } from "../../../database/neo4j/schemaCache.js";

/**
 * Self-Verification and Reflection Node:
 * Audits gathered evidence against every decomposed ask.
 * If evidence is missing for a specific ask, plans a targeted recovery attempt.
 * Retries are scoped per missing item and capped at 2 iterations.
 */
export async function reflectionNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const passCount = (state.iterationCount || 0) + 1;
    const tStart = Date.now();
    const startIso = new Date().toISOString();
    console.log(`[Timing] [reflectionNode] (Self-Verification Pass #${passCount}) Started at ${startIso}`);

    try {
        // If there are already pending tools queued up, continue executing them
        if (state.pendingTools && state.pendingTools.length > 0) {
            return { needMoreSearch: true, pendingTools: state.pendingTools, iterationCount: passCount };
        }

        // Fast Path: Full coverage with high confidence
        const allCovered = state.subgoals.length > 0 &&
            (!state.missingGoals || state.missingGoals.length === 0) &&
            state.structuredEvidence.length >= state.subgoals.length;

        if (allCovered) {
            console.log(`[Self-Verify] All ${state.subgoals.length} decomposed ask(s) verified with high-confidence evidence. Proceeding directly to synthesis.`);
            return {
                needMoreSearch: false,
                pendingTools: [],
                iterationCount: passCount,
            };
        }

        // Check if retry budget is exhausted
        if (state.iterationCount >= 2) {
            if (state.missingGoals && state.missingGoals.length > 0) {
                console.warn(`[Self-Verify] Retry budget exhausted for asks: ${JSON.stringify(state.missingGoals)}. Verified as absent in indexed sources.`);
            }
            return {
                needMoreSearch: false,
                pendingTools: [],
                iterationCount: passCount,
            };
        }

        // Targeted Recovery: for each missing subgoal, plan a fallback tool call
        if (state.missingGoals && state.missingGoals.length > 0) {
            console.log(`[Self-Verify] Detected ${state.missingGoals.length} unfulfilled ask(s): ${JSON.stringify(state.missingGoals)}. Initiating targeted recovery...`);

            let schemaLabels: string[] = [];
            try {
                const schema = await getGraphSchema();
                schemaLabels = schema.nodeLabels;
            } catch {}

            const retryCalls: ToolCall[] = [];

            await Promise.all(state.missingGoals.map(async (goalId) => {
                const goal = state.subgoals.find(g => g.id === goalId);
                const askText = goal?.description || state.query;

                const recoveryPrompt = `You are the Cortex self-verification recovery engine.
An engineering query ask could not be answered with the initial retrieval pass.
Plan ONE targeted fallback tool call with broader or adjusted parameters to find the data.

Missing Ask: "${askText}"
Available Graph Labels: [${schemaLabels.join(', ')}]

AVAILABLE TOOLS:
- "graph_describe_entity": {"entity": "<name>"}
- "graph_count_by_label": {"label": "REPOSITORY"|"TECHNOLOGY"|"PERSON"}
- "graph_list_nodes": {"entity": "<name>", "relation": "USES"|"WORKS_ON", "targetLabel": "TECHNOLOGY"|"REPOSITORY"}
- "graph_repository_summary": {"repositoryName": "<repo>"|"ALL"}
- "graph_traverse": {"startEntities": ["<name>"], "relations": ["AUTHORED", "DEPENDS_ON", "USES"], "depth": {"min": 1, "max": 3}, "direction": "both"}
- "sql_search": {"queryType": "repos_by_bus_factor"|"repo_risk"|"recent_events", "params": {...}}
- "knowledge_risk": {"personName": "<name>"|"ALL"}
- "vector_search": {"query": "<broader semantic query>"}

Return JSON format only:
{"call": {"name": "tool_name", "args": {...}}}`;

                try {
                    const response = await createGroqChatCompletion({
                        model: VERIFY_MODEL,
                        temperature: 0,
                        response_format: { type: 'json_object' },
                        max_completion_tokens: 1024,
                        messages: [
                            { role: 'system', content: 'You are a targeted recovery planner. Output JSON only: {"call": {"name": "...", "args": {...}}}' },
                            { role: 'user', content: recoveryPrompt }
                        ],
                    });

                    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
                    if (parsed.call && typeof parsed.call.name === 'string') {
                        retryCalls.push({
                            id: `retry_${goalId}_${passCount}_${retryCalls.length + 1}`,
                            subgoalId: goalId,
                            attempt: passCount,
                            name: parsed.call.name,
                            args: parsed.call.args || {},
                        });
                        console.log(`[Self-Verify] Targeted retry for [${goalId}]: ${parsed.call.name}(${JSON.stringify(parsed.call.args || {})})`);
                    }
                } catch (err: any) {
                    console.error(`[Self-Verify] Recovery planning failed for ${goalId}: ${err?.message}`);
                }
            }));

            if (retryCalls.length > 0) {
                return {
                    pendingTools: retryCalls,
                    needMoreSearch: true,
                    iterationCount: passCount,
                };
            }
        }

        return {
            needMoreSearch: false,
            pendingTools: [],
            iterationCount: passCount,
        };
    } catch (error: any) {
        console.error(`Error in reflectionNode: ${error?.message}`);
        return { needMoreSearch: false, iterationCount: passCount };
    } finally {
        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [reflectionNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`);
    }
}
