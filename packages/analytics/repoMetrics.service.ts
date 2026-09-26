import { neo4jSession } from "../../apps/api/config/neo4j.js";
import sql from "../../apps/api/config/postgres.js";
import { getGraphSchema } from "../database/neo4j/schemaCache.js";
import { CYPHER_BOT_FILTER, isBotAccount } from "../shared/botDetection.js";
import { aggregationSources, type DataSource } from '../database/provenance.js';

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
export async function calculateAllRepoMetrics(source: DataSource) {
    const session = neo4jSession();
    const trustedSources = aggregationSources(source);

    // Check schema before running queries
    let hasAuthored = true
    let hasPartOf = true
    let hasContributedTo = true
    try {
        const schema = await getGraphSchema()
        hasAuthored = schema.relationshipTypes.includes('AUTHORED')
        hasPartOf   = schema.relationshipTypes.includes('PART_OF')
        hasContributedTo = schema.relationshipTypes.includes('CONTRIBUTED_TO')
    } catch (schemaErr: any) {
        console.warn('[RepoMetrics] Schema fetch failed, proceeding with best-effort queries:', schemaErr?.message)
    }

    try {
        const repos = await session.run(`MATCH (r:REPOSITORY) WHERE r.source IN $trustedSources RETURN r.name AS name, r.externalId AS externalId`, { trustedSources });

        for (const record of repos.records) {
            const repoName = record.get("name");
            const externalId = record.get("externalId") || repoName;

            if (!externalId) {
                console.warn(`[RepoMetrics] Skipping repo without name/externalId`);
                continue;
            }

            // Bug #6 fix: per-record try/catch so one bad repo doesn't abort the whole batch
            try {
                // Invariants 1, 2, 4, 5, 7:
                // Bus factor and contributors derived directly from verified commit contributions
                const { busFactor, primaryOwner, totalCommits, contributors } = await calculateBusFactorAndOwner(session, repoName, trustedSources);
                
                // Zero-Commit / Scaffold Invariant:
                // If totalCommits === 0, contributorCount MUST be 0 (no ghost contributors from WORKS_ON)
                const isEmpty = totalCommits === 0 || contributors.length === 0;
                const contributorCount = isEmpty ? 0 : contributors.length;

                // Invariant 1: tech stack must be empty for 0-commit repositories
                let technologies: string[] = [];
                if (!isEmpty) {
                    const techResult = await session.run(
                        `MATCH (r:REPOSITORY) WHERE toLower(r.name) = toLower($repoName) AND r.source IN $trustedSources
                         OPTIONAL MATCH (r)-[:USES|DEPENDS_ON|MENTIONED_IN]->(t1:TECHNOLOGY)
                         OPTIONAL MATCH (r)<-[:PART_OF]-(:PULL_REQUEST|ISSUE)-[:USES|MENTIONED_IN]->(t2:TECHNOLOGY)
                         RETURN collect(DISTINCT t1.name) + collect(DISTINCT t2.name) AS techs`,
                        { repoName, trustedSources }
                    );
                    const rawTechs = techResult.records[0]?.get("techs") || [];
                    technologies = Array.from(new Set<string>((rawTechs as unknown[]).filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)));
                }

                const primaryOwnerPercentage = !isEmpty && contributors.length > 0 && totalCommits > 0 
                    ? Math.round(contributors[0]!.percentage) 
                    : 0;

                // Invariant 1: commits == 0 => contributors == 0 AND tech_stack == [] AND ownership == 'None'
                // Invariant 4: bus_factor <= contributor_count
                // Invariant 5: bus_factor == 0 <=> contributors == 0
                // Invariant 7: a repo with 0 commits cannot appear in 'Healthy' (only in 'empty')
                const busFactorFinal = isEmpty ? 0 : Math.min(busFactor, contributorCount);
                const riskScore = isEmpty ? 0 : Math.max(0, 100 - busFactorFinal * 20);
                const status = isEmpty
                    ? 'empty'
                    : (riskScore >= 80 ? 'fragile' : riskScore > 50 ? 'concentrated' : 'healthy');

                // Purge any obsolete rows for this repo_name with an older/different external_id
                await sql`
                    DELETE FROM repo_metrics
                    WHERE repo_name = ${repoName} AND external_id != ${externalId} AND source = ${source}
                `;

                await sql`
                    INSERT INTO repo_metrics
                        (source, external_id, repo_name, bus_factor, risk_score, contributor_count, primary_owner, status,
                         commit_count, primary_owner_percentage, technologies, top_contributors, computed_at)
                    VALUES
                        (${source}, ${externalId}, ${repoName}, ${busFactorFinal}, ${riskScore}, ${contributorCount},
                         ${isEmpty ? null : (primaryOwner ?? null)},
                         ${status},
                         ${totalCommits},
                         ${primaryOwnerPercentage},
                         ${sql.json(technologies)},
                         ${sql.json(isEmpty ? [] : contributors as any)},
                         now())
                    ON CONFLICT (source, external_id)
                    DO UPDATE SET
                        repo_name               = EXCLUDED.repo_name,
                        source                  = EXCLUDED.source,
                        bus_factor              = EXCLUDED.bus_factor,
                        risk_score              = EXCLUDED.risk_score,
                        contributor_count       = EXCLUDED.contributor_count,
                        primary_owner           = EXCLUDED.primary_owner,
                        status                  = EXCLUDED.status,
                        commit_count            = EXCLUDED.commit_count,
                        primary_owner_percentage= EXCLUDED.primary_owner_percentage,
                        technologies            = EXCLUDED.technologies,
                        top_contributors        = EXCLUDED.top_contributors,
                        computed_at             = EXCLUDED.computed_at
                `;

                console.log(`[RepoMetrics] ${repoName} (${externalId}): status=${status}, busFactor=${busFactorFinal}, risk=${riskScore}, commits=${totalCommits}, contributors=${contributorCount}, owner=${isEmpty ? 'none' : (primaryOwner ?? 'none')} (${primaryOwnerPercentage}%)`);
            } catch (repoError: any) {
                console.error(`[RepoMetrics] Failed for ${repoName}: ${repoError?.message}`);
                // Continue to next repo — don't let one failure abort the whole batch
            }
        }

        // Final cleanup: delete any rows from repo_metrics not in active Neo4j repos
        const activeNames = repos.records.map((r: any) => r.get("name"));
        if (activeNames.length > 0) {
            await sql`DELETE FROM repo_metrics WHERE source = ${source} AND repo_name NOT IN ${sql(activeNames)}`;
        }

        console.log('=== Repo Metrics Computed ===');
    } catch (error: any) {
        console.error(`[RepoMetrics] Fatal error: ${error?.message}`);
    } finally {
        await session.close();
    }
}

