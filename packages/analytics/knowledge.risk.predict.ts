import { driver } from "../../apps/api/config/neo4j.js";
import { toReadableTimestamp } from "../database/neo4j/neo4jUtils.js";

export interface KnowledgeRiskScore {
    person: string
    totalRisk: number
    breakdown: {
        ownership: number
        dependency: number
        activity: number
        documentation: number
        expertise: number
        pendingWork: number
    }
    details: {
        ownedItems: number
        criticalDependencies: number
        recentActivity: number
        documentationGaps: number
        uniqueSkills: number
        assignedWork: number
    }
    evidence: {
        ownership: Array<{ name: string, type: string, createdAt?: string | undefined }>
        dependency: Array<{ name: string, type: string, dependsOn: string }>
        activity: Array<{ name: string, type: string, timestamp: string | null }>
        documentation: Array<{ name: string, type: string, issue: string }>
        expertise: Array<{ name: string, type: string, reason: string }>
        pendingWork: Array<{ name: string, type: string, status?: string | undefined }>
    }
}

async function resolveCanonicalPersonName(session: any, rawName: string): Promise<string> {
    try {
        const res = await session.run(
            `MATCH (p:PERSON)
             WHERE toLower(p.name) = toLower($name)
                OR (p.externalId IS NOT NULL AND toLower(p.externalId) = toLower($name))
                OR (p.email IS NOT NULL AND toLower(p.email) = toLower($name))
             RETURN p.name AS name LIMIT 1`,
            { name: rawName }
        );
        if (res.records.length > 0 && res.records[0].get('name')) {
            return res.records[0].get('name') as string;
        }
    } catch {
        // Fallback
    }
    return rawName;
}

export async function calculateOwnership(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string, type: string, createdAt?: string | undefined }>
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Ownership] Relation "${mapping.relation}" not found, returning 0`)
        return { score: 0, count: 0, evidence: [] }
    }

    const session = driver.session()
    try {
        const name = await resolveCanonicalPersonName(session, personName);
        const targetLabel = mapping.targetLabel || 'COMMIT'

        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:${mapping.relation}]->(item:${targetLabel})
             RETURN count(item) as totalCount`,
            { name }
        )
        const personCount = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0

        // Query 2: Get evidence (top 10 items)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:${mapping.relation}]->(item:${targetLabel})
             RETURN item.name as name,
                    labels(item)[0] as type,
                    item.createdAt as createdAt
             ORDER BY item.createdAt DESC
             LIMIT 10`,
            { name }
        )

        const evidence = evidenceResult.records.map(record => {
            const rawCreatedAt = record.get('createdAt')
            const item: { name: string, type: string, createdAt?: string | undefined } = {
                name: record.get('name') as string,
                type: record.get('type') as string
            }
            const readable = toReadableTimestamp(rawCreatedAt)
            if (readable !== null) {
                item.createdAt = readable
            }
            return item
        })

        // Query 3: Get total items in graph
        const totalResult = await session.run(
            `MATCH (item:${targetLabel}) RETURN count(item) AS count`
        )
        const totalCount = totalResult.records[0]?.get('count')?.toNumber() ?? 1

        const ratio = totalCount > 0 ? personCount / totalCount : 0

        console.log(`[Ownership] ${personCount}/${totalCount} = ${ratio}`)

        return { score: ratio, count: personCount, evidence }
    } catch (error: any) {
        console.error('[Ownership] Query failed:', error.message)
        return { score: 0, count: 0, evidence: [] }
    } finally {
        await session.close()
    }
}

export async function calculateDependency(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string, type: string, dependsOn: string }>
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Dependency] Relation "${mapping.relation}" not found, returning 0`)
        return { score: 0, count: 0, evidence: [] }
    }

    const session = driver.session()
    try {
        const name = await resolveCanonicalPersonName(session, personName);

        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:AUTHORED]->(e)<-[:${mapping.relation}]-(dependent)
             RETURN count(DISTINCT dependent) as totalCount`,
            { name }
        )
        const count = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0

        // Query 2: Get evidence (top 10)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:AUTHORED]->(e)<-[:${mapping.relation}]-(dependent)
             RETURN dependent.name as name,
                    labels(dependent)[0] as type,
                    e.name as dependsOn
             LIMIT 10`,
            { name }
        )

        const evidence = evidenceResult.records.map(record => ({
            name: record.get('name') as string,
            type: record.get('type') as string,
            dependsOn: record.get('dependsOn') as string
        }))

        const score = Math.min(count / 10, 1)

        console.log(`[Dependency] ${count} dependents, score: ${score}`)

        return { score, count, evidence }
    } catch (error: any) {
        console.error('[Dependency] Query failed:', error.message)
        return { score: 0, count: 0, evidence: [] }
    } finally {
        await session.close()
    }
}

