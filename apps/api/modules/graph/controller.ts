import { Request, Response } from 'express'
import { getGraphSubgraph } from '../../../../packages/database/neo4j/graph.repository.js'

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

/**
 * GET /api/graph/visualize
 *
 * Returns a renderable subgraph (nodes + edges) for the Knowledge Graph visualization page.
 *
 * Query params:
 *   - repository       (optional) scope result to one repository neighborhood
 *   - personExternalId (optional) scope result to one person's immediate neighborhood
 *   - limit            (optional, default 100, hard cap 200)
 */
export async function getGraphVisualization(req: Request, res: Response) {
    try {
        const { repository, personExternalId } = req.query

        const rawLimit = parseInt((req.query.limit as string) ?? '', 10)
        const limit = isNaN(rawLimit) || rawLimit <= 0
            ? DEFAULT_LIMIT
            : Math.min(rawLimit, MAX_LIMIT)

        const filters = {
            repository: typeof repository === 'string' && repository.trim() ? repository.trim() : undefined,
            personExternalId: typeof personExternalId === 'string' && personExternalId.trim() ? personExternalId.trim() : undefined,
        }

        const subgraph = await getGraphSubgraph(filters, limit)

        return res.status(200).json({
            status: true,
            nodeCount: subgraph.nodes.length,
            edgeCount: subgraph.edges.length,
            nodes: subgraph.nodes,
            edges: subgraph.edges,
        })
    } catch (error: any) {
        console.error(`[Graph Visualize] Error: ${error?.message}`)
        return res.status(500).json({ status: false, error: 'Internal Server Error' })
    }
}
