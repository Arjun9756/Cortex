import { AgentStateType } from '../state.js'
import { executeGraphAction, GRAPH_ACTIONS, resolveGraphEntity } from '../../../graph/graph.service.js'
import type { EntityCandidate } from '../../../graph/cypher/analysis.cypher.js'

export async function graphNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const pendingTools = state.pendingTools.filter((tool) => tool !== 'graph_search')
    const executedTools = [...new Set([...state.executedTools, 'graph_search'])]
    try {
        const requestedEntities = state.entities.length > 0
            ? state.entities
            : state.vectorResult.flatMap((result: any) => (result.entities ?? []).map((entity: any) => entity.name))
        if (requestedEntities.length === 0) return { graphResult: [], pendingTools, executedTools }

        const resolutions = await Promise.all(requestedEntities.map((entity) => resolveGraphEntity(entity)))
        const unresolved = resolutions.find((resolution) => !resolution.selected && resolution.candidates.length > 0)
        if (unresolved) {
            const options = unresolved.candidates.map((candidate: EntityCandidate) => `${candidate.name} (${candidate.type})`).join(', ')
            return { clarificationQuestion: `I found multiple possible entities: ${options}. Which one do you mean?`, graphResult: [], pendingTools, executedTools }
        }

        const resolvedNames = resolutions.map((resolution, index) => resolution.selected?.name ?? requestedEntities[index]).filter((name): name is string => Boolean(name))
        const action = GRAPH_ACTIONS.includes(state.graphAction as typeof GRAPH_ACTIONS[number]) ? state.graphAction as typeof GRAPH_ACTIONS[number] : 'describeEntity'
        const result = await executeGraphAction(action, resolvedNames, state.graphTarget, state.graphRelation)
        return { graphResult: result == null ? [] : [result], pendingTools, executedTools, entities: resolvedNames }
    }
    catch (error: any) {
        console.log(`Error While Searching Graph ${error?.message}`)
        return { graphResult: [], pendingTools, executedTools }
    }
}
