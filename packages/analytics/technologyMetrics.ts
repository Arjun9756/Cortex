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
        
        // P1-5: Hoist totalRepos outside the loop instead of querying N times
        const totalRepoResult = await session.run(`MATCH (r:REPOSITORY) RETURN count(r) AS total`);
        const totalRepos = totalRepoResult.records[0]?.get("total")?.toNumber ? totalRepoResult.records[0]?.get("total")?.toNumber() : Number(totalRepoResult.records[0]?.get("total") || 1);

        for (const record of techResult.records) {
            const techName = record.get("name");

            // Bug #6 fix: per-record try/catch so one bad technology doesn't abort the whole batch
            try {
                const metrics = await calculateTechMetrics(session, techName, totalRepos);

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

async function calculateTechMetrics(session: any, techName: string, totalRepos: number) {
    // P1-5: Combined single Cypher query for repoCount, contributorCount, activities, and topExperts
    const combinedRes = await session.run(
        `MATCH (t:TECHNOLOGY) WHERE toLower(t.name) = toLower($techName)

         OPTIONAL MATCH (t)-[:MENTIONED_IN|USES]-(e1)-[:PART_OF]->(r:REPOSITORY)
         WITH t, count(DISTINCT r) AS repoCount

         OPTIONAL MATCH (p1:PERSON)-[]-(e2)-[:MENTIONED_IN|USES]-(t)
         WITH t, repoCount, count(DISTINCT p1) AS contributorCount

         OPTIONAL MATCH (t)-[:MENTIONED_IN]-(e3)
         WITH t, repoCount, contributorCount, labels(e3)[0] AS actType, count(e3) AS actCount
         WITH t, repoCount, contributorCount, collect({type: actType, count: actCount}) AS activities

         OPTIONAL MATCH (p2:PERSON)-[:AUTHORED|WORKS_ON|USES]-(e4)-[:MENTIONED_IN|USES]-(t)
         WITH repoCount, contributorCount, activities, p2.name AS expertName, count(e4) AS expertScore
         ORDER BY expertScore DESC
         WITH repoCount, contributorCount, activities,
              [item IN collect({name: expertName, score: expertScore}) WHERE item.name IS NOT NULL][0..5] AS topExperts
         RETURN repoCount, contributorCount, activities, topExperts`,
        { techName }
    );

    const rec = combinedRes.records[0];
    const repoCount = rec?.get("repoCount")?.toNumber ? rec?.get("repoCount")?.toNumber() : Number(rec?.get("repoCount") || 0);
    const contributorCount = rec?.get("contributorCount")?.toNumber ? rec?.get("contributorCount")?.toNumber() : Number(rec?.get("contributorCount") || 0);

    let commitCount = 0, prCount = 0, issueCount = 0;
    const activities = rec?.get("activities") || [];
    for (const act of activities) {
        const type = act.type;
        const count = act.count?.toNumber ? act.count.toNumber() : Number(act.count || 0);
        if (type === "COMMIT") commitCount = count;
        if (type === "PULL_REQUEST") prCount = count;
        if (type === "ISSUE") issueCount = count;
    }

    const rawTopExperts = rec?.get("topExperts") || [];
    const topExperts = rawTopExperts.map((r: any) => ({
        name: r.name,
        score: r.score?.toNumber ? r.score.toNumber() : Number(r.score || 0),
    }));

    return {
        repoCount,
        usagePercent: totalRepos > 0 ? Math.round((repoCount / totalRepos) * 100) : 0,
        contributorCount,
        commitCount,
        prCount,
        issueCount,
        topExperts,
        trendPercent: 0,
    };
}