export async function calculateActivity(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string, type: string, timestamp: string | null }>
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Activity] Relation "${mapping.relation}" not found in schema, returning 0`)
        return { score: 0, count: 0, evidence: [] }
    }

    const session = driver.session()
    try {
        const name = await resolveCanonicalPersonName(session, personName);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
        const targetLabel = mapping.targetLabel ? `:${mapping.targetLabel}` : ''

        // Query 1: Get total count of recent activity
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:${mapping.relation}]->(e${targetLabel})
             WHERE e.createdAt >= $timestamp
             RETURN count(e) as totalCount`,
            { name, timestamp: thirtyDaysAgo }
        )
        const recentCount = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0

        // Query 2: Get evidence (top 10) — convert Neo4j Integer timestamps to ISO strings
        const evidenceResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:${mapping.relation}]->(e${targetLabel})
             WHERE e.createdAt >= $timestamp
             RETURN e.name as name,
                    labels(e)[0] as type,
                    e.createdAt as timestamp
             ORDER BY e.createdAt DESC
             LIMIT 10`,
            { name, timestamp: thirtyDaysAgo }
        )

        const evidence = evidenceResult.records.map(record => ({
            name: record.get('name') as string,
            type: record.get('type') as string,
            timestamp: toReadableTimestamp(record.get('timestamp'))
        }))

        const score = Math.max(0, 1 - Math.min(recentCount / 20, 1))

        console.log(`[Activity] ${recentCount} recent activities in 30d, score: ${score}`)

        return { score, count: recentCount, evidence }
    } catch (error: any) {
        console.error('[Activity] Query failed:', error.message)
        return { score: 0, count: 0, evidence: [] }
    } finally {
        await session.close()
    }
}


export async function calculateDocumentation(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string, type: string, issue: string }>
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Documentation] Relation "${mapping.relation}" not found, returning neutral`)
        return { score: 0.5, count: 0, evidence: [] }
    }

    const session = driver.session()
    try {
        const name = await resolveCanonicalPersonName(session, personName);
        const targetLabel = mapping.targetLabel || 'FILE'

        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:${mapping.relation}]->(item:${targetLabel})
             WHERE item.description IS NULL OR item.description = ''
                OR NOT (item.name =~ '(?i).*readme.*|.*\\.md$')
             RETURN count(item) as totalCount`,
            { name }
        )
        const undocumentedCount = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0

        // Query 2: Get evidence (top 10)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:${mapping.relation}]->(item:${targetLabel})
             WHERE item.description IS NULL OR item.description = ''
                OR NOT (item.name =~ '(?i).*readme.*|.*\\.md$')
             RETURN item.name as name,
                    labels(item)[0] as type,
                    CASE
                        WHEN item.description IS NULL OR item.description = '' THEN 'No description'
                        ELSE 'Missing README/docs'
                    END as issue
             LIMIT 10`,
            { name }
        )

        const evidence = evidenceResult.records.map(record => ({
            name: record.get('name') as string,
            type: record.get('type') as string,
            issue: record.get('issue') as string
        }))

        const score = Math.min(undocumentedCount / 20, 1)

        console.log(`[Documentation] ${undocumentedCount} undocumented items, score: ${score}`)

        return { score, count: undocumentedCount, evidence }
    } catch (error: any) {
        console.error('[Documentation] Query failed:', error.message)
        return { score: 0.5, count: 0, evidence: [] }
    } finally {
        await session.close()
    }
}

