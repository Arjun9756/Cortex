import { driver } from "../../apps/api/config/neo4j.js";

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
        ownership: Array<{name: string, type: string, createdAt?: number | undefined}>
        dependency: Array<{name: string, type: string, dependsOn: string}>
        activity: Array<{name: string, type: string, timestamp: number}>
        documentation: Array<{name: string, type: string, issue: string}>
        expertise: Array<{name: string, type: string, reason: string}>
        pendingWork: Array<{name: string, type: string, status?: string | undefined}>
    }
}

export async function calculateOwnership(
    personName: string,
    mapping: { relation: string | null; targetLabel: string | null },
    usedRelations: string[]
): Promise<{
    score: number;
    count: number;
    evidence: Array<{name: string, type: string, createdAt?: number | undefined}>
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Ownership] Relation "${mapping.relation}" not found, returning 0`)
        return { score: 0, count: 0, evidence: [] }
    }

    const session = driver.session()
    try {
        const targetLabel = mapping.targetLabel || 'COMMIT'

        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:${mapping.relation}]->(item:${targetLabel})
             RETURN count(item) as totalCount`,
            { name: personName }
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
            { name: personName }
        )

        const evidence = evidenceResult.records.map(record => {
            const createdAt = record.get('createdAt') as number | null
            const item: {name: string, type: string, createdAt?: number | undefined} = {
                name: record.get('name') as string,
                type: record.get('type') as string
            }
            if (createdAt !== null && createdAt !== undefined) {
                item.createdAt = createdAt
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
    evidence: Array<{name: string, type: string, dependsOn: string}>
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Dependency] Relation "${mapping.relation}" not found, returning 0`)
        return { score: 0, count: 0, evidence: [] }
    }

    const session = driver.session()
    try {
        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:AUTHORED]->(e)<-[:${mapping.relation}]-(dependent)
             RETURN count(DISTINCT dependent) as totalCount`,
            { name: personName }
        )
        const count = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0

        // Query 2: Get evidence (top 10)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:AUTHORED]->(e)<-[:${mapping.relation}]-(dependent)
             RETURN dependent.name as name,
                    labels(dependent)[0] as type,
                    e.name as dependsOn
             LIMIT 10`,
            { name: personName }
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
    evidence: Array<{name: string, type: string, timestamp: number}>
}> {
    const session = driver.session()
    try {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)

        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[r]->(e)
             WHERE e.createdAt >= $timestamp
             RETURN count(e) as totalCount`,
            { name: personName, timestamp: thirtyDaysAgo }
        )
        const recentCount = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0

        // Query 2: Get evidence (top 10)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[r]->(e)
             WHERE e.createdAt >= $timestamp
             RETURN e.name as name,
                    labels(e)[0] as type,
                    e.createdAt as timestamp
             ORDER BY e.createdAt DESC
             LIMIT 10`,
            { name: personName, timestamp: thirtyDaysAgo }
        )

        const evidence = evidenceResult.records.map(record => ({
            name: record.get('name') as string,
            type: record.get('type') as string,
            timestamp: record.get('timestamp') as number
        }))

        const score = recentCount > 0 ? 0.3 : 1.0

        console.log(`[Activity] ${recentCount} recent activities, score: ${score}`)

        return { score, count: recentCount, evidence }
    } catch (error: any) {
        console.error('[Activity] Query failed:', error.message)
        return { score: 0.5, count: 0, evidence: [] }
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
    evidence: Array<{name: string, type: string, issue: string}>
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Documentation] Relation "${mapping.relation}" not found, returning neutral`)
        return { score: 0.5, count: 0, evidence: [] }
    }

    const session = driver.session()
    try {
        const targetLabel = mapping.targetLabel || 'FILE'

        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[:${mapping.relation}]->(item:${targetLabel})
             WHERE item.description IS NULL OR item.description = ''
                OR NOT (item.name =~ '(?i).*readme.*|.*\\.md$')
             RETURN count(item) as totalCount`,
            { name: personName }
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
            { name: personName }
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
    evidence: Array<{name: string, type: string, reason: string}>
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[Expertise] Relation "${mapping.relation}" not found, returning 0`)
        return { score: 0, count: 0, evidence: [] }
    }

    const session = driver.session()
    try {
        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[]->(e)
             WHERE NOT EXISTS {
                 MATCH (other:PERSON)-[]->(e)
                 WHERE other.name <> $name
             }
             RETURN count(DISTINCT e) as totalCount`,
            { name: personName }
        )
        const uniqueCount = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0

        // Query 2: Get evidence (top 10)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON {name: $name})-[]->(e)
             WHERE NOT EXISTS {
                 MATCH (other:PERSON)-[]->(e)
                 WHERE other.name <> $name
             }
             RETURN e.name as name,
                    labels(e)[0] as type,
                    'Only ' + $name + ' uses this' as reason
             LIMIT 10`,
            { name: personName }
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
    evidence: Array<{name: string, type: string, status?: string | undefined}>
}> {
    if (!mapping.relation || !usedRelations.includes(mapping.relation)) {
        console.log(`[PendingWork] Relation "${mapping.relation}" not found, returning 0`)
        return { score: 0, count: 0, evidence: [] }
    }

    const session = driver.session()
    try {
        const targetLabel = mapping.targetLabel || 'ISSUE'

        // Query 1: Get total count
        const countResult = await session.run(
            `MATCH (p:PERSON {name: $name})<-[:${mapping.relation}]-(issue:${targetLabel})
             RETURN count(issue) as totalCount`,
            { name: personName }
        )
        const count = countResult.records[0]?.get('totalCount')?.toNumber() ?? 0

        // Query 2: Get evidence (top 10)
        const evidenceResult = await session.run(
            `MATCH (p:PERSON {name: $name})<-[:${mapping.relation}]-(issue:${targetLabel})
             RETURN issue.name as name,
                    labels(issue)[0] as type,
                    issue.status as status
             LIMIT 10`,
            { name: personName }
        )

        const evidence = evidenceResult.records.map(record => {
            const status = record.get('status') as string | null
            const item: {name: string, type: string, status?: string | undefined} = {
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
