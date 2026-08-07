import { AgentStateType } from "../state.js";
import { calculateKnowledgeRisk } from "../../../analytics/knowledge.service.js";
import { searchEntitiesByProperty } from "../../../database/neo4j/graph.repository.js";

export async function knowledgeRiskNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now()
    const startIso = new Date().toISOString()
    console.log(`[Timing] [knowledgeRiskNode] Started at ${startIso}`)

    const pendingTools = state.pendingTools.filter((tool) => tool !== 'knowledge_risk')
    const executedTools = [...new Set([...state.executedTools, 'knowledge_risk'])]

    try {
        const requestedEntities = state.entities.length > 0 ? state.entities : [];
        if (requestedEntities.length === 0) {
            console.log('[KnowledgeRisk] No person entity found in state.entities')
            return { knowledgeRiskResult: null, pendingTools, executedTools }
        }

        const riskResults = await Promise.all(requestedEntities.map(async (rawPersonName) => {
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
            return await calculateKnowledgeRisk(resolvedName)
        }))

        const knowledgeRiskResult = riskResults.length === 1 ? riskResults[0] : riskResults

        return {
            knowledgeRiskResult,
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
    } finally {
        const elapsed = Date.now() - tStart
        console.log(`[Timing] [knowledgeRiskNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`)
    }
}