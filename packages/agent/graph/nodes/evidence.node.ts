import { AgentStateType } from "../state.js";
import { toReadableTimestamp } from "../../../database/neo4j/neo4jUtils.js";

/**
 * Normalize the knowledgeRiskResult for display before passing to the LLM.
 * - totalRiskPct  : 0-100  (totalRisk × 100)
 * - breakdownPct  : 0-100  (each 0-10 breakdown component × 10)
 *
 * This ensures the LLM is never shown mixed scales in the same evidence block.
 */
function formatSingleRiskText(kr: any): string {
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

    const safeEvidence = kr.evidence ? {
        ownership: (kr.evidence.ownership || []).map((e: { name: string; type: string; createdAt?: any }) => ({
            ...e,
            createdAt: e.createdAt ? toReadableTimestamp(e.createdAt) ?? e.createdAt : undefined
        })),
        dependency:    kr.evidence.dependency || [],
        activity: (kr.evidence.activity || []).map((e: { name: string; type: string; timestamp?: any }) => ({
            ...e,
            timestamp: e.timestamp ? toReadableTimestamp(e.timestamp) ?? e.timestamp : null
        })),
        documentation: kr.evidence.documentation || [],
        expertise:     kr.evidence.expertise || [],
        pendingWork:   kr.evidence.pendingWork || [],
    } : {};

    return [
        `[KNOWLEDGE RISK] Person: ${kr.person}`,
        `Total Risk: ${totalPct}% (0–100 scale)`,
        `Breakdown (each 0–100%): ownership=${breakdownPct.ownership}%, dependency=${breakdownPct.dependency}%, activity=${breakdownPct.activity}%, documentation=${breakdownPct.documentation}%, expertise=${breakdownPct.expertise}% (sole-maintained items score), pendingWork=${breakdownPct.pendingWork}%`,
        `Details: ownedItems=${kr.details?.ownedItems ?? 0}, criticalDependencies=${kr.details?.criticalDependencies ?? 0}, recentActivity=${kr.details?.recentActivity ?? 0}, documentationGaps=${kr.details?.documentationGaps ?? 0}, soleMaintainedItems=${kr.details?.uniqueSkills ?? kr.details?.soleMaintainedItems ?? 0}, assignedWork=${kr.details?.assignedWork ?? 0}`,
        `Concrete Evidence: ${JSON.stringify(safeEvidence)}`,
        `Note on Knowledge Risk "expertise": This metric counts sole-maintained / single-contributor codebase items (commits, PRs, issues, or files with only 1 author). It does NOT count technology node relationships. Technology node usage (e.g. USES -> TECHNOLOGY) is reported separately by graph_search.`,
    ].join('\n');
}

function buildRiskText(kr: AgentStateType['knowledgeRiskResult']): string {
    if (!kr) return '';
    if (Array.isArray(kr)) {
        return kr.map(item => formatSingleRiskText(item)).join('\n\n');
    }
    return formatSingleRiskText(kr);
}

export function evidenceNode(state: AgentStateType): Partial<AgentStateType> {
    const tStart = Date.now()
    const startIso = new Date().toISOString()
    console.log(`[Timing] [evidenceNode] Started at ${startIso}`)

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
        }).join('\n')

        const graphText = state.graphResult.map((item) => `[GRAPH] ${JSON.stringify(item)}`).join('\n')

        const sqlText = state.sqlResult.map((item: any) => {
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
        }).join('\n')

        const riskText = buildRiskText(state.knowledgeRiskResult)

        // FIX 3: Include pending clarification so the answer LLM can address
        // the answerable parts and relay the disambiguation question for the rest
        const clarificationText = state.clarificationQuestion
            ? `\n#PENDING CLARIFICATION\n${state.clarificationQuestion}\nNote: One part of the query could not be resolved. Answer what you can from the evidence above, then include this clarification question for the remaining part.`
            : ''

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
        `.trim()

        console.log("=== FINAL EVIDENCE STRING PASSED TO LLM ===");
        console.log(evidence);

        // Clear clarificationQuestion after consuming it into evidence, so the
        // reflectionNode conditional edge won't re-route to clarifyNode
        return { evidence, clarificationQuestion: '' }
    }
    catch (error: any) {
        console.log("Error in evidenceNode:", error?.message)
        return { evidence: "Error in Cortex Server" }
    } finally {
        const elapsed = Date.now() - tStart
        console.log(`[Timing] [evidenceNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`)
    }
}
