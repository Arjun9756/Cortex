import { AgentStateType } from "../state.js";
import { toReadableTimestamp } from "../../../database/neo4j/neo4jUtils.js";

/**
 * Normalize the knowledgeRiskResult for display before passing to the LLM.
 * - totalRiskPct  : 0-100  (totalRisk × 100)
 * - breakdownPct  : 0-100  (each 0-10 breakdown component × 10)
 *
 * This ensures the LLM is never shown mixed scales in the same evidence block.
 */
function buildRiskText(kr: AgentStateType['knowledgeRiskResult']): string {
    if (!kr) return '';

    const totalPct = Math.round(kr.totalRisk * 100);
    const b = kr.breakdown;
    const breakdownPct = {
        ownership:    Math.round(b.ownership    * 10),
        dependency:   Math.round(b.dependency   * 10),
        activity:     Math.round(b.activity     * 10),
        documentation:Math.round(b.documentation * 10),
        expertise:    Math.round(b.expertise    * 10),
        pendingWork:  Math.round(b.pendingWork  * 10),
    };

    // Convert any raw Neo4j Integer timestamps in evidence arrays
    const safeEvidence = {
        ownership: kr.evidence.ownership.map((e: { name: string; type: string; createdAt?: any }) => ({
            ...e,
            createdAt: e.createdAt ? toReadableTimestamp(e.createdAt) ?? e.createdAt : undefined
        })),
        dependency:    kr.evidence.dependency,
        activity: kr.evidence.activity.map((e: { name: string; type: string; timestamp?: any }) => ({
            ...e,
            timestamp: e.timestamp ? toReadableTimestamp(e.timestamp) ?? e.timestamp : null
        })),
        documentation: kr.evidence.documentation,
        expertise:     kr.evidence.expertise,
        pendingWork:   kr.evidence.pendingWork,
    };

    return [
        `[KNOWLEDGE RISK] Person: ${kr.person}`,
        `Total Risk: ${totalPct}% (0–100 scale)`,
        `Breakdown (each 0–100%): ownership=${breakdownPct.ownership}%, dependency=${breakdownPct.dependency}%, activity=${breakdownPct.activity}%, documentation=${breakdownPct.documentation}%, expertise=${breakdownPct.expertise}%, pendingWork=${breakdownPct.pendingWork}%`,
        `Details: ownedItems=${kr.details.ownedItems}, criticalDependencies=${kr.details.criticalDependencies}, recentActivity=${kr.details.recentActivity}, documentationGaps=${kr.details.documentationGaps}, uniqueSkills=${kr.details.uniqueSkills}, assignedWork=${kr.details.assignedWork}`,
        `Concrete Evidence: ${JSON.stringify(safeEvidence)}`,
    ].join('\n');
}

export function evidenceNode(state: AgentStateType): Partial<AgentStateType> {
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
            return `[Event ID: ${item?.id}] [${item?.provider}] ${JSON.stringify(item?.payload)} (created: ${item?.created_at})`
        }).join('\n')

        const riskText = buildRiskText(state.knowledgeRiskResult)

        const evidence = `
#RELEVANT EVENTS
${vectorText}

#RELEVANT RELATION
${graphText}

#RELEVANT SQL
${sqlText}

#KNOWLEDGE RISK DATA
${riskText}
        `.trim()

        console.log("=== FINAL EVIDENCE STRING PASSED TO LLM ===");
        console.log(evidence);

        return { evidence }
    }
    catch (error: any) {
        console.log("Error in evidenceNode:", error?.message)
        return { evidence: "Error in Cortex Server" }
    }
}
