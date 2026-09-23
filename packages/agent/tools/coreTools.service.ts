import { neo4jSession } from '../../../apps/api/config/neo4j.js';
import sql from '../../../apps/api/config/postgres.js';
import { CYPHER_BOT_FILTER, isBotAccount } from '../../shared/botDetection.js';
import { calculateSuccessorCandidates, calculateSuccessorsByRepo } from '../../analytics/successor.service.js';
import { searchSimilar } from '../../database/vector/qdrant.repository.js';
import { generateEmbeddings } from '../../llm/providers/gemini.js';
import {
    GetCommitCountInput, GetCommitCountOutput,
    GetRepoContributorsInput, GetRepoContributorsOutput,
    GetPersonActivityInput, GetPersonActivityOutput,
    GetOwnershipInput, GetOwnershipOutput,
    GetBusFactorInput, GetBusFactorOutput,
    GetSuccessorRecommendationInput, GetSuccessorRecommendationOutput,
    GetRecentChangesInput, GetRecentChangesOutput,
    GetRelatedEntitiesInput, GetRelatedEntitiesOutput,
    SearchEvidenceInput, SearchEvidenceOutput,
    GetPersonIdentityInput, GetPersonIdentityOutput,
} from './schemas.js';

function formatTimestamp12h(date: Date): string {
    if (isNaN(date.getTime())) return 'Unknown Date';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');

    return `${day} ${month} ${year}, ${strHours}:${minutes}:${seconds} ${ampm}`;
}