/**
 * Immediately computes and upserts repo_metrics for a SINGLE repository.
 * Called by the ingest path right after Neo4j is written so the Dashboard
 * and Chat Agent see the same commit count without waiting for the debounce window.
 *
 * @param repoName   - The repository name as stored in Neo4j (e.g. "billing-engine")
 * @param externalId - Stable external identifier for the repo (falls back to repoName)
 * @param source     - DataSource provenance tag (e.g. 'webhook')
 */
export async function upsertRepoMetrics(repoName: string, externalId: string, source: DataSource): Promise<void> {
    if (!repoName || !externalId) {
        console.warn('[RepoMetrics] upsertRepoMetrics called without repoName/externalId — skipping');
        return;
    }

    const session = neo4jSession();
    const trustedSources = aggregationSources(source);

    try {
        const { busFactor, primaryOwner, totalCommits, contributors } = await calculateBusFactorAndOwner(session, repoName, trustedSources);

        const isEmpty = totalCommits === 0 || contributors.length === 0;
        const contributorCount = isEmpty ? 0 : contributors.length;

        let technologies: string[] = [];
        if (!isEmpty) {
            const techResult = await session.run(
                `MATCH (r:REPOSITORY) WHERE toLower(r.name) = toLower($repoName) AND r.source IN $trustedSources
                 OPTIONAL MATCH (r)-[:USES|DEPENDS_ON|MENTIONED_IN]->(t1:TECHNOLOGY)
                 OPTIONAL MATCH (r)<-[:PART_OF]-(:PULL_REQUEST|ISSUE)-[:USES|MENTIONED_IN]->(t2:TECHNOLOGY)
                 RETURN collect(DISTINCT t1.name) + collect(DISTINCT t2.name) AS techs`,
                { repoName, trustedSources }
            );
            const rawTechs = techResult.records[0]?.get('techs') || [];
            technologies = Array.from(new Set<string>((rawTechs as unknown[]).filter((v: unknown): v is string => typeof v === 'string' && v.length > 0)));
        }

        const primaryOwnerPercentage = !isEmpty && contributors.length > 0 && totalCommits > 0
            ? Math.round(contributors[0]!.percentage)
            : 0;

        const busFactorFinal = isEmpty ? 0 : Math.min(busFactor, contributorCount);
        const riskScore = isEmpty ? 0 : Math.max(0, 100 - busFactorFinal * 20);
        const status = isEmpty
            ? 'empty'
            : (riskScore >= 80 ? 'fragile' : riskScore > 50 ? 'concentrated' : 'healthy');

        // Purge obsolete rows with a different external_id for this repo
        await sql`
            DELETE FROM repo_metrics
            WHERE repo_name = ${repoName} AND external_id != ${externalId} AND source = ${source}
        `;

        await sql`
            INSERT INTO repo_metrics
                (source, external_id, repo_name, bus_factor, risk_score, contributor_count, primary_owner, status,
                 commit_count, primary_owner_percentage, technologies, top_contributors, computed_at)
            VALUES
                (${source}, ${externalId}, ${repoName}, ${busFactorFinal}, ${riskScore}, ${contributorCount},
                 ${isEmpty ? null : (primaryOwner ?? null)},
                 ${status},
                 ${totalCommits},
                 ${primaryOwnerPercentage},
                 ${sql.json(technologies)},
                 ${sql.json(isEmpty ? [] : contributors as any)},
                 now())
            ON CONFLICT (source, external_id)
            DO UPDATE SET
                repo_name                = EXCLUDED.repo_name,
                source                   = EXCLUDED.source,
                bus_factor               = EXCLUDED.bus_factor,
                risk_score               = EXCLUDED.risk_score,
                contributor_count        = EXCLUDED.contributor_count,
                primary_owner            = EXCLUDED.primary_owner,
                status                   = EXCLUDED.status,
                commit_count             = EXCLUDED.commit_count,
                primary_owner_percentage = EXCLUDED.primary_owner_percentage,
                technologies             = EXCLUDED.technologies,
                top_contributors         = EXCLUDED.top_contributors,
                computed_at              = EXCLUDED.computed_at
        `;

        console.log(`[RepoMetrics] upsertRepoMetrics: ${repoName} (${externalId}): status=${status}, busFactor=${busFactorFinal}, commits=${totalCommits}, contributors=${contributorCount}`);
    } catch (err: any) {
        // Non-fatal: the debounced scheduler will reconcile on its next cycle
        console.error(`[RepoMetrics] upsertRepoMetrics failed for ${repoName}: ${err?.message}`);
    } finally {
        await session.close();
    }
}

