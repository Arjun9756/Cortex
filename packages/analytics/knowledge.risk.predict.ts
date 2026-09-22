import { driver } from "../../apps/api/config/neo4j.js";
import sql from "../../apps/api/config/postgres.js";
import { toReadableTimestamp } from "../database/neo4j/neo4jUtils.js";
import { CYPHER_BOT_FILTER } from "../shared/botDetection.js";

export interface KnowledgeRiskScore {
    person: string;
    totalRisk: number;
    breakdown: {
        ownership: number;
        dependency: number;
        activity: number;
        documentation: number;
        expertise: number;
        pendingWork: number;
    };
    details: {
        ownedItems: number;
        criticalDependencies: number;
        recentActivity: number;
        documentationGaps: number;
        uniqueSkills: number;
        assignedWork: number;
    };
    evidence: {
        ownership: Array<{ name: string; type: string; createdAt?: string | undefined }>;
        dependency: Array<{ name: string; type: string; dependsOn: string }>;
        activity: Array<{ name: string; type: string; timestamp: string | null }>;
        documentation: Array<{ name: string; type: string; issue: string }>;
        expertise: Array<{ name: string; type: string; reason: string }>;
        pendingWork: Array<{ name: string; type: string; status?: string | undefined }>;
    };
}

export interface CanonicalPersonContext {
    primaryName: string;
    canonicalPersonId: string | null;
    names: string[];
    emails: string[];
    externalIds: string[];
}

const personContextCache = new Map<string, { ctx: CanonicalPersonContext; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export async function resolvePersonContext(session: any, rawName: string): Promise<CanonicalPersonContext> {
    const raw = (rawName || '').trim();
    const cacheKey = raw.toLowerCase();
    const cached = personContextCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.ctx;
    }

    const namesSet = new Set<string>();
    const emailsSet = new Set<string>();
    const externalIdsSet = new Set<string>();
    let canonicalPersonId: string | null = null;
    let primaryName = raw;

    if (raw) {
        namesSet.add(raw);
    }

    // 1. Try PostgreSQL lookup (person_identity, canonical_persons, person_metrics)
    try {
        const identities = await sql`
            SELECT canonical_person_id, display_name, username, email, external_id
            FROM person_identity
            WHERE canonical_person_id = ${raw}
               OR toLower(display_name) = toLower(${raw})
               OR toLower(username) = toLower(${raw})
               OR toLower(email) = toLower(${raw})
               OR toLower(external_id) = toLower(${raw})
            LIMIT 5
        `;

        if (identities.length > 0) {
            canonicalPersonId = identities[0].canonical_person_id;
            const allLinked = await sql`
                SELECT canonical_person_id, display_name, username, email, external_id
                FROM person_identity
                WHERE canonical_person_id = ${canonicalPersonId}
            `;
            for (const row of allLinked) {
                if (row.display_name) {
                    namesSet.add(row.display_name);
                    primaryName = row.display_name;
                }
                if (row.username) {
                    namesSet.add(row.username);
                    externalIdsSet.add(row.username);
                }
                if (row.email) emailsSet.add(row.email.toLowerCase());
                if (row.external_id) externalIdsSet.add(row.external_id);
            }
        } else {
            // Check person_metrics
            const metrics = await sql`
                SELECT person_name
                FROM person_metrics
                WHERE toLower(person_name) = toLower(${raw})
                LIMIT 1
            `;
            if (metrics.length > 0 && metrics[0].person_name) {
                primaryName = metrics[0].person_name;
                namesSet.add(primaryName);
            }
        }
    } catch {
        // DB lookup failure handled gracefully
    }

    // 2. Query Neo4j nodes to find aliases / canonical ID if missing
    try {
        const neoRes = await session.run(
            `MATCH (p:PERSON)
             WHERE (toLower(p.name) = toLower($raw)
                OR (p.externalId IS NOT NULL AND toLower(p.externalId) = toLower($raw))
                OR (p.email IS NOT NULL AND toLower(p.email) = toLower($raw))
                OR ($canonicalPersonId IS NOT NULL AND p.canonicalPersonId = $canonicalPersonId))
             RETURN p.name AS name, p.externalId AS externalId, p.email AS email, p.canonicalPersonId AS canonicalPersonId
             LIMIT 10`,
            { raw, canonicalPersonId }
        );
        for (const rec of neoRes.records) {
            const pName = rec.get('name');
            const pExt = rec.get('externalId');
            const pEmail = rec.get('email');
            const pCanon = rec.get('canonicalPersonId');
            if (pName) namesSet.add(pName);
            if (pExt) externalIdsSet.add(pExt);
            if (pEmail) emailsSet.add(pEmail.toLowerCase());
            if (pCanon && !canonicalPersonId) canonicalPersonId = pCanon;
            if (!primaryName && pName) primaryName = pName;
        }
    } catch {
        // Neo4j lookup failure handled gracefully
    }

    const ctx: CanonicalPersonContext = {
        primaryName,
        canonicalPersonId,
        names: Array.from(namesSet),
        emails: Array.from(emailsSet),
        externalIds: Array.from(externalIdsSet),
    };

    personContextCache.set(cacheKey, { ctx, expiresAt: Date.now() + CACHE_TTL_MS });
    return ctx;
}

