import { driver } from '../../apps/api/config/neo4j.js';
import sql from '../../apps/api/config/postgres.js';
import neo4j from 'neo4j-driver';

export interface SuccessorCandidate {
    name: string;
    score: number; // 0–100 integer
    breakdown: {
        sharedTechScore: number;  // 0–100 (40% weight)
        sharedRepoScore: number;  // 0–100 (25% weight)
        recentActivityScore: number; // 0–100 (20% weight)
        workloadCapacityScore: number; // 0–100 (15% weight)
    };
    factors: {
        sharedTechnologies: string[];
        targetTechnologies: string[];
        candidateTechnologies: string[];
        techJaccard: number; // 0–1
        sharedRepositories: string[];
        targetRepositories: string[];
        candidateRepositories: string[];
        repoOverlapRatio: number; // 0–1
        daysSinceLastActivity: number | null;
        activityStatus: 'active_recent' | 'active_moderate' | 'dormant' | 'inactive';
        existingKnowledgeRisk: number; // 0–100%
        spofReposCount: number;
    };
    rationale: string;
}

export interface SuccessorRecommendationResult {
    person: string;
    hasSuccessor: boolean;
    targetTechnologies: string[];
    targetRepositories: string[];
    candidates: SuccessorCandidate[];
    explanation: string;
}

interface InternalPersonProfile {
    name: string;
    technologies: Set<string>;
    repositories: Set<string>;
    latestActivityTimestamp: number | null;
    spofReposCount: number;
    knowledgeRisk: number; // 0 - 1
}

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

/**
 * Computes deterministic 4-factor successor recommendations for an engineer.
 *
 * Scoring Model:
 * 1. Shared Technologies (Weight: 40%): Jaccard similarity of technology sets.
 * 2. Shared Repositories (Weight: 25%): Overlap fraction of target's repositories.
 * 3. Recent Activity (Weight: 20%): Full score (1.0) if active in last 30d, sliding 30-60d, penalized >60d.
 * 4. Workload / Existing Risk Penalty (Weight: 15%): (1.0 - candidateRisk) capacity factor.
 *
 * Disqualification: Candidates with 0 shared technologies AND 0 shared repositories are excluded.
 */
