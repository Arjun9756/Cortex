import { calculateSuccessorCandidates as baselineCalculate } from '../packages/analytics/successor.service.js';
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

// Scoped successor calculation
async function scopedCalculate(rawPersonName: string) {
    const session = driver.session();
    try {
        // Fast PG lookups
        const [pmRows, rmRows, eventRows] = await Promise.all([
            sql`SELECT person_name, risk_score, repos, top_technologies FROM person_metrics`,
            sql`SELECT repo_name, bus_factor FROM repo_metrics`,
            sql`SELECT coalesce(payload->'sender'->>'login', payload->'pusher'->>'name', payload->'actor'->>'login') AS author, MAX(created_at) as latest_event FROM events WHERE payload IS NOT NULL GROUP BY author`
        ]);

        const candidateNames: string[] = pmRows.map((r: any) => r.person_name).filter(Boolean);

        const t0 = Date.now();
        const graphRes = await session.run(`
            MATCH (p:PERSON)
            WHERE toLower(p.name) = toLower($rawPersonName) OR p.name IN $candidateNames
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
        `, { rawPersonName, candidateNames });
        const neoTime = Date.now() - t0;

        // Map bus factor by repo
        const spofRepoSet = new Set<string>();
        for (const rm of rmRows) {
            if (rm.repo_name && Number(rm.bus_factor) <= 1) {
                spofRepoSet.add(rm.repo_name.toLowerCase().trim());
            }
        }

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
            const matchedPM = pmRows.find((pm: any) => pm.person_name && pm.person_name.toLowerCase() === name.toLowerCase());
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
            const matchedEvent = eventRows.find((ev: any) => ev.author && ev.author.toLowerCase().includes(firstName));
            if (matchedEvent?.latest_event) {
                const t = new Date(matchedEvent.latest_event).getTime();
                if (!latestActivityTimestamp || t > latestActivityTimestamp) {
                    latestActivityTimestamp = t;
                }
            }

            let spofCount = 0;
            for (const r of repos) {
                if (spofRepoSet.has(r)) spofCount++;
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

        const normalizedInput = rawPersonName.trim().toLowerCase();
        let targetProfile: any = null;
        for (const [pKey, prof] of profileMap.entries()) {
            if (pKey === normalizedInput || pKey.includes(normalizedInput) || normalizedInput.includes(pKey)) {
                targetProfile = prof;
                break;
            }
        }

        if (!targetProfile) {
            return {
                person: rawPersonName,
                hasSuccessor: false,
                targetTechnologies: [],
                targetRepositories: [],
                candidates: [],
                explanation: `No indexed records found in the knowledge graph for "${rawPersonName}". Entity does not exist.`,
                neoTime
            };
        }

        const resolvedTargetName = targetProfile.name;
        const now = Date.now();
        const scoredCandidates: any[] = [];

        for (const [pKey, cand] of profileMap.entries()) {
            if (cand.name.toLowerCase() === resolvedTargetName.toLowerCase()) {
                continue;
            }

            const sharedTechList = Array.from(cand.technologies).filter((t: any) => targetProfile!.technologies.has(t));
            const totalTechUnionSize = new Set([...targetProfile!.technologies, ...cand.technologies]).size;
            const techJaccard = totalTechUnionSize > 0 ? (sharedTechList.length / totalTechUnionSize) : 0;

            const sharedRepoList = Array.from(cand.repositories).filter((r: any) => targetProfile!.repositories.has(r));
            const targetRepoCount = targetProfile!.repositories.size;
            const repoOverlapRatio = targetRepoCount > 0 ? (sharedRepoList.length / targetRepoCount) : (sharedRepoList.length > 0 ? 1 : 0);

            if (sharedTechList.length === 0 && sharedRepoList.length === 0) {
                continue;
            }

            const sharedTechScore = Math.round(techJaccard * 100);
            const sharedRepoScore = Math.round(repoOverlapRatio * 100);

            let recentActivityFactor = 0;
            let daysSinceLastActivity: number | null = null;
            let activityStatus: any = 'inactive';

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

            const spofPenalty = (cand.spofReposCount || 0) * 0.15;
            const capacityFactor = Math.max(0, 1.0 - cand.knowledgeRisk - spofPenalty);
            const workloadCapacityScore = Math.round(capacityFactor * 100);

            const compositeRaw = (0.40 * techJaccard) +
                                 (0.25 * repoOverlapRatio) +
                                 (0.20 * recentActivityFactor) +
                                 (0.15 * capacityFactor);

            let score = Math.round(compositeRaw * 100);

            const hasDirectRepoExperience = sharedRepoList.length > 0;
            const category = hasDirectRepoExperience ? 'recommended_successor' : 'cross_training_candidate';

            if (!hasDirectRepoExperience) {
                score = Math.min(25, score);
            }

            const isOverloaded = (cand.spofReposCount || 0) >= 3;
            let warningLabel: string | undefined = undefined;
            if (isOverloaded) {
                warningLabel = 'Not Recommended — Already Maintains 3+ Critical Repositories';
            }

            const reasons: string[] = [];
            if (sharedRepoList.length > 0) {
                reasons.push(`Contributes to ${sharedRepoList.length} overlapping repositories (${sharedRepoList.join(', ')})`);
            } else {
                reasons.push(`No direct repository experience (cross-training candidate with tech-only overlap)`);
            }
            if (sharedTechList.length > 0) {
                reasons.push(`Shares ${sharedTechList.length} technologies (${sharedTechList.join(', ')}) with ${Math.round(techJaccard * 100)}% Jaccard tech similarity`);
            }
            if (activityStatus === 'active_recent') {
                reasons.push(`Highly active recently (${daysSinceLastActivity ?? 0}d ago)`);
            } else if (activityStatus === 'active_moderate') {
                reasons.push(`Moderately active (${daysSinceLastActivity}d ago)`);
            }
            if (isOverloaded) {
                reasons.push(`CRITICAL OVERLOAD: Sole maintainer of ${cand.spofReposCount} SPOF repositories (fragility compounding risk)`);
            } else if (cand.knowledgeRisk < 0.30 && cand.spofReposCount === 0) {
                reasons.push(`Low existing departure risk (${Math.round(cand.knowledgeRisk * 100)}%) with capacity to take on ownership`);
            } else {
                reasons.push(`Existing workload: ${Math.round(cand.knowledgeRisk * 100)}% risk, maintains ${cand.spofReposCount} SPOF repos`);
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
                    targetTechnologies: Array.from(targetProfile.technologies),
                    candidateTechnologies: Array.from(cand.technologies),
                    techJaccard: Math.round(techJaccard * 1000) / 1000,
                    sharedRepositories: sharedRepoList,
                    targetRepositories: Array.from(targetProfile.repositories),
                    candidateRepositories: Array.from(cand.repositories),
                    repoOverlapRatio: Math.round(repoOverlapRatio * 1000) / 1000,
                    daysSinceLastActivity,
                    activityStatus,
                    existingKnowledgeRisk: Math.round(cand.knowledgeRisk * 100),
                    spofReposCount: cand.spofReposCount
                },
                rationale: reasons.join('. ') + '.'
            });
        }

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
                explanation = `Recommended successor for ${resolvedTargetName} is ${top.name} with a ${top.score}% match score. ${top.rationale}`;
            } else if (top.category === 'cross_training_candidate' && !top.isOverloaded) {
                explanation = `No direct successor with repository experience found for ${resolvedTargetName}. Top cross-training candidate is ${top.name} (${top.score}% match, capped at 25% due to 0% repository overlap). ${top.rationale}`;
            } else {
                explanation = `No viable successor found for ${resolvedTargetName}. Candidate ${top.name} was identified via tech stack but is ${top.warningLabel || 'overloaded'}. ${top.rationale}`;
            }
        } else {
            explanation = `No candidate with overlapping technologies or repositories was found in the knowledge graph for ${resolvedTargetName}.`;
        }

        return {
            person: resolvedTargetName,
            hasSuccessor,
            targetTechnologies: Array.from(targetProfile.technologies),
            targetRepositories: Array.from(targetProfile.repositories),
            candidates: scoredCandidates,
            explanation,
            neoTime
        };
    } finally {
        await session.close();
    }
}

