import { driver } from '../../../apps/api/config/neo4j.js'

interface GraphSchema {
    nodeLabels: string[]
    relationshipTypes: string[]
    lastUpdated: number
}

let schemaCache: GraphSchema | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Discovers and caches the graph schema to avoid repeated DB calls
 * Caching reduces load on Neo4j and improves response time
 */
export async function getGraphSchema(): Promise<GraphSchema> {
    const now = Date.now()

    // Return cached schema if still valid
    if (schemaCache && (now - schemaCache.lastUpdated) < CACHE_TTL) {
        return schemaCache
    }

    const session = driver.session()

    try {
        // Get all node labels
        const labelsResult = await session.run('CALL db.labels()')
        const nodeLabels = labelsResult.records.map(r => r.get(0) as string)

        // Get all relationship types
        const relsResult = await session.run('CALL db.relationshipTypes()')
        const relationshipTypes = relsResult.records.map(r => r.get(0) as string)

        schemaCache = {
            nodeLabels,
            relationshipTypes,
            lastUpdated: now
        }

        console.log(`[Schema Cache] Updated: ${nodeLabels.length} labels, ${relationshipTypes.length} relations`)

        return schemaCache

    } catch (error: any) {
        console.error('[Schema Cache] Failed to fetch schema:', error.message)

        // Return cached schema even if expired (fallback)
        if (schemaCache) {
            console.warn('[Schema Cache] Using stale cache as fallback')
            return schemaCache
        }

        throw error

    } finally {
        await session.close()
    }
}

/**
 * Manually invalidate the schema cache
 * Call this after schema migrations or significant graph changes
 */
export function invalidateSchemaCache(): void {
    schemaCache = null
    console.log('[Schema Cache] Invalidated')
}

/**
 * Get cache status for debugging
 */
export function getSchemaCacheStatus(): { cached: boolean; age?: number } {
    if (!schemaCache) {
        return { cached: false }
    }

    return {
        cached: true,
        age: Date.now() - schemaCache.lastUpdated
    }
}