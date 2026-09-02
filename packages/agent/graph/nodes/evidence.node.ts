import { AgentStateType } from "../state.js";
import { toReadableTimestamp } from "../../../database/neo4j/neo4jUtils.js";

/**
 * Formats knowledge risk for a SINGLE person query (verbose — includes Concrete Evidence JSON).
 */
function formatSingleRiskText(kr: any, compact = false): string {
    if (!kr) return '';

    const totalPct = Math.round((kr.totalRisk ?? 0) * 100);
    const b = kr.breakdown || {};
    const breakdownPct = {
        ownership:    Math.round((b.ownership    ?? 0) * 10),
        dependency:   Math.round((b.dependency   ?? 0) * 10),
        activity:     Math.round((b.activity     ?? 0) * 10),
        documentation:Math.round((b.documentation ?? 0) * 10),
        expertise:    Math.round((b.expertise    ?? 0) * 10),
        pendingWork:  Math.round((b.pendingWork  ?? 0) * 10),
    };

    let successorLine = '';
    if (kr.successors && Array.isArray(kr.successors) && kr.successors.length > 0) {
        const topSucc = kr.successors[0];
        if (compact) {
            // Compact mode for aggregate: just top successor name + score
            successorLine = `Successor: ${topSucc.name} (${topSucc.score}% match, shared techs: [${(topSucc.factors?.sharedTechnologies || []).slice(0, 3).join(', ') || 'none'}])`;
        } else {
            const lines: string[] = [];
            lines.push(`[SUCCESSOR RECOMMENDATION] Best Recommended Successor: ${topSucc.name} (${topSucc.score}% composite match score)`);
            for (const s of kr.successors) {
                lines.push(`  - Candidate: ${s.name} | Score: ${s.score}% (Tech=${s.breakdown?.sharedTechScore ?? 0}%, Repos=${s.breakdown?.sharedRepoScore ?? 0}%, Activity=${s.breakdown?.recentActivityScore ?? 0}%, Capacity=${s.breakdown?.workloadCapacityScore ?? 0}%) | Shared Techs: [${s.factors?.sharedTechnologies?.join(', ') || 'none'}] | Shared Repos: [${s.factors?.sharedRepositories?.join(', ') || 'none'}] | Activity: ${s.factors?.activityStatus || 'active'} | Existing Risk: ${s.factors?.existingKnowledgeRisk ?? 0}% | Rationale: ${s.rationale}`);
            }
            successorLine = lines.join('\n');
        }
    } else if (kr.hasSuccessor === false || (kr.successors && kr.successors.length === 0)) {
        successorLine = `[SUCCESSOR RECOMMENDATION] No candidate with overlapping technologies or repositories was found for ${kr.person}.`;
    }

    let affectedRepoSummary = '';
    if (kr.affectedRepositories && Array.isArray(kr.affectedRepositories) && kr.affectedRepositories.length > 0) {
        if (compact) {
            // Compact mode: single line with repo list
            const spofRepos = kr.affectedRepositories.filter((r: any) => r.bus_factor <= 1).map((r: any) => r.repo_name);
            affectedRepoSummary = spofRepos.length > 0
                ? `SPOF Repos: [${spofRepos.join(', ')}]`
                : `Repos: [${kr.affectedRepositories.slice(0, 3).map((r: any) => r.repo_name).join(', ')}]`;
        } else {
            const lines: string[] = [`[AFFECTED REPOSITORIES & BUS FACTOR] Repositories affected if ${kr.person} departs:`];
            for (const r of kr.affectedRepositories) {
                lines.push(`  - Repository: "${r.repo_name}" | Bus Factor: ${r.bus_factor} (${r.bus_factor <= 1 ? 'SPOF' : 'Normal'}) | Risk: ${r.risk_score}% | Owner: ${r.primary_owner || 'Unknown'} | Contributors: ${r.contributor_count || 1}`);
            }
            affectedRepoSummary = lines.join('\n');
        }
    }

    if (compact) {
        // Compact single-line format for aggregate/team-wide queries
        const parts = [
            `[KNOWLEDGE RISK] ${kr.person}: ${totalPct}% total risk`,
            `(ownership=${breakdownPct.ownership}%, expertise=${breakdownPct.expertise}%, activity=${breakdownPct.activity}%, dependency=${breakdownPct.dependency}%, docs=${breakdownPct.documentation}%, pending=${breakdownPct.pendingWork}%)`,
            `ownedItems=${kr.details?.ownedItems ?? 0}, soleMaintained=${kr.details?.uniqueSkills ?? 0}, recentActivity=${kr.details?.recentActivity ?? 0}`,
        ];
        if (affectedRepoSummary) parts.push(affectedRepoSummary);
        if (successorLine) parts.push(successorLine);
        return parts.join(' | ');
    }

    // Verbose format for single-person queries
    const safeEvidence = kr.evidence ? {
        ownership: (kr.evidence.ownership || []).slice(0, 5).map((e: { name: string; type: string; createdAt?: any }) => ({
            ...e,
            createdAt: e.createdAt ? toReadableTimestamp(e.createdAt) ?? e.createdAt : undefined
        })),
        dependency:    (kr.evidence.dependency || []).slice(0, 5),
        activity: (kr.evidence.activity || []).slice(0, 5).map((e: { name: string; type: string; timestamp?: any }) => ({
            ...e,
            timestamp: e.timestamp ? toReadableTimestamp(e.timestamp) ?? e.timestamp : null
        })),
        documentation: (kr.evidence.documentation || []).slice(0, 5),
        expertise:     (kr.evidence.expertise || []).slice(0, 5),
        pendingWork:   (kr.evidence.pendingWork || []).slice(0, 5),
    } : {};

    return [
        `[KNOWLEDGE RISK] Person: ${kr.person}`,
        `Total Risk: ${totalPct}% (0–100 scale)`,
        `Breakdown (each 0–100%): ownership=${breakdownPct.ownership}%, dependency=${breakdownPct.dependency}%, activity=${breakdownPct.activity}%, documentation=${breakdownPct.documentation}%, expertise=${breakdownPct.expertise}% (sole-maintained items score), pendingWork=${breakdownPct.pendingWork}%`,
        `Details: ownedItems=${kr.details?.ownedItems ?? 0}, criticalDependencies=${kr.details?.criticalDependencies ?? 0}, recentActivity=${kr.details?.recentActivity ?? 0}, documentationGaps=${kr.details?.documentationGaps ?? 0}, soleMaintainedItems=${kr.details?.uniqueSkills ?? kr.details?.soleMaintainedItems ?? 0}, assignedWork=${kr.details?.assignedWork ?? 0}`,
        `Concrete Evidence: ${JSON.stringify(safeEvidence)}`,
        affectedRepoSummary,
        successorLine,
        `Note: "expertise" counts sole-maintained items (commits/PRs/issues with only 1 author), NOT technology node count.`,
    ].filter(Boolean).join('\n');
}

