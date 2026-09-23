import { neo4jSession } from "../../apps/api/config/neo4j.js";
import sql from "../../apps/api/config/postgres.js";
import { getGraphSchema } from "../database/neo4j/schemaCache.js";
import { CYPHER_BOT_FILTER } from "../shared/botDetection.js";

/**
 * Migration note: repo_metrics table must have these columns for this service to work:
 *
 *   external_id VARCHAR(255) UNIQUE NOT NULL
 *
 * If the table was created before this constraint existed, run:
 *   ALTER TABLE repo_metrics ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
 *   CREATE UNIQUE INDEX IF NOT EXISTS repo_metrics_external_id_idx ON repo_metrics (external_id);
 *
 * risk_score is stored as a 0–100 INTEGER (percentage).
 */
export async function calculateAllRepoMetrics() {
    const session = neo4jSession();

    // Check schema before running queries
    let hasAuthored = true
    let hasPartOf = true
    let hasContributedTo = true
    try {
        const schema = await getGraphSchema()
        hasAuthored = schema.relationshipTypes.includes('AUTHORED')
        hasPartOf   = schema.relationshipTypes.includes('PART_OF')
        hasContributedTo = schema.relationshipTypes.includes('CONTRIBUTED_TO')
    } catch (schemaErr: any) {
        console.warn('[RepoMetrics] Schema fetch failed, proceeding with best-effort queries:', schemaErr?.message)
    }

    try {
        const repos = await session.run(`MATCH (r:REPOSITORY) RETURN r.name AS name, r.externalId AS externalId`);

        for (const record of repos.records) {
            const repoName = record.get("name");
            const externalId = record.get("externalId") || repoName;

            if (!externalId) {
                console.warn(`[RepoMetrics] Skipping repo without name/externalId`);
                continue;
            }

            // Bug #6 fix: per-record try/catch so one bad repo doesn't abort the whole batch
            try {
                // P0-1: Contributor count includes CONTRIBUTED_TO, WORKS_ON, and legacy PART_OF
                const contributorsResult = await session.run(
                    `MATCH (r:REPOSITORY)
                     WHERE toLower(r.name) = toLower($repoName)
                     OPTIONAL MATCH (p1:PERSON)-[:CONTRIBUTED_TO|WORKS_ON]->(r)
                     OPTIONAL MATCH (p2:PERSON)-[]-(e)-[:PART_OF]->(r)
                     WITH collect(DISTINCT p1) + collect(DISTINCT p2) AS allP
                     UNWIND allP AS p
                     WITH p WHERE p IS NOT NULL
                       AND ${CYPHER_BOT_FILTER}
                       AND COALESCE(p.isActive, true) = true
                       AND COALESCE(p.employmentStatus, 'active') <> 'alumni'
                     RETURN count(DISTINCT COALESCE(p.canonicalPersonId, p.externalId, p.email, p.name)) AS count`,
                    { repoName }
                );
                const contributorCount = contributorsResult.records[0]?.get("count")?.toNumber() ?? 0;

                // P0-1: Bus factor calculated via CONTRIBUTED_TO rollup edges with legacy fallback
                const { busFactor, primaryOwner, totalCommits } = await calculateBusFactorAndOwner(session, repoName);

                // Empty / scaffold repository: 0 commits or 0 contributors
                const isEmpty = totalCommits === 0 || contributorCount === 0;

                // If empty: bus_factor = 0, risk_score = 0, status = 'empty' (not fragile)
                // Real repos: busFactor = 1 → risk 80 (fragile), busFactor = 2 → risk 60 (concentrated), etc.
                const busFactorFinal = isEmpty ? 0 : busFactor;
                const riskScore = isEmpty ? 0 : Math.max(0, 100 - busFactor * 20);
                const status = isEmpty
                    ? 'empty'
                    : (riskScore >= 80 ? 'fragile' : riskScore > 50 ? 'concentrated' : 'healthy');

                await sql`
                    INSERT INTO repo_metrics
                        (external_id, repo_name, bus_factor, risk_score, contributor_count, primary_owner, status, computed_at)
                    VALUES
                        (${externalId}, ${repoName}, ${busFactorFinal}, ${riskScore}, ${contributorCount},
                         ${isEmpty ? null : (primaryOwner ?? null)},
                         ${status}, now())
                    ON CONFLICT (external_id)
                    DO UPDATE SET
                        repo_name        = EXCLUDED.repo_name,
                        bus_factor       = EXCLUDED.bus_factor,
                        risk_score       = EXCLUDED.risk_score,
                        contributor_count= EXCLUDED.contributor_count,
                        primary_owner    = EXCLUDED.primary_owner,
                        status           = EXCLUDED.status,
                        computed_at      = EXCLUDED.computed_at
                `;

                console.log(`[RepoMetrics] ${repoName} (${externalId}): status=${status}, busFactor=${busFactorFinal}, risk=${riskScore}, owner=${primaryOwner ?? 'none'}`);
            } catch (repoError: any) {
                console.error(`[RepoMetrics] Failed for ${repoName}: ${repoError?.message}`);
                // Continue to next repo — don't let one failure abort the whole batch
            }
        }

        console.log('=== Repo Metrics Computed ===');
    } catch (error: any) {
        console.error(`[RepoMetrics] Fatal error: ${error?.message}`);
    } finally {
        await session.close();
    }
}

