import sql from "../../apps/api/config/postgres.js";
import { driver } from "../../apps/api/config/neo4j.js";
import type { DataSource } from '../database/provenance.js';
import { aggregationSources } from '../database/provenance.js';

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
export async function calculateAllTechnologyMetrics(source: DataSource) {
    const session = driver.session();
    const trustedSources = aggregationSources(source);
    try {
        const techResult = await session.run(`MATCH (t:TECHNOLOGY) WHERE t.source IN $trustedSources RETURN t.name AS name`, { trustedSources });
        
        // Hoist active repos from repo_metrics (single source of truth)
        const activeRepoRows = await sql`
            SELECT repo_name, technologies, top_contributors, commit_count
            FROM repo_metrics
            WHERE source IN ${sql([...trustedSources])} AND commit_count > 0 AND status != 'empty'
        `;
        const activeRepoNames = new Set(activeRepoRows.map(r => r.repo_name));
        const totalActiveRepos = activeRepoRows.length;

        for (const record of techResult.records) {
            const techName = record.get("name");

            try {
                const metrics = await calculateTechMetrics(session, techName, totalActiveRepos, activeRepoNames, activeRepoRows, [...trustedSources]);

                await sql`
                    INSERT INTO technology_metrics
                        (source, tech_name, usage_percent, trend_percent, repo_count, contributor_count,
                         commit_count, pr_count, issue_count, top_experts, repos, computed_at)
                    VALUES
                        (${source}, ${techName}, ${metrics.usagePercent}, ${metrics.trendPercent},
                         ${metrics.repoCount}, ${metrics.contributorCount}, ${metrics.commitCount},
                         ${metrics.prCount}, ${metrics.issueCount}, ${sql.json(metrics.topExperts)},
                         ${sql.json(metrics.repos)}, now())
                    ON CONFLICT (source, tech_name)
                    DO UPDATE SET
                        usage_percent    = EXCLUDED.usage_percent,
                        trend_percent    = EXCLUDED.trend_percent,
                        repo_count       = EXCLUDED.repo_count,
                        contributor_count= EXCLUDED.contributor_count,
                        commit_count     = EXCLUDED.commit_count,
                        pr_count         = EXCLUDED.pr_count,
                        issue_count      = EXCLUDED.issue_count,
                        top_experts      = EXCLUDED.top_experts,
                        repos            = EXCLUDED.repos,
                        computed_at      = EXCLUDED.computed_at
                `;

                console.log(`[TechMetrics] ${techName}: usage=${metrics.usagePercent}%, repos=${metrics.repoCount}`);
            } catch (techError: any) {
                console.error(`[TechMetrics] Failed for ${techName}: ${techError?.message}`);
            }
        }

        console.log('=== Technology Metrics Computed ===');
    } catch (error: any) {
        console.error(`[TechMetrics] Fatal error: ${error?.message}`);
    } finally {
        await session.close();
    }
}

async function calculateTechMetrics(
    session: any,
    techName: string,
    totalRepos: number,
    activeRepoNames: Set<string>,
    activeRepoRows: any[],
    trustedSources: string[]
) {
    const combinedRes = await session.run(
        `MATCH (t:TECHNOLOGY) WHERE toLower(t.name) = toLower($techName) AND t.source IN $trustedSources

         // Match direct repo connections (r)-[:USES]-(t) and via contributors/PRs
         OPTIONAL MATCH (r1:REPOSITORY)-[:USES|DEPENDS_ON|MENTIONED_IN]-(t)
         OPTIONAL MATCH (t)<-[:USES]-(pContrib:PERSON)-[:CONTRIBUTED_TO|WORKS_ON]->(r2:REPOSITORY)
         OPTIONAL MATCH (t)-[:MENTIONED_IN|USES]-(:PULL_REQUEST|ISSUE)-[:PART_OF]->(r3:REPOSITORY)
         WITH t, [r IN collect(DISTINCT r1.name) + collect(DISTINCT r2.name) + collect(DISTINCT r3.name) WHERE r IS NOT NULL] AS allRepoNames
         UNWIND (CASE WHEN size(allRepoNames) > 0 THEN allRepoNames ELSE [null] END) AS rName
         WITH t, [rn IN collect(DISTINCT rName) WHERE rn IS NOT NULL] AS repoNames
         WITH t, repoNames, size(repoNames) AS repoCount

         // Contributors who directly use tech OR commit to repos using this tech
         OPTIONAL MATCH (p1:PERSON)-[:USES]-(t)
         OPTIONAL MATCH (p2:PERSON)-[:CONTRIBUTED_TO|WORKS_ON]->(rRepo:REPOSITORY)
         WHERE rRepo.name IN repoNames
         WITH t, repoNames, repoCount, [p IN collect(DISTINCT COALESCE(p1.name, p1.externalId)) + collect(DISTINCT COALESCE(p2.name, p2.externalId)) WHERE p IS NOT NULL] AS allContribs
         UNWIND (CASE WHEN size(allContribs) > 0 THEN allContribs ELSE [null] END) AS cName
         WITH t, repoNames, repoCount, [cn IN collect(DISTINCT cName) WHERE cn IS NOT NULL] AS contribNames
         WITH t, repoNames, repoCount, contribNames, size(contribNames) AS contributorCount

         // Activities count (Commits, PRs, Issues)
         OPTIONAL MATCH (t)-[:MENTIONED_IN|USES]-(e3)
         WITH t, repoNames, repoCount, contributorCount, labels(e3)[0] AS actType, count(e3) AS actCount
         WITH t, repoNames, repoCount, contributorCount, collect({type: actType, count: actCount}) AS activities

         // Top experts by commit volume to repositories using this tech
         OPTIONAL MATCH (pExpert:PERSON)-[rel:CONTRIBUTED_TO]->(rExp:REPOSITORY)
         WHERE rExp.name IN repoNames AND pExpert.name IS NOT NULL
         WITH repoNames, repoCount, contributorCount, activities, pExpert.name AS expertName, sum(COALESCE(rel.commitCount, 1)) AS expertScore
         ORDER BY expertScore DESC
         WITH repoNames, repoCount, contributorCount, activities,
              [item IN collect({name: expertName, score: expertScore}) WHERE item.name IS NOT NULL][0..5] AS topExperts
         RETURN repoCount, contributorCount, repoNames, activities, topExperts`,
        { techName, trustedSources }
    );

    const rec = combinedRes.records[0];
    const rawRepos = (rec?.get("repoNames") || []).filter(Boolean);
    
    // Strict Invariant 1 & 9: Exclude scaffold/empty repos and repos not in active repo_metrics
    const reposSet = new Set<string>();
    for (const r of rawRepos) {
        if (activeRepoNames.has(r)) {
            reposSet.add(r);
        }
    }

    // Also check activeRepoRows for explicit tech inclusion
    const lowerTech = techName.toLowerCase();
    for (const rRow of activeRepoRows) {
        const techs = Array.isArray(rRow.technologies) ? rRow.technologies : [];
        if (techs.some((t: string) => t && t.toLowerCase() === lowerTech)) {
            reposSet.add(rRow.repo_name);
        }
    }

    const repos = Array.from(reposSet);
    const repoCount = repos.length;
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
        repos,
        usagePercent: totalRepos > 0 ? Math.round((repoCount / totalRepos) * 100) : 0,
        contributorCount,
        commitCount,
        prCount,
        issueCount,
        topExperts,
        trendPercent: 0,
    };
}
