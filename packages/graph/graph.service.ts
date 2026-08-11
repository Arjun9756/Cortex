import { describeEntity, type EntityCandidate, searchEntityCandidates } from './cypher/analysis.cypher.js'
import { countNodes, countByLabel, dependencyAnalysis, expertiseAnalysis, impactAnalysis, listNodes, listNodesMultiHop, repositorySummary, shortestPath } from './cypher/analysis.cypher.js'

export const GRAPH_ACTIONS = [
    'describeEntity', 'countNodes', 'countByLabel', 'listNodes', 'shortestPath',
    'dependencyAnalysis', 'impactAnalysis', 'expertiseAnalysis', 'repositorySummary',
] as const

export type GraphAction = typeof GRAPH_ACTIONS[number]

export async function resolveGraphEntity(name: string) {
    const candidates = await searchEntityCandidates(name)
    if (candidates.length === 0) {
        return { selected: undefined, candidates: [] }
    }

    const trimmedLower = name.trim().toLowerCase()
    const exact = candidates.filter((candidate: EntityCandidate) => candidate.name.toLowerCase() === trimmedLower)

    if (exact.length >= 1) {
        // Prefer TECHNOLOGY, REPOSITORY, PERSON over FILE or COMMIT
        const preferred = exact.find((c: EntityCandidate) => ['TECHNOLOGY', 'REPOSITORY', 'PERSON'].includes(c.type?.toUpperCase())) || exact[0];
        return { selected: preferred, candidates };
    }

    if (candidates.length === 1) {
        return { selected: candidates[0], candidates }
    }

    // Heuristic fallback: Prefer non-FILE, non-COMMIT candidates over generic file paths
    const nonFileCandidates = candidates.filter((c: EntityCandidate) => c.type?.toUpperCase() !== 'FILE' && c.type?.toUpperCase() !== 'COMMIT');
    if (nonFileCandidates.length > 0) {
        return { selected: nonFileCandidates[0], candidates };
    }

    return { selected: candidates[0], candidates }
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