export async function calculateSuccessorCandidates(rawPersonName: string): Promise<SuccessorRecommendationResult> {
    if (!rawPersonName || !rawPersonName.trim()) {
        return {
            person: '',
            hasSuccessor: false,
            targetTechnologies: [],
            targetRepositories: [],
            candidates: [],
            explanation: 'No person name specified.'
        };
    }

    const session = driver.session();
    try {
        // 1. Bulk query all PERSON profiles, technologies, repositories, and activity timestamps from Neo4j
        const graphRes = await session.run(`
            MATCH (p:PERSON)
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
        `);

        if (graphRes.records.length === 0) {
            return {
                person: rawPersonName,
                hasSuccessor: false,
                targetTechnologies: [],
                targetRepositories: [],
                candidates: [],
                explanation: `No indexed records found in the knowledge graph for "${rawPersonName}". Entity does not exist.`
            };
        }

        // Fetch Postgres metrics in bulk
        let pmRows: any[] = [];
        let rmRows: any[] = [];
        let eventRows: any[] = [];
        try {
            pmRows = await sql`
                SELECT person_name, risk_score, repos, top_technologies 
                FROM person_metrics
            `;
        } catch (e) {}

        try {
            rmRows = await sql`
                SELECT repo_name, bus_factor 
                FROM repo_metrics
            `;
        } catch (e) {}

        try {
            eventRows = await sql`
                SELECT 
                    coalesce(payload->'sender'->>'login', payload->'pusher'->>'name', payload->'actor'->>'login') AS author,
                    MAX(created_at) as latest_event
                FROM events
                WHERE payload IS NOT NULL
                GROUP BY author
            `;
        } catch (e) {}

        // Map bus factor by repo
        const spofRepoSet = new Set<string>();
        for (const rm of rmRows) {
            if (rm.repo_name && Number(rm.bus_factor) <= 1) {
                spofRepoSet.add(rm.repo_name.toLowerCase().trim());
            }
        }

        // Build canonical map of person profiles
        const profileMap = new Map<string, InternalPersonProfile>();

        for (const record of graphRes.records) {
            const name: string = record.get('name');
            if (!name || !name.trim()) continue;

            const rawTechs: string[] = record.get('rawTechs') || [];
            const rawRepos: string[] = record.get('rawRepos') || [];
            const techs = new Set<string>(rawTechs.filter(Boolean));
            const repos = new Set<string>(rawRepos.filter(Boolean));
            let latestActivityTimestamp: number | null = parseNeo4jTimestamp(record.get('latestTime'));

            // Augment from Postgres person_metrics
            let knowledgeRisk = 0.20; // default baseline 20%
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

            // Check Postgres events for recent activity
            const firstName = name.split(' ')[0]?.toLowerCase() || name.toLowerCase();
            const matchedEvent = eventRows.find(ev => ev.author && ev.author.toLowerCase().includes(firstName));
            if (matchedEvent?.latest_event) {
                const t = new Date(matchedEvent.latest_event).getTime();
                if (!latestActivityTimestamp || t > latestActivityTimestamp) {
                    latestActivityTimestamp = t;
                }
            }

            // Count SPOF repos
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

        // Find target person
        const normalizedInput = rawPersonName.trim().toLowerCase();
        let targetProfile: InternalPersonProfile | null = null;

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
                explanation: `No indexed records found in the knowledge graph for "${rawPersonName}". Entity does not exist.`
            };
        }

        const resolvedTargetName = targetProfile.name;
        const now = Date.now();
        const scoredCandidates: SuccessorCandidate[] = [];

        for (const [pKey, cand] of profileMap.entries()) {
            if (cand.name.toLowerCase() === resolvedTargetName.toLowerCase()) {
                continue; // Do not recommend departing engineer as their own successor
            }

            // Shared technologies
            const sharedTechList = Array.from(cand.technologies).filter(t => targetProfile!.technologies.has(t));
            const totalTechUnionSize = new Set([...targetProfile!.technologies, ...cand.technologies]).size;
            const techJaccard = totalTechUnionSize > 0 ? (sharedTechList.length / totalTechUnionSize) : 0;

            // Shared repositories
            const sharedRepoList = Array.from(cand.repositories).filter(r => targetProfile!.repositories.has(r));
            const targetRepoCount = targetProfile!.repositories.size;
            const repoOverlapRatio = targetRepoCount > 0 ? (sharedRepoList.length / targetRepoCount) : (sharedRepoList.length > 0 ? 1 : 0);

            // DISQUALIFICATION RULE:
            // If candidate has ZERO shared technologies AND ZERO shared repositories,
            // they have zero domain overlap and must NOT be recommended.
            if (sharedTechList.length === 0 && sharedRepoList.length === 0) {
                continue;
            }

            // Factor 1: Shared Tech (40%)
            const sharedTechScore = Math.round(techJaccard * 100);

            // Factor 2: Shared Repos (25%)
            const sharedRepoScore = Math.round(repoOverlapRatio * 100);

            // Factor 3: Recent Activity (20%)
            let recentActivityFactor = 0;
            let daysSinceLastActivity: number | null = null;
            let activityStatus: SuccessorCandidate['factors']['activityStatus'] = 'inactive';

            if (cand.latestActivityTimestamp) {
                const diffMs = Math.max(0, now - cand.latestActivityTimestamp);
                daysSinceLastActivity = Math.round(diffMs / (24 * 60 * 60 * 1000));

                if (daysSinceLastActivity <= 30) {
                    recentActivityFactor = 1.0;
                    activityStatus = 'active_recent';
                } else if (daysSinceLastActivity <= 60) {
                    // Linear decay between 30 and 60 days from 1.0 to 0.5
                    recentActivityFactor = 1.0 - 0.5 * ((daysSinceLastActivity - 30) / 30);
                    activityStatus = 'active_moderate';
                } else if (daysSinceLastActivity <= 90) {
                    // Decay between 60 and 90 days from 0.5 to 0.2
                    recentActivityFactor = 0.5 - 0.3 * ((daysSinceLastActivity - 60) / 30);
                    activityStatus = 'dormant';
                } else {
                    recentActivityFactor = 0.1;
                    activityStatus = 'inactive';
                }
            }
            const recentActivityScore = Math.round(recentActivityFactor * 100);

            // Factor 4: Current Workload / Existing Risk (15% capacity factor)
            // Penalty for candidates who already have high knowledge risk / sole maintainership
            const capacityFactor = Math.max(0, 1.0 - cand.knowledgeRisk);
            const workloadCapacityScore = Math.round(capacityFactor * 100);

            // Composite Weighted Score (0–100)
            const compositeRaw = (0.40 * techJaccard) +
                                 (0.25 * repoOverlapRatio) +
                                 (0.20 * recentActivityFactor) +
                                 (0.15 * capacityFactor);

            const score = Math.round(compositeRaw * 100);

            // Build human-readable rationale
            const reasons: string[] = [];
            if (sharedTechList.length > 0) {
                reasons.push(`Shares ${sharedTechList.length} technologies (${sharedTechList.join(', ')}) with ${Math.round(techJaccard * 100)}% Jaccard tech similarity`);
            }
            if (sharedRepoList.length > 0) {
                reasons.push(`Contributes to ${sharedRepoList.length} overlapping repositories (${sharedRepoList.join(', ')})`);
            }
            if (activityStatus === 'active_recent') {
                reasons.push(`Highly active recently (${daysSinceLastActivity ?? 0}d ago)`);
            } else if (activityStatus === 'active_moderate') {
                reasons.push(`Moderately active (${daysSinceLastActivity}d ago)`);
            }
            if (cand.knowledgeRisk < 0.30) {
                reasons.push(`Low existing departure risk (${Math.round(cand.knowledgeRisk * 100)}%) with capacity to take on ownership`);
            } else {
                reasons.push(`Moderate existing workload (${Math.round(cand.knowledgeRisk * 100)}% risk, maintains ${cand.spofReposCount} SPOF repos)`);
            }

            scoredCandidates.push({
                name: cand.name,
                score,
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

        // Sort descending by score
        scoredCandidates.sort((a, b) => b.score - a.score);

        const hasSuccessor = scoredCandidates.length > 0;
        let explanation = '';

        if (hasSuccessor) {
            const top = scoredCandidates[0];
            explanation = `Recommended successor for ${resolvedTargetName} is ${top?.name} with a ${top.score}% match score. ${top.rationale}`;
        } else {
            explanation = `No candidate with overlapping technologies or repositories was found in the knowledge graph for ${resolvedTargetName}.`;
        }

        return {
            person: resolvedTargetName,
            hasSuccessor,
            targetTechnologies: Array.from(targetProfile.technologies),
            targetRepositories: Array.from(targetProfile.repositories),
            candidates: scoredCandidates,
            explanation
        };
    } finally {
        await session.close();
    }
}