function cypherPersonMatch(alias: string = 'p'): string {
    return `(
        ($canonicalPersonId IS NOT NULL AND ${alias}.canonicalPersonId = $canonicalPersonId)
        OR (size($names) > 0 AND ${alias}.name IN $names)
        OR (size($externalIds) > 0 AND ${alias}.externalId IN $externalIds)
        OR (size($emails) > 0 AND toLower(${alias}.email) IN $emails)
    )`;
}

export async function calculateOwnership(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[],
    existingSession?: any
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string; type: string; createdAt?: string | undefined }>;
}> {
    const session = existingSession || driver.session();
    const shouldClose = !existingSession;
    try {
        const ctx = await resolvePersonContext(session, personName);
        const name = ctx.primaryName;
        const nowMs = Date.now();
        const pMatch = cypherPersonMatch('p');
        const queryParams = {
            canonicalPersonId: ctx.canonicalPersonId,
            names: ctx.names,
            externalIds: ctx.externalIds,
            emails: ctx.emails,
        };

        // P0-1: Query 1 — Total count across CONTRIBUTED_TO rollup edges and legacy COMMIT nodes
        const countResult = await session.run(
            `OPTIONAL MATCH (p:PERSON)
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
             OPTIONAL MATCH (p)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
             WITH p, COALESCE(sum(COALESCE(rel.commitCount, 1)), 0) AS contribCount
             OPTIONAL MATCH (p)-[:AUTHORED]->(c:COMMIT)
             WITH contribCount, count(c) AS legacyCount
             RETURN (contribCount + legacyCount) AS totalCount`,
            queryParams
        );
        const personCount = countResult.records[0]?.get('totalCount')?.toNumber ? countResult.records[0]?.get('totalCount')?.toNumber() : Number(countResult.records[0]?.get('totalCount') || 0);

        // P0-1: Query 2 — Evidence (top 10 items)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON)
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
             OPTIONAL MATCH (p)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
             WITH p, collect({
                 name: r.name + ' (' + toString(COALESCE(rel.commitCount, 1)) + ' commits)',
                 type: 'REPOSITORY_CONTRIBUTION',
                 createdAt: rel.lastCommitAt
             }) AS contribEvidence
             OPTIONAL MATCH (p)-[:AUTHORED]->(c:COMMIT)
             WITH contribEvidence, collect({
                 name: c.name,
                 type: 'COMMIT',
                 createdAt: c.createdAt
             }) AS legacyEvidence
             RETURN [item IN (contribEvidence + legacyEvidence) WHERE item.name IS NOT NULL][0..10] AS evidence`,
            queryParams
        );

        const rawEvidence = evidenceResult.records[0]?.get('evidence') || [];
        const evidence = rawEvidence.map((record: any) => {
            const rawCreatedAt = record.createdAt;
            const item: { name: string; type: string; createdAt?: string | undefined } = {
                name: record.name as string,
                type: record.type as string
            };
            const readable = toReadableTimestamp(rawCreatedAt);
            if (readable !== null) {
                item.createdAt = readable;
            }
            return item;
        });

        // P1-2: Query 3 — Per-repository ownership calculation with bucketed/moving decayed weighted score
        const allPBotFilter = CYPHER_BOT_FILTER.replace(/p\./g, 'allP.');
        let ownershipResult = await session.run(
            `MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
             WITH r,
                  sum(
                      COALESCE(rel.weightedScore, toFloat(COALESCE(rel.commitCount, 1))) *
                      exp(-0.693 * (CASE WHEN $nowMs > toFloat(COALESCE(rel.lastCommitAt, $nowMs)) THEN ($nowMs - toFloat(COALESCE(rel.lastCommitAt, $nowMs))) ELSE 0.0 END) / (180.0 * 86400000.0))
                  ) AS personWeightedScore
             MATCH (allP:PERSON)-[allRel:CONTRIBUTED_TO]->(r)
             WHERE ${allPBotFilter}
             WITH r, personWeightedScore,
                  sum(
                      COALESCE(allRel.weightedScore, toFloat(COALESCE(allRel.commitCount, 1))) *
                      exp(-0.693 * (CASE WHEN $nowMs > toFloat(COALESCE(allRel.lastCommitAt, $nowMs)) THEN ($nowMs - toFloat(COALESCE(allRel.lastCommitAt, $nowMs))) ELSE 0.0 END) / (180.0 * 86400000.0))
                  ) AS totalWeightedScore
             RETURN max(
                 CASE 
                     WHEN totalWeightedScore > 0 THEN personWeightedScore / totalWeightedScore 
                     ELSE 0.0 
                 END
             ) AS maxRepoOwnership`,
            { ...queryParams, nowMs }
        );

        let rawMaxOwnership = ownershipResult.records[0]?.get('maxRepoOwnership');

        // Fallback path for legacy uncompacted COMMIT nodes
        if (rawMaxOwnership === null || rawMaxOwnership === undefined || isNaN(Number(rawMaxOwnership))) {
            const legacyOwnershipRes = await session.run(
                `MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY)
                 WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
                 WITH r,
                      sum(
                          CASE 
                              WHEN c.createdAt IS NOT NULL 
                              THEN exp(-0.693 * (CASE WHEN $nowMs > toFloat(c.createdAt) THEN ($nowMs - toFloat(c.createdAt)) ELSE 0.0 END) / (180.0 * 86400000.0))
                              ELSE 0.5 
                          END
                      ) AS personWeightedScore
                 MATCH (allP:PERSON)-[:AUTHORED]->(c2:COMMIT)-[:PART_OF]->(r)
                 WHERE ${allPBotFilter}
                 WITH r, personWeightedScore,
                      sum(
                          CASE 
                              WHEN c2.createdAt IS NOT NULL 
                              THEN exp(-0.693 * (CASE WHEN $nowMs > toFloat(c2.createdAt) THEN ($nowMs - toFloat(c2.createdAt)) ELSE 0.0 END) / (180.0 * 86400000.0))
                              ELSE 0.5 
                          END
                      ) AS totalWeightedScore
                 RETURN max(
                     CASE 
                         WHEN totalWeightedScore > 0 THEN personWeightedScore / totalWeightedScore 
                         ELSE 0.0 
                     END
                 ) AS maxRepoOwnership`,
                { ...queryParams, nowMs }
            );
            rawMaxOwnership = legacyOwnershipRes.records[0]?.get('maxRepoOwnership');
        }

        const maxRepoOwnership = (rawMaxOwnership !== null && rawMaxOwnership !== undefined)
            ? (typeof rawMaxOwnership === 'number' ? rawMaxOwnership : (rawMaxOwnership.toNumber ? rawMaxOwnership.toNumber() : Number(rawMaxOwnership)))
            : 0;
        const ratio = Math.min(1, Math.max(0, isNaN(maxRepoOwnership) ? 0 : maxRepoOwnership));

        console.log(`[Ownership] ${name} time-decayed maxRepoOwnership = ${ratio} (personCount: ${personCount})`);

        return { score: ratio, count: personCount, evidence };
    } catch (error: any) {
        console.error('[Ownership] Query failed:', error.message);
        return { score: 0, count: 0, evidence: [] };
    } finally {
        if (shouldClose) await session.close();
    }
}

export async function calculateDependency(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string; type: string; dependsOn: string }>;
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Dependency] Relation "${mapping.relation}" not found, returning 0`);
        return { score: 0, count: 0, evidence: [] };
    }

    const session = driver.session();
    try {
        const ctx = await resolvePersonContext(session, personName);
        const pMatch = cypherPersonMatch('p');
        const queryParams = {
            canonicalPersonId: ctx.canonicalPersonId,
            names: ctx.names,
            externalIds: ctx.externalIds,
            emails: ctx.emails,
        };

        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON)-[:AUTHORED]->(e)<-[:${mapping.relation}]-(dependent)
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
             RETURN count(DISTINCT dependent) as totalCount`,
            queryParams
        );
        const count = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0;

        // Query 2: Get evidence (top 10)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON)-[:AUTHORED]->(e)<-[:${mapping.relation}]-(dependent)
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
             RETURN dependent.name as name,
                    labels(dependent)[0] as type,
                    e.name as dependsOn
             LIMIT 10`,
            queryParams
        );

        const evidence = evidenceResult.records.map(record => ({
            name: record.get('name') as string,
            type: record.get('type') as string,
            dependsOn: record.get('dependsOn') as string
        }));

        const score = Math.min(count / 10, 1);

        console.log(`[Dependency] ${count} dependents, score: ${score}`);

        return { score, count, evidence };
    } catch (error: any) {
        console.error('[Dependency] Query failed:', error.message);
        return { score: 0, count: 0, evidence: [] };
    } finally {
        await session.close();
    }
}

