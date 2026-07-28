import { describeEntity, type EntityCandidate, searchEntityCandidates } from './cypher/analysis.cypher.js'
import { countNodes, dependencyAnalysis, expertiseAnalysis, impactAnalysis, listNodes, repositorySummary, shortestPath } from './cypher/analysis.cypher.js'

export const GRAPH_ACTIONS = [
    'describeEntity', 'countNodes', 'listNodes', 'shortestPath',
    'dependencyAnalysis', 'impactAnalysis', 'expertiseAnalysis', 'repositorySummary',
] as const

export type GraphAction = typeof GRAPH_ACTIONS[number]

export async function resolveGraphEntity(name: string) {
    const candidates = await searchEntityCandidates(name)
    const exact = candidates.filter((candidate: EntityCandidate) => candidate.name.toLowerCase() === name.toLowerCase())
    return { selected: exact.length === 1 ? exact[0] : undefined, candidates }
}

export async function executeGraphAction(action: GraphAction, entities: string[], target = '', relation = '') {
    const [primary, secondary] = entities
    if (!primary) return null

    switch (action) {
        case 'describeEntity': return describeEntity(primary)
        case 'countNodes': return countNodes(primary, target, 'AUTHORED', secondary)
        case 'listNodes': return listNodes(primary, target, relation)
        case 'shortestPath': return secondary ? shortestPath(primary, secondary) : null
        case 'dependencyAnalysis': return dependencyAnalysis(primary)
        case 'impactAnalysis': return impactAnalysis(primary)
        case 'expertiseAnalysis': return expertiseAnalysis(primary)
        case 'repositorySummary': return repositorySummary(primary)
    }
}
