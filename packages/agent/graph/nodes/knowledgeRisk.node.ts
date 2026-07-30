import { AgentStateType } from "../state.js";
import { calculateKnowledgeRisk } from "../../../analytics/knowledge.service.js";

export async function knowledgeRiskNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const pendingTools = state.pendingTools.filter((tool) => tool !== 'knowledge_risk')
    const executedTools = [...new Set([...state.executedTools, 'knowledge_risk'])]

    try {
        const personName = state.entities[0]
        if (!personName) {
            console.log('[KnowledgeRisk] No person entity found')
            return { knowledgeRiskResult: null, pendingTools, executedTools }
        }

        console.log(`[KnowledgeRisk] Calculating risk for: ${personName}`)
        const riskData = await calculateKnowledgeRisk(personName)

        return {
            knowledgeRiskResult: riskData,
            pendingTools,
            executedTools
        }
    }
    catch (error: any) {
        console.error(`[KnowledgeRisk] Error: ${error?.message}`)
        return {
            knowledgeRiskResult: null,
            pendingTools,
            executedTools
        }
    }
}