export interface ContributorShare {
    person: string;
    commits: number;
    percentage: number;
}

export interface BusFactorResult {
    busFactor: number;
    primaryOwner: string | null;
    totalCommits: number;
    contributors: ContributorShare[];
    status: 'empty' | 'fragile' | 'concentrated' | 'healthy';
    riskScore: number;
    definition: string;
    qualification: string;
}

/**
 * Calculates the bus factor (minimum contributors covering >=50% of commits)
 * and identifies the primary owner (top committer by commit count).
 * P0-1: Queries CONTRIBUTED_TO rollup edges with fallback to legacy COMMIT nodes.
 */
export async function calculateBusFactorAndOwner(
    session: any, 
    repoName: string
): Promise<BusFactorResult> {
    const definition = "Bus Factor represents the minimum number of engineers whose combined contributions account for >= 50% of the repository's commit volume.";
    const qualification = "Engineering Activity (Not a measure of individual productivity or output).";

    try {
        // 1. Primary path: query CONTRIBUTED_TO relationship rollup
        const contribRes = await session.run(
            `MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
             WHERE toLower(r.name) = toLower($repoName)
               AND (p.name IS NOT NULL OR p.canonicalPersonId IS NOT NULL OR p.externalId IS NOT NULL)
               AND ${CYPHER_BOT_FILTER}
               AND COALESCE(p.isActive, true) = true
               AND COALESCE(p.employmentStatus, 'active') <> 'alumni'
             WITH COALESCE(p.canonicalPersonId, p.externalId, p.email, p.name) AS personKey,
                  head(collect(COALESCE(p.name, p.externalId, 'Unknown'))) AS personName,
                  sum(COALESCE(rel.commitCount, 1)) AS commits
             RETURN personName AS person, commits
             ORDER BY commits DESC, person ASC`,
            { repoName }
        );

        let rows: Array<{ person: string; commits: number }> = [];

        if (contribRes.records.length > 0) {
            rows = contribRes.records.map((r: any) => ({
                person: r.get("person") as string,
                commits: r.get("commits")?.toNumber ? r.get("commits").toNumber() : Number(r.get("commits") || 0),
            })).filter((r: { person: string; commits: number }) => r.commits > 0);
        }

        // 2. Fallback path for legacy graphs with uncompacted COMMIT nodes
        if (rows.length === 0) {
            const legacyRes = await session.run(
                `MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY)
                 WHERE toLower(r.name) = toLower($repoName)
                   AND (p.name IS NOT NULL OR p.canonicalPersonId IS NOT NULL OR p.externalId IS NOT NULL)
                   AND ${CYPHER_BOT_FILTER}
                   AND COALESCE(p.isActive, true) = true
                   AND COALESCE(p.employmentStatus, 'active') <> 'alumni'
                 WITH COALESCE(p.canonicalPersonId, p.externalId, p.email, p.name) AS personKey,
                      head(collect(COALESCE(p.name, p.externalId, 'Unknown'))) AS personName,
                      count(c) AS commits
                 RETURN personName AS person, commits
                 ORDER BY commits DESC, person ASC`,
                { repoName }
            );

            if (legacyRes.records.length > 0) {
                rows = legacyRes.records.map((r: any) => ({
                    person: r.get("person") as string,
                    commits: r.get("commits")?.toNumber ? r.get("commits").toNumber() : Number(r.get("commits") || 0),
                }));
            }
        }

        if (rows.length === 0) {
            return {
                busFactor: 0,
                primaryOwner: null,
                totalCommits: 0,
                contributors: [],
                status: 'empty',
                riskScore: 0,
                definition,
                qualification
            };
        }

        const total = rows.reduce((a: number, b: { commits: number }) => a + b.commits, 0);
        if (total === 0) {
            return {
                busFactor: 0,
                primaryOwner: rows[0]?.person ?? null,
                totalCommits: 0,
                contributors: [],
                status: 'empty',
                riskScore: 0,
                definition,
                qualification
            };
        }

        const contributors: ContributorShare[] = rows.map(r => ({
            person: r.person,
            commits: r.commits,
            percentage: Math.round((r.commits / total) * 1000) / 10
        }));

        const primaryOwner = rows[0]?.person ?? null;

        let covered = 0, count = 0;
        for (const row of rows) {
            covered += row.commits;
            count++;
            if (covered / total >= 0.5) break;
        }

        const riskScore = Math.max(0, 100 - count * 20);
        const status = riskScore >= 80 ? 'fragile' : riskScore > 50 ? 'concentrated' : 'healthy';

        return {
            busFactor: count,
            primaryOwner,
            totalCommits: total,
            contributors,
            status,
            riskScore,
            definition,
            qualification
        };
    } catch (error: any) {
        console.error(`[RepoMetrics] calculateBusFactorAndOwner failed for ${repoName}: ${error?.message}`);
        return {
            busFactor: 0,
            primaryOwner: null,
            totalCommits: 0,
            contributors: [],
            status: 'empty',
            riskScore: 0,
            definition,
            qualification
        };
    }
}
