import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';
import neo4j from 'neo4j-driver';

function parseNeo4jTimestamp(raw: any): number | null {
    if (!raw) return null;
    if (neo4j.isInt(raw)) return raw.toNumber();
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
        const num = Number(raw);
        if (!isNaN(num) && num > 1000000) return num;
        const parsed = new Date(raw).getTime();
        if (!isNaN(parsed)) return parsed;
    }
    if (raw.low !== undefined && raw.high !== undefined) {
        return neo4j.integer.toNumber(raw);
    }
    return null;
}

export async function testPerRepoSuccessors(targetPersonName: string) {
    const session = driver.session();
    try {
        // 1. Fetch Postgres data
        const [pmRows, rmRows, eventRows] = await Promise.all([
            sql`SELECT person_name, external_id, risk_score, repos, top_technologies FROM person_metrics`,
            sql`SELECT repo_name, bus_factor, primary_owner FROM repo_metrics`,
            sql`SELECT coalesce(payload->'sender'->>'login', payload->'pusher'->>'name', payload->'actor'->>'login') AS author, MAX(created_at) as latest_event FROM events WHERE payload IS NOT NULL GROUP BY author`
        ]);

        const candidateNames: string[] = pmRows.map(r => r.person_name).filter(Boolean);

        // 2. Scoped query for candidates and target
        const graphRes = await session.run(`
            MATCH (p:PERSON)
            WHERE toLower(p.name) = toLower($targetPersonName) OR p.name IN $candidateNames
            OPTIONAL MATCH (p)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED|WORKS_ON|ASSIGNED_TO|CONTRIBUTED_TO]-(w)-[:USES|MENTIONED_IN]-(t2:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:WORKS_ON|CONTRIBUTED_TO]-(r1:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]-(w)-[:PART_OF|BELONGS_TO]-(r2:REPOSITORY)
            WITH p,
                 collect(DISTINCT toLower(trim(t1.name))) + collect(DISTINCT toLower(trim(t2.name))) AS rawTechs,
                 collect(DISTINCT toLower(trim(r1.name))) + collect(DISTINCT toLower(trim(r2.name))) AS rawRepos,
                 max(coalesce(w.timestamp, w.createdAt, w.created_at)) AS latestTime
            RETURN p.name AS name,
                   p.email AS email,
                   p.externalId AS externalId,
                   rawTechs,
                   rawRepos,
                   latestTime
        `, { targetPersonName, candidateNames });

        // Also fetch repository-level technologies from Neo4j
        const repoTechRes = await session.run(`
            MATCH (r:REPOSITORY)
            OPTIONAL MATCH (r)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (c:COMMIT)-[:PART_OF]->(r)
            OPTIONAL MATCH (c)-[:USES]->(t2:TECHNOLOGY)
            RETURN toLower(r.name) AS repoName,
                   collect(DISTINCT toLower(trim(t1.name))) + collect(DISTINCT toLower(trim(t2.name))) AS techs
        `);

        const repoTechMap = new Map<string, Set<string>>();
        for (const r of repoTechRes.records) {
            const rName = r.get('repoName');
            const techs = new Set<string>((r.get('techs') || []).filter(Boolean));
            repoTechMap.set(rName, techs);
        }

        // SPOF repo set
        const spofRepoMap = new Map<string, number>();
        for (const rm of rmRows) {
            if (rm.repo_name) {
                const bf = Number(rm.bus_factor);
                spofRepoMap.set(rm.repo_name.toLowerCase().trim(), bf);
            }
        }

        // Build profiles
        const profileMap = new Map<string, any>();
        for (const record of graphRes.records) {
            const name: string = record.get('name');
            if (!name || !name.trim()) continue;

            const rawTechs: string[] = record.get('rawTechs') || [];
            const rawRepos: string[] = record.get('rawRepos') || [];
            const techs = new Set<string>(rawTechs.filter(Boolean));
            const repos = new Set<string>(rawRepos.filter(Boolean));
            let latestActivityTimestamp: number | null = parseNeo4jTimestamp(record.get('latestTime'));

            let knowledgeRisk = 0.20;
            const matchedPM = pmRows.find(pm => pm.person_name && pm.person_name.toLowerCase() === name.toLowerCase());
            if (matchedPM) {
                if (matchedPM.risk_score != null) {
                    knowledgeRisk = Number(matchedPM.risk_score) / 100;
                }
                if (Array.isArray(matchedPM.repos)) {
                    matchedPM.repos.forEach((r: string) => { if (r) repos.add(r.trim().toLowerCase()); });
                }
                if (Array.isArray(matchedPM.top_technologies)) {
                    matchedPM.top_technologies.forEach((t: any) => {
                        const tName = typeof t === 'string' ? t : (t?.name || t?.tech);
                        if (tName) techs.add(tName.trim().toLowerCase());
                    });
                }
            }

            const firstName = name.split(' ')[0]?.toLowerCase() || name.toLowerCase();
            const matchedEvent = eventRows.find(ev => ev.author && ev.author.toLowerCase().includes(firstName));
            if (matchedEvent?.latest_event) {
                const t = new Date(matchedEvent.latest_event).getTime();
                if (!latestActivityTimestamp || t > latestActivityTimestamp) {
                    latestActivityTimestamp = t;
                }
            }

            let spofCount = 0;
            for (const r of repos) {
                const bf = spofRepoMap.get(r);
                if (bf !== undefined && bf <= 1) spofCount++;
            }

            profileMap.set(name.toLowerCase(), {
                name,
                technologies: techs,
                repositories: repos,
                latestActivityTimestamp,
                spofReposCount: spofCount,
                knowledgeRisk
            });
        }

        const SLACK_ID_PATTERN = /^U[A-Z0-9]{6,}$/i;
        for (const [key, profile] of profileMap.entries()) {
            if (SLACK_ID_PATTERN.test(profile.name.trim())) {
                profileMap.delete(key);
            }
        }

        // Find target person
        const normalizedTarget = targetPersonName.trim().toLowerCase();
        let targetProfile: any = null;
        for (const [pKey, prof] of profileMap.entries()) {
            if (pKey === normalizedTarget || pKey.includes(normalizedTarget) || normalizedTarget.includes(pKey)) {
                targetProfile = prof;
                break;
            }
        }

        if (!targetProfile) {
            return [];
        }

        // Identify repositories where the departing person is primary/sole owner (bus factor <= 1)
        const targetPM = pmRows.find(pm => pm.person_name && pm.person_name.toLowerCase() === targetProfile.name.toLowerCase());
        const targetExternalId = targetPM?.external_id?.toLowerCase() || '';

        const ownedRepos: Array<{ repoName: string; busFactor: number }> = [];
        for (const rm of rmRows) {
            const rmOwner = (rm.primary_owner || '').toLowerCase().trim();
            const isOwner = rmOwner === targetProfile.name.toLowerCase() || (targetExternalId && rmOwner === targetExternalId);
            const bf = Number(rm.bus_factor);

            if (isOwner && bf <= 1) {
                ownedRepos.push({ repoName: rm.repo_name, busFactor: bf });
            }
        }

        // If no repo explicitly owned via primary_owner with bus_factor <= 1, fallback to target's repos
        if (ownedRepos.length === 0) {
            for (const r of targetProfile.repositories) {
                const bf = spofRepoMap.get(r) ?? 1.0;
                if (bf <= 1) {
                    ownedRepos.push({ repoName: r, busFactor: bf });
                }
            }
        }

        console.log(`Identified ${ownedRepos.length} SPOF repositories owned by ${targetProfile.name}:`, ownedRepos.map(r => `${r.repoName} (BF: ${r.busFactor})`));

        const now = Date.now();
        const resultsByRepo: any[] = [];

        for (const repoInfo of ownedRepos) {
            const repoName = repoInfo.repoName;
            const repoNameLower = repoName.toLowerCase();
            const busFactor = repoInfo.busFactor;

            // Target tech set for this specific repository
            let targetRepoTechs = repoTechMap.get(repoNameLower);
            if (!targetRepoTechs || targetRepoTechs.size === 0) {
                // Fallback to target person's technologies
                targetRepoTechs = targetProfile.technologies;
            }

            const scoredCandidates: any[] = [];

            for (const [pKey, cand] of profileMap.entries()) {
                if (cand.name.toLowerCase() === targetProfile.name.toLowerCase()) {
                    continue; // Do not recommend self
                }

                // 1. Shared Repo Experience: direct contribution to THIS specific repository
                const hasDirectRepoExperience = cand.repositories.has(repoNameLower);
                const repoOverlapRatio = hasDirectRepoExperience ? 1.0 : 0.0;
                const sharedRepoScore = Math.round(repoOverlapRatio * 100);

                // 2. Shared Technologies: overlap with THIS repository's technologies
                const sharedTechList = Array.from(cand.technologies).filter((t: any) => targetRepoTechs!.has(t));
                const totalTechUnionSize = new Set([...targetRepoTechs!, ...cand.technologies]).size;
                const techJaccard = totalTechUnionSize > 0 ? (sharedTechList.length / totalTechUnionSize) : 0;
                const sharedTechScore = Math.round(techJaccard * 100);

                // Disqualification: if zero tech overlap AND zero experience on this repo
                if (sharedTechList.length === 0 && !hasDirectRepoExperience) {
                    continue;
                }

                // 3. Recent Activity Factor (20%)
                let recentActivityFactor = 0;
                let daysSinceLastActivity: number | null = null;
                let activityStatus = 'inactive';

                if (cand.latestActivityTimestamp) {
                    const diffMs = Math.max(0, now - cand.latestActivityTimestamp);
                    daysSinceLastActivity = Math.round(diffMs / (24 * 60 * 60 * 1000));

                    if (daysSinceLastActivity <= 30) {
                        recentActivityFactor = 1.0;
                        activityStatus = 'active_recent';
                    } else if (daysSinceLastActivity <= 60) {
                        recentActivityFactor = 1.0 - 0.5 * ((daysSinceLastActivity - 30) / 30);
                        activityStatus = 'active_moderate';
                    } else if (daysSinceLastActivity <= 90) {
                        recentActivityFactor = 0.5 - 0.3 * ((daysSinceLastActivity - 60) / 30);
                        activityStatus = 'dormant';
                    } else {
                        recentActivityFactor = 0.1;
                        activityStatus = 'inactive';
                    }
                }
                const recentActivityScore = Math.round(recentActivityFactor * 100);

                // 4. Workload Capacity / SPOF penalty (15%)
                const spofPenalty = (cand.spofReposCount || 0) * 0.15;
                const capacityFactor = Math.max(0, 1.0 - cand.knowledgeRisk - spofPenalty);
                const workloadCapacityScore = Math.round(capacityFactor * 100);

                // Composite score
                const compositeRaw = (0.40 * techJaccard) +
                                     (0.25 * repoOverlapRatio) +
                                     (0.20 * recentActivityFactor) +
                                     (0.15 * capacityFactor);

                let score = Math.round(compositeRaw * 100);

                const category = hasDirectRepoExperience ? 'recommended_successor' : 'cross_training_candidate';

                // Fix C cap: If zero direct experience on this repo, cap at 25
                if (!hasDirectRepoExperience) {
                    score = Math.min(25, score);
                }

                // Fix B: Overloaded warning if maintaining 3+ SPOF repos
                const isOverloaded = (cand.spofReposCount || 0) >= 3;
                let warningLabel: string | undefined = undefined;
                if (isOverloaded) {
                    warningLabel = 'Not Recommended — Already Maintains 3+ Critical Repositories';
                }

                // Rationale
                const reasons: string[] = [];
                if (hasDirectRepoExperience) {
                    reasons.push(`Direct contributor to ${repoName}`);
                } else {
                    reasons.push(`No prior commits to ${repoName} (cross-training candidate)`);
                }
                if (sharedTechList.length > 0) {
                    reasons.push(`Shares ${sharedTechList.length} technologies (${sharedTechList.join(', ')}) with ${Math.round(techJaccard * 100)}% stack similarity`);
                }
                if (activityStatus === 'active_recent') {
                    reasons.push(`Highly active recently (${daysSinceLastActivity ?? 0}d ago)`);
                }
                if (isOverloaded) {
                    reasons.push(`CRITICAL OVERLOAD: Maintains ${cand.spofReposCount} SPOF repositories`);
                } else if (cand.knowledgeRisk < 0.30) {
                    reasons.push(`Low departure risk (${Math.round(cand.knowledgeRisk * 100)}%) with capacity`);
                }

                scoredCandidates.push({
                    name: cand.name,
                    score,
                    category,
                    isOverloaded,
                    warningLabel,
                    breakdown: {
                        sharedTechScore,
                        sharedRepoScore,
                        recentActivityScore,
                        workloadCapacityScore
                    },
                    factors: {
                        sharedTechnologies: sharedTechList,
                        targetTechnologies: Array.from(targetRepoTechs),
                        candidateTechnologies: Array.from(cand.technologies),
                        techJaccard: Math.round(techJaccard * 1000) / 1000,
                        sharedRepositories: hasDirectRepoExperience ? [repoName] : [],
                        targetRepositories: [repoName],
                        candidateRepositories: Array.from(cand.repositories),
                        repoOverlapRatio,
                        daysSinceLastActivity,
                        activityStatus,
                        existingKnowledgeRisk: Math.round(cand.knowledgeRisk * 100),
                        spofReposCount: cand.spofReposCount
                    },
                    rationale: reasons.join('. ') + '.'
                });
            }

            // Sort per repo
            scoredCandidates.sort((a, b) => {
                if (a.isOverloaded !== b.isOverloaded) {
                    return a.isOverloaded ? 1 : -1;
                }
                if (a.category !== b.category) {
                    return a.category === 'recommended_successor' ? -1 : 1;
                }
                return b.score - a.score;
            });

            const top = scoredCandidates[0];
            const hasSuccessor = Boolean(top && top.category === 'recommended_successor' && !top.isOverloaded);
            let explanation = '';

            if (top) {
                if (top.category === 'recommended_successor' && !top.isOverloaded) {
                    explanation = `Recommended successor for ${repoName} is ${top.name} with a ${top.score}% match score. ${top.rationale}`;
                } else if (top.category === 'cross_training_candidate' && !top.isOverloaded) {
                    explanation = `No direct successor with repository experience found for ${repoName}. Top cross-training candidate is ${top.name} (${top.score}% match, capped at 25% due to 0% repository overlap). ${top.rationale}`;
                } else {
                    explanation = `No viable successor found for ${repoName}. Candidate ${top.name} was identified via tech stack but is ${top.warningLabel || 'overloaded'}. ${top.rationale}`;
                }
            } else {
                explanation = `No candidate with overlapping technologies was found for repository ${repoName}.`;
            }

            resultsByRepo.push({
                repoName,
                busFactor,
                candidates: scoredCandidates,
                hasSuccessor,
                explanation
            });
        }

        return resultsByRepo;
    } finally {
        await session.close();
    }
}

