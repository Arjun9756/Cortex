import { driver } from '../../../apps/api/config/neo4j.js'
import neo4j from 'neo4j-driver'

const ALLOWED_RELATIONS = new Set([
    'USES', 'HAS_PROBLEM', 'FIXED_BY', 'REPLACED_BY', 'DEPENDS_ON',
    'WORKS_ON', 'CREATED', 'MENTIONED_IN', 'ASSIGNED_TO', 'PART_OF', 'AUTHORED',
    'CONTRIBUTED_TO'
])

const ALLOWED_ENTITY_TYPES = new Set([
    'PERSON', 'TECHNOLOGY', 'REPOSITORY', 'ISSUE', 'PULL_REQUEST',
    'TEAM', 'FILE', 'ORGANIZATION'
])

/**
 * Ensures indexes exist for fast property-based entity lookups.
 * Safe to call on every boot — uses IF NOT EXISTS.
 * Fixes Neo4j Cypher 5 syntax requirement: label must be specified for property index ON (n:LABEL).
 */
export async function ensureIndexes(): Promise<void> {
    const session = driver.session()
    try {
        await session.run(`CREATE INDEX entity_person_canonicalid IF NOT EXISTS FOR (n:PERSON) ON (n.canonicalPersonId)`)
        await session.run(`CREATE INDEX entity_person_email IF NOT EXISTS FOR (n:PERSON) ON (n.email)`)
        await session.run(`CREATE INDEX entity_person_externalid IF NOT EXISTS FOR (n:PERSON) ON (n.externalId)`)
        await session.run(`CREATE INDEX entity_repo_externalid IF NOT EXISTS FOR (n:REPOSITORY) ON (n.externalId)`)
        await session.run(`CREATE INDEX entity_person_name IF NOT EXISTS FOR (n:PERSON) ON (n.name)`)
        await session.run(`CREATE INDEX entity_repo_name IF NOT EXISTS FOR (n:REPOSITORY) ON (n.name)`)
        await session.run(`CREATE INDEX entity_tech_name IF NOT EXISTS FOR (n:TECHNOLOGY) ON (n.name)`)
        console.log('[Graph] Neo4j indexes ensured (PERSON: canonicalPersonId, name, email, externalId; REPOSITORY: name, externalId; TECHNOLOGY: name)')
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
 * @param extraProperties  Optional { email, role, externalId, avatarUrl, canonicalPersonId }
 * @param existingSession  Optional caller-managed session to prevent connection churn
 */
export async function upsertEntity(
    name: string,
    type: string,
    extraProperties?: Record<string, any>,
    existingSession?: any
): Promise<string | undefined> {
    const session = existingSession || driver.session()
    const shouldClose = !existingSession
    try {
        const normalizedType = type.toUpperCase()
        // Defense-in-depth gatekeeper: Reject any attempt to upsert COMMIT nodes
        if (
            normalizedType === 'COMMIT' ||
            ['COMMITS', 'GIT_COMMIT', 'GITCOMMIT', 'COMMIT_HASH', 'CHANGESET', 'REVISION'].includes(normalizedType) ||
            /^(commit\s*:?\s*#?|sha\s*:?\s*)?[a-f0-9]{7,40}$/i.test((name || '').trim())
        ) {
            console.warn(`[Graph] Blocked attempt to upsert COMMIT entity: "${name}" (${type}). Commits are strictly excluded from graph nodes.`)
            return undefined
        }
        if (!ALLOWED_ENTITY_TYPES.has(normalizedType)) {
            throw new Error(`Invalid entity type: ${type}`)
        }
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
        if (normalizedType === 'PERSON') {
            // P1-6 & P0-2: Collapse multi-probe into a single prioritized match query:
            // Priority order: canonicalPersonId > email > externalId.
            // Strict identity resolution: name-only matching is strictly disabled.
            params.canonicalPersonId = extraProperties?.canonicalPersonId ?? null
            params.email = extraProperties?.email ?? null
            params.externalId = extraProperties?.externalId ?? null

            const probeMatch = await session.run(`
                OPTIONAL MATCH (p1:PERSON) 
                WHERE $canonicalPersonId IS NOT NULL AND p1.canonicalPersonId = $canonicalPersonId
                OPTIONAL MATCH (p2:PERSON) 
                WHERE p1 IS NULL AND $email IS NOT NULL AND toLower(p2.email) = toLower($email)
                OPTIONAL MATCH (p3:PERSON) 
                WHERE p1 IS NULL AND p2 IS NULL AND $externalId IS NOT NULL AND p3.externalId = $externalId
                WITH coalesce(p1, p2, p3) AS matched
                RETURN elementId(matched) AS id
                LIMIT 1
            `, params)

            const matchedId = probeMatch.records[0]?.get('id') || null

            // Update existing or create distinct person node
            if (matchedId) {
                params.id = matchedId;
                result = await session.run(`
                    MATCH (e:PERSON) WHERE elementId(e) = $id
                    SET e.name = $name, e.updatedAt = timestamp()${extraSetClause}
                    RETURN elementId(e) AS id
                `, params);
            } else if (extraProperties?.canonicalPersonId) {
                result = await session.run(`
                    MERGE (e:PERSON {canonicalPersonId: $canonicalPersonId})
                    ON CREATE SET e.name = $name, e.createdAt = timestamp()${extraSetClause}
                    ON MATCH SET e.name = $name, e.updatedAt = timestamp()${extraSetClause}
                    RETURN elementId(e) AS id
                `, params);
            } else if (extraProperties?.email) {
                result = await session.run(`
                    MERGE (e:PERSON {email: $email})
                    ON CREATE SET e.name = $name, e.createdAt = timestamp()${extraSetClause}
                    ON MATCH SET e.name = $name, e.updatedAt = timestamp()${extraSetClause}
                    RETURN elementId(e) AS id
                `, params);
            } else if (extraProperties?.externalId) {
                result = await session.run(`
                    MERGE (e:PERSON {externalId: $externalId})
                    ON CREATE SET e.name = $name, e.createdAt = timestamp()${extraSetClause}
                    ON MATCH SET e.name = $name, e.updatedAt = timestamp()${extraSetClause}
                    RETURN elementId(e) AS id
                `, params);
            } else {
                result = await session.run(`
                    CREATE (e:PERSON {name: $name, createdAt: timestamp()${extraSetClause}})
                    RETURN elementId(e) AS id
                `, params);
            }
        } else {
            // Case-insensitive lookup for TECHNOLOGY, REPOSITORY, and other entity types to prevent case-variant duplicates (e.g. "Redis" vs "redis")
            const existingMatch = await session.run(`
                MATCH (e:${normalizedType})
                WHERE toLower(e.name) = toLower($name)
                RETURN elementId(e) AS id, e.name AS existingName
                LIMIT 1
            `, { name });

            if (existingMatch.records.length > 0 && existingMatch.records[0]) {
                const matchedId = existingMatch.records[0].get('id');
                const existingName = existingMatch.records[0].get('existingName');
                // Prefer properly capitalized name (e.g. "Redis" over "redis")
                const preferredName = (name !== name.toLowerCase() && existingName === existingName.toLowerCase()) ? name : existingName;
                params.id = matchedId;
                params.preferredName = preferredName;
                result = await session.run(`
                    MATCH (e:${normalizedType}) WHERE elementId(e) = $id
                    SET e.name = $preferredName, e.updatedAt = timestamp()${extraSetClause}
                    RETURN elementId(e) AS id
                `, params);
            } else {
                result = await session.run(`
                    MERGE (e:${normalizedType} {name: $name})
                    ON CREATE SET e.createdAt = timestamp()${extraSetClause}
                    ON MATCH SET e.updatedAt = timestamp()${extraSetClause}
                    RETURN elementId(e) AS id
                `, params);
            }
        }

        return result.records[0]?.get("id")
    }
    catch (error: any) {
        console.log(`Error While Upsert of Entity in Graph: ${error?.message}`)
    }
    finally {
        if (shouldClose) await session.close()
    }
}

export async function upsertCanonicalPersonNode(person: { id: string; name: string; email?: string | undefined; isActive?: boolean; employmentStatus?: string }, session?: any) {
    return await upsertEntity(person.name, 'PERSON', { 
        email: person.email, 
        canonicalPersonId: person.id, 
        externalId: person.id,
        isActive: person.isActive ?? true,
        employmentStatus: person.employmentStatus ?? (person.isActive === false ? 'alumni' : 'active')
    }, session);
}

export async function upsertIdentityNode(identity: { provider: string; externalId: string; username: string; displayName: string; canonicalPersonId: string }, session?: any) {
    return await upsertEntity(identity.displayName || identity.username, 'PERSON', { externalId: identity.externalId, provider: identity.provider, canonicalPersonId: identity.canonicalPersonId }, session);
}

export interface RelationMetadata {
    sourceEventId?: string | null;
    confidence?: number | null;
    commitCount?: number | null;
    lastCommitAt?: number | null;
    properties?: Record<string, any>;
}

export async function upsertRelation(
    fromID: string,
    toID: string,
    type: string,
    evidence?: string,
    metadata?: RelationMetadata,
    existingSession?: any
) {
    const session = existingSession || driver.session()
    const shouldClose = !existingSession
    try {
        const normalizedType = type.toUpperCase()
        if (!ALLOWED_RELATIONS.has(normalizedType)) {
            throw new Error(`Invalid relationship type: ${type}`)
        }

        const sourceEventId = metadata?.sourceEventId ?? null;
        const confidence = metadata?.confidence != null ? metadata.confidence : 1.0;
        const commitCount = metadata?.commitCount ?? (metadata?.properties?.commitCount ?? 1);
        const lastCommitAt = metadata?.lastCommitAt ?? (metadata?.properties?.lastCommitAt ?? Date.now());

        if (normalizedType === 'ASSIGNED_TO') {
            await session.run(`
                MATCH (a) WHERE elementId(a) = $fromID
                MATCH (b) WHERE elementId(b) = $toID
                OPTIONAL MATCH (a)-[oldRel:ASSIGNED_TO]->(other) WHERE elementId(other) <> elementId(b)
                DELETE oldRel
                MERGE (a)-[r:ASSIGNED_TO]->(b)
                ON CREATE SET r.createdAt = timestamp(), r.evidence = $evidence, r.sourceEventId = $sourceEventId, r.confidence = $confidence
                ON MATCH SET r.updatedAt = timestamp(), r.evidence = $evidence, r.sourceEventId = COALESCE($sourceEventId, r.sourceEventId), r.confidence = COALESCE($confidence, r.confidence)
            `, { fromID, toID, evidence: evidence ?? null, sourceEventId, confidence });
        } else if (normalizedType === 'CONTRIBUTED_TO') {
            await session.run(`
                MATCH (a) WHERE elementId(a) = $fromID
                MATCH (b) WHERE elementId(b) = $toID
                MERGE (a)-[r:CONTRIBUTED_TO]->(b)
                ON CREATE SET 
                    r.commitCount = COALESCE($commitCount, 1),
                    r.lastCommitAt = COALESCE($lastCommitAt, timestamp()),
                    r.weightedScore = toFloat(COALESCE($commitCount, 1)),
                    r.commits30d = COALESCE($commitCount, 1),
                    r.commits90d = COALESCE($commitCount, 1),
                    r.commits180d = COALESCE($commitCount, 1),
                    r.commitsOlder = 0,
                    r.createdAt = timestamp(),
                    r.evidence = $evidence,
                    r.sourceEventId = $sourceEventId,
                    r.processedEventIds = CASE WHEN $sourceEventId IS NOT NULL THEN [$sourceEventId] ELSE [] END,
                    r.confidence = $confidence
                ON MATCH SET 
                    r.commitCount = CASE 
                        WHEN $sourceEventId IS NOT NULL AND $sourceEventId IN COALESCE(r.processedEventIds, []) 
                        THEN r.commitCount 
                        ELSE COALESCE(r.commitCount, 0) + COALESCE($commitCount, 1) 
                    END,
                    r.weightedScore = CASE 
                        WHEN $sourceEventId IS NOT NULL AND $sourceEventId IN COALESCE(r.processedEventIds, []) 
                        THEN r.weightedScore 
                        ELSE 
                            COALESCE(r.weightedScore, toFloat(COALESCE(r.commitCount, 1))) * 
                            exp(-0.693 * (CASE WHEN $lastCommitAt IS NOT NULL AND $lastCommitAt > COALESCE(r.lastCommitAt, 0) THEN (toFloat($lastCommitAt) - toFloat(COALESCE(r.lastCommitAt, 0))) ELSE 0.0 END) / (180.0 * 86400000.0)) + 
                            toFloat(COALESCE($commitCount, 1))
                    END,
                    r.commits30d = CASE 
                        WHEN $sourceEventId IS NOT NULL AND $sourceEventId IN COALESCE(r.processedEventIds, []) 
                        THEN r.commits30d 
                        ELSE COALESCE(r.commits30d, 0) + COALESCE($commitCount, 1) 
                    END,
                    r.processedEventIds = CASE 
                        WHEN $sourceEventId IS NOT NULL AND NOT ($sourceEventId IN COALESCE(r.processedEventIds, [])) 
                        THEN (COALESCE(r.processedEventIds, []) + [$sourceEventId])[-50..]
                        ELSE r.processedEventIds
                    END,
                    r.lastCommitAt = CASE WHEN $lastCommitAt IS NOT NULL AND $lastCommitAt > COALESCE(r.lastCommitAt, 0) THEN $lastCommitAt ELSE r.lastCommitAt END,
                    r.updatedAt = timestamp(),
                    r.evidence = $evidence,
                    r.sourceEventId = COALESCE($sourceEventId, r.sourceEventId),
                    r.confidence = COALESCE($confidence, r.confidence)
            `, { fromID, toID, evidence: evidence ?? null, sourceEventId, confidence, commitCount, lastCommitAt });
        } else {
            await session.run(`
                MATCH (a) WHERE elementId(a) = $fromID
                MATCH (b) WHERE elementId(b) = $toID
                MERGE (a)-[r:${normalizedType}]->(b)
                ON CREATE SET r.createdAt = timestamp(), r.evidence = $evidence, r.sourceEventId = $sourceEventId, r.confidence = $confidence
                ON MATCH SET r.updatedAt = timestamp(), r.evidence = $evidence, r.sourceEventId = COALESCE($sourceEventId, r.sourceEventId), r.confidence = COALESCE($confidence, r.confidence)
            `, { fromID, toID, evidence: evidence ?? null, sourceEventId, confidence });
        }
    }
    catch (error: any) {
        console.log(`Error While Upsert of Relation in Graph ${error?.message}`)
    }
    finally {
        if (shouldClose) await session.close()
    }
}

/**
 * P0-2: Batch upsert relations in a single Cypher session using UNWIND grouping.
 * Replaces O(relations) sequential session creations with 1 fixed session.
 */
export async function batchUpsertRelations(
    relations: Array<{
        fromID: string;
        toID: string;
        type: string;
        evidence?: string | undefined;
        metadata?: RelationMetadata | undefined;
    }>,
    existingSession?: any
): Promise<void> {
    if (!relations || relations.length === 0) return;
    const session = existingSession || driver.session();
    const shouldClose = !existingSession;

    try {
        const byType = new Map<string, any[]>();
        for (const rel of relations) {
            const normalizedType = rel.type.toUpperCase();
            if (!ALLOWED_RELATIONS.has(normalizedType)) {
                console.warn(`[GraphBatch] Skipping unknown relation type: ${rel.type}`);
                continue;
            }
            if (!rel.fromID || !rel.toID) {
                console.warn(`[GraphBatch] Skipping relation with missing endpoint: from=${rel.fromID}, to=${rel.toID}`);
                continue;
            }
            if (!byType.has(normalizedType)) {
                byType.set(normalizedType, []);
            }
            byType.get(normalizedType)!.push({
                fromID: rel.fromID,
                toID: rel.toID,
                evidence: rel.evidence ?? null,
                sourceEventId: rel.metadata?.sourceEventId ?? null,
                confidence: rel.metadata?.confidence != null ? rel.metadata.confidence : 1.0,
                commitCount: rel.metadata?.commitCount ?? (rel.metadata?.properties?.commitCount ?? 1),
                lastCommitAt: rel.metadata?.lastCommitAt ?? (rel.metadata?.properties?.lastCommitAt ?? Date.now())
            });
        }

        for (const [relType, batch] of byType.entries()) {
            if (relType === 'ASSIGNED_TO') {
                await session.run(`
                    UNWIND $batch AS item
                    MATCH (a) WHERE elementId(a) = item.fromID
                    MATCH (b) WHERE elementId(b) = item.toID
                    OPTIONAL MATCH (a)-[oldRel:ASSIGNED_TO]->(other) WHERE elementId(other) <> elementId(b)
                    DELETE oldRel
                    MERGE (a)-[r:ASSIGNED_TO]->(b)
                    ON CREATE SET r.createdAt = timestamp(), r.evidence = item.evidence, r.sourceEventId = item.sourceEventId, r.confidence = item.confidence
                    ON MATCH SET r.updatedAt = timestamp(), r.evidence = item.evidence, r.sourceEventId = COALESCE(item.sourceEventId, r.sourceEventId), r.confidence = COALESCE(item.confidence, r.confidence)
                `, { batch });
            } else if (relType === 'CONTRIBUTED_TO') {
                await session.run(`
                    UNWIND $batch AS item
                    MATCH (a) WHERE elementId(a) = item.fromID
                    MATCH (b) WHERE elementId(b) = item.toID
                    MERGE (a)-[r:CONTRIBUTED_TO]->(b)
                    ON CREATE SET 
                        r.commitCount = COALESCE(item.commitCount, 1),
                        r.lastCommitAt = COALESCE(item.lastCommitAt, timestamp()),
                        r.weightedScore = toFloat(COALESCE(item.commitCount, 1)),
                        r.commits30d = COALESCE(item.commitCount, 1),
                        r.commits90d = COALESCE(item.commitCount, 1),
                        r.commits180d = COALESCE(item.commitCount, 1),
                        r.commitsOlder = 0,
                        r.createdAt = timestamp(),
                        r.evidence = item.evidence,
                        r.sourceEventId = item.sourceEventId,
                        r.processedEventIds = CASE WHEN item.sourceEventId IS NOT NULL THEN [item.sourceEventId] ELSE [] END,
                        r.confidence = item.confidence
                    ON MATCH SET 
                        r.commitCount = CASE 
                            WHEN item.sourceEventId IS NOT NULL AND item.sourceEventId IN COALESCE(r.processedEventIds, []) 
                            THEN r.commitCount 
                            ELSE COALESCE(r.commitCount, 0) + COALESCE(item.commitCount, 1) 
                        END,
                        r.weightedScore = CASE 
                            WHEN item.sourceEventId IS NOT NULL AND item.sourceEventId IN COALESCE(r.processedEventIds, []) 
                            THEN r.weightedScore 
                            ELSE 
                                COALESCE(r.weightedScore, toFloat(COALESCE(r.commitCount, 1))) * 
                                exp(-0.693 * (CASE WHEN item.lastCommitAt IS NOT NULL AND item.lastCommitAt > COALESCE(r.lastCommitAt, 0) THEN (toFloat(item.lastCommitAt) - toFloat(COALESCE(r.lastCommitAt, 0))) ELSE 0.0 END) / (180.0 * 86400000.0)) + 
                                toFloat(COALESCE(item.commitCount, 1))
                        END,
                        r.commits30d = CASE 
                            WHEN item.sourceEventId IS NOT NULL AND item.sourceEventId IN COALESCE(r.processedEventIds, []) 
                            THEN r.commits30d 
                            ELSE COALESCE(r.commits30d, 0) + COALESCE(item.commitCount, 1) 
                        END,
                        r.processedEventIds = CASE 
                            WHEN item.sourceEventId IS NOT NULL AND NOT (item.sourceEventId IN COALESCE(r.processedEventIds, [])) 
                            THEN (COALESCE(r.processedEventIds, []) + [item.sourceEventId])[-50..]
                            ELSE r.processedEventIds
                        END,
                        r.lastCommitAt = CASE WHEN item.lastCommitAt IS NOT NULL AND item.lastCommitAt > COALESCE(r.lastCommitAt, 0) THEN item.lastCommitAt ELSE r.lastCommitAt END,
                        r.updatedAt = timestamp(),
                        r.evidence = item.evidence,
                        r.sourceEventId = COALESCE(item.sourceEventId, r.sourceEventId),
                        r.confidence = COALESCE(item.confidence, r.confidence)
                `, { batch });
            } else {
                await session.run(`
                    UNWIND $batch AS item
                    MATCH (a) WHERE elementId(a) = item.fromID
                    MATCH (b) WHERE elementId(b) = item.toID
                    MERGE (a)-[r:${relType}]->(b)
                    ON CREATE SET r.createdAt = timestamp(), r.evidence = item.evidence, r.sourceEventId = item.sourceEventId, r.confidence = item.confidence
                    ON MATCH SET r.updatedAt = timestamp(), r.evidence = item.evidence, r.sourceEventId = COALESCE(item.sourceEventId, r.sourceEventId), r.confidence = COALESCE(item.confidence, r.confidence)
                `, { batch });
            }
        }
    } catch (err: any) {
        console.error(`[GraphBatch] batchUpsertRelations failed:`, err?.message);
        throw err;
    } finally {
        if (shouldClose) await session.close();
    }
}

/**
 * Rollback / delete all relationships tagged with a specific sourceEventId.
 * Used for reversing hallucinated or deleted/reverted webhook deliveries.
 */
export async function rollbackEventRelations(sourceEventId: string): Promise<number> {
    if (!sourceEventId) return 0;
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH ()-[r]->()
            WHERE r.sourceEventId = $sourceEventId
            DELETE r
            RETURN count(r) AS deletedCount
        `, { sourceEventId });
        const deleted = result.records[0]?.get('deletedCount')?.toNumber() ?? 0;
        console.log(`[GraphRollback] Rolled back ${deleted} relations for sourceEventId: ${sourceEventId}`);
        return deleted;
    } catch (err: any) {
        console.error(`[GraphRollback] Error rolling back relations for ${sourceEventId}: ${err?.message}`);
        throw err;
    } finally {
        await session.close();
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
        // P1-11: Restrict search labels to core entities (never scan unbounded COMMIT nodes)
        const result = await session.run(`
            MATCH (n)
            WHERE (n:PERSON OR n:REPOSITORY OR n:TECHNOLOGY OR n:ISSUE OR n:PULL_REQUEST)
              AND (
                toLower(n.name) CONTAINS toLower($searchTerm)
                OR (n.email IS NOT NULL AND toLower(n.email) CONTAINS toLower($searchTerm))
                OR (n.externalId IS NOT NULL AND toLower(n.externalId) CONTAINS toLower($searchTerm))
              )
            RETURN n.name AS name, labels(n)[0] AS type,
                   n.email AS email, n.externalId AS externalId
            ORDER BY
                CASE WHEN toLower(n.name) = toLower($searchTerm) THEN 0 ELSE 1 END,
                n.name
            LIMIT $limit
        `, { searchTerm, limit: neo4j.int(limit) })

        if (result.records.length > 0) {
            return result.records.map((r) => ({
                name: r.get('name') as string,
                type: r.get('type') as string,
                email: r.get('email') as string | null,
                externalId: r.get('externalId') as string | null,
            }))
        }

        // Fallback: Token-based matching for multi-word queries with typos (e.g. "Rohan Verna" -> matches "Rohan Verma")
        const tokens = searchTerm.trim().split(/\s+/).filter(t => t.length >= 3).map(t => t.toLowerCase())
        if (tokens.length > 0) {
            const tokenResult = await session.run(`
                MATCH (n)
                WHERE (n:PERSON OR n:REPOSITORY OR n:TECHNOLOGY OR n:ISSUE OR n:PULL_REQUEST)
                  AND ANY(token IN $tokens WHERE toLower(n.name) CONTAINS token OR (n.email IS NOT NULL AND toLower(n.email) CONTAINS token))
                RETURN n.name AS name, labels(n)[0] AS type,
                       n.email AS email, n.externalId AS externalId
                ORDER BY n.name
                LIMIT $limit
            `, { tokens, limit: neo4j.int(limit) })

            return tokenResult.records.map((r) => ({
                name: r.get('name') as string,
                type: r.get('type') as string,
                email: r.get('email') as string | null,
                externalId: r.get('externalId') as string | null,
            }))
        }

        return []
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
            // P1-7: Directed relationships with label filters; exclude COMMIT explosion
            cypher = `
                MATCH (repo:REPOSITORY)
                WHERE toLower(repo.name) = toLower($repository)
                MATCH (n)-[r]-(m)
                WHERE (n:PERSON OR n:REPOSITORY OR n:TECHNOLOGY OR n:ISSUE OR n:PULL_REQUEST)
                  AND (m:PERSON OR m:REPOSITORY OR m:TECHNOLOGY OR m:ISSUE OR m:PULL_REQUEST)
                  AND NOT n:COMMIT AND NOT m:COMMIT
                  AND ((n)-[:PART_OF|WORKS_ON|CONTRIBUTED_TO|CREATED|MENTIONED_IN|USES|DEPENDS_ON]-(repo) OR n = repo OR m = repo)
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
                WHERE NOT neighbor:COMMIT
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
                WHERE (n:PERSON OR n:REPOSITORY OR n:TECHNOLOGY)
                  AND (m:PERSON OR m:REPOSITORY OR m:TECHNOLOGY)
                  AND NOT n:COMMIT AND NOT m:COMMIT
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
