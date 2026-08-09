import { AgentStateType } from "../state.js";
import { calculateKnowledgeRisk } from "../../../analytics/knowledge.service.js";
import { searchEntitiesByProperty } from "../../../database/neo4j/graph.repository.js";

export async function knowledgeRiskNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now()
    const startIso = new Date().toISOString()
    console.log(`[Timing] [knowledgeRiskNode] Started at ${startIso}`)

    const remainingPendingTools = state.pendingTools.filter((tool) => (typeof tool === 'string' ? tool : tool.name) !== 'knowledge_risk')
    const executedTools = [...new Set([...state.executedTools, 'knowledge_risk'])]

    const krCalls = state.pendingTools.filter((tool) => (typeof tool === 'string' ? tool : tool.name) === 'knowledge_risk');
    const personNamesSet = new Set<string>(state.entities);
    for (const call of krCalls) {
        if (typeof call !== 'string' && typeof call.args?.personName === 'string' && call.args.personName.trim()) {
            personNamesSet.add(call.args.personName.trim());
        }
    }

    try {
        const requestedEntities = Array.from(personNamesSet);
        if (requestedEntities.length === 0) {
            console.log('[KnowledgeRisk] No person entity found in call args or state.entities');
            return { knowledgeRiskResult: state.knowledgeRiskResult || null, pendingTools: remainingPendingTools, executedTools };
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

        const newKnowledgeRiskResult = riskResults.length === 1 ? riskResults[0] : riskResults
        return {
            knowledgeRiskResult: newKnowledgeRiskResult,
            pendingTools: remainingPendingTools,
            executedTools
        }
    }
    catch (error: any) {
        console.error(`[KnowledgeRisk] Error in knowledgeRiskNode: ${error?.message}`)
        return {
            knowledgeRiskResult: state.knowledgeRiskResult || null,
            pendingTools: remainingPendingTools,
            executedTools
        }
    } finally {
        const elapsed = Date.now() - tStart
        console.log(`[Timing] [knowledgeRiskNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`)
    }
}