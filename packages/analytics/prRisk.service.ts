import { driver } from '../../apps/api/config/neo4j.js';
import sql from '../../apps/api/config/postgres.js';
import redis from '../../apps/api/config/redis.js';
import neo4j from 'neo4j-driver';
import { calculateKnowledgeRisk } from './knowledge.service.js';

export interface PullRequestRiskInput {
    repository: string;
    prId: string | number;
    author: string;
    modifiedFiles: string[];
    deliveryId?: string | undefined;
}

export interface PullRequestRiskOutput {
    riskScore: number;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    affectedPeople: string[];
    affectedRepositories: string[];
    criticalFiles: string[];
    recommendations: string[];
}

/**
 * PHASE 1: Real-time PR Risk Engine
 * Calculates risk score (0-100) and blast radius before merging a PR.
 * Webhook-driven, async, idempotent with Redis caching.
 */
export async function evaluatePullRequestRisk(input: PullRequestRiskInput): Promise<PullRequestRiskOutput> {
    const { repository, prId, author, modifiedFiles, deliveryId } = input;
    const cacheKey = `pr_risk:${repository}:${prId}`;
    const lockKey = deliveryId ? `pr_risk:lock:${deliveryId}` : null;

    // 1. Idempotency & Cache Check
    try {
        if (lockKey) {
            const isDuplicate = await redis.set(lockKey, '1', 'EX', 60, 'NX');
            if (!isDuplicate && !deliveryId?.startsWith('test_')) {
                const existingCache = await redis.get(cacheKey);
                if (existingCache) {
                    return JSON.parse(existingCache);
                }
            }
        }

        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (redisErr: any) {
        console.warn(`[PRRisk] Redis cache read warning: ${redisErr?.message}`);
    }

    const session = driver.session();
    try {
        // 2. Blast Radius & Dependent Nodes (Max 2 Hops, Localized Subgraph)
        let blastRadiusCount = 0;
        const affectedReposSet = new Set<string>([repository]);
        const affectedPeopleSet = new Set<string>([author]);
        const criticalFiles: string[] = [];

        if (modifiedFiles.length > 0) {
            const graphRes = await session.run(`
                UNWIND $files AS filePath
                OPTIONAL MATCH (f) WHERE toLower(f.name) CONTAINS toLower(filePath)
                OPTIONAL MATCH (f)<-[:DEPENDS_ON|USES|PART_OF*1..2]-(dependent)
                RETURN count(DISTINCT dependent) AS blastCount,
                       collect(DISTINCT dependent.name)[0..10] AS dependentNames
            `, { files: modifiedFiles });

            blastRadiusCount = neo4j.integer.toNumber(graphRes.records[0]?.get('blastCount') ?? neo4j.int(0));
            
            // Check critical file ownership (SPOF files)
            for (const file of modifiedFiles) {
                const ownerRes = await session.run(`
                    MATCH (p:PERSON)-[:AUTHORED|WORKS_ON]->(w)-[:PART_OF|USES]-(f)
                    WHERE toLower(f.name) CONTAINS toLower($file)
                    RETURN count(DISTINCT p) AS ownerCount, collect(DISTINCT p.name)[0..5] AS owners
                `, { file });
                const ownerCount = neo4j.integer.toNumber(ownerRes.records[0]?.get('ownerCount') ?? neo4j.int(0));
                const owners = ownerRes.records[0]?.get('owners') ?? [];
                
                if (ownerCount <= 1) {
                    criticalFiles.push(file);
                }
                owners.forEach((o: string) => affectedPeopleSet.add(o));
            }
        }

        // 3. Repository Health & Bus Factor from Postgres
        let repoBusFactor = 2;
        try {
            const [repoMetrics] = await sql`
                SELECT bus_factor, risk_score 
                FROM repo_metrics 
                WHERE repo_name ILIKE ${`%${repository}%`} OR external_id ILIKE ${`%${repository}%`}
                LIMIT 1
            `;
            if (repoMetrics) {
                repoBusFactor = repoMetrics.bus_factor ?? 2;
            }
        } catch (dbErr: any) {
            console.warn(`[PRRisk] Repo metrics read warning: ${dbErr?.message}`);
        }

        // 4. Knowledge Risk of PR Author
        let authorRiskPercent = 40;
        try {
            const personRisk = await calculateKnowledgeRisk(author);
            authorRiskPercent = Math.round(personRisk.totalRisk * 100);
        } catch (personErr: any) {
            console.warn(`[PRRisk] Knowledge risk calc warning for ${author}: ${personErr?.message}`);
        }

        // 5. Previous Incidents touching same repo / files
        let incidentCount = 0;
        try {
            const incidentEvents = await sql`
                SELECT COUNT(*) as count 
                FROM events 
                WHERE (payload->>'repository' ILIKE ${`%${repository}%`} OR payload->>'text' ILIKE '%incident%')
                  AND created_at >= NOW() - INTERVAL '30 days'
            `;
            incidentCount = Number(incidentEvents[0]?.count ?? 0);
        } catch (err: any) {
            console.warn(`[PRRisk] Incident events read warning: ${err?.message}`);
        }

        // 6. Compute Weighted Risk Score (0-100)
        const blastRiskComponent = Math.min(100, blastRadiusCount * 10);
        const busFactorRiskComponent = repoBusFactor <= 1 ? 90 : (repoBusFactor === 2 ? 50 : 20);
        const incidentRiskComponent = Math.min(100, incidentCount * 25);
        const criticalFilesComponent = Math.min(100, criticalFiles.length * 30);

        const rawScore = Math.round(
            0.25 * blastRiskComponent +
            0.25 * authorRiskPercent +
            0.20 * busFactorRiskComponent +
            0.15 * criticalFilesComponent +
            0.15 * incidentRiskComponent
        );
        const riskScore = Math.max(5, Math.min(99, rawScore));

        // 7. Severity & Recommendations
        let severity: PullRequestRiskOutput['severity'] = 'LOW';
        if (riskScore >= 80) severity = 'CRITICAL';
        else if (riskScore >= 60) severity = 'HIGH';
        else if (riskScore >= 35) severity = 'MEDIUM';

        const recommendations: string[] = [];
        if (criticalFiles.length > 0) {
            recommendations.push(`Critical files modified (${criticalFiles.length}). Require secondary owner sign-off.`);
        }
        if (repoBusFactor <= 1) {
            recommendations.push(`Repository "${repository}" has Bus Factor of 1. Ensure documentation is updated.`);
        }
        if (authorRiskPercent >= 70) {
            recommendations.push(`Author "${author}" has high departure/knowledge risk. Code review by senior peer required.`);
        }
        if (recommendations.length === 0) {
            recommendations.push('Standard peer review recommended before merging.');
        }

        const result: PullRequestRiskOutput = {
            riskScore,
            severity,
            affectedPeople: Array.from(affectedPeopleSet),
            affectedRepositories: Array.from(affectedReposSet),
            criticalFiles,
            recommendations
        };

        // Cache result in Redis (24-hour TTL)
        try {
            await redis.set(cacheKey, JSON.stringify(result), 'EX', 86400);
        } catch (cacheErr: any) {
            console.warn(`[PRRisk] Redis cache write warning: ${cacheErr?.message}`);
        }

        return result;

    } finally {
        await session.close();
    }
}
