import { describeEntity, type EntityCandidate, searchEntityCandidates } from './cypher/analysis.cypher.js'
import { countNodes, countByLabel, dependencyAnalysis, expertiseAnalysis, impactAnalysis, listNodes, repositorySummary, shortestPath } from './cypher/analysis.cypher.js'

export const GRAPH_ACTIONS = [
    'describeEntity', 'countNodes', 'countByLabel', 'listNodes', 'shortestPath',
    'dependencyAnalysis', 'impactAnalysis', 'expertiseAnalysis', 'repositorySummary',
] as const

export type GraphAction = typeof GRAPH_ACTIONS[number]

export async function resolveGraphEntity(name: string) {
    const candidates = await searchEntityCandidates(name)
    const exact = candidates.filter((candidate: EntityCandidate) => candidate.name.toLowerCase() === name.toLowerCase())
    if (exact.length === 1) {
        return { selected: exact[0], candidates }
    }
    // If only 1 candidate matches (e.g. "arjun" -> "Arjun Kumar"), auto-select it instead of asking clarification
    if (candidates.length === 1) {
        return { selected: candidates[0], candidates }
    }
    return { selected: undefined, candidates }
}

export async function executeGraphAction(action: GraphAction, entities: string[], target = '', relation = '') {
    const [primary, secondary] = entities

    // countByLabel allows empty primary (searchTerm), so handle before null guard
    if (action === 'countByLabel') return countByLabel(primary ?? '', target)
    if (!primary) return null

    switch (action) {
        case 'describeEntity':
            if (entities.length > 1) {
                const results = await Promise.all(entities.map((e) => describeEntity(e)))
                return results.filter(Boolean)
            }
            return describeEntity(primary)
        case 'countNodes': return countNodes(primary, target, 'AUTHORED', secondary)
        case 'listNodes': return listNodes(primary, target, relation)
        case 'shortestPath': return secondary ? shortestPath(primary, secondary) : null
        case 'dependencyAnalysis': return dependencyAnalysis(primary)
        case 'impactAnalysis': return impactAnalysis(primary)
        case 'expertiseAnalysis': return expertiseAnalysis(primary)
        case 'repositorySummary': return repositorySummary(primary)
    }
}
