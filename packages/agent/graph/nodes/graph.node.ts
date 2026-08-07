import { AgentStateType } from '../state.js'
import { executeGraphAction, GRAPH_ACTIONS, resolveGraphEntity } from '../../../graph/graph.service.js'
import type { EntityCandidate } from '../../../graph/cypher/analysis.cypher.js'

export async function graphNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now()
    const startIso = new Date().toISOString()
    console.log(`[Timing] [graphNode] Started at ${startIso}`)

    const pendingTools = state.pendingTools.filter((tool) => tool !== 'graph_search')
    const executedTools = [...new Set([...state.executedTools, 'graph_search'])]
    try {
        const action = GRAPH_ACTIONS.includes(state.graphAction as typeof GRAPH_ACTIONS[number]) ? state.graphAction as typeof GRAPH_ACTIONS[number] : 'describeEntity'

        // FIX 1: countByLabel bypasses entity resolution — it's an aggregate query
        if (action === 'countByLabel') {
            const searchTerm = state.entities[0] || ''
            const result = await executeGraphAction('countByLabel', [searchTerm], state.graphTarget, state.graphRelation)
            return { graphResult: result == null ? [] : [result], pendingTools, executedTools }
        }

        const requestedEntities = state.entities.length > 0
            ? state.entities
            : state.vectorResult.flatMap((result: any) => (result.entities ?? []).map((entity: any) => entity.name))
        if (requestedEntities.length === 0) return { graphResult: [], pendingTools, executedTools }

        const resolutions = await Promise.all(requestedEntities.map((entity) => resolveGraphEntity(entity)))
        const unresolved = resolutions.find((resolution) => !resolution.selected && resolution.candidates.length > 0)
        if (unresolved) {
            const options = formatClarificationOptions(unresolved.candidates)
            return { clarificationQuestion: `I found multiple possible entities: ${options}. Which one do you mean?`, graphResult: [], pendingTools, executedTools }
        }

        const resolvedNames = resolutions.map((resolution, index) => resolution.selected?.name ?? requestedEntities[index]).filter((name): name is string => Boolean(name))
        const result = await executeGraphAction(action, resolvedNames, state.graphTarget, state.graphRelation)
        const graphResult = Array.isArray(result) ? result : (result == null ? [] : [result])
        return { graphResult, pendingTools, executedTools, entities: resolvedNames }
    }
    catch (error: any) {
        console.log(`Error While Searching Graph ${error?.message}`)
        return { graphResult: [], pendingTools, executedTools }
    } finally {
        const elapsed = Date.now() - tStart
        console.log(`[Timing] [graphNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`)
    }
}

/**
 * Formats a list of candidate entities for clarification prompts using distinguishing fields.
 * Priority order:
 *   1. Email (if email exists and differs between candidates) -> e.g. "Arjun Kumar (arjun@company.com)"
 *   2. Role (if role exists and differs between candidates) -> e.g. "Arjun Kumar (Software Engineer)"
 *   3. Last 6 characters of externalId -> e.g. "Arjun Kumar (ID: ...582544)"
 *   4. Fallback to candidate type -> e.g. "Arjun Kumar (PERSON)"
 *
 * Note: If ALL fields are identical across candidates, this represents true duplicate data at
 * ingestion time rather than a UI formatting issue.
 */
export function formatClarificationOptions(candidates: EntityCandidate[]): string {
    const emails = candidates.map(c => c.email).filter((e): e is string => Boolean(e && e.trim()))
    const uniqueEmails = new Set(emails)
    const emailsDiffer = uniqueEmails.size > 1 || (uniqueEmails.size === 1 && emails.length < candidates.length)

    if (emailsDiffer) {
        return candidates.map(c => {
            if (c.email) return `${c.name} (${c.email})`
            if (c.role) return `${c.name} (${c.role})`
            if (c.externalId) return `${c.name} (ID: ...${c.externalId.slice(-6)})`
            return `${c.name} (${c.type})`
        }).join(', ')
    }

    const roles = candidates.map(c => c.role).filter((r): r is string => Boolean(r && r.trim()))
    const uniqueRoles = new Set(roles)
    const rolesDiffer = uniqueRoles.size > 1 || (uniqueRoles.size === 1 && roles.length < candidates.length)

    if (rolesDiffer) {
        return candidates.map(c => {
            if (c.role) return `${c.name} (${c.role})`
            if (c.externalId) return `${c.name} (ID: ...${c.externalId.slice(-6)})`
            return `${c.name} (${c.type})`
        }).join(', ')
    }

    return candidates.map(c => {
        if (c.externalId) return `${c.name} (ID: ...${c.externalId.slice(-6)})`
        return `${c.name} (${c.type})`
    }).join(', ')
}