export async function calculateExpertise(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string, type: string, reason: string }>
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Expertise] Relation "${mapping.relation}" not found, returning 0`)
        return { score: 0, count: 0, evidence: [] }
    }

    const session = driver.session()
    try {
        const name = await resolveCanonicalPersonName(session, personName);

        // Fix 2: Aggregation-based approach avoids expensive per-entity NOT EXISTS correlated subqueries.
        // Collects all PERSON contributors to each entity, then filters to those where only $name contributed.
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[]->(e)
             WITH e
             MATCH (e)<-[]-(connectedPerson:PERSON)
             WITH e, collect(DISTINCT connectedPerson.name) AS connectedPeople
             WHERE size(connectedPeople) = 1 AND connectedPeople[0] = $name
             RETURN count(e) AS totalCount`,
            { name }
        )
        const uniqueCount = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0

        // Fix 2: Evidence query uses same aggregation pattern for consistency and performance
        const evidenceResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[]->(e)
             WITH e
             MATCH (e)<-[]-(connectedPerson:PERSON)
             WITH e, collect(DISTINCT connectedPerson.name) AS connectedPeople
             WHERE size(connectedPeople) = 1 AND connectedPeople[0] = $name
             RETURN e.name as name,
                    labels(e)[0] as type,
                    'Single contributor (' + $name + ') to this ' + toLower(labels(e)[0]) as reason
             LIMIT 10`,
            { name }
        )

        const evidence = evidenceResult.records.map(record => ({
            name: record.get('name') as string,
            type: record.get('type') as string,
            reason: record.get('reason') as string
        }))

        const score = Math.min(uniqueCount / 20, 1)

        console.log(`[Expertise] ${uniqueCount} unique items, score: ${score}`)

        return { score, count: uniqueCount, evidence }
    } catch (error: any) {
        console.error('[Expertise] Query failed:', error.message)
        return { score: 0, count: 0, evidence: [] }
    } finally {
        await session.close()
    }
}

export async function calculatePendingWork(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{ name: string, type: string, status?: string | undefined }>
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[PendingWork] Relation "${mapping.relation}" not found, returning 0`)
        return { score: 0, count: 0, evidence: [] }
    }

    const session = driver.session()
    try {
        const name = await resolveCanonicalPersonName(session, personName);
        const targetLabel = mapping.targetLabel || 'ISSUE'

        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})<-[:${mapping.relation}]-(issue:${targetLabel})
             RETURN count(issue) as totalCount`,
            { name }
        )
        const count = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0

        // Query 2: Get evidence (top 10)
        // Fix BUG 3: use resolved `name` (from resolveCanonicalPersonName) not raw `personName`.
        // Previously this query used `personName` (the raw input), while countResult used the
        // resolved `name`. This caused 0 evidence for lowercase/variant-cased inputs.
        const evidenceResult = await session.run(
            `MATCH (p:PERSON {name: $name})<-[:${mapping.relation}]-(issue:${targetLabel})
             RETURN issue.name as name,
                    labels(issue)[0] as type,
                    issue.status as status
             LIMIT 10`,
            { name }
        )

        const evidence = evidenceResult.records.map(record => {
            const status = record.get('status') as string | null
            const item: { name: string, type: string, status?: string | undefined } = {
                name: record.get('name') as string,
                type: record.get('type') as string
            }
            if (status !== null && status !== undefined) {
                item.status = status
            }
            return item
        })

        const score = Math.min(count / 10, 1)

        console.log(`[PendingWork] ${count} pending items, score: ${score}`)

        return { score, count, evidence }
    } catch (error: any) {
        console.error('[PendingWork] Query failed:', error.message)
        return { score: 0, count: 0, evidence: [] }
    } finally {
        await session.close()
    }
}
