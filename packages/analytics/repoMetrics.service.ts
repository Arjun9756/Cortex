import { neo4jSession } from "../../apps/api/config/neo4j.js";
import sql from "../../apps/api/config/postgres.js";
import { getGraphSchema } from "../database/neo4j/schemaCache.js";

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

    // Bug #5 fix: check schema before running AUTHORED/PART_OF queries
    let hasAuthored = true
    let hasPartOf = true
    try {
        const schema = await getGraphSchema()
        hasAuthored = schema.relationshipTypes.includes('AUTHORED')
        hasPartOf   = schema.relationshipTypes.includes('PART_OF')
        if (!hasAuthored) console.warn('[RepoMetrics] AUTHORED relation not in schema — bus factor will be 0')
        if (!hasPartOf)   console.warn('[RepoMetrics] PART_OF relation not in schema — contributor count may be incomplete')
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
                const contributorsResult = await session.run(
                    `MATCH (p:PERSON)-[]-(e)-[:PART_OF]->(r {name: $repoName})
                     RETURN count(DISTINCT p) AS count`,
                    { repoName }
                );
                const contributorCount = contributorsResult.records[0]?.get("count")?.toNumber() ?? 0;

                // Bug #5 fix: only run bus factor Cypher if AUTHORED exists in schema
                const { busFactor, primaryOwner, totalCommits } = (hasAuthored && hasPartOf)
                    ? await calculateBusFactorAndOwner(session, repoName)
                    : { busFactor: 0, primaryOwner: null, totalCommits: 0 };

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

/**
 * Calculates the bus factor (minimum contributors covering >=50% of commits)
 * and identifies the primary owner (top committer by commit count).
 * Uses AUTHORED and PART_OF relations — callers must verify these exist in schema first.
 */
async function calculateBusFactorAndOwner(
    session: any, 
    repoName: string
): Promise<{ busFactor: number; primaryOwner: string | null; totalCommits: number }> {
    try {
        const result = await session.run(
            `MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r {name: $repoName})
             WHERE p.name IS NOT NULL OR p.canonicalPersonId IS NOT NULL OR p.externalId IS NOT NULL
             WITH COALESCE(p.canonicalPersonId, p.externalId, p.email, p.name) AS personKey,
                  head(collect(COALESCE(p.name, p.externalId, 'Unknown'))) AS personName,
                  count(c) AS commits
             RETURN personName AS person, commits
             ORDER BY commits DESC`,
            { repoName }
        );

        if (result.records.length === 0) return { busFactor: 0, primaryOwner: null, totalCommits: 0 };

        const rows = result.records.map((r: any) => ({
            person: r.get("person") as string,
            commits: r.get("commits")?.toNumber() ?? 0,
        }));

        // Primary owner = top committer (first record, already sorted DESC)
        const primaryOwner = rows[0]?.person ?? null;

        const total = rows.reduce((a: number, b: { commits: number }) => a + b.commits, 0);
        if (total === 0) return { busFactor: 0, primaryOwner, totalCommits: 0 };

        let covered = 0, count = 0;
        for (const row of rows) {
            covered += row.commits;
            count++;
            if (covered / total >= 0.5) break;
        }
        return { busFactor: count, primaryOwner, totalCommits: total };
    } catch (error: any) {
        console.error(`[RepoMetrics] calculateBusFactorAndOwner failed for ${repoName}: ${error?.message}`);
        return { busFactor: 0, primaryOwner: null, totalCommits: 0 };
    }
}