export async function calculateActivity(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string; type: string; timestamp: string | null }>;
}> {
    const session = driver.session();
    try {
        const ctx = await resolvePersonContext(session, personName);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const pMatch = cypherPersonMatch('p');
        const relation = mapping.relation || 'CONTRIBUTED_TO';
        const queryParams = {
            canonicalPersonId: ctx.canonicalPersonId,
            names: ctx.names,
            externalIds: ctx.externalIds,
            emails: ctx.emails,
            relation,
            timestamp: thirtyDaysAgo,
        };

        // Query 1: Get total count of recent developer activity using relationship and entity timestamps
        // P0-4: Evaluate developer activity (rel.lastCommitAt, rel.updatedAt, rel.createdAt), NOT repo creation date
        const countResult = await session.run(
            `MATCH (p:PERSON)-[rel]->(e)
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
               AND type(rel) IN ['CONTRIBUTED_TO', 'WORKS_ON', 'AUTHORED', $relation]
               AND coalesce(rel.lastCommitAt, rel.updatedAt, rel.createdAt, e.updatedAt, e.createdAt, 0) >= $timestamp
             RETURN count(rel) as totalCount`,
            queryParams
        );
        const recentCount = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0;

        // Query 2: Get evidence (top 10)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON)-[rel]->(e)
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
               AND type(rel) IN ['CONTRIBUTED_TO', 'WORKS_ON', 'AUTHORED', $relation]
               AND coalesce(rel.lastCommitAt, rel.updatedAt, rel.createdAt, e.updatedAt, e.createdAt, 0) >= $timestamp
             RETURN COALESCE(e.name, 'Activity on ' + type(rel)) as name,
                    labels(e)[0] as type,
                    coalesce(rel.lastCommitAt, rel.updatedAt, rel.createdAt, e.updatedAt, e.createdAt) as timestamp
             ORDER BY timestamp DESC
             LIMIT 10`,
            queryParams
        );

        const evidence = evidenceResult.records.map(record => ({
            name: record.get('name') as string,
            type: record.get('type') as string,
            timestamp: toReadableTimestamp(record.get('timestamp'))
        }));

        const score = Math.max(0, 1 - Math.min(recentCount / 20, 1));

        console.log(`[Activity] ${recentCount} recent activities in 30d, score: ${score}`);

        return { score, count: recentCount, evidence };
    } catch (error: any) {
        console.error('[Activity] Query failed:', error.message);
        return { score: 0, count: 0, evidence: [] };
    } finally {
        await session.close();
    }
}

export async function calculateDocumentation(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string; type: string; issue: string }>;
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Documentation] Relation "${mapping.relation}" not found, returning neutral`);
        return { score: 0.5, count: 0, evidence: [] };
    }

    const session = driver.session();
    try {
        const ctx = await resolvePersonContext(session, personName);
        const targetLabel = mapping.targetLabel || 'FILE';
        const pMatch = cypherPersonMatch('p');
        const queryParams = {
            canonicalPersonId: ctx.canonicalPersonId,
            names: ctx.names,
            externalIds: ctx.externalIds,
            emails: ctx.emails,
        };

        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON)-[:${mapping.relation}]->(item:${targetLabel})
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
               AND (item.description IS NULL OR item.description = ''
                 OR NOT (item.name =~ '(?i).*readme.*|.*\\.md$'))
             RETURN count(item) as totalCount`,
            queryParams
        );
        const undocumentedCount = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0;

        // Query 2: Get evidence (top 10)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON)-[:${mapping.relation}]->(item:${targetLabel})
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
               AND (item.description IS NULL OR item.description = ''
                 OR NOT (item.name =~ '(?i).*readme.*|.*\\.md$'))
             RETURN item.name as name,
                    labels(item)[0] as type,
                    CASE
                        WHEN item.description IS NULL OR item.description = '' THEN 'No description'
                        ELSE 'Missing README/docs'
                    END as issue
             LIMIT 10`,
            queryParams
        );

        const evidence = evidenceResult.records.map(record => ({
            name: record.get('name') as string,
            type: record.get('type') as string,
            issue: record.get('issue') as string
        }));

        const score = Math.min(undocumentedCount / 20, 1);

        console.log(`[Documentation] ${undocumentedCount} undocumented items, score: ${score}`);

        return { score, count: undocumentedCount, evidence };
    } catch (error: any) {
        console.error('[Documentation] Query failed:', error.message);
        return { score: 0.5, count: 0, evidence: [] };
    } finally {
        await session.close();
    }
}