async function main() {
    console.log('====================================================');
    console.log('TEST 1: MULTI-REPO SPOF OWNER — ROHAN VERMA');
    console.log('====================================================');
    const rohanResults = await testPerRepoSuccessors('Rohan Verma');
    for (const r of rohanResults) {
        console.log(`\n--- REPO: ${r.repoName} (Bus Factor: ${r.busFactor}) ---`);
        console.log(`Has Successor: ${r.hasSuccessor}`);
        console.log(`Explanation: ${r.explanation}`);
        console.log(`Candidates (${r.candidates.length}):`);
        r.candidates.slice(0, 3).forEach((c: any) => {
            console.log(`  * ${c.name}: score=${c.score}, cat=${c.category}, ovl=${c.isOverloaded}, sharedTech=${JSON.stringify(c.factors.sharedTechnologies)}, warn=${c.warningLabel}`);
        });
    }

    console.log('\n====================================================');
    console.log('TEST 2: SINGLE REPO SPOF OWNER — PRIYA SHARMA');
    console.log('====================================================');
    const priyaResults = await testPerRepoSuccessors('Priya Sharma');
    for (const r of priyaResults) {
        console.log(`\n--- REPO: ${r.repoName} (Bus Factor: ${r.busFactor}) ---`);
        console.log(`Has Successor: ${r.hasSuccessor}`);
        console.log(`Explanation: ${r.explanation}`);
        console.log(`Candidates (${r.candidates.length}):`);
        r.candidates.forEach((c: any) => {
            console.log(`  * ${c.name}: score=${c.score}, cat=${c.category}, ovl=${c.isOverloaded}, sharedTech=${JSON.stringify(c.factors.sharedTechnologies)}, warn=${c.warningLabel}`);
        });
    }
}

main().catch(console.error).finally(async () => {
    await sql.end();
    process.exit(0);
});
