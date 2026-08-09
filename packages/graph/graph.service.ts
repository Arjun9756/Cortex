import { describeEntity, type EntityCandidate, searchEntityCandidates } from './cypher/analysis.cypher.js'
import { countNodes, countByLabel, dependencyAnalysis, expertiseAnalysis, impactAnalysis, listNodes, listNodesMultiHop, repositorySummary, shortestPath } from './cypher/analysis.cypher.js'

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
        case 'listNodes': {
            const direct = await listNodes(primary, target, relation)
            if (direct.count > 0 && target !== 'TECHNOLOGY') {
                return direct
            }
            // Auto fallback / multi-hop check when 1-hop returns 0 items or for TECHNOLOGY targets
            const multiHop = await listNodesMultiHop(primary, target, relation)
            return multiHop.count > 0 ? multiHop : direct
        }
        case 'shortestPath':
            if (!secondary || primary.trim().toLowerCase() === secondary.trim().toLowerCase()) {
                return [{ nodes: [{ name: primary, type: 'ENTITY' }], relations: [], note: 'Start and end nodes are identical; no distinct path needed.' }];
            }
            return shortestPath(primary, secondary)
        case 'dependencyAnalysis': return dependencyAnalysis(primary)
        case 'impactAnalysis': return impactAnalysis(primary)
        case 'expertiseAnalysis': return expertiseAnalysis(primary)
        case 'repositorySummary': return repositorySummary(primary)
    }
}
