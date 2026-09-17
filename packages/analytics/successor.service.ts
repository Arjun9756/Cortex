import { driver } from '../../apps/api/config/neo4j.js';
import sql from '../../apps/api/config/postgres.js';
import neo4j from 'neo4j-driver';

export interface SuccessorCandidate {
    name: string;
    score: number; // 0–100 integer
    category: 'recommended_successor' | 'cross_training_candidate';
    isOverloaded: boolean;
    warningLabel?: string | undefined;
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

export interface RepoSuccessorResult {
    repoName: string;
    busFactor?: number;
    candidates: SuccessorCandidate[];
    hasSuccessor: boolean;
    explanation: string;
}

export interface SuccessorRecommendationResult {
    person: string;
    repoName?: string;
    hasSuccessor: boolean;
    targetTechnologies: string[];
    targetRepositories: string[];
    candidates: SuccessorCandidate[];
    explanation: string;
    successorsByRepo?: RepoSuccessorResult[];
}

interface InternalPersonProfile {
    name: string;
    technologies: Set<string>;
    repositories: Set<string>;
    latestActivityTimestamp: number | null;
    spofReposCount: number;
    knowledgeRisk: number; // 0 - 1
    email?: string | null;
    externalId?: string | null;
}

interface CanonicalIdentitySet {
    canonicalId: string | null;
    names: Set<string>;
    emails: Set<string>;
    usernames: Set<string>;
    externalIds: Set<string>;
}

/**
 * Resolves the departing engineer's Canonical Person ID and all associated aliases
 * (display names, usernames, emails, external IDs) from PostgreSQL person_identity table.
 */
function resolveCanonicalTarget(
    rawName: string,
    identityRows: any[],
    targetProfileName?: string
): CanonicalIdentitySet {
    const norm = rawName.trim().toLowerCase();
    const names = new Set<string>([norm]);
    const emails = new Set<string>();
    const usernames = new Set<string>();
    const externalIds = new Set<string>();
    let canonicalId: string | null = null;

    if (targetProfileName) {
        names.add(targetProfileName.trim().toLowerCase());
    }

    // Step A: Find matching identity row in person_identity table
    for (const row of identityRows) {
        const dName = (row.display_name || '').trim().toLowerCase();
        const uName = (row.username || '').trim().toLowerCase();
        const email = (row.email || '').trim().toLowerCase();
        const extId = (row.external_id || '').trim().toLowerCase();

        if (
            dName === norm ||
            uName === norm ||
            email === norm ||
            extId === norm ||
            (targetProfileName && dName === targetProfileName.trim().toLowerCase())
        ) {
            canonicalId = row.canonical_person_id;
            break;
        }
    }

    // Step B: Collect all linked identities for this canonical person
    if (canonicalId) {
        for (const row of identityRows) {
            if (row.canonical_person_id === canonicalId) {
                if (row.display_name) names.add(row.display_name.trim().toLowerCase());
                if (row.username) {
                    names.add(row.username.trim().toLowerCase());
                    usernames.add(row.username.trim().toLowerCase());
                }
                if (row.email) {
                    names.add(row.email.trim().toLowerCase());
                    emails.add(row.email.trim().toLowerCase());
                }
                if (row.external_id) externalIds.add(row.external_id.trim().toLowerCase());
            }
        }
    }

    return { canonicalId, names, emails, usernames, externalIds };
}

/**
 * Checks whether a candidate profile is the departing engineer or one of their alias accounts.
 */
function isDepartingPersonOrAlias(
    cand: InternalPersonProfile,
    targetIdentity: CanonicalIdentitySet,
    identityRows: any[]
): boolean {
    const candNameNorm = cand.name.trim().toLowerCase();

    // 1. Direct name match in target's known names/aliases
    if (targetIdentity.names.has(candNameNorm)) {
        return true;
    }

    // 2. Check candidate in person_identity table
    if (targetIdentity.canonicalId) {
        for (const row of identityRows) {
            const dName = (row.display_name || '').trim().toLowerCase();
            const uName = (row.username || '').trim().toLowerCase();
            const extId = (row.external_id || '').trim().toLowerCase();
            const email = (row.email || '').trim().toLowerCase();

            const candMatch = dName === candNameNorm || uName === candNameNorm || extId === candNameNorm;
            if (candMatch) {
                // If candidate belongs to the SAME canonical person -> Self/Alias
                if (row.canonical_person_id === targetIdentity.canonicalId) {
                    return true;
                }
                // If candidate shares an email verified with the target -> Self/Alias
                if (email && targetIdentity.emails.has(email)) {
                    return true;
                }
            }
        }
    }

    // 3. Fallback check on email if candidate profile has email
    if (cand.email && targetIdentity.emails.has(cand.email.trim().toLowerCase())) {
        return true;
    }

    // 4. Fallback check on externalId if candidate profile has externalId
    if (cand.externalId && targetIdentity.externalIds.has(cand.externalId.trim().toLowerCase())) {
        return true;
    }

    return false;
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
 * Computes deterministic per-repository successor recommendations for a departing engineer.
 * Identifies each repository where the engineer is the primary/sole owner (bus factor <= 1),
 * and runs candidate scoring independently FOR EACH repository.
 */
export async function calculateSuccessorsByRepo(rawPersonName: string): Promise<RepoSuccessorResult[]> {
    if (!rawPersonName || !rawPersonName.trim()) {
        return [];
    }

    const session = driver.session();
    try {
        // Step 1: Fast parallel lookups in PostgreSQL (including central person_identity table)
        let pmRows: any[] = [];
        let rmRows: any[] = [];
        let eventRows: any[] = [];
        let identityRows: any[] = [];

        try {
            [pmRows, rmRows, eventRows, identityRows] = await Promise.all([
                sql`SELECT person_name, external_id, risk_score, repos, top_technologies FROM person_metrics`,
                sql`SELECT repo_name, bus_factor, primary_owner FROM repo_metrics`,
                sql`
                    SELECT 
                        coalesce(payload->'sender'->>'login', payload->'pusher'->>'name', payload->'actor'->>'login') AS author,
                        MAX(created_at) as latest_event
                    FROM events
                    WHERE payload IS NOT NULL
                    GROUP BY author
                `,
                sql`
                    SELECT canonical_person_id, provider, external_id, username, email, display_name
                    FROM person_identity
                `
            ]);
        } catch (dbErr: any) {
            console.warn('[SuccessorService] Postgres lookup warning:', dbErr?.message);
        }

        // Step 1.5: Resolve Target Canonical Identity & All Known Aliases
        const targetIdentity = resolveCanonicalTarget(rawPersonName, identityRows);
        const targetNamesLower = Array.from(targetIdentity.names);

        // Build list of valid human candidate names to scope Neo4j query
        const SLACK_ID_PATTERN = /^U[A-Z0-9]{6,}$/i;
        const candidateNames: string[] = [];
        for (const pm of pmRows) {
            if (pm.person_name && !SLACK_ID_PATTERN.test(pm.person_name.trim())) {
                candidateNames.push(pm.person_name.trim());
            }
        }

        // Step 2: Scoped Neo4j queries for target and candidates + repo-level technologies
        const graphRes = await session.run(`
            MATCH (p:PERSON)
            WHERE toLower(p.name) = toLower($rawPersonName) OR toLower(p.name) IN $targetNamesLower OR p.name IN $candidateNames
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
        `, { rawPersonName, targetNamesLower, candidateNames });

        const repoTechRes = await session.run(`
            MATCH (r:REPOSITORY)
            OPTIONAL MATCH (r)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (c:COMMIT)-[:PART_OF]->(r)
            OPTIONAL MATCH (c)-[:USES]->(t2:TECHNOLOGY)
            RETURN toLower(r.name) AS repoName,
                   collect(DISTINCT toLower(trim(t1.name))) + collect(DISTINCT toLower(trim(t2.name))) AS techs
        `);

        if (graphRes.records.length === 0) {
            return [];
        }

        // Map repository-level technologies
        const repoTechMap = new Map<string, Set<string>>();
        for (const r of repoTechRes.records) {
            const rName = r.get('repoName');
            const techs = new Set<string>((r.get('techs') || []).filter(Boolean));
            repoTechMap.set(rName, techs);
        }

        // Map bus factors and SPOF repositories
        const spofRepoMap = new Map<string, number>();
        for (const rm of rmRows) {
            if (rm.repo_name) {
                const bf = Number(rm.bus_factor);
                spofRepoMap.set(rm.repo_name.toLowerCase().trim(), bf);
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

            // Augment with Postgres person_metrics
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

            // Augment with Postgres events recency
            const firstName = name.split(' ')[0]?.toLowerCase() || name.toLowerCase();
            const matchedEvent = eventRows.find(ev => ev.author && ev.author.toLowerCase().includes(firstName));
            if (matchedEvent?.latest_event) {
                const t = new Date(matchedEvent.latest_event).getTime();
                if (!latestActivityTimestamp || t > latestActivityTimestamp) {
                    latestActivityTimestamp = t;
                }
            }

            // Count SPOF repositories candidate maintains
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
                knowledgeRisk,
                email: record.get('email') || null,
                externalId: record.get('externalId') || null
            });
        }

        // Filter out raw Slack user ID duplicate nodes
        for (const [key, profile] of profileMap.entries()) {
            if (SLACK_ID_PATTERN.test(profile.name.trim())) {
                profileMap.delete(key);
            }
        }

        // Find departing target person profile
        const normalizedTarget = rawPersonName.trim().toLowerCase();
        let targetProfile: InternalPersonProfile | null = null;
        for (const [pKey, prof] of profileMap.entries()) {
            if (
                targetIdentity.names.has(pKey) ||
                pKey === normalizedTarget ||
                pKey.includes(normalizedTarget) ||
                normalizedTarget.includes(pKey)
            ) {
                targetProfile = prof;
                break;
            }
        }

        if (!targetProfile) {
            return [];
        }

        // Merge repositories and technologies across all aliases of the departing engineer
        for (const [pKey, prof] of profileMap.entries()) {
            if (prof !== targetProfile && isDepartingPersonOrAlias(prof, targetIdentity, identityRows)) {
                prof.repositories.forEach(r => targetProfile!.repositories.add(r));
                prof.technologies.forEach(t => targetProfile!.technologies.add(t));
            }
        }

        // Step 3: Identify repositories where target is primary/sole owner (bus factor <= 1)
        const targetPM = pmRows.find(pm => pm.person_name && pm.person_name.toLowerCase() === targetProfile!.name.toLowerCase());
        const targetExternalId = targetPM?.external_id?.toLowerCase() || '';

        const ownedRepos: Array<{ repoName: string; busFactor: number }> = [];
        for (const rm of rmRows) {
            const rmOwner = (rm.primary_owner || '').toLowerCase().trim();
            const isOwner = targetIdentity.names.has(rmOwner) ||
                            targetIdentity.externalIds.has(rmOwner) ||
                            targetIdentity.usernames.has(rmOwner) ||
                            rmOwner === targetProfile.name.toLowerCase() ||
                            (targetExternalId && rmOwner === targetExternalId);
            const bf = Number(rm.bus_factor);

            if (isOwner && bf <= 1) {
                ownedRepos.push({ repoName: rm.repo_name, busFactor: bf });
            }
        }

        // Fallback: If no repo explicitly tagged via primary_owner with bus_factor <= 1, evaluate target's SPOF repos
        if (ownedRepos.length === 0) {
            for (const r of targetProfile.repositories) {
                const bf = spofRepoMap.get(r) ?? 1.0;
                if (bf <= 1) {
                    ownedRepos.push({ repoName: r, busFactor: bf });
                }
            }
        }

        // If target has no SPOF repos, evaluate against all repositories target worked on
        if (ownedRepos.length === 0) {
            for (const r of targetProfile.repositories) {
                const bf = spofRepoMap.get(r) ?? 2.0;
                ownedRepos.push({ repoName: r, busFactor: bf });
            }
        }

        const now = Date.now();
        const resultsByRepo: RepoSuccessorResult[] = [];

        // Step 4: Run candidate scoring independently FOR EACH repository
        for (const repoInfo of ownedRepos) {
            const repoName = repoInfo.repoName;
            const repoNameLower = repoName.toLowerCase();
            const busFactor = repoInfo.busFactor;

            // Determine target technologies for THIS specific repository
            let targetRepoTechs = repoTechMap.get(repoNameLower);
            if (!targetRepoTechs || targetRepoTechs.size === 0) {
                targetRepoTechs = targetProfile.technologies;
            }

            const scoredCandidates: SuccessorCandidate[] = [];

            for (const [pKey, cand] of profileMap.entries()) {
                if (isDepartingPersonOrAlias(cand, targetIdentity, identityRows)) {
                    continue; // Exclude departing engineer and any alias accounts from being their own successor
                }

                // 1. Shared Repo Experience: direct contribution to THIS specific repository
                const hasDirectRepoExperience = cand.repositories.has(repoNameLower);
                const repoOverlapRatio = hasDirectRepoExperience ? 1.0 : 0.0;
                const sharedRepoScore = Math.round(repoOverlapRatio * 100);

                // 2. Shared Technologies: overlap with THIS repository's technologies
                const sharedTechList = Array.from(cand.technologies).filter(t => targetRepoTechs!.has(t));
                const totalTechUnionSize = new Set([...targetRepoTechs!, ...cand.technologies]).size;
                const techJaccard = totalTechUnionSize > 0 ? (sharedTechList.length / totalTechUnionSize) : 0;
                const sharedTechScore = Math.round(techJaccard * 100);

                // Disqualification: Candidates with 0 shared tech AND 0 contribution to THIS repo are excluded
                if (sharedTechList.length === 0 && !hasDirectRepoExperience) {
                    continue;
                }

                // 3. Recent Activity Factor (20%)
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

                // 4. Workload Capacity / Existing Risk (15% weight)
                // FIX B: Explicitly penalize existing SPOF accumulation (0.15 penalty per SPOF repo)
                const spofPenalty = (cand.spofReposCount || 0) * 0.15;
                const capacityFactor = Math.max(0, 1.0 - cand.knowledgeRisk - spofPenalty);
                const workloadCapacityScore = Math.round(capacityFactor * 100);

                // Composite Weighted Score (0–100)
                const compositeRaw = (0.40 * techJaccard) +
                                     (0.25 * repoOverlapRatio) +
                                     (0.20 * recentActivityFactor) +
                                     (0.15 * capacityFactor);

                let score = Math.round(compositeRaw * 100);

                // FIX C: Hard distinction between "Recommended Successor" and "Cross-Training Candidate"
                const category: SuccessorCandidate['category'] = hasDirectRepoExperience
                    ? 'recommended_successor'
                    : 'cross_training_candidate';

                // If zero direct repo experience on this repository, cap maximum composite score at 25
                if (!hasDirectRepoExperience) {
                    score = Math.min(25, score);
                }

                // FIX B: Hard eligibility warning for overloaded candidates maintaining 3+ SPOF repos
                const isOverloaded = (cand.spofReposCount || 0) >= 3;
                let warningLabel: string | undefined = undefined;
                if (isOverloaded) {
                    warningLabel = 'Not Recommended — Already Maintains 3+ Critical Repositories';
                }

                // Human-readable rationale
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
                } else if (activityStatus === 'active_moderate') {
                    reasons.push(`Moderately active (${daysSinceLastActivity}d ago)`);
                }
                if (isOverloaded) {
                    reasons.push(`CRITICAL OVERLOAD: Sole maintainer of ${cand.spofReposCount} SPOF repositories`);
                } else if (cand.knowledgeRisk < 0.30 && cand.spofReposCount === 0) {
                    reasons.push(`Low departure risk (${Math.round(cand.knowledgeRisk * 100)}%) with capacity`);
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

            // Sort per repository:
            // 1. Non-overloaded candidates rank above overloaded candidates
            // 2. Direct successors rank above cross-training candidates
            // 3. Descending by score
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

/**
 * Calculates successor candidates for a specific engineer and optionally scopes to a specific repository.
 * Fully backwards-compatible with existing callers (getRepoDetails, offboarding.service, knowledgeRisk.node).
 */
export async function calculateSuccessorCandidates(rawPersonName: string, targetRepoName?: string): Promise<SuccessorRecommendationResult> {
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

    const repoResults = await calculateSuccessorsByRepo(rawPersonName);

    if (repoResults.length === 0) {
        return {
            person: rawPersonName,
            hasSuccessor: false,
            targetTechnologies: [],
            targetRepositories: targetRepoName ? [targetRepoName] : [],
            candidates: [],
            explanation: `No indexed records or owned repositories found for "${rawPersonName}".`,
            successorsByRepo: []
        };
    }

    // If targetRepoName specified, find that repository's recommendation
    let chosenRepoResult = repoResults[0]!;
    if (targetRepoName) {
        const found = repoResults.find(r => r.repoName.toLowerCase() === targetRepoName.toLowerCase());
        if (found) chosenRepoResult = found;
    }

    const targetTechs = chosenRepoResult.candidates[0]?.factors?.targetTechnologies || [];
    const targetRepos = repoResults.map(r => r.repoName);

    return {
        person: rawPersonName,
        repoName: chosenRepoResult.repoName,
        hasSuccessor: chosenRepoResult.hasSuccessor,
        targetTechnologies: targetTechs,
        targetRepositories: targetRepos,
        candidates: chosenRepoResult.candidates,
        explanation: chosenRepoResult.explanation,
        successorsByRepo: repoResults
    };
}