/**
 * Builds the full risk text block for evidence.
 *
 * Strategy for aggregate (team-wide) queries:
 *   - Sort all persons by totalRisk DESC
 *   - Top 3 (highest risk): medium-detail compact format (all 6 factors + SPOF repos + successor)
 *   - Remaining persons: name + total risk % ONLY (1 line each)
 *   This provides full insight where it matters and stays well within free-tier token limits.
 *
 * For single-person queries: verbose format with full Concrete Evidence JSON.
 */
function buildRiskText(kr: AgentStateType['knowledgeRiskResult']): string {
    if (!kr) return '';
    if (Array.isArray(kr)) {
        const sorted = [...kr]
            .filter(item => item != null)
            .sort((a, b) => (b.totalRisk ?? 0) - (a.totalRisk ?? 0));

        const TOP_DETAIL_COUNT = 3;
        const topPersons = sorted.slice(0, TOP_DETAIL_COUNT);
        const restPersons = sorted.slice(TOP_DETAIL_COUNT);

        const topText = topPersons.map(item => formatSingleRiskText(item, true)).join('\n');

        const restText = restPersons.length > 0
            ? '\n[REMAINING TEAM MEMBERS — Summary only]\n' +
              restPersons.map(item => {
                  const pct = Math.round((item.totalRisk ?? 0) * 100);
                  const spofRepos = (item.affectedRepositories || []).filter((r: any) => r.bus_factor <= 1).map((r: any) => r.repo_name);
                  const spofNote = spofRepos.length > 0 ? ` | SPOF Repos: [${spofRepos.join(', ')}]` : '';
                  return `  - ${item.person}: ${pct}% total risk${spofNote}`;
              }).join('\n')
            : '';

        return topText + restText;
    }
    return formatSingleRiskText(kr, false);
}

