import { AgentStateType, StructuredEvidence } from '../state.js'
import { resolveGraphEntity } from '../../../graph/graph.service.js'
import { describeEntity, countByLabel, listNodes, listNodesMultiHop, repositorySummary, shortestPath, dependencyAnalysis, impactAnalysis, expertiseAnalysis, countNodes, searchEntityCandidates } from '../../../graph/cypher/analysis.cypher.js'
import { executeGraphTraversal } from '../../../graph/cypher/graphTraversalExecutor.js'
import { GraphTraversalSpec } from '../../tools/schemas.js'
import type { EntityCandidate } from '../../../graph/cypher/analysis.cypher.js'

/**
 * All tool names that route to this graph node.
 */
export const GRAPH_TOOL_NAMES = [
    'graph_describe_entity',
    'graph_count_by_label',
    'graph_list_nodes',
    'graph_repository_summary',
    'graph_shortest_path',
    'graph_dependency_analysis',
    'graph_impact_analysis',
    'graph_expertise_analysis',
    'graph_count_nodes',
    'graph_search_candidates',
    'graph_traverse',
    'graph_search', // backward compat
] as const;

export type GraphToolName = typeof GRAPH_TOOL_NAMES[number];

/**
 * Checks if a tool name is a graph tool.
 */
export function isGraphTool(toolName: string): boolean {
    return toolName.startsWith('graph_') || toolName === 'graph_search';
}

/**
 * Resolves a single entity name to its canonical graph name.
 * Returns the resolved name, or the original if unresolvable.
 */
async function resolveEntityName(entityName: string): Promise<string> {
    if (!entityName || !entityName.trim()) return entityName;
    try {
        const resolution = await resolveGraphEntity(entityName.trim());
        return resolution.selected?.name ?? entityName.trim();
    } catch {
        return entityName.trim();
    }
}

/**
 * Resolves an entity and checks for ambiguity.
 * Returns { resolved, clarification? } where clarification is set if ambiguous.
 */
async function resolveWithClarification(entityName: string): Promise<{
    resolved: string;
    clarification?: string;
    candidates?: EntityCandidate[];
}> {
    if (!entityName || !entityName.trim()) return { resolved: entityName };
    const resolution = await resolveGraphEntity(entityName.trim());

    if (!resolution.selected && resolution.candidates.length > 0) {
        return {
            resolved: entityName.trim(),
            clarification: `I found multiple possible entities: ${formatClarificationOptions(resolution.candidates)}. Which one do you mean?`,
            candidates: resolution.candidates,
        };
    }

    return { resolved: resolution.selected?.name ?? entityName.trim() };
}

