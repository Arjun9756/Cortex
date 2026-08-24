import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';
import { calculateSuccessorCandidates } from '../packages/analytics/successor.service.js';

async function getRepoDetails(repoName: string) {
    const session = driver.session();
    try {
        console.log(`=== Testing Repo Details for: "${repoName}" ===\n`);

        // 1. Fetch from Postgres repo_metrics
        const [metric] = await sql`
            SELECT repo_name, bus_factor, risk_score, contributor_count, status, computed_at
            FROM repo_metrics
            WHERE lower(repo_name) = lower(${repoName})
            LIMIT 1
        `;

        // 2. Fetch Contributors and commit counts from Neo4j
        const contribsRes = await session.run(`
            MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY)
            WHERE lower(r.name) = lower($repoName)
            WITH p, count(c) AS commits
            RETURN p.name AS name, p.email AS email, p.role AS role, commits
            ORDER BY commits DESC
        `, { repoName });

        const contributors = contribsRes.records.map(rec => ({
            name: rec.get('name'),
            email: rec.get('email'),
            role: rec.get('role'),
            commitCount: rec.get('commits')?.toNumber?.() ?? Number(rec.get('commits'))
        }));

        const totalCommits = contributors.reduce((acc, c) => acc + c.commitCount, 0);
        const topContributor = contributors[0] || null;
        const primaryOwner = topContributor ? {
            ...topContributor,
            ownershipPercentage: totalCommits > 0 ? Math.round((topContributor.commitCount / totalCommits) * 100) : 100
        } : null;

        // 3. Fetch Technologies used in this repository
        const techRes = await session.run(`
            MATCH (r:REPOSITORY)
            WHERE lower(r.name) = lower($repoName)
            OPTIONAL MATCH (r)<-[:PART_OF|FIXED_BY*1..2]-(work)-[:USES|MENTIONED_IN|HAS_PROBLEM]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (r)<-[:WORKS_ON|CONTRIBUTED_TO]-(p:PERSON)-[:USES]->(t2:TECHNOLOGY)
            WITH collect(DISTINCT t1.name) + collect(DISTINCT t2.name) AS rawTechs
            RETURN [t in rawTechs WHERE t IS NOT NULL] AS technologies
        `, { repoName });

        const rawTechs = techRes.records[0]?.get('technologies') || [];
        const technologies = [...new Set(rawTechs.filter(Boolean))];

        // 4. Fetch Recent Activity (commits / PRs)
        const activityRes = await session.run(`
            MATCH (r:REPOSITORY)<-[:PART_OF]-(work)
            WHERE lower(r.name) = lower($repoName) AND (work:COMMIT OR work:PULL_REQUEST)
            OPTIONAL MATCH (author:PERSON)-[:AUTHORED|CREATED]->(work)
            RETURN work.name AS title, work.hash AS hash, work.externalId AS externalId,
                   labels(work)[0] AS type,
                   coalesce(work.createdAt, work.created_at, work.timestamp) AS date,
                   author.name AS author
            ORDER BY date DESC
            LIMIT 10
        `, { repoName });

        const recentActivity = activityRes.records.map(rec => ({
            title: rec.get('title'),
            hash: rec.get('hash'),
            externalId: rec.get('externalId'),
            type: rec.get('type') || 'COMMIT',
            date: rec.get('date'),
            author: rec.get('author') || 'Team Engineer'
        }));

        // 5. Compute Risk Explanation
        const busFactor = metric?.bus_factor ?? (contributors.length <= 1 ? 1 : contributors.length);
        const riskScore = metric?.risk_score ?? Math.max(0, 100 - busFactor * 20);
        const isSPOF = busFactor <= 1;

        const factors: string[] = [];
        if (isSPOF) {
            factors.push(`Bus factor of ${busFactor} indicates a Single Point of Failure (SPOF).`);
            if (primaryOwner) {
                factors.push(`${primaryOwner.name} authored ${primaryOwner.ownershipPercentage}% (${primaryOwner.commitCount}/${totalCommits || 1}) of all indexed commits.`);
            }
            if (contributors.length <= 1) {
                factors.push(`Zero active co-maintainers or secondary reviewers found in graph records.`);
            }
        } else {
            factors.push(`Bus factor of ${busFactor} indicates distributed contributor coverage.`);
            factors.push(`${contributors.length} active contributors maintain this repository.`);
        }

        if (technologies.length > 0) {
            factors.push(`Relies on ${technologies.length} key stack technologies: ${technologies.slice(0, 4).join(', ')}${technologies.length > 4 ? '...' : ''}.`);
        }

        // 6. Find Suggested Backup Owners
        let suggestedBackups: any[] = [];
        if (primaryOwner) {
            const succRes = await calculateSuccessorCandidates(primaryOwner.name);
            suggestedBackups = succRes.candidates.slice(0, 3).map(c => ({
                name: c.name,
                score: c.score,
                sharedTechnologies: c.factors.sharedTechnologies,
                capacityScore: c.breakdown.workloadCapacityScore,
                rationale: c.rationale
            }));
        }

        const details = {
            repoName: metric?.repo_name || repoName,
            busFactor,
            riskScore,
            status: metric?.status || (isSPOF ? 'fragile' : 'healthy'),
            contributorCount: contributors.length || metric?.contributor_count || 1,
            primaryOwner,
            contributors,
            technologies,
            recentActivity,
            riskExplanation: {
                summary: isSPOF
                    ? `Critical Single Point of Failure: ${primaryOwner?.name || 'Sole Contributor'} holds 100% of architectural knowledge.`
                    : `Distributed Repository: Maintained by ${contributors.length} contributors with acceptable redundancy.`,
                factors,
                isSPOF
            },
            suggestedBackups
        };

        console.log('Result Details:');
        console.log(JSON.stringify(details, null, 2));

    } finally {
        await session.close();
        await sql.end();
    }
}

getRepoDetails('Cortex');