export function evidenceNode(state: AgentStateType): Partial<AgentStateType> {
    const tStart = Date.now();
    const startIso = new Date().toISOString();
    console.log(`[Timing] [evidenceNode] Started at ${startIso}`);

    try {
        const vectorText = state.vectorResult.map((item) => {
            const metaParts = [`provider: ${item?.provider || 'unknown'}`]
            if (item?.eventId) metaParts.push(`messageId/eventId: ${item.eventId}`)
            if (item?.channel) metaParts.push(`channel: ${item.channel}`)
            if (item?.repository) metaParts.push(`repository: ${item.repository}`)
            if (item?.issueKey) metaParts.push(`issueKey: ${item.issueKey}`)
            if (item?.status) metaParts.push(`status: ${item.status}`)
            if (item?.timestamp) metaParts.push(`timestamp: ${item.timestamp}`)
            if (item?.author) metaParts.push(`author: ${item.author}`)

            return `[${metaParts.join(' | ')}] Summary: ${item?.summary || ''}${item?.text ? ` | Text: "${item.text}"` : ''}`
        }).join('\n');

        const graphText = state.graphResult.map((item) => {
            if (item?.repository && Array.isArray(item?.technologies)) {
                const contribNames = Array.isArray(item.contributors) ? item.contributors.map((c: any) => c.name).filter(Boolean).join(', ') : 'None';
                return `[REPOSITORY TECH & CONTRIBUTORS] Repository: "${item.repository}" | Technologies: [${item.technologies.join(', ') || 'None indexed'}] | Work Items: ${item.workItems ?? 0} | Contributors: [${contribNames}]`;
            }
            return `[GRAPH] ${JSON.stringify(item)}`;
        }).join('\n');

        const sqlText = state.sqlResult.map((item: any) => {
            if (item?.repo_name) {
                return `[REPOSITORY RISK & METRIC] Repo Name: "${item.repo_name}" | Bus Factor: ${item.bus_factor} | Total Risk Score: ${item.risk_score}% | Primary Owner: ${item.primary_owner || 'Unknown'} | Contributors: ${item.contributor_count || 1}`;
            }
            if (item?.engineer) {
                return `[Engineer: ${item.engineer}] [Provider: ${item.provider || 'all'}] Total Activity Events: ${item.event_count || item.count || 1}`;
            }
            if (item?.count) {
                return `[Provider: ${item.provider}] Event Count: ${item.count}`;
            }
            const idStr = item?.id || item?.external_id || 'N/A';
            const providerStr = item?.provider || 'N/A';
            const createdStr = item?.created_at || 'N/A';
            const payloadStr = item?.payload ? JSON.stringify(item.payload) : JSON.stringify(item);
            return `[Event ID: ${idStr}] [${providerStr}] ${payloadStr} (created: ${createdStr})`;
        }).join('\n');

        const riskText = buildRiskText(state.knowledgeRiskResult);

        const clarificationText = state.clarificationQuestion
            ? `\n#PENDING CLARIFICATION\n${state.clarificationQuestion}\nNote: One part of the query could not be resolved. Answer what you can from the evidence above, then include this clarification question for the remaining part.`
            : '';

        const evidence = `
#RELEVANT EVENTS
${vectorText}

#RELEVANT RELATION
${graphText}

#RELEVANT SQL
${sqlText}

#KNOWLEDGE RISK DATA
${riskText}
${clarificationText}
        `.trim();

        // Calculate Subgoal Coverage and Confidence Metrics
        const coveredGoals: string[] = [];
        const missingGoals: string[] = [];

        // Allocate evidence once. "Some graph data exists" must not mark every
        // graph subgoal complete: each ask needs its own returned evidence item.
        const claimedEvidence = new Set<number>();
        for (const subgoal of state.subgoals) {
            const matchingEvidenceIndex = state.structuredEvidence.findIndex((item, index) => {
                if (claimedEvidence.has(index)) return false;
                if (item.subgoalId) return item.subgoalId === subgoal.id;
                if (item.toolCallId) return item.toolCallId === subgoal.id;
                return subgoal.targetSourcePreference.includes(item.sourceType === 'cypher' ? 'graph' : item.sourceType);
            });
            const isCovered = matchingEvidenceIndex >= 0;
            if (isCovered) claimedEvidence.add(matchingEvidenceIndex);

            if (isCovered) {
                coveredGoals.push(subgoal.id);
            } else {
                missingGoals.push(subgoal.id);
            }
        }

        const totalGoalsCount = state.subgoals.length || 1;
        const confidenceScore = state.subgoals.length > 0 ? (coveredGoals.length / totalGoalsCount) : 0.85;

        console.log(`[evidenceNode] Evidence compiled. Goals covered: ${coveredGoals.length}/${totalGoalsCount}, missing=${JSON.stringify(missingGoals)}, Confidence: ${confidenceScore.toFixed(2)}`);

        return {
            evidence,
            coveredGoals,
            missingGoals,
            evidenceConfidence: confidenceScore,
            clarificationQuestion: '',
            metrics: {
                ...state.metrics,
                evidenceConfidence: confidenceScore,
            }
        };
    }
    catch (error: any) {
        console.log("Error in evidenceNode:", error?.message);
        return { evidence: "Error in Cortex Server" };
    } finally {
        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [evidenceNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`);
    }
}
