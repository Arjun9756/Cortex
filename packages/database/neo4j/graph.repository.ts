import { driver } from '../../../apps/api/config/neo4j.js'
import neo4j from 'neo4j-driver'

/**
 * Ensures indexes exist for fast property-based entity lookups.
 * Safe to call on every boot — uses IF NOT EXISTS.
 * Fixes Neo4j Cypher 5 syntax requirement: label must be specified for property index ON (n:LABEL).
 */
export async function ensureIndexes(): Promise<void> {
    const session = driver.session()
    try {
        await session.run(`CREATE INDEX entity_person_email IF NOT EXISTS FOR (n:PERSON) ON (n.email)`)
        await session.run(`CREATE INDEX entity_person_externalid IF NOT EXISTS FOR (n:PERSON) ON (n.externalId)`)
        await session.run(`CREATE INDEX entity_repo_externalid IF NOT EXISTS FOR (n:REPOSITORY) ON (n.externalId)`)
        await session.run(`CREATE INDEX entity_person_name IF NOT EXISTS FOR (n:PERSON) ON (n.name)`)
        console.log('[Graph] Neo4j indexes ensured (PERSON: name, email, externalId; REPOSITORY: externalId)')
    } catch (error: any) {
        console.error('[Graph] Failed to ensure indexes:', error.message)
    } finally {
        await session.close()
    }
}

/**
 * Upsert an entity node into Neo4j with multi-property identity resolution.
 * For PERSON entities, matches on email OR name to prevent duplicate nodes
 * across different providers (e.g. GitHub "Arjun" vs Jira "Arjun Kumar").
 *
 * @param name             Display name — the fallback key
 * @param type             Node label (e.g. PERSON, REPOSITORY)
 * @param extraProperties  Optional { email, role, externalId, avatarUrl }
 */
export async function upsertEntity(
    name: string,
    type: string,
    extraProperties?: Record<string, any>
): Promise<string | undefined> {
    const session = driver.session()
    try {
        // Build dynamic SET clauses for non-null extra properties
        const setParts: string[] = []
        const params: Record<string, any> = { name }

        if (extraProperties) {
            for (const [key, value] of Object.entries(extraProperties)) {
                if (value !== null && value !== undefined && key !== 'name' && key !== 'type') {
                    const paramKey = `extra_${key}`
                    setParts.push(`e.${key} = $${paramKey}`)
                    params[paramKey] = value
                }
            }
        }

        const extraSetClause = setParts.length > 0 ? `, ${setParts.join(', ')}` : ''

        let result;
        if (type === 'PERSON') {
            let matchedId: string | null = null;

            // Step 1: Match by Email if present
            if (extraProperties?.email) {
                params.email = extraProperties.email;
                const emailMatch = await session.run(`
                    MATCH (e:PERSON)
                    WHERE e.email IS NOT NULL AND e.email = $email
                    RETURN elementId(e) AS id LIMIT 1
                `, params);
                if (emailMatch.records.length > 0) {
                    matchedId = emailMatch.records[0].get('id');
                }
            }

            // Step 2: Match by externalId if present and no email match
            if (!matchedId && extraProperties?.externalId) {
                params.externalId = extraProperties.externalId;
                const extMatch = await session.run(`
                    MATCH (e:PERSON)
                    WHERE e.externalId IS NOT NULL AND e.externalId = $externalId
                    RETURN elementId(e) AS id LIMIT 1
                `, params);
                if (extMatch.records.length > 0) {
                    matchedId = extMatch.records[0].get('id');
                }
            }

            // Step 3: Match by exact case-insensitive Name if still no match
            if (!matchedId) {
                const nameMatch = await session.run(`
                    MATCH (e:PERSON)
                    WHERE toLower(e.name) = toLower($name)
                    RETURN elementId(e) AS id LIMIT 1
                `, params);
                if (nameMatch.records.length > 0) {
                    matchedId = nameMatch.records[0].get('id');
                }
            }

            // Update existing or Merge new
            if (matchedId) {
                params.id = matchedId;
                result = await session.run(`
                    MATCH (e:PERSON) WHERE elementId(e) = $id
                    SET e.name = $name, e.updatedAt = timestamp()${extraSetClause}
                    RETURN elementId(e) AS id
                `, params);
            } else if (extraProperties?.email) {
                result = await session.run(`
                    MERGE (e:PERSON {email: $email})
                    ON CREATE SET e.name = $name, e.createdAt = timestamp()${extraSetClause}
                    ON MATCH SET e.name = $name, e.updatedAt = timestamp()${extraSetClause}
                    RETURN elementId(e) AS id
                `, params);
            } else {
                result = await session.run(`
                    MERGE (e:PERSON {name: $name})
                    ON CREATE SET e.createdAt = timestamp()${extraSetClause}
                    ON MATCH SET e.updatedAt = timestamp()${extraSetClause}
                    RETURN elementId(e) AS id
                `, params);
            }
        } else {
            result = await session.run(`
                MERGE (e:${type} {name: $name})
                ON CREATE SET e.createdAt = timestamp()${extraSetClause}
                ON MATCH SET e.updatedAt = timestamp()${extraSetClause}
                RETURN elementId(e) AS id
            `, params)
        }

        return result.records[0]?.get("id")
    }
    catch (error: any) {
        console.log(`Error While Upsert of Entity in Graph: ${error?.message}`)
    }
    finally {
        await session.close()
    }
}