export async function calculateExpertise(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string; type: string; reason: string }>;
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Expertise] Relation "${mapping.relation}" not found, returning 0`);
        return { score: 0, count: 0, evidence: [] };
    }

    const session = driver.session();
    try {
        const ctx = await resolvePersonContext(session, personName);
        const pMatch = cypherPersonMatch('p');
        const connectedBotFilter = CYPHER_BOT_FILTER.replace(/p\./g, 'connectedPerson.');
        const queryParams = {
            canonicalPersonId: ctx.canonicalPersonId,
            names: ctx.names,
            externalIds: ctx.externalIds,
            emails: ctx.emails,
        };

        // Aggregation-based approach avoiding expensive per-entity NOT EXISTS correlated subqueries.
        // Collects all human PERSON contributors to each entity, then filters to those where only this canonical person contributed.
        const countResult = await session.run(
            `MATCH (p:PERSON)-[]->(e)
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
             WITH e, p
             MATCH (e)<-[]-(connectedPerson:PERSON)
             WHERE ${connectedBotFilter}
             WITH e, collect(DISTINCT COALESCE(connectedPerson.canonicalPersonId, connectedPerson.externalId, connectedPerson.email, connectedPerson.name)) AS connectedPeople,
                  COALESCE(p.canonicalPersonId, p.externalId, p.email, p.name) AS myKey
             WHERE size(connectedPeople) = 1 AND connectedPeople[0] = myKey
             RETURN count(e) AS totalCount`,
            queryParams
        );
        const uniqueCount = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0;

        const evidenceResult = await session.run(
            `MATCH (p:PERSON)-[]->(e)
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
             WITH e, p
             MATCH (e)<-[]-(connectedPerson:PERSON)
             WHERE ${connectedBotFilter}
             WITH e, collect(DISTINCT COALESCE(connectedPerson.canonicalPersonId, connectedPerson.externalId, connectedPerson.email, connectedPerson.name)) AS connectedPeople,
                  COALESCE(p.canonicalPersonId, p.externalId, p.email, p.name) AS myKey,
                  p
             WHERE size(connectedPeople) = 1 AND connectedPeople[0] = myKey
             RETURN e.name as name,
                    labels(e)[0] as type,
                    'Single contributor (' + p.name + ') to this ' + toLower(labels(e)[0]) as reason
             LIMIT 10`,
            queryParams
        );

        const evidence = evidenceResult.records.map(record => ({
            name: record.get('name') as string,
            type: record.get('type') as string,
            reason: record.get('reason') as string
        }));

        const score = Math.min(uniqueCount / 20, 1);

        console.log(`[Expertise] ${uniqueCount} unique items, score: ${score}`);

        return { score, count: uniqueCount, evidence };
    } catch (error: any) {
        console.error('[Expertise] Query failed:', error.message);
        return { score: 0, count: 0, evidence: [] };
    } finally {
        await session.close();
    }
}

export async function calculatePendingWork(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string; type: string; status?: string | undefined }>;
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[PendingWork] Relation "${mapping.relation}" not found, returning 0`);
        return { score: 0, count: 0, evidence: [] };
    }

    const session = driver.session();
    try {
        const ctx = await resolvePersonContext(session, personName);
        const targetLabel = mapping.targetLabel || 'ISSUE';
        const pMatch = cypherPersonMatch('p');
        const queryParams = {
            canonicalPersonId: ctx.canonicalPersonId,
            names: ctx.names,
            externalIds: ctx.externalIds,
            emails: ctx.emails,
        };

        // Query 1: Get total count (exclude completed/closed work, and guard against ticket reassignment)
        const countResult = await session.run(
            `MATCH (p:PERSON)<-[r:${mapping.relation}]-(issue:${targetLabel})
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
               AND (issue.status IS NULL OR NOT toLower(issue.status) IN ['closed', 'done', 'resolved', 'completed'])
               AND (issue.assignee IS NULL OR toLower(trim(issue.assignee)) IN [n IN $names | toLower(n)] OR toLower(trim(issue.assignee)) = toLower(trim(p.name)))
               AND NOT EXISTS {
                   MATCH (issue)-[newer:${mapping.relation}]->(other:PERSON)
                   WHERE elementId(other) <> elementId(p)
                     AND coalesce(newer.updatedAt, newer.createdAt, 0) > coalesce(r.updatedAt, r.createdAt, 0)
               }
             RETURN count(issue) as totalCount`,
            queryParams
        );
        const count = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0;

        // Query 2: Get evidence (top 10)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON)<-[r:${mapping.relation}]-(issue:${targetLabel})
             WHERE ${pMatch} AND ${CYPHER_BOT_FILTER}
               AND (issue.status IS NULL OR NOT toLower(issue.status) IN ['closed', 'done', 'resolved', 'completed'])
               AND (issue.assignee IS NULL OR toLower(trim(issue.assignee)) IN [n IN $names | toLower(n)] OR toLower(trim(issue.assignee)) = toLower(trim(p.name)))
               AND NOT EXISTS {
                   MATCH (issue)-[newer:${mapping.relation}]->(other:PERSON)
                   WHERE elementId(other) <> elementId(p)
                     AND coalesce(newer.updatedAt, newer.createdAt, 0) > coalesce(r.updatedAt, r.createdAt, 0)
               }
             RETURN issue.name as name,
                    labels(issue)[0] as type,
                    issue.status as status
             LIMIT 10`,
            queryParams
        );

        const evidence = evidenceResult.records.map(record => {
            const status = record.get('status') as string | null;
            const item: { name: string; type: string; status?: string | undefined } = {
                name: record.get('name') as string,
                type: record.get('type') as string
            };
            if (status !== null && status !== undefined) {
                item.status = status;
            }
            return item;
        });

        const score = Math.min(count / 10, 1);

        console.log(`[PendingWork] ${count} pending items, score: ${score}`);

        return { score, count, evidence };
    } catch (error: any) {
        console.error('[PendingWork] Query failed:', error.message);
        return { score: 0, count: 0, evidence: [] };
    } finally {
        await session.close();
    }
}