async function main() {
    console.log('--- COMPARING BASELINE VS SCOPED FOR PRIYA SHARMA ---');
    const baseline = await baselineCalculate('Priya Sharma');
    const scoped = await scopedCalculate('Priya Sharma');

    console.log('\n--- BASELINE OUTPUT ---');
    console.log('Has Successor:', baseline.hasSuccessor);
    console.log('Candidates count:', baseline.candidates.length);
    baseline.candidates.forEach((c: any) => console.log(`- ${c.name}: score=${c.score}, cat=${c.category}, ovl=${c.isOverloaded}, warn=${c.warningLabel}, tech=${JSON.stringify(c.factors.sharedTechnologies)}, repo=${JSON.stringify(c.factors.sharedRepositories)}`));

    console.log('\n--- SCOPED OUTPUT ---');
    console.log('Has Successor:', scoped.hasSuccessor);
    console.log('Neo4j Query Time:', scoped.neoTime, 'ms');
    console.log('Candidates count:', scoped.candidates.length);
    scoped.candidates.forEach((c: any) => console.log(`- ${c.name}: score=${c.score}, cat=${c.category}, ovl=${c.isOverloaded}, warn=${c.warningLabel}, tech=${JSON.stringify(c.factors.sharedTechnologies)}, repo=${JSON.stringify(c.factors.sharedRepositories)}`));

    // Verify identity
    const matchHasSuccessor = baseline.hasSuccessor === scoped.hasSuccessor;
    const matchCount = baseline.candidates.length === scoped.candidates.length;
    let matchCandidates = true;
    for (let i = 0; i < baseline.candidates.length; i++) {
        const b = baseline.candidates[i];
        const s = scoped.candidates[i];
        if (b.name !== s.name || b.score !== s.score || b.category !== s.category || b.isOverloaded !== s.isOverloaded || b.warningLabel !== s.warningLabel) {
            matchCandidates = false;
            console.log(`Mismatch at candidate ${i}: baseline=${JSON.stringify(b)}, scoped=${JSON.stringify(s)}`);
        }
    }

    if (matchHasSuccessor && matchCount && matchCandidates) {
        console.log('\n>>> 100% IDENTICAL OUTPUT CONFIRMED! Zero logic regression. <<<');
    } else {
        console.log('\n>>> MISMATCH DETECTED! <<<');
    }
}

main().catch(console.error).finally(async () => {
    await sql.end();
    process.exit(0);
});