export async function graphNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now();
    const startIso = new Date().toISOString();
    console.log(`[Timing] [graphNode] Started at ${startIso}`);

    // Filter out ALL graph tool calls from pending
    const remainingPendingTools = state.pendingTools.filter((tool) => {
        const name = typeof tool === 'string' ? tool : tool.name;
        return !isGraphTool(name);
    });
    const executedTools = [...new Set([...state.executedTools, 'graph_search'])];

    // Collect ALL graph tool calls
    const graphCalls = state.pendingTools
        .filter((tool) => {
            const name = typeof tool === 'string' ? tool : tool.name;
            return isGraphTool(name);
        })
        .map(tool => typeof tool === 'string' ? { name: tool, args: {} } : tool);

    if (graphCalls.length === 0) {
        return { graphResult: state.graphResult, pendingTools: remainingPendingTools, executedTools };
    }

    const aggregatedGraphResults: any[] = [];
    const newStructuredEvidence: StructuredEvidence[] = [];
    const allResolvedEntities: string[] = [...state.entities];
    let clarificationQuestion: string = '';

    try {
        // Execute ALL graph tool calls concurrently via Promise.all
        const results = await Promise.all(graphCalls.map(async (call, callIdx) => {
            const toolName = call.name;
            const args = call.args || {};
            const subgoalId = call.subgoalId || `subgoal_${callIdx + 1}`;

            console.log(`[graphNode] Dispatching [${subgoalId}]: ${toolName}(${JSON.stringify(args)})`);

            const callEvidence: StructuredEvidence[] = [];
            const callGraphResults: any[] = [];
            const callEntities: string[] = [];
            let callClarification: string | undefined;

            try {
                switch (toolName) {
                    // ─── Describe Entity ──────────────────────────────
                    case 'graph_describe_entity': {
                        const entityName = args.entity || '';
                        if (!entityName) break;

                        const { resolved, clarification } = await resolveWithClarification(entityName);
                        if (clarification) {
                            callClarification = clarification;
                            break;
                        }

                        callEntities.push(resolved);
                        const result = await describeEntity(resolved);
                        if (result) {
                            const resArray = Array.isArray(result) ? result : [result];
                            callGraphResults.push(...resArray);
                            callEvidence.push({
                                id: `graph_${Date.now()}_describeEntity_${callIdx}`,
                                subgoalId,
                                toolCallId: subgoalId,
                                sourceType: 'graph',
                                confidence: 0.95,
                                summary: `Described entity "${resolved}": ${resArray.length} record(s).`,
                                rawPayload: resArray,
                                entitiesFound: [resolved],
                                queryExplanation: `graph_describe_entity for "${resolved}"`,
                            });
                        }
                        break;
                    }

                    // ─── Count By Label ───────────────────────────────
                    case 'graph_count_by_label': {
                        const searchTerm = args.searchTerm ?? '';
                        const label = args.label ?? '';
                        const result = await countByLabel(searchTerm, label);
                        if (result) {
                            callGraphResults.push(result);
                            callEvidence.push({
                                id: `graph_${Date.now()}_countByLabel_${callIdx}`,
                                subgoalId,
                                toolCallId: subgoalId,
                                sourceType: 'graph',
                                confidence: 0.95,
                                summary: `Count by label (${label}): ${JSON.stringify(result)}`,
                                rawPayload: result,
                                entitiesFound: searchTerm ? [searchTerm] : [],
                                queryExplanation: `graph_count_by_label(searchTerm="${searchTerm}", label="${label}")`,
                            });
                        }
                        break;
                    }

                    // ─── List Nodes ───────────────────────────────────
                    case 'graph_list_nodes': {
                        const entityName = args.entity || '';
                        if (!entityName) break;

                        const resolved = await resolveEntityName(entityName);
                        callEntities.push(resolved);

                        const targetLabel = args.targetLabel || '';
                        const relation = args.relation || '';

                        const direct = await listNodes(resolved, targetLabel, relation);
                        let result = direct;
                        if (direct.count === 0 || targetLabel === 'TECHNOLOGY') {
                            const multiHop = await listNodesMultiHop(resolved, targetLabel, relation);
                            if (multiHop.count > 0) result = multiHop;
                        }

                        callGraphResults.push(result);
                        callEvidence.push({
                            id: `graph_${Date.now()}_listNodes_${callIdx}`,
                            subgoalId,
                            toolCallId: subgoalId,
                            sourceType: 'graph',
                            confidence: 0.95,
                            summary: `List nodes for "${resolved}": ${result.count} item(s).`,
                            rawPayload: result,
                            entitiesFound: [resolved],
                            queryExplanation: `graph_list_nodes(entity="${resolved}", targetLabel="${targetLabel}", relation="${relation}")`,
                        });
                        break;
                    }

                    // ─── Repository Summary ───────────────────────────
                    case 'graph_repository_summary': {
                        const repoName = args.repositoryName || '';
                        const result = await repositorySummary(repoName);
                        const resArray = Array.isArray(result) ? result : (result == null ? [] : [result]);
                        callGraphResults.push(...resArray);
                        callEvidence.push({
                            id: `graph_${Date.now()}_repositorySummary_${callIdx}`,
                            subgoalId,
                            toolCallId: subgoalId,
                            sourceType: 'graph',
                            confidence: 0.95,
                            summary: `Repository summary returned ${resArray.length} record(s).`,
                            rawPayload: resArray,
                            entitiesFound: resArray.map((r: any) => r.repository).filter(Boolean),
                            queryExplanation: `graph_repository_summary(repositoryName="${repoName || 'ALL'}")`,
                        });
                        break;
                    }

                    // ─── Shortest Path ────────────────────────────────
                    case 'graph_shortest_path': {
                        const from = args.from || '';
                        const to = args.to || '';
                        if (!from || !to) break;

                        const resolvedFrom = await resolveEntityName(from);
                        const resolvedTo = await resolveEntityName(to);
                        callEntities.push(resolvedFrom, resolvedTo);

                        const result = await shortestPath(resolvedFrom, resolvedTo);
                        const resArray = Array.isArray(result) ? result : (result == null ? [] : [result]);
                        callGraphResults.push(...resArray);
                        callEvidence.push({
                            id: `graph_${Date.now()}_shortestPath_${callIdx}`,
                            subgoalId,
                            toolCallId: subgoalId,
                            sourceType: 'graph',
                            confidence: 0.95,
                            summary: `Shortest path from "${resolvedFrom}" to "${resolvedTo}": ${resArray.length} path(s).`,
                            rawPayload: resArray,
                            entitiesFound: [resolvedFrom, resolvedTo],
                            queryExplanation: `graph_shortest_path(from="${resolvedFrom}", to="${resolvedTo}")`,
                        });
                        break;
                    }

                    // ─── Dependency Analysis ──────────────────────────
                    case 'graph_dependency_analysis': {
                        const entityName = args.entity || '';
                        if (!entityName) break;

                        const resolved = await resolveEntityName(entityName);
                        callEntities.push(resolved);

                        const result = await dependencyAnalysis(resolved);
                        if (result) {
                            callGraphResults.push(result);
                            callEvidence.push({
                                id: `graph_${Date.now()}_dependencyAnalysis_${callIdx}`,
                                subgoalId,
                                toolCallId: subgoalId,
                                sourceType: 'graph',
                                confidence: 0.95,
                                summary: `Dependency analysis for "${resolved}".`,
                                rawPayload: result,
                                entitiesFound: [resolved],
                                queryExplanation: `graph_dependency_analysis(entity="${resolved}")`,
                            });
                        }
                        break;
                    }

                    // ─── Impact Analysis ──────────────────────────────
                    case 'graph_impact_analysis': {
                        const entityName = args.entity || '';
                        if (!entityName) break;

                        const resolved = await resolveEntityName(entityName);
                        callEntities.push(resolved);

                        const result = await impactAnalysis(resolved);
                        if (result) {
                            callGraphResults.push(result);
                            callEvidence.push({
                                id: `graph_${Date.now()}_impactAnalysis_${callIdx}`,
                                subgoalId,
                                toolCallId: subgoalId,
                                sourceType: 'graph',
                                confidence: 0.95,
                                summary: `Impact analysis for "${resolved}".`,
                                rawPayload: result,
                                entitiesFound: [resolved],
                                queryExplanation: `graph_impact_analysis(entity="${resolved}")`,
                            });
                        }
                        break;
                    }

                    // ─── Expertise Analysis ───────────────────────────
                    case 'graph_expertise_analysis': {
                        const entityName = args.entity || '';
                        if (!entityName) break;

                        const resolved = await resolveEntityName(entityName);
                        callEntities.push(resolved);

                        const result = await expertiseAnalysis(resolved);
                        const resArray = Array.isArray(result) ? result : (result == null ? [] : [result]);
                        callGraphResults.push(...resArray);
                        callEvidence.push({
                            id: `graph_${Date.now()}_expertiseAnalysis_${callIdx}`,
                            subgoalId,
                            toolCallId: subgoalId,
                            sourceType: 'graph',
                            confidence: 0.95,
                            summary: `Expertise analysis for "${resolved}": ${resArray.length} expert(s).`,
                            rawPayload: resArray,
                            entitiesFound: [resolved],
                            queryExplanation: `graph_expertise_analysis(entity="${resolved}")`,
                        });
                        break;
                    }

                    // ─── Count Nodes ──────────────────────────────────
                    case 'graph_count_nodes': {
                        const entityName = args.entity || '';
                        if (!entityName) break;

                        const resolved = await resolveEntityName(entityName);
                        callEntities.push(resolved);

                        const targetLabel = args.targetLabel || '';
                        const relation = args.relation || 'AUTHORED';
                        const scopeName = args.scopeName || '';

                        const result = await countNodes(resolved, targetLabel, relation, scopeName);
                        if (result) {
                            callGraphResults.push(result);
                            callEvidence.push({
                                id: `graph_${Date.now()}_countNodes_${callIdx}`,
                                subgoalId,
                                toolCallId: subgoalId,
                                sourceType: 'graph',
                                confidence: 0.95,
                                summary: `Count nodes: ${JSON.stringify(result)}`,
                                rawPayload: result,
                                entitiesFound: [resolved],
                                queryExplanation: `graph_count_nodes(entity="${resolved}", targetLabel="${targetLabel}", relation="${relation}")`,
                            });
                        }
                        break;
                    }

                    // ─── Search Entity Candidates ─────────────────────
                    case 'graph_search_candidates': {
                        const searchTerm = args.searchTerm || '';
                        if (!searchTerm) break;

                        const limit = typeof args.limit === 'number' ? args.limit : 5;
                        const result = await searchEntityCandidates(searchTerm, limit);
                        callGraphResults.push({ searchTerm, candidates: result });
                        callEvidence.push({
                            id: `graph_${Date.now()}_searchCandidates_${callIdx}`,
                            subgoalId,
                            toolCallId: subgoalId,
                            sourceType: 'graph',
                            confidence: 0.90,
                            summary: `Search candidates for "${searchTerm}": ${result.length} match(es).`,
                            rawPayload: result,
                            entitiesFound: result.map(c => c.name),
                            queryExplanation: `graph_search_candidates(searchTerm="${searchTerm}", limit=${limit})`,
                        });
                        break;
                    }

                    // ─── Open-Ended Traversal ─────────────────────────
                    case 'graph_traverse': {
                        const specParse = GraphTraversalSpec.safeParse(args);
                        if (!specParse.success) {
                            console.warn(`[graphNode] Invalid graph_traverse spec: ${specParse.error.message}`);
                            break;
                        }
                        const spec = specParse.data;

                        const resolvedEntities = await Promise.all(
                            spec.startEntities.map(resolveEntityName)
                        );
                        callEntities.push(...resolvedEntities);

                        const resolvedSpec = { ...spec, startEntities: resolvedEntities };
                        const result = await executeGraphTraversal(resolvedSpec);

                        callGraphResults.push(result);
                        callEvidence.push({
                            id: `graph_${Date.now()}_traverse_${callIdx}`,
                            subgoalId,
                            toolCallId: subgoalId,
                            sourceType: 'graph',
                            confidence: 0.90,
                            summary: `Traversal from [${resolvedEntities.join(', ')}]: ${result.nodes.length} node(s), ${result.edges.length} edge(s).`,
                            rawPayload: result,
                            entitiesFound: resolvedEntities,
                            queryExplanation: `graph_traverse(startEntities=[${resolvedEntities.join(', ')}], relations=[${spec.relations.join(', ')}], depth=${spec.depth.min}..${spec.depth.max}, direction="${spec.direction}", limit=${spec.limit})`,
                        });
                        break;
                    }

                    // ─── Legacy graph_search (backward compat) ────────
                    case 'graph_search': {
                        const entities = args.entities || [];
                        for (const entityName of entities) {
                            if (!entityName) continue;
                            const resolved = await resolveEntityName(entityName);
                            callEntities.push(resolved);
                            const result = await describeEntity(resolved);
                            if (result) {
                                const resArray = Array.isArray(result) ? result : [result];
                                callGraphResults.push(...resArray);
                                callEvidence.push({
                                    id: `graph_${Date.now()}_legacy_${callIdx}`,
                                    subgoalId,
                                    toolCallId: subgoalId,
                                    sourceType: 'graph',
                                    confidence: 0.90,
                                    summary: `Legacy graph_search for "${resolved}".`,
                                    rawPayload: resArray,
                                    entitiesFound: [resolved],
                                    queryExplanation: `graph_search (legacy) for entity "${resolved}"`,
                                });
                            }
                        }
                        break;
                    }

                    default:
                        console.warn(`[graphNode] Unknown graph tool: ${toolName}`);
                }
            } catch (callErr: any) {
                console.error(`[graphNode] Error executing ${toolName}: ${callErr?.message}`);
            }

            return {
                evidence: callEvidence,
                graphResults: callGraphResults,
                entities: callEntities,
                clarification: callClarification,
            };
        }));

        for (const res of results) {
            if (res.clarification) clarificationQuestion = res.clarification;
            aggregatedGraphResults.push(...res.graphResults);
            newStructuredEvidence.push(...res.evidence);
            for (const ent of res.entities) {
                if (!allResolvedEntities.includes(ent)) allResolvedEntities.push(ent);
            }
        }

        if (clarificationQuestion && aggregatedGraphResults.length === 0) {
            return {
                clarificationQuestion,
                graphResult: state.graphResult,
                pendingTools: remainingPendingTools,
                executedTools,
            };
        }

        const combinedGraphResults = [...state.graphResult, ...aggregatedGraphResults];
        const elapsed = Date.now() - tStart;
        return {
            graphResult: combinedGraphResults,
            structuredEvidence: [...state.structuredEvidence, ...newStructuredEvidence],
            pendingTools: remainingPendingTools,
            executedTools,
            entities: allResolvedEntities,
            clarificationQuestion: clarificationQuestion || state.clarificationQuestion,
            metrics: {
                ...state.metrics,
                toolLatencies: { ...state.metrics?.toolLatencies, graphNode: elapsed },
                toolOrder: [...(state.metrics?.toolOrder || []), 'graphNode'],
            }
        };
    }
    catch (error: any) {
        console.error(`Error While Searching Graph: ${error?.message}`);
        return { graphResult: state.graphResult, pendingTools: remainingPendingTools, executedTools };
    } finally {
        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [graphNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`);
    }
}

/**
 * Formats a list of candidate entities for clarification prompts using distinguishing fields.
 */
export function formatClarificationOptions(candidates: EntityCandidate[]): string {
    const emails = candidates.map(c => c.email).filter((e): e is string => Boolean(e && e.trim()))
    const uniqueEmails = new Set(emails)
    const emailsDiffer = uniqueEmails.size > 1 || (uniqueEmails.size === 1 && emails.length < candidates.length)

    if (emailsDiffer) {
        return candidates.map(c => {
            if (c.email) return `${c.name} (${c.email})`
            if (c.role) return `${c.name} (${c.role})`
            if (c.externalId) return `${c.name} (ID: ...${c.externalId.slice(-6)})`
            return `${c.name} (${c.type})`
        }).join(', ')
    }

    const roles = candidates.map(c => c.role).filter((r): r is string => Boolean(r && r.trim()))
    const uniqueRoles = new Set(roles)
    const rolesDiffer = uniqueRoles.size > 1 || (uniqueRoles.size === 1 && roles.length < candidates.length)

    if (rolesDiffer) {
        return candidates.map(c => {
            if (c.role) return `${c.name} (${c.role})`
            if (c.externalId) return `${c.name} (ID: ...${c.externalId.slice(-6)})`
            return `${c.name} (${c.type})`
        }).join(', ')
    }

    return candidates.map(c => {
        if (c.externalId) return `${c.name} (ID: ...${c.externalId.slice(-6)})`
        return `${c.name} (${c.type})`
    }).join(', ')
}