export interface ContributorShare {
    person: string;
    commits: number;
    percentage: number;
}

export interface BusFactorResult {
    busFactor: number;
    primaryOwner: string | null;
    totalCommits: number;
    contributors: ContributorShare[];
    status: 'empty' | 'fragile' | 'concentrated' | 'healthy';
    riskScore: number;
    definition: string;
    qualification: string;
}

let cachedIdentityMap: { map: Map<string, string>; loadedAt: number } | null = null;

/**
 * Dynamically builds an alias-to-canonical-display-name mapping from PostgreSQL
 * person_identity and person_metrics tables. Fully client-agnostic and multi-tenant.
 */
async function getDynamicCanonicalMap(trustedSources: readonly string[]): Promise<Map<string, string>> {
    const now = Date.now();
    if (cachedIdentityMap && now - cachedIdentityMap.loadedAt < 60000) {
        return cachedIdentityMap.map;
    }

    const map = new Map<string, string>();
    try {
        const rows = await sql<any[]>`
            SELECT pi.external_id, pi.username, pi.email, pi.display_name,
                   COALESCE(pm.person_name, pi.display_name, pi.username) AS canonical_name
            FROM person_identity pi
            LEFT JOIN person_metrics pm ON pm.external_id = pi.canonical_person_id AND pm.source IN ${sql(trustedSources)}
            WHERE pi.is_active = true AND pi.source IN ${sql(trustedSources)}
        `;

        for (const r of rows) {
            const canon = (r.canonical_name || '').trim();
            if (!canon) continue;
            if (r.external_id) map.set(r.external_id.trim().toLowerCase(), canon);
            if (r.username) map.set(r.username.trim().toLowerCase(), canon);
            if (r.email) map.set(r.email.trim().toLowerCase(), canon);
            if (r.display_name) map.set(r.display_name.trim().toLowerCase(), canon);
        }
    } catch (err: any) {
        console.warn(`[RepoMetrics] Dynamic identity map fetch warning: ${err?.message}`);
    }

    cachedIdentityMap = { map, loadedAt: now };
    return map;
}

