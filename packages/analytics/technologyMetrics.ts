import sql from "../../apps/api/config/postgres.js";
import { driver } from "../../apps/api/config/neo4j.js";

/**
 * Migration note: technology_metrics table must have these columns:
 *
 *   tech_name VARCHAR(255) UNIQUE NOT NULL
 *
 * Technologies use tech_name (not externalId) as the natural key — technology names
 * don't get renamed the way people/repos do, so a name-based UNIQUE constraint is correct here.
 *
 * If the constraint is missing:
 *   CREATE UNIQUE INDEX IF NOT EXISTS technology_metrics_tech_name_idx ON technology_metrics (tech_name);
 */
export async function calculateAllTechnologyMetrics() {
    const session = driver.session();
    try {
        const techResult = await session.run(`MATCH (t:TECHNOLOGY) RETURN t.name AS name`);

        for (const record of techResult.records) {
            const techName = record.get("name");

            // Bug #6 fix: per-record try/catch so one bad technology doesn't abort the whole batch
            try {
                const metrics = await calculateTechMetrics(session, techName);

                await sql`
                    INSERT INTO technology_metrics
                        (tech_name, usage_percent, trend_percent, repo_count, contributor_count,
                         commit_count, pr_count, issue_count, top_experts, computed_at)
                    VALUES
                        (${techName}, ${metrics.usagePercent}, ${metrics.trendPercent},
                         ${metrics.repoCount}, ${metrics.contributorCount}, ${metrics.commitCount},
                         ${metrics.prCount}, ${metrics.issueCount}, ${sql.json(metrics.topExperts)}, now())
                    ON CONFLICT (tech_name)
                    DO UPDATE SET
                        usage_percent    = EXCLUDED.usage_percent,
                        trend_percent    = EXCLUDED.trend_percent,
                        repo_count       = EXCLUDED.repo_count,
                        contributor_count= EXCLUDED.contributor_count,
                        commit_count     = EXCLUDED.commit_count,
                        pr_count         = EXCLUDED.pr_count,
                        issue_count      = EXCLUDED.issue_count,
                        top_experts      = EXCLUDED.top_experts,
                        computed_at      = EXCLUDED.computed_at
                `;

                console.log(`[TechMetrics] ${techName}: usage=${metrics.usagePercent}%`);
            } catch (techError: any) {
                console.error(`[TechMetrics] Failed for ${techName}: ${techError?.message}`);
                // Continue to next technology — don't let one failure abort the whole batch
            }
        }

        console.log('=== Technology Metrics Computed ===');
    } catch (error: any) {
        console.error(`[TechMetrics] Fatal error: ${error?.message}`);
    } finally {
        await session.close();
    }
}

async function calculateTechMetrics(session: any, techName: string) {
    const repoResult = await session.run(
        `MATCH (t {name: $techName})-[:MENTIONED_IN|USES]-(e)-[:PART_OF]->(r:REPOSITORY)
         RETURN count(DISTINCT r) AS repoCount`,
        { techName }
    );
    const repoCount = repoResult.records[0]?.get("repoCount")?.toNumber() ?? 0;

    const totalRepoResult = await session.run(`MATCH (r:REPOSITORY) RETURN count(r) AS total`);
    const totalRepos = totalRepoResult.records[0]?.get("total")?.toNumber() ?? 1;

    const contributorResult = await session.run(
        `MATCH (p:PERSON)-[]-(e)-[:MENTIONED_IN|USES]-(t {name: $techName})
         RETURN count(DISTINCT p) AS count`,
        { techName }
    );
    const contributorCount = contributorResult.records[0]?.get("count")?.toNumber() ?? 0;

    const activityResult = await session.run(
        `MATCH (t {name: $techName})-[:MENTIONED_IN]-(e)
         RETURN labels(e)[0] AS type, count(e) AS count`,
        { techName }
    );
    let commitCount = 0, prCount = 0, issueCount = 0;
    activityResult.records.forEach((r: any) => {
        const type = r.get("type");
        const count = r.get("count")?.toNumber() ?? 0;
        if (type === "COMMIT") commitCount = count;
        if (type === "PULL_REQUEST") prCount = count;
        if (type === "ISSUE") issueCount = count;
    });

    const expertResult = await session.run(
        `MATCH (p:PERSON)-[:AUTHORED]->(e)-[:MENTIONED_IN]-(t {name: $techName})
         RETURN p.name AS name, count(e) AS score
         ORDER BY score DESC LIMIT 5`,
        { techName }
    );
    const topExperts = expertResult.records.map((r: any) => ({
        name: r.get("name"),
        score: r.get("score")?.toNumber() ?? 0,
    }));

    return {
        repoCount,
        usagePercent: totalRepos > 0 ? Math.round((repoCount / totalRepos) * 100) : 0,
        contributorCount,
        commitCount,
        prCount,
        issueCount,
        topExperts,
        // Bug #8 fix: document that this is a placeholder, not a working metric.
        // TODO: requires time-series commit history bucketed by week/month; not yet implemented.
        trendPercent: 0,
    };
}