import { AgentStateType, StructuredEvidence } from '../state.js'
import { executeGraphAction, GRAPH_ACTIONS, resolveGraphEntity } from '../../../graph/graph.service.js'
import type { EntityCandidate } from '../../../graph/cypher/analysis.cypher.js'

export async function graphNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now()
    const startIso = new Date().toISOString()
    console.log(`[Timing] [graphNode] Started at ${startIso}`)

    const remainingPendingTools = state.pendingTools.filter((tool) => (typeof tool === 'string' ? tool : tool.name) !== 'graph_search')
    const executedTools = [...new Set([...state.executedTools, 'graph_search'])]

    const graphCalls = state.pendingTools.filter((tool) => (typeof tool === 'string' ? tool : tool.name) === 'graph_search')
        .map(tool => typeof tool === 'string' ? { name: 'graph_search', args: { action: state.graphAction, target: state.graphTarget, relation: state.graphRelation, entities: state.entities } } : tool);

    if (graphCalls.length === 0) {
        graphCalls.push({
            name: 'graph_search',
            args: {
                action: state.graphAction,
                target: state.graphTarget,
                relation: state.graphRelation,
                entities: state.entities
            }
        });
    }

    const aggregatedGraphResults: any[] = [];
    const newStructuredEvidence: StructuredEvidence[] = [];
    const allResolvedEntities: string[] = [...state.entities];

    try {
        for (const call of graphCalls) {
            const args = call.args || {};
            const rawAction = args.action || state.graphAction || 'describeEntity';
            const action = GRAPH_ACTIONS.includes(rawAction as typeof GRAPH_ACTIONS[number])
                ? rawAction as typeof GRAPH_ACTIONS[number]
                : 'describeEntity';
            const target = typeof args.target === 'string' ? args.target : (state.graphTarget || '');
            const relation = typeof args.relation === 'string' ? args.relation : (state.graphRelation || '');

            let callEntities: string[] = [];
            if (Array.isArray(args.entities) && args.entities.length > 0) {
                callEntities = args.entities.filter((e): e is string => typeof e === 'string' && Boolean(e.trim()));
            } else if (state.entities.length > 0) {
                callEntities = state.entities;
            } else if (state.vectorResult.length > 0) {
                callEntities = state.vectorResult.flatMap((result: any) => (result.entities ?? []).map((entity: any) => entity.name));
            }

            console.log(`[graphNode] Executing call: action="${action}", target="${target}", relation="${relation}", entities=${JSON.stringify(callEntities)}`);

            if (action === 'countByLabel') {
                const searchTerm = callEntities[0] || '';
                const result = await executeGraphAction('countByLabel', [searchTerm], target, relation);
                if (result != null) {
                    aggregatedGraphResults.push(result);
                    newStructuredEvidence.push({
                        id: `graph_${Date.now()}_count`,
                        sourceType: 'graph',
                        confidence: 0.95,
                        summary: `Graph countByLabel result: ${JSON.stringify(result)}`,
                        rawPayload: result,
                        entitiesFound: callEntities,
                        queryExplanation: `Executed graph countByLabel for label="${target || 'ANY'}", search="${searchTerm}"`,
                    });
                }
                continue;
            }

            if (callEntities.length === 0) continue;

            const resolutions = await Promise.all(callEntities.map((entity) => resolveGraphEntity(entity)));
            const unresolved = resolutions.find((resolution) => !resolution.selected && resolution.candidates.length > 0);
            if (unresolved) {
                const options = formatClarificationOptions(unresolved.candidates);
                return {
                    clarificationQuestion: `I found multiple possible entities: ${options}. Which one do you mean?`,
                    graphResult: state.graphResult,
                    pendingTools: remainingPendingTools,
                    executedTools
                };
            }

            const resolvedNames = resolutions.map((resolution, index) => resolution.selected?.name ?? callEntities[index]).filter((name): name is string => Boolean(name));
            resolvedNames.forEach(n => { if (!allResolvedEntities.includes(n)) allResolvedEntities.push(n); });

            const result = await executeGraphAction(action, resolvedNames, target, relation);
            const resArray = Array.isArray(result) ? result : (result == null ? [] : [result]);
            aggregatedGraphResults.push(...resArray);

            if (resArray.length > 0) {
                newStructuredEvidence.push({
                    id: `graph_${Date.now()}_${action}`,
                    sourceType: 'graph',
                    confidence: 0.95,
                    summary: `Graph action "${action}" returned ${resArray.length} record(s).`,
                    rawPayload: resArray,
                    entitiesFound: resolvedNames,
                    queryExplanation: `Executed graph action "${action}" on entities ${JSON.stringify(resolvedNames)} (target: "${target}", relation: "${relation}")`,
                });
            }
        }

        const combinedGraphResults = [...state.graphResult, ...aggregatedGraphResults];
        const elapsed = Date.now() - tStart;
        return {
            graphResult: combinedGraphResults,
            structuredEvidence: [...state.structuredEvidence, ...newStructuredEvidence],
            pendingTools: remainingPendingTools,
            executedTools,
            entities: allResolvedEntities,
            metrics: {
                ...state.metrics,
                toolLatencies: { ...state.metrics?.toolLatencies, graphNode: elapsed },
                toolOrder: [...(state.metrics?.toolOrder || []), 'graphNode'],
            }
        };
    }
    catch (error: any) {
        console.log(`Error While Searching Graph: ${error?.message}`);
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