/**
 * Calculates the bus factor (minimum contributors covering >=50% of commits)
 * and identifies the primary owner (top committer by commit count).
 * P0-1: Queries CONTRIBUTED_TO rollup edges with fallback to legacy COMMIT nodes.
 */
export async function calculateBusFactorAndOwner(
    session: any, 
    repoName: string,
    trustedSources: readonly string[]
): Promise<BusFactorResult> {
    const definition = "Bus Factor represents the minimum number of engineers whose combined contributions account for >= 50% of the repository's commit volume.";
    const qualification = "Engineering Activity (Not a measure of individual productivity or output).";

    try {
        // 1. Primary path: query CONTRIBUTED_TO relationship rollup
        const contribRes = await session.run(
            `MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
             WHERE toLower(r.name) = toLower($repoName) AND r.source IN $trustedSources AND p.source IN $trustedSources AND rel.source IN $trustedSources
               AND (p.name IS NOT NULL OR p.canonicalPersonId IS NOT NULL OR p.externalId IS NOT NULL)
               AND ${CYPHER_BOT_FILTER}
               AND COALESCE(p.isActive, true) = true
               AND COALESCE(p.employmentStatus, 'active') <> 'alumni'
             WITH COALESCE(p.canonicalPersonId, p.externalId, p.email, p.name) AS personKey,
                  head(collect(COALESCE(p.name, p.externalId, 'Unknown'))) AS personName,
                  sum(COALESCE(rel.commitCount, 1)) AS commits
             RETURN personName AS person, commits
             ORDER BY commits DESC, person ASC`,
            { repoName, trustedSources }
        );

        let rows: Array<{ person: string; commits: number }> = [];

        if (contribRes.records.length > 0) {
            rows = contribRes.records.map((r: any) => ({
                person: r.get("person") as string,
                commits: r.get("commits")?.toNumber ? r.get("commits").toNumber() : Number(r.get("commits") || 0),
            })).filter((r: { person: string; commits: number }) => r.commits > 0);
        }

        // 2. Fallback path for legacy graphs with uncompacted COMMIT nodes
        if (rows.length === 0) {
            const legacyRes = await session.run(
                `MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY)
                 WHERE toLower(r.name) = toLower($repoName) AND r.source IN $trustedSources AND p.source IN $trustedSources
                   AND (p.name IS NOT NULL OR p.canonicalPersonId IS NOT NULL OR p.externalId IS NOT NULL)
                   AND ${CYPHER_BOT_FILTER}
                   AND COALESCE(p.isActive, true) = true
                   AND COALESCE(p.employmentStatus, 'active') <> 'alumni'
                 WITH COALESCE(p.canonicalPersonId, p.externalId, p.email, p.name) AS personKey,
                      head(collect(COALESCE(p.name, p.externalId, 'Unknown'))) AS personName,
                      count(c) AS commits
                 RETURN personName AS person, commits
                 ORDER BY commits DESC, person ASC`,
                { repoName, trustedSources }
            );

            if (legacyRes.records.length > 0) {
                rows = legacyRes.records.map((r: any) => ({
                    person: r.get("person") as string,
                    commits: r.get("commits")?.toNumber ? r.get("commits").toNumber() : Number(r.get("commits") || 0),
                }));
            }
        }

        // 3. Robust Fallback: check PostgreSQL events if Neo4j graph has not ingested graph nodes yet
        if (rows.length === 0) {
            try {
                const pgRows = await sql`
                    SELECT 
                        COALESCE(
                            payload->'head_commit'->'author'->>'name',
                            payload->'pusher'->>'name',
                            payload->'sender'->>'login',
                            payload->>'author',
                            'Contributor'
                        ) AS author_name,
                        COUNT(*)::int AS commits
                    FROM events
                    WHERE source IN ${sql(trustedSources)} AND (
                        lower(COALESCE(payload->'repository'->>'full_name', payload->'repository'->>'name', payload->>'repository', '')) = lower(${repoName})
                        OR (
                            lower(COALESCE(payload->'repository'->>'name', payload->>'repository', '')) = lower(${repoName})
                            AND payload->'repository'->>'full_name' IS NULL
                        )
                    )
                    AND (provider = 'github' OR event_type ILIKE '%push%' OR event_type ILIKE '%commit%')
                    GROUP BY 1
                    ORDER BY commits DESC
                `;
                if (pgRows && pgRows.length > 0) {
                    rows = pgRows
                        .filter((r: any) => !isBotAccount(r.author_name))
                        .map((r: any) => ({
                            person: r.author_name,
                            commits: Number(r.commits) || 1
                        }));
                }
            } catch (pgErr: any) {
                console.warn(`[RepoMetrics] PG fallback query warning for ${repoName}:`, pgErr?.message);
            }
        }

        // Dynamic canonical alias resolution from PostgreSQL person_identity table
        const canonicalLookup = await getDynamicCanonicalMap(trustedSources);

        // Filter out any bots and consolidate rows under canonical display names
        const consolidatedMap = new Map<string, number>();
        for (const r of rows) {
            if (!r.person || isBotAccount(r.person) || r.commits <= 0) continue;
            const clean = r.person.trim().toLowerCase();
            const canonName = canonicalLookup.get(clean) || r.person.trim();
            if (isBotAccount(canonName)) continue;
            consolidatedMap.set(canonName, (consolidatedMap.get(canonName) || 0) + r.commits);
        }

        rows = Array.from(consolidatedMap.entries())
            .map(([person, commits]) => ({ person, commits }))
            .sort((a, b) => b.commits - a.commits || a.person.localeCompare(b.person));

        if (rows.length === 0) {
            return {
                busFactor: 0,
                primaryOwner: null,
                totalCommits: 0,
                contributors: [],
                status: 'empty',
                riskScore: 0,
                definition,
                qualification
            };
        }

        const total = rows.reduce((a: number, b: { commits: number }) => a + b.commits, 0);
        if (total === 0) {
            return {
                busFactor: 0,
                primaryOwner: null,
                totalCommits: 0,
                contributors: [],
                status: 'empty',
                riskScore: 0,
                definition,
                qualification
            };
        }

        const contributors: ContributorShare[] = rows.map(r => ({
            person: r.person,
            commits: r.commits,
            percentage: Math.round((r.commits / total) * 1000) / 10
        }));

        // Invariant 3: Normalize rounding so sum(percentage) is strictly 100.0%
        if (contributors.length > 0) {
            const rawSum = contributors.reduce((s, c) => s + c.percentage, 0);
            const diff = Math.round((100.0 - rawSum) * 10) / 10;
            if (Math.abs(diff) > 0 && Math.abs(diff) < 1.0) {
                contributors[0]!.percentage = Math.round((contributors[0]!.percentage + diff) * 10) / 10;
            }
        }

        const primaryOwner = rows[0]?.person ?? null;

        let covered = 0, count = 0;
        for (const row of rows) {
            covered += row.commits;
            count++;
            if (covered / total >= 0.5) break;
        }

        // Invariant 4: bus factor cannot exceed total distinct contributors
        const busFactor = Math.min(count, contributors.length);
        const riskScore = Math.max(0, 100 - busFactor * 20);
        const status = riskScore >= 80 ? 'fragile' : riskScore > 50 ? 'concentrated' : 'healthy';

        return {
            busFactor,
            primaryOwner,
            totalCommits: total,
            contributors,
            status,
            riskScore,
            definition,
            qualification
        };
    } catch (error: any) {
        console.error(`[RepoMetrics] calculateBusFactorAndOwner failed for ${repoName}: ${error?.message}`);
        return {
            busFactor: 0,
            primaryOwner: null,
            totalCommits: 0,
            contributors: [],
            status: 'empty',
            riskScore: 0,
            definition,
            qualification
        };
    }
}