export async function upsertRelation(fromID: string, toID: string, type: string, evidence?: string) {
    const session = driver.session()
    console.log(`Upsert Relation ${evidence}`)
    try {
        const result = await session.run(`
            MATCH (a) where elementId(a) = $fromID
            MATCH(b) where elementId(b) = $toID
            MERGE (a)-[r:${type}]->(b)
            ON CREATE SET r.createdAt = timestamp(), r.evidence = $evidence
            ON MATCH SET r.updatedAt = timestamp() , r.evidence = $evidence 
        ` , { fromID, toID, evidence: evidence ?? null })
    }
    catch (error: any) {
        console.log(`Error While Upsert of Relation in Graph ${error?.message}`)
    }
    finally {
        await session.close()
    }
}

export async function getUsedRelationship() {
    const session = driver.session()
    try {
        const result = await session.run(`CALL db.relationshipTypes()`)
        return result.records.map((r) => {
            return r.get('relationshipType')
        })
    }
    catch (error: any) {
        console.log(`Error While Fetching Relationships From Neo4j ${error}`)
    }
    finally {
        await session.close()
    }
}

export async function getExistingEntityName(limit: number = 50) {
    const session = driver.session()
    try {
        const result = await session.run(`
            MATCH (e) RETURN e.name as name , labels(e)[0] as type LIMIT $limit
        ` , { limit: neo4j.int(limit) })

        return result.records.map((e) => {
            return { name: e.get('name'), type: e.get('type') }
        })
    }
    catch (error: any) {
        console.log(`Error While Fetching Relationships From Neo4j ${error.message}`)
    }
    finally {
        await session.close()
    }
}

export async function getUsedEntityLabels(): Promise<string[]> {
    const session = driver.session()
    try {
        const result = await session.run(`CALL db.labels()`)
        return result.records.map((item) => item.get('label'))
    }
    catch (error: any) {
        console.log("Error While Fetching The Labels From Graph DB")
        return []
    }
    finally {
        await session.close()
    }
}

/**
 * Searches entities by name, email, OR externalId using a single CONTAINS query.
 * This replaces name-only search so queries like "who is arjun@cortex.io" resolve correctly.
 *
 * @param searchTerm  Raw string from planner output (could be name, email, or externalId fragment)
 * @param limit       Max candidates to return (default 5)
 */
export async function searchEntitiesByProperty(
    searchTerm: string,
    limit = 5
): Promise<Array<{ name: string; type: string; email: string | null; externalId: string | null }>> {
    const session = driver.session()
    try {
        const result = await session.run(`
            MATCH (n)
            WHERE toLower(n.name) CONTAINS toLower($searchTerm)
               OR (n.email IS NOT NULL AND toLower(n.email) CONTAINS toLower($searchTerm))
               OR (n.externalId IS NOT NULL AND toLower(n.externalId) CONTAINS toLower($searchTerm))
            RETURN n.name AS name, labels(n)[0] AS type,
                   n.email AS email, n.externalId AS externalId
            ORDER BY
                CASE WHEN toLower(n.name) = toLower($searchTerm) THEN 0 ELSE 1 END,
                n.name
            LIMIT $limit
        `, { searchTerm, limit: neo4j.int(limit) })

        return result.records.map((r) => ({
            name: r.get('name') as string,
            type: r.get('type') as string,
            email: r.get('email') as string | null,
            externalId: r.get('externalId') as string | null,
        }))
    } catch (error: any) {
        console.log(`Error While Searching Entities By Property: ${error?.message}`)
        return []
    } finally {
        await session.close()
    }
}

