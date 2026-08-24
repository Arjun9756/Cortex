import { AgentStateType, StructuredEvidence } from "../state.js";
import { calculateKnowledgeRisk } from "../../../analytics/knowledge.service.js";
import { calculateSuccessorCandidates } from "../../../analytics/successor.service.js";
import { driver } from "../../../../apps/api/config/neo4j.js";
import sql from "../../../../apps/api/config/postgres.js";

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
    const collectedRepoMetrics: any[] = [];

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

    // Helper: fetch repo_metrics for a list of repo names from Postgres
    async function fetchAffectedRepoMetrics(repoNames: string[], ownerFallback: string): Promise<any[]> {
        if (!repoNames || repoNames.length === 0) return [];
        const uniqueRepos = [...new Set(repoNames.map(r => r.trim()).filter(Boolean))];
        const results: any[] = [];

        try {
            const rows = await sql`
                SELECT repo_name, bus_factor, risk_score, contributor_count, status
                FROM repo_metrics
                WHERE lower(repo_name) = ANY(${uniqueRepos.map(r => r.toLowerCase())})
                   OR repo_name ILIKE ANY(${uniqueRepos.map(r => `%${r}%`)})
            `;
            for (const row of rows) {
                results.push({
                    repo_name: row.repo_name,
                    bus_factor: Number(row.bus_factor ?? 1),
                    risk_score: Number(row.risk_score ?? 80),
                    primary_owner: ownerFallback,
                    contributor_count: Number(row.contributor_count ?? 1),
                    status: row.status || 'active',
                    isSPOF: Number(row.bus_factor ?? 1) <= 1
                });
            }
        } catch (err: any) {
            console.warn(`[KnowledgeRisk] SQL repo_metrics query error: ${err?.message}`);
        }

        // Fill in any repos that were not found in the DB table with sensible fallback
        for (const repo of uniqueRepos) {
            if (!results.some(r => r.repo_name.toLowerCase() === repo.toLowerCase())) {
                results.push({
                    repo_name: repo,
                    bus_factor: 1,
                    risk_score: 80,
                    primary_owner: ownerFallback,
                    contributor_count: 1,
                    isSPOF: true
                });
            }
        }
        return results;
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
                    const [risk, succ] = await Promise.all([
                        calculateKnowledgeRisk(name),
                        calculateSuccessorCandidates(name)
                    ]);
                    if (!risk) return null;
                    const affectedRepoMetrics = await fetchAffectedRepoMetrics(succ.targetRepositories, name);
                    for (const rm of affectedRepoMetrics) collectedRepoMetrics.push(rm);

                    return {
                        ...risk,
                        successorRecommendation: succ,
                        successors: succ.candidates,
                        hasSuccessor: succ.hasSuccessor,
                        successorExplanation: succ.explanation,
                        affectedRepositories: affectedRepoMetrics
                    };
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
                    queryExplanation: `Calculated team-wide knowledge departure risk, successor recommendations, and repo metrics for all ${allPersons.length} verified persons`,
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
                        rawPayload: { person: rawPersonName, found: false, totalRisk: null, successors: [], affectedRepositories: [], error: 'Entity does not exist in graph' },
                        entitiesFound: [],
                        queryExplanation: `Attempted departure knowledge risk calculation for "${rawPersonName}", but entity was not found in graph.`,
                    });
                } else {
                    console.log(`[KnowledgeRisk] Call [${subgoalId}]: Calculating risk & successors for verified PERSON "${resolvedName}" (raw: "${rawPersonName}")`);

                    const [riskResult, successorResult] = await Promise.all([
                        calculateKnowledgeRisk(resolvedName),
                        calculateSuccessorCandidates(resolvedName)
                    ]);

                    if (riskResult) {
                        const affectedRepoMetrics = await fetchAffectedRepoMetrics(successorResult.targetRepositories, resolvedName);
                        for (const rm of affectedRepoMetrics) collectedRepoMetrics.push(rm);

                        const enrichedRiskResult = {
                            ...riskResult,
                            successorRecommendation: successorResult,
                            successors: successorResult.candidates,
                            hasSuccessor: successorResult.hasSuccessor,
                            successorExplanation: successorResult.explanation,
                            affectedRepositories: affectedRepoMetrics
                        };
                        collectedRiskResults.push(enrichedRiskResult);

                        const topSuccMsg = successorResult.hasSuccessor && successorResult.candidates.length > 0
                            ? ` Recommended successor: ${successorResult?.candidates[0]?.name} (${successorResult?.candidates[0]?.score}% match).`
                            : ` No successor candidate with overlapping tech/repos found.`;

                        const repoSummary = affectedRepoMetrics.length > 0
                            ? ` Affected repos: ${affectedRepoMetrics.map(r => `${r.repo_name} (Bus Factor: ${r.bus_factor}, Risk: ${r.risk_score}%)`).join(', ')}.`
                            : '';

                        newStructuredEvidence.push({
                            id: `analytics_${Date.now()}_kr_${resolvedName.replace(/\s+/g, '_')}_${callIdx}`,
                            subgoalId,
                            toolCallId: subgoalId,
                            sourceType: 'analytics',
                            confidence: 0.95,
                            summary: `Knowledge risk calculated for ${resolvedName}: ${Math.round((riskResult.totalRisk ?? 0) * 100)}% total risk.${topSuccMsg}${repoSummary}`,
                            rawPayload: enrichedRiskResult,
                            entitiesFound: [resolvedName],
                            queryExplanation: `Calculated departure knowledge risk, successor recommendation, and repo metrics for ${resolvedName}`,
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

        // Merge SQL repo metrics into state.sqlResult so evidenceNode sees repo metrics
        const existingSql = Array.isArray(state.sqlResult) ? state.sqlResult : [];
        const mergedSql = [...existingSql];
        for (const rm of collectedRepoMetrics) {
            if (!mergedSql.some(existing => existing?.repo_name && existing.repo_name.toLowerCase() === rm.repo_name.toLowerCase())) {
                mergedSql.push(rm);
            }
        }

        const finalKRResult = mergedKR.length === 1 ? mergedKR[0] : (mergedKR.length > 0 ? mergedKR : null);
        const elapsed = Date.now() - tStart;

        return {
            knowledgeRiskResult: finalKRResult,
            sqlResult: mergedSql,
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