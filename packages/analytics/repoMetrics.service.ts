import { driver } from "../../apps/api/config/neo4j.js";
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
    const session = driver.session();

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
            const externalId = record.get("externalId");

            if (!externalId) {
                console.warn(`[RepoMetrics] Skipping repo without externalId: ${repoName}`);
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
                const busFactor = (hasAuthored && hasPartOf)
                    ? await calculateBusFactor(session, repoName)
                    : 0

                const riskScore = Math.max(0, 100 - busFactor * 20);

                await sql`
                    INSERT INTO repo_metrics
                        (external_id, repo_name, bus_factor, risk_score, contributor_count, status, computed_at)
                    VALUES
                        (${externalId}, ${repoName}, ${busFactor}, ${riskScore}, ${contributorCount},
                         ${riskScore > 80 ? 'fragile' : riskScore > 50 ? 'concentrated' : 'healthy'}, now())
                    ON CONFLICT (external_id)
                    DO UPDATE SET
                        repo_name        = EXCLUDED.repo_name,
                        bus_factor       = EXCLUDED.bus_factor,
                        risk_score       = EXCLUDED.risk_score,
                        contributor_count= EXCLUDED.contributor_count,
                        status           = EXCLUDED.status,
                        computed_at      = EXCLUDED.computed_at
                `;

                console.log(`[RepoMetrics] ${repoName} (${externalId}): busFactor=${busFactor}, risk=${riskScore}`);
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
 * Calculates the bus factor: minimum number of contributors covering >=50% of commits.
 * Uses AUTHORED and PART_OF relations — callers must verify these exist in schema first.
 */
async function calculateBusFactor(session: any, repoName: string): Promise<number> {
    try {
        const result = await session.run(
            `MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r {name: $repoName})
             RETURN p.name AS person, count(c) AS commits
             ORDER BY commits DESC`,
            { repoName }
        );

        const commits = result.records.map((r: any) => r.get("commits")?.toNumber() ?? 0);
        const total = commits.reduce((a: number, b: number) => a + b, 0);
        if (total === 0) return 0;

        let covered = 0, count = 0;
        for (const c of commits) {
            covered += c;
            count++;
            if (covered / total >= 0.5) break;
        }
        return count;
    } catch (error: any) {
        console.error(`[RepoMetrics] calculateBusFactor failed for ${repoName}: ${error?.message}`)
        return 0
    }
}