// ─── Graph Visualization ──────────────────────────────────────────────────────

export interface GraphNode {
    id: string
    type: string
    externalId: string | null
}

export interface GraphEdge {
    source: string
    target: string
    relation: string
}

export interface GraphSubgraph {
    nodes: GraphNode[]
    edges: GraphEdge[]
}

export interface GraphSubgraphFilters {
    repository?: string | undefined
    personExternalId?: string | undefined
}

/**
 * Returns a renderable subgraph (nodes + edges) for the Knowledge Graph visualization page.
 * This is a live, real-time Neo4j query — NOT cron-precomputed.
 *
 * Scoping:
 *   - No filters: returns a representative sample of the entire graph
 *   - repository: returns only nodes + edges connected to that REPOSITORY node
 *   - personExternalId: returns the immediate neighborhood of that PERSON node
 *
 * Hard cap of 200 nodes enforced regardless of caller-supplied limit.
 */
export async function getGraphSubgraph(
    filters: GraphSubgraphFilters,
    limit: number
): Promise<GraphSubgraph> {
    const cappedLimit = Math.min(limit, 200)
    const session = driver.session()

    try {
        let cypher: string
        const params: Record<string, any> = { limit: neo4j.int(cappedLimit) }

        if (filters.repository) {
            cypher = `
                MATCH (repo:REPOSITORY)
                WHERE toLower(repo.name) = toLower($repository)
                MATCH (n)-[r]-(m)
                WHERE (n)-[:PART_OF|AUTHORED|WORKS_ON|CREATED|MENTIONED_IN*1..2]-(repo)
                   OR n = repo OR m = repo
                RETURN DISTINCT
                    n.name AS sourceName, labels(n)[0] AS sourceType, n.externalId AS sourceExtId,
                    m.name AS targetName, labels(m)[0] AS targetType, m.externalId AS targetExtId,
                    type(r) AS relation
                LIMIT $limit
            `
            params.repository = filters.repository
        } else if (filters.personExternalId) {
            cypher = `
                MATCH (person:PERSON)
                WHERE person.externalId = $personExternalId
                MATCH (person)-[r]-(neighbor)
                RETURN DISTINCT
                    person.name AS sourceName, labels(person)[0] AS sourceType, person.externalId AS sourceExtId,
                    neighbor.name AS targetName, labels(neighbor)[0] AS targetType, neighbor.externalId AS targetExtId,
                    type(r) AS relation
                LIMIT $limit
            `
            params.personExternalId = filters.personExternalId
        } else {
            cypher = `
                MATCH (n)-[r]-(m)
                RETURN DISTINCT
                    n.name AS sourceName, labels(n)[0] AS sourceType, n.externalId AS sourceExtId,
                    m.name AS targetName, labels(m)[0] AS targetType, m.externalId AS targetExtId,
                    type(r) AS relation
                LIMIT $limit
            `
        }

        const result = await session.run(cypher, params)

        const nodeMap = new Map<string, GraphNode>()
        const edges: GraphEdge[] = []

        for (const record of result.records) {
            const sourceName: string = record.get('sourceName')
            const targetName: string = record.get('targetName')
            const relation: string = record.get('relation')

            if (!sourceName || !targetName) continue

            if (!nodeMap.has(sourceName)) {
                nodeMap.set(sourceName, {
                    id: sourceName,
                    type: record.get('sourceType') ?? 'UNKNOWN',
                    externalId: record.get('sourceExtId') ?? null,
                })
            }
            if (!nodeMap.has(targetName)) {
                nodeMap.set(targetName, {
                    id: targetName,
                    type: record.get('targetType') ?? 'UNKNOWN',
                    externalId: record.get('targetExtId') ?? null,
                })
            }

            edges.push({ source: sourceName, target: targetName, relation })
        }

        return {
            nodes: Array.from(nodeMap.values()),
            edges,
        }
    } catch (error: any) {
        console.log(`Error While Fetching Graph Subgraph: ${error?.message}`)
        return { nodes: [], edges: [] }
    } finally {
        await session.close()
    }
}