import { AgentStateType, StructuredEvidence } from "../state.js";
import { calculateKnowledgeRisk } from "../../../analytics/knowledge.service.js";
import { driver } from "../../../../apps/api/config/neo4j.js";

export async function knowledgeRiskNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now();
    const startIso = new Date().toISOString();
    console.log(`[Timing] [knowledgeRiskNode] Started at ${startIso}`);

    const remainingPendingTools = state.pendingTools.filter(
        (tool) => (typeof tool === 'string' ? tool : tool.name) !== 'knowledge_risk'
    );
    const executedTools = [...new Set([...state.executedTools, 'knowledge_risk'])];

    const krCalls = state.pendingTools.filter(
        (tool): tool is Exclude<typeof tool, string> => (typeof tool !== 'string' && tool.name === 'knowledge_risk')
    );

    if (krCalls.length === 0) {
        // Legacy fallback if tool was called as string
        const hasLegacy = state.pendingTools.some(t => (typeof t === 'string' ? t : t.name) === 'knowledge_risk');
        if (!hasLegacy) {
            return { knowledgeRiskResult: state.knowledgeRiskResult || null, pendingTools: remainingPendingTools, executedTools };
        }
        krCalls.push({ name: 'knowledge_risk', args: { personName: 'ALL' } });
    }

    const newStructuredEvidence: StructuredEvidence[] = [];
    const collectedRiskResults: any[] = [];

    // Helper: resolve person name against Neo4j PERSON nodes
    async function resolvePersonName(rawName: string): Promise<string | null> {
        if (!rawName || !rawName.trim()) return null;
        const session = driver.session();
        try {
            const res = await session.run(`
                MATCH (p:PERSON)
                WHERE toLower(p.name) = toLower($name)
                   OR toLower(p.name) CONTAINS toLower($name)
                   OR (p.email IS NOT NULL AND toLower(p.email) CONTAINS toLower($name))
                RETURN p.name AS name
                LIMIT 1
            `, { name: rawName.trim() });
            if (res.records.length > 0 && res.records[0]?.get('name')) {
                return res.records[0].get('name');
            }
        } catch (e: any) {
            console.warn(`[KnowledgeRisk] Error resolving PERSON entity "${rawName}": ${e?.message}`);
        } finally {
            await session.close();
        }
        return null;
    }

    // Helper: fetch all PERSON node names from graph
    async function getAllPersonNames(): Promise<string[]> {
        const session = driver.session();
        try {
            const result = await session.run(`
                MATCH (p:PERSON)
                WHERE p.name IS NOT NULL
                RETURN DISTINCT p.name AS name
                ORDER BY p.name
            `);
            return result.records.map(r => r.get('name')).filter((n): n is string => typeof n === 'string' && Boolean(n.trim()));
        } catch (e: any) {
            console.warn(`[KnowledgeRisk] Failed to query all PERSON nodes: ${e?.message}`);
            return [];
        } finally {
            await session.close();
        }
    }

    try {
        await Promise.all(krCalls.map(async (call, callIdx) => {
            const rawPersonName = typeof call.args?.personName === 'string' ? call.args.personName.trim() : '';
            const subgoalId = call.subgoalId || `subgoal_${callIdx + 1}`;

            const isAll = !rawPersonName || ['ALL', 'EVERYONE', 'EVERY_PERSON', 'EVERY PERSON', 'SYSTEM', 'EVERY ENGINEER', 'ALL ENGINEERS', 'TEAM'].includes(rawPersonName.toUpperCase());

            if (isAll) {
                console.log(`[KnowledgeRisk] Call [${subgoalId}]: Aggregate mode -> querying all PERSON nodes`);
                const allPersons = await getAllPersonNames();
                if (allPersons.length === 0) {
                    console.warn('[KnowledgeRisk] No PERSON nodes found in graph for aggregate knowledge risk');
                    return;
                }

                const teamResults = await Promise.all(allPersons.map(async (name) => {
                    return await calculateKnowledgeRisk(name);
                }));

                for (const res of teamResults) {
                    if (res) collectedRiskResults.push(res);
                }

                newStructuredEvidence.push({
                    id: `analytics_${Date.now()}_kr_all_${callIdx}`,
                    subgoalId,
                    toolCallId: subgoalId,
                    sourceType: 'analytics',
                    confidence: 0.95,
                    summary: `Knowledge risk calculated for all ${allPersons.length} team members: ${allPersons.join(', ')}`,
                    rawPayload: teamResults,
                    entitiesFound: allPersons,
                    queryExplanation: `Calculated team-wide knowledge departure risk for all ${allPersons.length} verified persons`,
                });
            } else {
                const resolvedName = await resolvePersonName(rawPersonName);

                if (!resolvedName) {
                    console.log(`[KnowledgeRisk] Call [${subgoalId}]: Person "${rawPersonName}" not found in knowledge graph.`);
                    newStructuredEvidence.push({
                        id: `analytics_${Date.now()}_kr_notfound_${callIdx}`,
                        subgoalId,
                        toolCallId: subgoalId,
                        sourceType: 'analytics',
                        confidence: 0.95,
                        summary: `No indexed records, person node, or contributions found in the knowledge graph for "${rawPersonName}". Entity does not exist.`,
                        rawPayload: { person: rawPersonName, found: false, totalRisk: null, error: 'Entity does not exist in graph' },
                        entitiesFound: [],
                        queryExplanation: `Attempted departure knowledge risk calculation for "${rawPersonName}", but entity was not found in graph.`,
                    });
                } else {
                    console.log(`[KnowledgeRisk] Call [${subgoalId}]: Calculating risk for verified PERSON "${resolvedName}" (raw: "${rawPersonName}")`);

                    const riskResult = await calculateKnowledgeRisk(resolvedName);
                    if (riskResult) {
                        collectedRiskResults.push(riskResult);
                        newStructuredEvidence.push({
                            id: `analytics_${Date.now()}_kr_${resolvedName.replace(/\s+/g, '_')}_${callIdx}`,
                            subgoalId,
                            toolCallId: subgoalId,
                            sourceType: 'analytics',
                            confidence: 0.95,
                            summary: `Knowledge risk calculated for ${resolvedName}: ${Math.round((riskResult.totalRisk ?? 0) * 100)}% total risk.`,
                            rawPayload: riskResult,
                            entitiesFound: [resolvedName],
                            queryExplanation: `Calculated departure knowledge risk for ${resolvedName}`,
                        });
                    }
                }
            }
        }));

        // Combine existing state results with new results (prevent overwrites)
        let mergedKR: any[] = [];
        if (state.knowledgeRiskResult) {
            mergedKR = Array.isArray(state.knowledgeRiskResult) ? [...state.knowledgeRiskResult] : [state.knowledgeRiskResult];
        }
        for (const r of collectedRiskResults) {
            if (!mergedKR.some(existing => existing?.person === r?.person)) {
                mergedKR.push(r);
            }
        }

        const finalKRResult = mergedKR.length === 1 ? mergedKR[0] : (mergedKR.length > 0 ? mergedKR : null);
        const elapsed = Date.now() - tStart;

        return {
            knowledgeRiskResult: finalKRResult,
            structuredEvidence: [...state.structuredEvidence, ...newStructuredEvidence],
            pendingTools: remainingPendingTools,
            executedTools,
            metrics: {
                ...state.metrics,
                toolLatencies: { ...state.metrics?.toolLatencies, knowledgeRiskNode: elapsed },
                toolOrder: [...(state.metrics?.toolOrder || []), 'knowledgeRiskNode'],
            }
        };
    } catch (error: any) {
        console.error(`[KnowledgeRisk] Error in knowledgeRiskNode: ${error?.message}`);
        return {
            knowledgeRiskResult: state.knowledgeRiskResult || null,
            pendingTools: remainingPendingTools,
            executedTools,
        };
    } finally {
        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [knowledgeRiskNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`);
    }
}