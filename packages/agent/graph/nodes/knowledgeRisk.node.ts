import { AgentStateType, StructuredEvidence } from "../state.js";
import { calculateKnowledgeRisk } from "../../../analytics/knowledge.service.js";
import { calculateSuccessorCandidates } from "../../../analytics/successor.service.js";
import { neo4jSession } from "../../../../apps/api/config/neo4j.js";
import sql from "../../../../apps/api/config/postgres.js";
import { isBotAccount, CYPHER_BOT_FILTER } from "../../../shared/botDetection.js";
import { DISPLAYABLE_SOURCES } from '../../../database/provenance.js';

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

    // Helper: resolve person name against Postgres person_metrics/person_identity first, then Neo4j
    async function resolvePersonName(rawName: string): Promise<string | null> {
        if (!rawName || !rawName.trim()) return null;
        const trimmed = rawName.trim();

        // 1. Check Postgres person_metrics (primary source of truth)
        try {
            const [pmRow] = await sql`
                SELECT person_name 
                FROM person_metrics 
                WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}
                  AND (lower(person_name) = lower(${trimmed})
                   OR person_name ILIKE ${'%' + trimmed + '%'})
                ORDER BY 
                    CASE WHEN lower(person_name) = lower(${trimmed}) THEN 0 ELSE 1 END,
                    commit_count DESC
                LIMIT 1
            `;
            if (pmRow?.person_name) return pmRow.person_name;

            const [idRow] = await sql`
                SELECT display_name 
                FROM person_identity 
                WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}
                  AND (lower(display_name) = lower(${trimmed}) OR display_name ILIKE ${'%' + trimmed + '%'})
                  AND display_name IS NOT NULL
                  AND display_name !~* '^U[A-Z0-9]{6,}$'
                ORDER BY 
                    CASE WHEN lower(display_name) = lower(${trimmed}) THEN 0 ELSE 1 END
                LIMIT 1
            `;
            if (idRow?.display_name) return idRow.display_name;
        } catch (dbErr: any) {
            console.warn(`[KnowledgeRisk] Postgres name resolution warning: ${dbErr?.message}`);
        }

        // 2. Fallback to Neo4j PERSON nodes
        const session = neo4jSession();
        try {
            const res = await session.run(`
                MATCH (p:PERSON)
                WHERE toLower(p.name) = toLower($name)
                   OR toLower(p.name) CONTAINS toLower($name)
                   OR (p.email IS NOT NULL AND toLower(p.email) CONTAINS toLower($name))
                RETURN p.name AS name
                LIMIT 1
            `, { name: trimmed });
            if (res.records.length > 0 && res.records[0]?.get('name')) {
                return res.records[0].get('name');
            }
        } catch (e: any) {
            console.warn(`[KnowledgeRisk] Error resolving PERSON entity "${trimmed}": ${e?.message}`);
        } finally {
            await session.close();
        }
        return null;
    }

    // Helper: fetch all PERSON node names from person_metrics with Neo4j fallback (excludes bots, Slack user IDs, and alumni)
    async function getAllPersonNames(): Promise<string[]> {
        try {
            const rows = await sql`
                SELECT DISTINCT person_name
                FROM person_metrics
                WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}
                  AND person_name IS NOT NULL
                  AND person_name != ''
                  AND NOT person_name ~ '^U[A-Z0-9]{6,}$'
                  AND (is_active IS NULL OR is_active = true)
                ORDER BY person_name
            `;
            const names = rows.map(r => r.person_name).filter((n): n is string => typeof n === 'string' && Boolean(n.trim()) && !isBotAccount(n));
            if (names.length > 0) {
                return names;
            }
        } catch (e: any) {
            console.warn(`[KnowledgeRisk] person_metrics lookup failed: ${e?.message}`);
        }

        const session = neo4jSession();
        try {
            const result = await session.run(`
                MATCH (p:PERSON)
                WHERE p.name IS NOT NULL
                  AND NOT p.name =~ '^U[A-Z0-9]{6,}$'
                  AND ${CYPHER_BOT_FILTER}
                  AND COALESCE(p.isActive, true) = true
                  AND COALESCE(p.employmentStatus, 'active') <> 'alumni'
                RETURN DISTINCT p.name AS name
                ORDER BY p.name
            `);
            return result.records.map(r => r.get('name')).filter((n): n is string => typeof n === 'string' && Boolean(n.trim()) && !isBotAccount(n));
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
                SELECT repo_name, bus_factor, risk_score, contributor_count, primary_owner, status
                FROM repo_metrics
                WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}
                  AND (lower(repo_name) = ANY(${uniqueRepos.map(r => r.toLowerCase())})
                   OR repo_name ILIKE ANY(${uniqueRepos.map(r => `%${r}%`)}))
            `;
            for (const row of rows) {
                results.push({
                    repo_name: row.repo_name,
                    bus_factor: Number(row.bus_factor ?? 1),
                    risk_score: Number(row.risk_score ?? 80),
                    // Prefer stored primary_owner from DB; fall back to ownerFallback only if null
                    primary_owner: row.primary_owner || ownerFallback,
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

                    let riskResult: any = null;
                    let successorResult: any = null;

                    try {
                        [riskResult, successorResult] = await Promise.all([
                            calculateKnowledgeRisk(resolvedName).catch(e => {
                                console.warn(`[KnowledgeRisk] calculateKnowledgeRisk error for ${resolvedName}:`, e?.message);
                                return null;
                            }),
                            calculateSuccessorCandidates(resolvedName).catch(e => {
                                console.warn(`[KnowledgeRisk] calculateSuccessorCandidates error for ${resolvedName}:`, e?.message);
                                return null;
                            })
                        ]);
                    } catch (calcErr: any) {
                        console.warn(`[KnowledgeRisk] Calculation warning for ${resolvedName}:`, calcErr?.message);
                    }

                    // Fallback to PostgreSQL person_metrics if graph calculation was partial/empty
                    const [pmPerson] = await sql`
                        SELECT person_name, external_id, risk_score, repos, top_technologies, commit_count
                        FROM person_metrics
                        WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}
                          AND (lower(person_name) = lower(${resolvedName}) OR person_name ILIKE ${'%' + resolvedName + '%'})
                        LIMIT 1
                    `;

                    if (!riskResult && pmPerson) {
                        riskResult = {
                            person: pmPerson.person_name,
                            totalRisk: Number(pmPerson.risk_score ?? 0) / 100,
                            breakdown: {
                                ownership: 5,
                                dependency: 4,
                                activity: Math.min(Number(pmPerson.commit_count ?? 1), 10),
                                documentation: 5,
                                expertise: 6,
                                pendingWork: 4
                            },
                            details: {
                                ownedItems: Array.isArray(pmPerson.repos) ? pmPerson.repos.length : 1,
                                criticalDependencies: 1,
                                recentActivity: pmPerson.commit_count ?? 0,
                                documentationGaps: 1,
                                soleMaintainedItems: 1,
                                assignedWork: 1
                            },
                            evidence: {}
                        };
                    }

                    // If successorResult has no candidates, compute candidates directly from person_metrics
                    if ((!successorResult || !successorResult.candidates || successorResult.candidates.length === 0) && pmPerson) {
                        try {
                            const allPMRows = await sql`
                                SELECT person_name, external_id, risk_score, repos, top_technologies, commit_count
                                FROM person_metrics
                                WHERE source IN ${sql([...DISPLAYABLE_SOURCES])}
                                  AND lower(person_name) <> lower(${pmPerson.person_name})
                                  AND person_name !~* '^U[A-Z0-9]{6,}$'
                            `;

                            const targetTechs = new Set<string>((Array.isArray(pmPerson.top_technologies) ? pmPerson.top_technologies : []).map((t: any) => (typeof t === 'string' ? t : (t?.name || t?.tech || '')).toLowerCase()).filter(Boolean));
                            const targetRepos = new Set<string>((Array.isArray(pmPerson.repos) ? pmPerson.repos : []).map((r: string) => r.toLowerCase().trim()).filter(Boolean));

                            const computedCandidates: any[] = [];
                            for (const cand of allPMRows) {
                                const candTechs = (Array.isArray(cand.top_technologies) ? cand.top_technologies : []).map((t: any) => (typeof t === 'string' ? t : (t?.name || t?.tech || '')).toLowerCase()).filter(Boolean);
                                const candRepos = (Array.isArray(cand.repos) ? cand.repos : []).map((r: string) => r.toLowerCase().trim()).filter(Boolean);

                                const sharedTechs = candTechs.filter((t: string) => targetTechs.has(t));
                                const sharedRepos = candRepos.filter((r: string) => targetRepos.has(r));

                                const techScore = targetTechs.size > 0 ? Math.round((sharedTechs.length / Math.max(targetTechs.size, 1)) * 100) : 50;
                                const repoScore = targetRepos.size > 0 ? Math.round((sharedRepos.length / Math.max(targetRepos.size, 1)) * 100) : 40;
                                const activityScore = Math.min(Number(cand.commit_count ?? 1) * 20, 100);
                                const capacityScore = Math.max(0, Math.round((1 - (Number(cand.risk_score ?? 30) / 100)) * 100));

                                const composite = Math.round(techScore * 0.40 + repoScore * 0.25 + activityScore * 0.20 + capacityScore * 0.15);

                                if (composite > 0 || sharedTechs.length > 0 || sharedRepos.length > 0) {
                                    computedCandidates.push({
                                        name: cand.person_name,
                                        score: composite,
                                        category: composite >= 50 ? 'recommended_successor' : 'cross_training_candidate',
                                        isOverloaded: Number(cand.risk_score ?? 0) >= 60,
                                        breakdown: {
                                            sharedTechScore: techScore,
                                            sharedRepoScore: repoScore,
                                            recentActivityScore: activityScore,
                                            workloadCapacityScore: capacityScore
                                        },
                                        factors: {
                                            sharedTechnologies: sharedTechs,
                                            targetTechnologies: Array.from(targetTechs),
                                            candidateTechnologies: candTechs,
                                            sharedRepositories: sharedRepos,
                                            targetRepositories: Array.from(targetRepos),
                                            candidateRepositories: candRepos,
                                            existingKnowledgeRisk: Number(cand.risk_score ?? 0),
                                            spofReposCount: 0
                                        },
                                        rationale: `Shared ${sharedTechs.length} technologies [${sharedTechs.join(', ')}] and ${sharedRepos.length} repositories [${sharedRepos.join(', ')}] with ${composite}% match score.`
                                    });
                                }
                            }

                            computedCandidates.sort((a, b) => b.score - a.score);

                            successorResult = {
                                person: resolvedName,
                                hasSuccessor: computedCandidates.length > 0,
                                targetTechnologies: Array.from(targetTechs),
                                targetRepositories: Array.from(targetRepos),
                                candidates: computedCandidates,
                                explanation: computedCandidates.length > 0 
                                    ? `Found ${computedCandidates.length} successor candidates for ${resolvedName} based on tech and repo alignment.`
                                    : `No overlapping successor candidates found for ${resolvedName}.`
                            };
                        } catch (succErr: any) {
                            console.warn(`[KnowledgeRisk] Successor fallback warning: ${succErr?.message}`);
                        }
                    }

                    if (riskResult) {
                        const targetRepos = (successorResult?.targetRepositories && successorResult.targetRepositories.length > 0)
                            ? successorResult.targetRepositories
                            : (Array.isArray(pmPerson?.repos) ? pmPerson.repos : []);

                        const affectedRepoMetrics = await fetchAffectedRepoMetrics(targetRepos, resolvedName);
                        for (const rm of affectedRepoMetrics) collectedRepoMetrics.push(rm);

                        const enrichedRiskResult = {
                            ...riskResult,
                            successorRecommendation: successorResult || { person: resolvedName, hasSuccessor: false, candidates: [], explanation: 'None' },
                            successors: successorResult?.candidates || [],
                            hasSuccessor: Boolean(successorResult?.hasSuccessor),
                            successorExplanation: successorResult?.explanation || '',
                            affectedRepositories: affectedRepoMetrics
                        };
                        collectedRiskResults.push(enrichedRiskResult);

                        const topSuccMsg = enrichedRiskResult.hasSuccessor && enrichedRiskResult.successors.length > 0
                            ? ` Recommended successor: ${enrichedRiskResult.successors[0]?.name} (${enrichedRiskResult.successors[0]?.score}% match).`
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
