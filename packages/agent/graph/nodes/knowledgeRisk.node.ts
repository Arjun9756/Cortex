import { AgentStateType } from "../state.js";
import { calculateKnowledgeRisk } from "../../../analytics/knowledge.service.js";
import { searchEntitiesByProperty } from "../../../database/neo4j/graph.repository.js";

export async function knowledgeRiskNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const pendingTools = state.pendingTools.filter((tool) => tool !== 'knowledge_risk')
    const executedTools = [...new Set([...state.executedTools, 'knowledge_risk'])]

    try {
        const rawPersonName = state.entities[0]
        if (!rawPersonName) {
            console.log('[KnowledgeRisk] No person entity found in state.entities')
            return { knowledgeRiskResult: null, pendingTools, executedTools }
        }

        // Targeted property search to resolve entity name safely
        let resolvedName = rawPersonName
        try {
            const candidates = await searchEntitiesByProperty(rawPersonName, 1)
            if (candidates.length > 0 && candidates[0]?.name) {
                resolvedName = candidates[0].name
                console.log(`[KnowledgeRisk] Resolved "${rawPersonName}" -> "${resolvedName}"`)
            }
        } catch (resErr: any) {
            console.warn(`[KnowledgeRisk] Entity resolution failed for "${rawPersonName}", using raw name: ${resErr?.message}`)
        }

        console.log(`[KnowledgeRisk] Calculating risk for: ${resolvedName}`)
        const riskData = await calculateKnowledgeRisk(resolvedName)

        return {
            knowledgeRiskResult: riskData,
            pendingTools,
            executedTools
        }
    }
    catch (error: any) {
        console.error(`[KnowledgeRisk] Error in knowledgeRiskNode: ${error?.message}`)
        return {
            knowledgeRiskResult: null,
            pendingTools,
            executedTools
        }
    }
}