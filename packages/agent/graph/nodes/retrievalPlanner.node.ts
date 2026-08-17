import { AgentStateType, StructuredEvidence } from "../state.js";
import { vectorNode } from "./vector.node.js";
import { graphNode } from "./graph.node.js";
import { sqlNode } from "./sql.node.js";
import { knowledgeRiskNode } from "./knowledgeRisk.node.js";
import { cypherFallbackNode } from "./cypherFallback.node.js";
import { isGraphTool } from "./graph.node.js";

/**
 * Retrieval Planner Node:
 * Executes ALL pending independent tools concurrently via Promise.all.
 * Combines retrieved results, structured evidence, and metrics in a single parallel pass.
 *
 * Updated to recognize all graph_* tool names (not just 'graph_search').
 */
export async function retrievalPlannerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now();
    const startIso = new Date().toISOString();
    console.log(`[Timing] [retrievalPlannerNode] Started at ${startIso}`);

    if (!state.pendingTools || state.pendingTools.length === 0) {
        return { pendingTools: [] };
    }

    const toolNames = new Set(state.pendingTools.map(t => typeof t === 'string' ? t : t.name));
    console.log(`[retrievalPlannerNode] Executing ${toolNames.size} distinct tool(s) in TRUE PARALLEL:`, Array.from(toolNames));

    const toolPromises: Promise<Partial<AgentStateType>>[] = [];

    const wrapTool = (p: Promise<Partial<AgentStateType>>, name: string) => p.catch(err => {
        console.error(`[retrievalPlannerNode] Error executing tool "${name}":`, err?.message);
        return {} as Partial<AgentStateType>;
    });

    // Check if ANY graph_* tool is requested
    const hasGraphTool = Array.from(toolNames).some(name => isGraphTool(name));

    if (toolNames.has('knowledge_risk')) {
        toolPromises.push(wrapTool(knowledgeRiskNode(state), 'knowledge_risk'));
    }
    if (hasGraphTool) {
        toolPromises.push(wrapTool(graphNode(state), 'graph'));
    }
    if (toolNames.has('vector_search')) {
        toolPromises.push(wrapTool(vectorNode(state), 'vector_search'));
    }
    if (toolNames.has('sql_search')) {
        toolPromises.push(wrapTool(sqlNode(state), 'sql_search'));
    }
    if (toolNames.has('cypher_fallback')) {
        toolPromises.push(wrapTool(cypherFallbackNode(state), 'cypher_fallback'));
    }

    try {
        const updates = await Promise.all(toolPromises);

        let combinedVector = [...state.vectorResult];
        let combinedGraph = [...state.graphResult];
        let combinedSql = [...state.sqlResult];
        let combinedKR = state.knowledgeRiskResult;
        let combinedEvidence: StructuredEvidence[] = [...state.structuredEvidence];
        let combinedExecuted = [...state.executedTools];
        let combinedEntities = [...state.entities];
        let clarificationQ = state.clarificationQuestion;
        const mergedLatencies = { ...(state.metrics?.toolLatencies || {}) };
        const mergedToolOrder = [...(state.metrics?.toolOrder || [])];

        for (const update of updates) {
            if (update.vectorResult) combinedVector = update.vectorResult;
            if (update.graphResult) combinedGraph = update.graphResult;
            if (update.sqlResult) combinedSql = update.sqlResult;
            if (update.knowledgeRiskResult) combinedKR = update.knowledgeRiskResult;
            if (update.structuredEvidence) {
                for (const ev of update.structuredEvidence) {
                    if (!combinedEvidence.some(e => e.id === ev.id)) {
                        combinedEvidence.push(ev);
                    }
                }
            }
            if (update.executedTools) {
                for (const tool of update.executedTools) {
                    if (!combinedExecuted.includes(tool)) combinedExecuted.push(tool);
                }
            }
            if (update.entities) {
                for (const ent of update.entities) {
                    if (!combinedEntities.includes(ent)) combinedEntities.push(ent);
                }
            }
            if (update.clarificationQuestion) {
                clarificationQ = update.clarificationQuestion;
            }
            if (update.metrics?.toolLatencies) {
                Object.assign(mergedLatencies, update.metrics.toolLatencies);
            }
            if (update.metrics?.toolOrder) {
                for (const o of update.metrics.toolOrder) {
                    if (!mergedToolOrder.includes(o)) mergedToolOrder.push(o);
                }
            }
        }

        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [retrievalPlannerNode] Parallel execution batch finished in ${elapsed}ms`);

        return {
            vectorResult: combinedVector,
            graphResult: combinedGraph,
            sqlResult: combinedSql,
            knowledgeRiskResult: combinedKR,
            structuredEvidence: combinedEvidence,
            executedTools: combinedExecuted,
            entities: combinedEntities,
            clarificationQuestion: clarificationQ,
            pendingTools: [],
            metrics: {
                ...state.metrics,
                toolLatencies: mergedLatencies,
                toolOrder: mergedToolOrder,
                parallelBatches: (state.metrics?.parallelBatches || 0) + 1,
            }
        };
    } catch (error: any) {
        console.error(`[retrievalPlannerNode] Error during parallel tool execution: ${error?.message}`);
        return { pendingTools: [] };
    }
}