export function normalizeName(input: string): string {
    if (!input) return '';
    return input.trim().toLowerCase().replace(/\s+/g, '-');
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. get_commit_count
// ─────────────────────────────────────────────────────────────────────────────
export async function executeGetCommitCount(input: GetCommitCountInput): Promise<GetCommitCountOutput> {
    const rawRepo = input.repo?.trim();
    const rawPerson = input.person?.trim();
    const session = neo4jSession();

    try {
        // Case A: Specific Repository (with optional person)
        if (rawRepo) {
            const normalizedRepo = normalizeName(rawRepo);

            // 1. Query Neo4j CONTRIBUTED_TO rollup edges (where commits are stored post-compaction)
            let cypher = `
                MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
                WHERE (toLower(r.name) = toLower($repo) OR replace(toLower(r.name), '-', ' ') = toLower($spacedRepo) OR toLower(r.name) CONTAINS toLower($repo))
                  AND ${CYPHER_BOT_FILTER}
            `;
            const params: Record<string, any> = {
                repo: normalizedRepo,
                spacedRepo: rawRepo.toLowerCase().replace(/[-_]/g, ' ')
            };

            if (rawPerson) {
                cypher += ` AND (toLower(p.name) = toLower($person) OR toLower(p.canonicalPersonId) = toLower($person) OR toLower(p.externalId) = toLower($person) OR toLower(p.name) CONTAINS toLower($person))`;
                params.person = rawPerson;
            }

            cypher += `
                RETURN r.name AS repoName, p.name AS personName, rel.commitCount AS commits
                ORDER BY commits DESC
            `;

            const res = await session.run(cypher, params);
            const breakdown: Array<{ name: string; commits: number }> = [];
            let totalCommits = 0;
            let matchedRepoName = rawRepo;

            for (const record of res.records) {
                matchedRepoName = record.get('repoName') || matchedRepoName;
                const pName = record.get('personName') || 'Unknown';
                const countVal = record.get('commits');
                const commits = countVal?.toNumber ? countVal.toNumber() : Number(countVal || 0);
                if (commits > 0) {
                    breakdown.push({ name: pName, commits });
                    totalCommits += commits;
                }
            }

            // 2. If 0 in Neo4j, check PostgreSQL events table for push commits
            if (totalCommits === 0) {
                try {
                    const eventRows = await sql`
                        SELECT 
                            COALESCE(payload->'head_commit'->'author'->>'name', payload->'pusher'->>'name', payload->>'author', 'Unknown') as author_name,
                            COUNT(*) as commit_count
                        FROM events
                        WHERE (payload->'repository'->>'name' ILIKE ${'%' + normalizedRepo + '%'} OR payload->>'repository' ILIKE ${'%' + normalizedRepo + '%'})
                          AND (provider = 'github' OR event_type = 'push')
                          ${rawPerson ? sql`AND (payload->'head_commit'->'author'->>'name' ILIKE ${'%' + rawPerson + '%'} OR payload->>'author' ILIKE ${'%' + rawPerson + '%'})` : sql``}
                        GROUP BY author_name
                    `;
                    for (const r of eventRows) {
                        const count = Number(r.commit_count || 0);
                        if (count > 0) {
                            breakdown.push({ name: r.author_name, commits: count });
                            totalCommits += count;
                        }
                    }
                } catch (e: any) {
                    console.warn(`[executeGetCommitCount] Postgres event check error: ${e?.message}`);
                }
            }

            return {
                totalCommits,
                repository: matchedRepoName,
                person: rawPerson,
                breakdown,
                source: totalCommits > 0 ? 'Neo4j CONTRIBUTED_TO rollup & PostgreSQL events' : 'No commits recorded',
            };
        }

        // Case B: Specific Person across all repos
        if (rawPerson) {
            // 1. Check PostgreSQL person_metrics (canonical aggregated source of truth)
            let pmCommits = 0;
            let pmRepos: string[] = [];
            let canonicalName = rawPerson;

            try {
                const [pmRow] = await sql`
                    SELECT person_name, commit_count, repos
                    FROM person_metrics
                    WHERE lower(person_name) = lower(${rawPerson})
                       OR person_name ILIKE ${'%' + rawPerson + '%'}
                    ORDER BY 
                        CASE WHEN lower(person_name) = lower(${rawPerson}) THEN 0 ELSE 1 END,
                        commit_count DESC
                    LIMIT 1
                `;
                if (pmRow) {
                    pmCommits = Number(pmRow.commit_count || 0);
                    pmRepos = Array.isArray(pmRow.repos) ? pmRow.repos : [];
                    canonicalName = pmRow.person_name || rawPerson;
                }
            } catch (e: any) {
                console.warn(`[executeGetCommitCount] person_metrics check error: ${e?.message}`);
            }

            // 2. Query Neo4j per-repo breakdown for this person
            const res = await session.run(`
                MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
                WHERE (toLower(p.name) = toLower($person) OR toLower(p.name) CONTAINS toLower($person) OR toLower(p.canonicalPersonId) = toLower($person) OR toLower(p.externalId) = toLower($person))
                  AND ${CYPHER_BOT_FILTER}
                RETURN r.name AS repoName, rel.commitCount AS commits
                ORDER BY commits DESC
            `, { person: rawPerson });

            const breakdown: Array<{ name: string; commits: number }> = [];
            let neo4jTotal = 0;

            for (const record of res.records) {
                const rName = record.get('repoName');
                const countVal = record.get('commits');
                const commits = countVal?.toNumber ? countVal.toNumber() : Number(countVal || 0);
                if (commits > 0) {
                    breakdown.push({ name: rName, commits });
                    neo4jTotal += commits;
                }
            }

            const totalCommits = Math.max(pmCommits, neo4jTotal);

            // If breakdown is empty but we know total and repos, create breakdown entries
            if (breakdown.length === 0 && pmRepos.length > 0) {
                for (const r of pmRepos) {
                    breakdown.push({ name: r, commits: Math.round(totalCommits / pmRepos.length) || 1 });
                }
            }

            return {
                totalCommits,
                person: canonicalName,
                breakdown,
                source: 'PostgreSQL person_metrics & Neo4j CONTRIBUTED_TO rollup',
            };
        }

        // Case C: Global total commits across organization
        const res = await session.run(`
            MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
            WHERE ${CYPHER_BOT_FILTER}
            RETURN r.name AS repoName, sum(rel.commitCount) AS commits
            ORDER BY commits DESC
        `);

        const breakdown: Array<{ name: string; commits: number }> = [];
        let totalCommits = 0;

        for (const record of res.records) {
            const rName = record.get('repoName');
            const countVal = record.get('commits');
            const commits = countVal?.toNumber ? countVal.toNumber() : Number(countVal || 0);
            if (commits > 0) {
                breakdown.push({ name: rName, commits });
                totalCommits += commits;
            }
        }

        return {
            totalCommits,
            breakdown,
            source: 'Organization-wide Neo4j CONTRIBUTED_TO rollup',
        };
    } finally {
        await session.close();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. get_repo_contributors
// ─────────────────────────────────────────────────────────────────────────────
export async function executeGetRepoContributors(input: GetRepoContributorsInput): Promise<GetRepoContributorsOutput> {
    const rawRepo = input.repo.trim();
    const normalizedRepo = normalizeName(rawRepo);

    // 1. Get metadata from PostgreSQL repo_metrics (single source of truth for SPOF and primary owner)
    let primaryOwner: string | null = null;
    let busFactor = 1.0;
    let status = 'healthy';
    let storedContributorCount = 0;

    try {
        const [rmRow] = await sql`
            SELECT repo_name, primary_owner, bus_factor, status, contributor_count
            FROM repo_metrics
            WHERE lower(repo_name) = lower(${normalizedRepo})
               OR lower(repo_name) = lower(${rawRepo})
               OR repo_name ILIKE ${'%' + normalizedRepo + '%'}
            ORDER BY 
                CASE WHEN lower(repo_name) = lower(${normalizedRepo}) THEN 0 ELSE 1 END
            LIMIT 1
        `;
        if (rmRow) {
            primaryOwner = rmRow.primary_owner || null;
            busFactor = Number(rmRow.bus_factor ?? 1.0);
            status = rmRow.status || 'healthy';
            storedContributorCount = Number(rmRow.contributor_count ?? 0);
        }
    } catch (e: any) {
        console.warn(`[executeGetRepoContributors] repo_metrics query error: ${e?.message}`);
    }

    // 2. Query Neo4j for actual contributor list and commit counts
    const session = neo4jSession();
    try {
        const res = await session.run(`
            MATCH (r:REPOSITORY)
            WHERE toLower(r.name) = toLower($repo) OR replace(toLower(r.name), '-', ' ') = toLower($spacedRepo) OR toLower(r.name) CONTAINS toLower($repo)
            OPTIONAL MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r)
            WHERE ${CYPHER_BOT_FILTER}
              AND COALESCE(p.isActive, true) = true
              AND COALESCE(p.employmentStatus, 'active') <> 'alumni'
            RETURN r.name AS matchedRepo, p.name AS personName, p.role AS role, rel.commitCount AS commits
            ORDER BY commits DESC
        `, {
            repo: normalizedRepo,
            spacedRepo: rawRepo.toLowerCase().replace(/[-_]/g, ' ')
        });

        const contributors: Array<{ name: string; commits: number; role?: string | null }> = [];
        let matchedRepoName = rawRepo;

        for (const record of res.records) {
            if (record.get('matchedRepo')) matchedRepoName = record.get('matchedRepo');
            const pName = record.get('personName');
            if (pName && !isBotAccount(pName)) {
                const countVal = record.get('commits');
                const commits = countVal?.toNumber ? countVal.toNumber() : Number(countVal || 0);
                contributors.push({
                    name: pName,
                    commits,
                    role: record.get('role') || undefined,
                });
            }
        }

        // If primaryOwner is recorded in PostgreSQL but wasn't in graph contributors list, add them
        if (primaryOwner && !contributors.some(c => c.name.toLowerCase() === primaryOwner!.toLowerCase())) {
            contributors.unshift({ name: primaryOwner, commits: 1, role: 'Primary Owner' });
        }

        const finalContributorCount = Math.max(contributors.length, storedContributorCount);

        return {
            repository: matchedRepoName,
            contributorCount: finalContributorCount,
            primaryOwner,
            busFactor,
            status,
            contributors,
        };
    } finally {
        await session.close();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. get_person_activity
// ─────────────────────────────────────────────────────────────────────────────
export async function executeGetPersonActivity(input: GetPersonActivityInput): Promise<GetPersonActivityOutput> {
    const person = input.person.trim();
    const limit = Math.min(input.limit ?? 10, 50);

    const tokens = person.split(/\s+/).filter(t => t.length > 2);
    const terms = Array.from(new Set([person, ...tokens]));
    const patterns = terms.map(t => `%${t}%`);

    const rows = await sql`
        SELECT id, external_id, provider, event_type, payload, created_at 
        FROM events 
        WHERE (
            payload->>'author' ILIKE ANY(${patterns})
            OR payload->>'user' ILIKE ANY(${patterns})
            OR payload->'sender'->>'login' ILIKE ANY(${patterns})
            OR payload->'sender'->>'name' ILIKE ANY(${patterns})
            OR payload->'sender'->>'email' ILIKE ANY(${patterns})
            OR payload->'pusher'->>'name' ILIKE ANY(${patterns})
            OR payload->'head_commit'->'author'->>'name' ILIKE ANY(${patterns})
            OR payload->'pull_request'->'user'->>'login' ILIKE ANY(${patterns})
            OR payload->'user'->>'displayName' ILIKE ANY(${patterns})
            OR payload->'user'->>'name' ILIKE ANY(${patterns})
            OR payload->'issue'->'fields'->'reporter'->>'displayName' ILIKE ANY(${patterns})
        )
        ORDER BY created_at DESC 
        LIMIT ${limit}
    `;

    const activities = rows.map((r: any) => {
        const payload = r.payload || {};
        const repoName = payload.repository?.name || payload.repository || payload.repo || 'general';
        const summary = payload.head_commit?.message ||
            payload.comment?.body ||
            payload.pull_request?.title ||
            payload.issue?.fields?.summary ||
            payload.issue?.title ||
            payload.text ||
            payload.message ||
            (r.event_type ? `${r.event_type} action` : 'activity');

        return {
            id: String(r.id),
            event_type: r.event_type || 'activity',
            repository: repoName,
            summary: typeof summary === 'string' ? summary.replace(/\r?\n/g, ' ').trim() : String(summary),
            formatted_date: formatTimestamp12h(new Date(r.created_at)),
            provider: r.provider || 'unknown',
        };
    });

    return {
        person,
        activityCount: activities.length,
        activities,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. get_ownership
// ─────────────────────────────────────────────────────────────────────────────
export async function executeGetOwnership(input: GetOwnershipInput): Promise<GetOwnershipOutput> {
    const rawRepo = input.repo.trim();
    const normalizedRepo = normalizeName(rawRepo);

    // 1. Fetch repo_metrics data
    let primaryOwner: string | null = null;
    let busFactor = 1.0;
    let status = 'healthy';

    try {
        const [rmRow] = await sql`
            SELECT primary_owner, bus_factor, status
            FROM repo_metrics
            WHERE lower(repo_name) = lower(${normalizedRepo})
               OR lower(repo_name) = lower(${rawRepo})
               OR repo_name ILIKE ${'%' + normalizedRepo + '%'}
            LIMIT 1
        `;
        if (rmRow) {
            primaryOwner = rmRow.primary_owner || null;
            busFactor = Number(rmRow.bus_factor ?? 1.0);
            status = rmRow.status || 'healthy';
        }
    } catch (e: any) {
        console.warn(`[executeGetOwnership] repo_metrics lookup warning: ${e?.message}`);
    }

    // 2. Query Neo4j for exact commit counts per contributor on this repo
    const session = neo4jSession();
    try {
        const res = await session.run(`
            MATCH (r:REPOSITORY)
            WHERE toLower(r.name) = toLower($repo) OR replace(toLower(r.name), '-', ' ') = toLower($spacedRepo) OR toLower(r.name) CONTAINS toLower($repo)
            OPTIONAL MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r)
            WHERE ${CYPHER_BOT_FILTER}
            RETURN r.name AS matchedRepo, p.name AS personName, rel.commitCount AS commits
            ORDER BY commits DESC
        `, {
            repo: normalizedRepo,
            spacedRepo: rawRepo.toLowerCase().replace(/[-_]/g, ' ')
        });

        let matchedRepoName = rawRepo;
        const rawBreakdown: Array<{ person: string; commits: number }> = [];
        let totalCommits = 0;

        for (const record of res.records) {
            if (record.get('matchedRepo')) matchedRepoName = record.get('matchedRepo');
            const pName = record.get('personName');
            if (pName && !isBotAccount(pName)) {
                const countVal = record.get('commits');
                const commits = countVal?.toNumber ? countVal.toNumber() : Number(countVal || 0);
                rawBreakdown.push({ person: pName, commits });
                totalCommits += commits;
            }
        }

        // If total commits is 0, check if primaryOwner exists in SQL
        if (totalCommits === 0 && primaryOwner) {
            rawBreakdown.push({ person: primaryOwner, commits: 1 });
            totalCommits = 1;
        }

        const ownershipBreakdown = rawBreakdown.map(item => {
            const percentage = totalCommits > 0 ? Math.round((item.commits / totalCommits) * 100) : 0;
            const isOwner = Boolean(primaryOwner && item.person.toLowerCase() === primaryOwner.toLowerCase());
            return {
                person: item.person,
                commits: item.commits,
                percentage,
                isPrimaryOwner: isOwner || (rawBreakdown.length === 1 && !primaryOwner),
            };
        });

        // Ensure owner is at top
        ownershipBreakdown.sort((a, b) => b.percentage - a.percentage);

        return {
            repository: matchedRepoName,
            primaryOwner: primaryOwner || (ownershipBreakdown[0]?.person ?? null),
            busFactor,
            status,
            totalCommits,
            ownershipBreakdown,
        };
    } finally {
        await session.close();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. get_bus_factor
// ─────────────────────────────────────────────────────────────────────────────
export async function executeGetBusFactor(input: GetBusFactorInput): Promise<GetBusFactorOutput> {
    const rawRepo = input.repo?.trim();

    let rows: any[] = [];
    if (rawRepo && rawRepo.toUpperCase() !== 'ALL') {
        const normalized = normalizeName(rawRepo);
        rows = await sql`
            SELECT repo_name, bus_factor, risk_score, contributor_count, primary_owner, status
            FROM repo_metrics
            WHERE lower(repo_name) = lower(${normalized})
               OR lower(repo_name) = lower(${rawRepo})
               OR repo_name ILIKE ${'%' + normalized + '%'}
            ORDER BY 
                CASE WHEN lower(repo_name) = lower(${normalized}) THEN 0 ELSE 1 END
        `;
    } else {
        rows = await sql`
            SELECT repo_name, bus_factor, risk_score, contributor_count, primary_owner, status
            FROM repo_metrics
            WHERE status IS DISTINCT FROM 'empty'
            ORDER BY bus_factor ASC, risk_score DESC
        `;
    }

    const repositories = rows.map((r: any) => ({
        repoName: r.repo_name,
        busFactor: Number(r.bus_factor ?? 1.0),
        riskScore: Number(r.risk_score ?? 80),
        contributorCount: Number(r.contributor_count ?? 1),
        primaryOwner: r.primary_owner || null,
        status: r.status || (Number(r.bus_factor) <= 1 ? 'fragile' : 'healthy'),
        isSPOF: Number(r.bus_factor ?? 1.0) <= 1.0 && r.status !== 'empty',
    }));

    return { repositories };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. get_successor_recommendation
// CRITICAL: Reuses exact same function/query used by dashboard's SPOF section!
// ─────────────────────────────────────────────────────────────────────────────
export async function executeGetSuccessorRecommendation(input: GetSuccessorRecommendationInput): Promise<GetSuccessorRecommendationOutput> {
    const rawRepo = input.repo?.trim();
    const rawPerson = input.person?.trim();

    // Case A: Querying by Repository
    if (rawRepo) {
        const normalizedRepo = normalizeName(rawRepo);

        // 1. Find repository details & primary owner from PostgreSQL repo_metrics (exact same as dashboard)
        const [rmRow] = await sql`
            SELECT repo_name, primary_owner, bus_factor, status
            FROM repo_metrics
            WHERE lower(repo_name) = lower(${normalizedRepo})
               OR lower(repo_name) = lower(${rawRepo})
               OR repo_name ILIKE ${'%' + normalizedRepo + '%'}
            LIMIT 1
        `;

        const repoName = rmRow?.repo_name || rawRepo;
        const busFactor = Number(rmRow?.bus_factor ?? 1.0);
        let primaryOwner = rmRow?.primary_owner;

        // If no owner in repo_metrics, check top committer from Neo4j
        if (!primaryOwner) {
            const session = neo4jSession();
            try {
                const res = await session.run(`
                    MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
                    WHERE toLower(r.name) = toLower($repo) AND ${CYPHER_BOT_FILTER}
                    RETURN p.name AS name, rel.commitCount AS commits
                    ORDER BY commits DESC
                    LIMIT 1
                `, { repo: normalizedRepo });
                if (res.records.length > 0) {
                    primaryOwner = res.records[0].get('name');
                }
            } finally {
                await session.close();
            }
        }

        if (!primaryOwner) {
            return {
                target: repoName,
                targetType: 'repository',
                busFactor,
                hasSuccessor: false,
                explanation: `Repository "${repoName}" has no recorded primary owner or active maintainers.`,
                recommendedSuccessor: null,
                candidates: [],
            };
        }

        // 2. Call the EXACT function the SPOF dashboard modal uses: calculateSuccessorCandidates(primaryOwner, repoName)
        const succResult = await calculateSuccessorCandidates(primaryOwner, repoName);
        const topCandidate = succResult.candidates[0] || null;

        return {
            target: repoName,
            targetType: 'repository',
            primaryOwner,
            busFactor,
            hasSuccessor: succResult.hasSuccessor,
            explanation: succResult.explanation,
            recommendedSuccessor: topCandidate ? {
                name: topCandidate.name,
                score: topCandidate.score,
                sharedTechnologies: topCandidate.factors.sharedTechnologies || [],
                sharedRepositories: topCandidate.factors.sharedRepositories || [],
                capacityScore: topCandidate.breakdown.workloadCapacityScore || 0,
                rationale: topCandidate.rationale,
                warningLabel: topCandidate.warningLabel,
                isOverloaded: topCandidate.isOverloaded,
            } : null,
            candidates: succResult.candidates.map(c => ({
                name: c.name,
                score: c.score,
                sharedTechnologies: c.factors.sharedTechnologies || [],
                sharedRepositories: c.factors.sharedRepositories || [],
                capacityScore: c.breakdown.workloadCapacityScore || 0,
                rationale: c.rationale,
                isOverloaded: c.isOverloaded,
            })),
        };
    }

    // Case B: Querying by Person
    const personName = rawPerson || 'ALL';
    const succResult = await calculateSuccessorCandidates(personName);
    const topCandidate = succResult.candidates[0] || null;

    return {
        target: personName,
        targetType: 'person',
        hasSuccessor: succResult.hasSuccessor,
        explanation: succResult.explanation,
        recommendedSuccessor: topCandidate ? {
            name: topCandidate.name,
            score: topCandidate.score,
            sharedTechnologies: topCandidate.factors.sharedTechnologies || [],
            sharedRepositories: topCandidate.factors.sharedRepositories || [],
            capacityScore: topCandidate.breakdown.workloadCapacityScore || 0,
            rationale: topCandidate.rationale,
            warningLabel: topCandidate.warningLabel,
            isOverloaded: topCandidate.isOverloaded,
        } : null,
        candidates: succResult.candidates.map(c => ({
            name: c.name,
            score: c.score,
            sharedTechnologies: c.factors.sharedTechnologies || [],
            sharedRepositories: c.factors.sharedRepositories || [],
            capacityScore: c.breakdown.workloadCapacityScore || 0,
            rationale: c.rationale,
            isOverloaded: c.isOverloaded,
        })),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. get_recent_changes
// ─────────────────────────────────────────────────────────────────────────────
export async function executeGetRecentChanges(input: GetRecentChangesInput): Promise<GetRecentChangesOutput> {
    const rawRepo = input.repo.trim();
    const days = Math.min(input.days ?? 30, 365);
    const normalizedRepo = normalizeName(rawRepo);

    const rows = await sql`
        SELECT id, provider, event_type, payload, created_at 
        FROM events 
        WHERE (payload->'repository'->>'name' ILIKE ${'%' + normalizedRepo + '%'} OR payload->>'repository' ILIKE ${'%' + normalizedRepo + '%'})
          AND created_at >= NOW() - (${days} || ' days')::interval
        ORDER BY created_at DESC 
        LIMIT 25
    `;

    const changes = rows.map((r: any) => {
        const payload = r.payload || {};
        const author = payload.author || payload.sender?.login || payload.pusher?.name || payload.head_commit?.author?.name || 'Unknown';
        const summary = payload.head_commit?.message || payload.pull_request?.title || payload.issue?.fields?.summary || payload.issue?.title || payload.text || `${r.event_type} event`;

        return {
            id: String(r.id),
            provider: r.provider || 'unknown',
            eventType: r.event_type || 'activity',
            author,
            summary: typeof summary === 'string' ? summary.replace(/\r?\n/g, ' ').trim() : String(summary),
            createdAt: formatTimestamp12h(new Date(r.created_at)),
        };
    });

    return {
        repository: rawRepo,
        days,
        totalChanges: changes.length,
        changes,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. get_related_entities
// ─────────────────────────────────────────────────────────────────────────────
export async function executeGetRelatedEntities(input: GetRelatedEntitiesInput): Promise<GetRelatedEntitiesOutput> {
    const entity = input.entity.trim();
    const depth = Math.min(input.depth ?? 1, 3);
    const session = neo4jSession();

    try {
        let cypher = `
            MATCH (e)-[r]-(target)
            WHERE toLower(e.name) = toLower($entity) OR toLower(e.name) CONTAINS toLower($entity)
        `;
        if (input.relationType) {
            cypher += ` AND type(r) = $relType`;
        }
        cypher += `
            RETURN target.name AS targetName, labels(target) AS targetLabels, type(r) AS relation
            LIMIT 30
        `;

        const res = await session.run(cypher, {
            entity,
            relType: input.relationType?.toUpperCase()
        });

        const connections = res.records.map((r: any) => {
            const labels: string[] = r.get('targetLabels') || [];
            return {
                targetName: r.get('targetName') || 'Unknown',
                targetType: labels[0] || 'Entity',
                relation: r.get('relation') || 'CONNECTED_TO',
            };
        });

        return {
            entity,
            connections,
        };
    } finally {
        await session.close();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. search_evidence
// ─────────────────────────────────────────────────────────────────────────────
export async function executeSearchEvidence(input: SearchEvidenceInput): Promise<SearchEvidenceOutput> {
    const query = input.query.trim();
    const limit = Math.min(input.limit ?? 5, 20);
    const matches: Array<{ source: string; text: string; author?: string; date?: string; score?: number }> = [];

    // 1. Vector Search via Qdrant
    try {
        const queryVector = await generateEmbeddings(query);
        if (queryVector && queryVector.length > 0) {
            const vectorResults = await searchSimilar(queryVector, limit);
            if (Array.isArray(vectorResults)) {
                for (const item of vectorResults) {
                    const p = (item.payload || {}) as Record<string, any>;
                    const text = p.text || p.content || p.summary || JSON.stringify(p);
                    matches.push({
                        source: `Vector Store (${p.provider || p.source || 'qdrant'})`,
                        text: typeof text === 'string' ? text.slice(0, 300) : String(text),
                        author: p.author || p.user,
                        date: p.timestamp || p.created_at,
                        score: item.score,
                    });
                }
            }
        }
    } catch (e: any) {
        console.warn(`[executeSearchEvidence] Qdrant search warning: ${e?.message}`);
    }

    // 2. PostgreSQL Full-Text ILIKE Fallback across events table
    if (matches.length < limit) {
        try {
            const tokens = query.split(/\s+/).filter(t => t.length > 2);
            const patterns = tokens.map(t => `%${t}%`);
            if (patterns.length > 0) {
                const rows = await sql`
                    SELECT id, provider, event_type, payload, created_at
                    FROM events
                    WHERE payload::text ILIKE ANY(${patterns})
                    ORDER BY created_at DESC
                    LIMIT ${limit - matches.length}
                `;
                for (const r of rows) {
                    const p = r.payload || {};
                    const text = p.text || p.message || p.summary || p.head_commit?.message || p.issue?.fields?.summary || `${r.event_type} event`;
                    matches.push({
                        source: `PostgreSQL events (${r.provider})`,
                        text: typeof text === 'string' ? text.slice(0, 300) : String(text),
                        author: p.author || p.user || p.sender?.login,
                        date: formatTimestamp12h(new Date(r.created_at)),
                    });
                }
            }
        } catch (e: any) {
            console.warn(`[executeSearchEvidence] PostgreSQL search warning: ${e?.message}`);
        }
    }

    return {
        query,
        matches,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. get_person_identity
// ─────────────────────────────────────────────────────────────────────────────
export async function executeGetPersonIdentity(input: GetPersonIdentityInput): Promise<GetPersonIdentityOutput> {
    const alias = input.alias.trim();

    // 1. Query person_identity table for canonical mappings
    let canonicalId: string | null = null;
    let displayName = alias;
    let email: string | null = null;
    let username: string | null = null;
    let externalId: string | null = null;
    const knownAliases = new Set<string>([alias]);

    try {
        const rows = await sql`
            SELECT canonical_person_id, display_name, email, username, external_id
            FROM person_identity
            WHERE lower(display_name) = lower(${alias})
               OR lower(username) = lower(${alias})
               OR lower(email) = lower(${alias})
               OR external_id = ${alias}
               OR display_name ILIKE ${'%' + alias + '%'}
            LIMIT 10
        `;

        if (rows.length > 0) {
            const primary = rows[0];
            canonicalId = primary.canonical_person_id || null;
            displayName = primary.display_name || alias;
            email = primary.email || null;
            username = primary.username || null;
            externalId = primary.external_id || null;

            for (const r of rows) {
                if (r.display_name) knownAliases.add(r.display_name);
                if (r.username) knownAliases.add(r.username);
                if (r.email) knownAliases.add(r.email);
            }
        }
    } catch (e: any) {
        console.warn(`[executeGetPersonIdentity] person_identity query warning: ${e?.message}`);
    }

    // 2. Query person_metrics for commit count, repos, technologies
    let commitCount = 0;
    let repos: string[] = [];
    let technologies: string[] = [];

    try {
        const [pmRow] = await sql`
            SELECT person_name, commit_count, repos, top_technologies
            FROM person_metrics
            WHERE lower(person_name) = lower(${displayName})
               OR lower(person_name) = lower(${alias})
               OR person_name ILIKE ${'%' + alias + '%'}
            ORDER BY 
                CASE WHEN lower(person_name) = lower(${alias}) THEN 0 ELSE 1 END,
                commit_count DESC
            LIMIT 1
        `;

        if (pmRow) {
            displayName = pmRow.person_name || displayName;
            commitCount = Number(pmRow.commit_count ?? 0);
            repos = Array.isArray(pmRow.repos) ? pmRow.repos : [];
            if (Array.isArray(pmRow.top_technologies)) {
                technologies = pmRow.top_technologies.map((t: any) => typeof t === 'string' ? t : t.name).filter(Boolean);
            }
        }
    } catch (e: any) {
        console.warn(`[executeGetPersonIdentity] person_metrics query warning: ${e?.message}`);
    }

    return {
        found: Boolean(canonicalId || commitCount > 0 || repos.length > 0),
        canonicalPersonId: canonicalId,
        displayName,
        email,
        username,
        externalId,
        knownAliases: Array.from(knownAliases),
        commitCount,
        repos,
        technologies,
    };
}
