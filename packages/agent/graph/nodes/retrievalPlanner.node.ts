import { AgentStateType, StructuredEvidence } from "../state.js";
import { vectorNode } from "./vector.node.js";
import { graphNode } from "./graph.node.js";
import { sqlNode } from "./sql.node.js";
import { knowledgeRiskNode } from "./knowledgeRisk.node.js";
import { cypherFallbackNode } from "./cypherFallback.node.js";
import { isGraphTool } from "./graph.node.js";
import { dispatchCoreTool, isCoreTool } from "../../tools/dispatcher.js";

/**
 * Retrieval Planner Node:
 * Executes ALL pending tools (both newly built core tools and legacy graph/relational tools)
 * in true parallel via Promise.all.
 */
export async function retrievalPlannerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now();
    const startIso = new Date().toISOString();
    console.log(`[Timing] [retrievalPlannerNode] Started at ${startIso}`);

    if (!state.pendingTools || state.pendingTools.length === 0) {
        return { pendingTools: [] };
    }

    const pendingList = state.pendingTools.map(t => typeof t === 'string' ? { id: t, name: t, args: {} } : t);
    console.log(`[retrievalPlannerNode] Executing ${pendingList.length} tool(s) in TRUE PARALLEL:`, pendingList.map(t => t.name));

    let combinedVector = [...(state.vectorResult || [])];
    let combinedGraph = [...(state.graphResult || [])];
    let combinedSql = [...(state.sqlResult || [])];
    let combinedKR = state.knowledgeRiskResult;
    let combinedEvidence: StructuredEvidence[] = [...(state.structuredEvidence || [])];
    let combinedExecuted = [...(state.executedTools || [])];
    let combinedEntities = [...(state.entities || [])];
    const mergedLatencies = { ...(state.metrics?.toolLatencies || {}) };
    const mergedToolOrder = [...(state.metrics?.toolOrder || [])];

    // Partition tools into Core Tools vs Legacy Graph/SQL Nodes
    const coreToolCalls = pendingList.filter(t => isCoreTool(t.name));
    const legacyToolCalls = pendingList.filter(t => !isCoreTool(t.name));

    const parallelPromises: Promise<void>[] = [];

    // 1. Execute all Core Tools concurrently
    if (coreToolCalls.length > 0) {
        parallelPromises.push(
            Promise.all(coreToolCalls.map(async (call) => {
                const t0 = Date.now();
                const res = await dispatchCoreTool(call.name, call.args);
                mergedLatencies[call.name] = res.latencyMs;
                if (!mergedToolOrder.includes(call.name)) mergedToolOrder.push(call.name);
                if (!combinedExecuted.includes(call.name)) combinedExecuted.push(call.name);

                if (res.success && res.data) {
                    // Create structured evidence envelope
                    const evId = `core_${Date.now()}_${call.name}_${Math.random().toString(36).substring(7)}`;
                    const evidenceEnvelope: StructuredEvidence = {
                        id: evId,
                        subgoalId: call.subgoalId || 'subgoal_1',
                        toolCallId: call.id || call.subgoalId || 'subgoal_1',
                        sourceType: call.name === 'search_evidence' ? 'vector' : (call.name === 'get_related_entities' ? 'graph' : (call.name === 'get_successor_recommendation' ? 'analytics' : 'sql')),
                        confidence: 1.0,
                        summary: res.summary,
                        rawPayload: res.data,
                        entitiesFound: [
                            call.args?.repo,
                            call.args?.repository,
                            call.args?.person,
                            call.args?.alias,
                            call.args?.entity,
                        ].filter(Boolean) as string[],
                        queryExplanation: `${call.name}(${JSON.stringify(call.args)})`,
                    };
                    combinedEvidence.push(evidenceEnvelope);

                    // Cross-populate downstream context buffers
                    if (call.name === 'get_commit_count') {
                        combinedSql.push({
                            type: 'commit_count',
                            repo: res.data.repository,
                            person: res.data.person,
                            timeframe: res.data.timeframe,
                            allTimeCommits: res.data.allTimeCommits,
                            totalCommits: res.data.totalCommits,
                            breakdown: res.data.breakdown,
                            repoRankings: res.data.repoRankings,
                            topContributors: res.data.topContributors,
                            highestRepository: res.data.highestRepository,
                            highestContributor: res.data.highestContributor,
                            source: res.data.source,
                        });
                    } else if (call.name === 'get_successor_recommendation') {
                        combinedSql.push({
                            type: 'successor_recommendation',
                            target: res.data.target,
                            targetType: res.data.targetType,
                            primaryOwner: res.data.primaryOwner,
                            hasSuccessor: res.data.hasSuccessor,
                            recommendedSuccessor: res.data.recommendedSuccessor,
                            explanation: res.data.explanation,
                            candidates: res.data.candidates,
                        });
                        // Populate knowledgeRiskResult if not already set
                        if (!combinedKR || !combinedKR.successors) {
                            combinedKR = {
                                person: res.data.primaryOwner || res.data.target,
                                totalRisk: res.data.busFactor && res.data.busFactor <= 1 ? 0.8 : 0.4,
                                hasSuccessor: res.data.hasSuccessor,
                                successors: res.data.candidates,
                                successorRecommendation: res.data.recommendedSuccessor,
                                explanation: res.data.explanation,
                                affectedRepositories: res.data.targetType === 'repository' ? [{ repo_name: res.data.target, bus_factor: res.data.busFactor || 1, risk_score: 80, isSPOF: true }] : [],
                            };
                        }
                    } else if (call.name === 'get_bus_factor') {
                        for (const r of res.data.repositories) {
                            combinedSql.push({
                                repo_name: r.repoName,
                                bus_factor: r.busFactor,
                                risk_score: r.riskScore,
                                contributor_count: r.contributorCount,
                                primary_owner: r.primaryOwner,
                                status: r.status,
                            });
                        }
                    } else if (call.name === 'get_repo_contributors') {
                        combinedSql.push({
                            type: 'repo_contributors',
                            repo_name: res.data.repository,
                            primary_owner: res.data.primaryOwner,
                            bus_factor: res.data.busFactor,
                            contributor_count: res.data.contributorCount,
                            contributors: res.data.contributors,
                        });
                        combinedGraph.push({
                            repository: res.data.repository,
                            workItems: 0,
                            technologies: [],
                            contributors: res.data.contributors,
                        });
                    } else if (call.name === 'get_ownership') {
                        combinedSql.push({
                            type: 'ownership',
                            repo_name: res.data.repository,
                            primary_owner: res.data.primaryOwner,
                            bus_factor: res.data.busFactor,
                            totalCommits: res.data.totalCommits,
                            ownershipBreakdown: res.data.ownershipBreakdown,
                        });
                    } else if (call.name === 'get_person_activity') {
                        for (const act of res.data.activities) {
                            combinedSql.push({
                                id: act.id,
                                author: res.data.person,
                                event_type: act.event_type,
                                repository: act.repository,
                                summary: act.summary,
                                formatted_date: act.formatted_date,
                                provider: act.provider,
                            });
                        }
                    } else if (call.name === 'get_recent_changes') {
                        for (const ch of res.data.changes) {
                            combinedSql.push({
                                id: ch.id,
                                repository: res.data.repository,
                                author: ch.author,
                                event_type: ch.eventType,
                                summary: ch.summary,
                                formatted_date: ch.createdAt,
                                provider: ch.provider,
                            });
                        }
                    } else if (call.name === 'get_person_identity') {
                        combinedSql.push({
                            person: res.data.displayName,
                            identities: res.data.knownAliases.map((a: string) => ({ provider: 'cortex', username: a, email: res.data.email })),
                            person_name: res.data.displayName,
                            commit_count: res.data.commitCount,
                            repos: res.data.repos,
                            top_technologies: res.data.technologies,
                        });
                    } else if (call.name === 'get_related_entities') {
                        combinedGraph.push({
                            entity: res.data.entity,
                            connections: res.data.connections,
                        });
                    } else if (call.name === 'search_evidence') {
                        for (const m of res.data.matches) {
                            combinedVector.push({
                                payload: {
                                    summary: m.text,
                                    text: m.text,
                                    author: m.author,
                                    timestamp: m.date,
                                    provider: m.source,
                                }
                            });
                        }
                    }
                }
            })).then(() => {})
        );
    }

    // 2. Execute Legacy Nodes concurrently
    if (legacyToolCalls.length > 0) {
        const legacyNames = new Set(legacyToolCalls.map(t => t.name));
        const legacyPromises: Promise<Partial<AgentStateType>>[] = [];

        const wrap = (p: Promise<Partial<AgentStateType>>, name: string) => p.catch(err => {
            console.error(`[retrievalPlannerNode] Error executing legacy tool "${name}":`, err?.message);
            return {} as Partial<AgentStateType>;
        });

        if (legacyNames.has('knowledge_risk')) {
            legacyPromises.push(wrap(knowledgeRiskNode(state), 'knowledge_risk'));
        }
        if (Array.from(legacyNames).some(n => isGraphTool(n))) {
            legacyPromises.push(wrap(graphNode(state), 'graph'));
        }
        if (legacyNames.has('vector_search')) {
            legacyPromises.push(wrap(vectorNode(state), 'vector_search'));
        }
        if (legacyNames.has('sql_search') || legacyNames.has('recent_activity')) {
            legacyPromises.push(wrap(sqlNode(state), 'sql_search'));
        }
        if (legacyNames.has('cypher_fallback')) {
            legacyPromises.push(wrap(cypherFallbackNode(state), 'cypher_fallback'));
        }

        parallelPromises.push(
            Promise.all(legacyPromises).then(updates => {
                for (const update of updates) {
                    if (update.vectorResult) combinedVector.push(...update.vectorResult);
                    if (update.graphResult) combinedGraph.push(...update.graphResult);
                    if (update.sqlResult) combinedSql.push(...update.sqlResult);
                    if (update.knowledgeRiskResult) combinedKR = update.knowledgeRiskResult;
                    if (update.structuredEvidence) combinedEvidence.push(...update.structuredEvidence);
                    if (update.executedTools) {
                        for (const t of update.executedTools) {
                            if (!combinedExecuted.includes(t)) combinedExecuted.push(t);
                        }
                    }
                    if (update.metrics?.toolLatencies) Object.assign(mergedLatencies, update.metrics.toolLatencies);
                }
            })
        );
    }

    try {
        await Promise.all(parallelPromises);

        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [retrievalPlannerNode] Finished in ${elapsed}ms. Executed tools: ${combinedExecuted.join(', ')}`);

        return {
            vectorResult: combinedVector,
            graphResult: combinedGraph,
            sqlResult: combinedSql,
            knowledgeRiskResult: combinedKR,
            structuredEvidence: combinedEvidence,
            executedTools: combinedExecuted,
            entities: combinedEntities,
            pendingTools: [],
            metrics: {
                ...state.metrics,
                toolLatencies: mergedLatencies,
                toolOrder: mergedToolOrder,
                parallelBatches: (state.metrics?.parallelBatches || 0) + 1,
            }
        };
    } catch (err: any) {
        console.error(`[retrievalPlannerNode] Error during parallel tool execution: ${err?.message}`);
        return { pendingTools: [] };
    }
}
