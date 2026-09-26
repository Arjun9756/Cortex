import { neo4jSession } from "../../apps/api/config/neo4j.js";
import { calculateKnowledgeRisk } from "./knowledge.service.js";
import sql from "../../apps/api/config/postgres.js";
import { CYPHER_BOT_FILTER, isBotAccount } from "../shared/botDetection.js";
import { aggregationSources, type DataSource } from '../database/provenance.js';

/**
 * Interface representing a consolidated Canonical Person across all providers.
 */
interface CanonicalPersonGroup {
    canonicalId: string;
    primaryName: string;
    names: Set<string>;
    emails: Set<string>;
    usernames: Set<string>;
    externalIds: Set<string>;
    aliases: Set<string>; // set of all names, usernames, externalIds, emails
    isActive: boolean;
}

const SLACK_ID_PATTERN = /^U[A-Z0-9]{6,}$/i;

function chooseBestDisplayName(names: string[]): string {
    const valid = names.filter(n => n && !SLACK_ID_PATTERN.test(n.trim()));
    if (valid.length === 0) return names[0] || 'Unknown';
    // Prefer human display names with spaces over usernames or abbreviations
    valid.sort((a, b) => {
        const aHasSpace = a.includes(' ') ? 1 : 0;
        const bHasSpace = b.includes(' ') ? 1 : 0;
        if (aHasSpace !== bHasSpace) return bHasSpace - aHasSpace;
        return b.length - a.length;
    });
    return valid[0] || 'Unknown';
}

/**
 * Calculates metrics and risk scores grouped by Canonical Person ID.
 *
 * 1. Resolves all identities from Postgres `person_identity` table.
 * 2. Matches Neo4j PERSON nodes into their respective canonical person groups.
 * 3. Aggregates activity (commits, repos, technologies) across ALL provider aliases.
 * 4. Filters out ghost users with zero real activity (0 commits + 0 repos).
 * 5. Calculates 6-factor Knowledge Risk on the unified canonical identity.
 * 6. Upserts exactly 1 row per canonical person into `person_metrics` and purges stale/duplicate rows.
 */
export async function calculateAllPersonMetrics(source: DataSource) {
    const session = neo4jSession();
    const trustedSources = aggregationSources(source);
    try {
        console.log("[PersonMetrics] Starting canonical identity metrics calculation...");

        // Step 1: Load all identity mappings from Postgres person_identity table
        let identityRows: any[] = [];
        try {
            identityRows = await sql`
                SELECT canonical_person_id, provider, external_id, username, email, display_name, is_active
                FROM person_identity
                WHERE source IN ${sql(trustedSources)}
            `;
        } catch (dbErr: any) {
            console.warn(`[PersonMetrics] Failed to load person_identity: ${dbErr?.message}`);
        }

        // Build Canonical Groups map from Postgres
        const canonicalGroupsMap = new Map<string, CanonicalPersonGroup>();

        for (const row of identityRows) {
            const cId = row.canonical_person_id;
            if (!cId) continue;

            let group = canonicalGroupsMap.get(cId);
            if (!group) {
                group = {
                    canonicalId: cId,
                    primaryName: row.display_name || row.username || cId,
                    names: new Set<string>(),
                    emails: new Set<string>(),
                    usernames: new Set<string>(),
                    externalIds: new Set<string>(),
                    aliases: new Set<string>(),
                    isActive: row.is_active !== false,
                };
                canonicalGroupsMap.set(cId, group);
            }

            if (row.is_active === false) {
                group.isActive = false;
            }

            if (row.display_name) {
                group.names.add(row.display_name.trim());
                group.aliases.add(row.display_name.trim());
            }
            if (row.username) {
                group.usernames.add(row.username.trim().toLowerCase());
                group.aliases.add(row.username.trim());
            }
            if (row.email) {
                group.emails.add(row.email.trim().toLowerCase());
                group.aliases.add(row.email.trim().toLowerCase());
            }
            if (row.external_id) {
                group.externalIds.add(row.external_id.trim());
                group.aliases.add(row.external_id.trim());
            }
        }

        // Step 2: Fetch all PERSON nodes from Neo4j to ensure complete coverage (excluding bots)
        const neo4jPersons = await session.run(
            `MATCH (p:PERSON)
             WHERE p.source IN $trustedSources AND ${CYPHER_BOT_FILTER}
             RETURN p.name AS name, p.externalId AS externalId, p.email AS email, p.provider AS provider, p.canonicalPersonId AS canonicalPersonId, p.isActive AS isActive`
            , { trustedSources }
        );

        for (const record of neo4jPersons.records) {
            const pName = record.get("name")?.trim();
            const pExt = record.get("externalId")?.trim();
            const pEmail = record.get("email")?.trim()?.toLowerCase();
            const pCanonical = record.get("canonicalPersonId")?.trim();

            if (!pName && !pExt && !pCanonical) continue;

            // Strict policy: match Neo4j node to canonical group strictly on high-confidence identifiers:
            // 1. canonicalPersonId
            // 2. Exact email
            // 3. Exact externalId
            // NEVER match solely by display name similarity!
            let matchedGroup: CanonicalPersonGroup | undefined;

            if (pCanonical && canonicalGroupsMap.has(pCanonical)) {
                matchedGroup = canonicalGroupsMap.get(pCanonical);
            }

            if (!matchedGroup && pEmail) {
                for (const group of canonicalGroupsMap.values()) {
                    if (group.emails.has(pEmail)) {
                        matchedGroup = group;
                        break;
                    }
                }
            }

            if (!matchedGroup && pExt) {
                for (const group of canonicalGroupsMap.values()) {
                    if (group.externalIds.has(pExt)) {
                        matchedGroup = group;
                        break;
                    }
                }
            }

            if (matchedGroup) {
                if (pName) {
                    matchedGroup.names.add(pName);
                    matchedGroup.aliases.add(pName);
                }
                if (pExt) {
                    matchedGroup.externalIds.add(pExt);
                    matchedGroup.aliases.add(pExt);
                }
                if (pEmail) {
                    matchedGroup.emails.add(pEmail);
                    matchedGroup.aliases.add(pEmail);
                }
            } else {
                // New person node not yet registered in person_identity table
                // Under strict policy: Keep as separate person
                const canonId = pCanonical || pExt || `person_${(pEmail || pName || 'anon').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
                const newGroup: CanonicalPersonGroup = {
                    canonicalId: canonId,
                    primaryName: pName || pExt || canonId,
                    names: new Set<string>(pName ? [pName] : []),
                    emails: new Set<string>(pEmail ? [pEmail] : []),
                    usernames: new Set<string>(),
                    externalIds: new Set<string>(pExt ? [pExt] : []),
                    aliases: new Set<string>([pName, pExt, pEmail].filter(Boolean) as string[]),
                    isActive: record.get('isActive') !== false,
                };
                canonicalGroupsMap.set(canonId, newGroup);
            }
        }

        // Refine primary display name for each group
        for (const group of canonicalGroupsMap.values()) {
            group.primaryName = chooseBestDisplayName(Array.from(group.names));
        }

        await session.close();

        // Load all repository metrics to ensure absolute parity with repo_metrics (single source of truth)
        const repoRows = await sql`
            SELECT repo_name, technologies, top_contributors
            FROM repo_metrics
            WHERE source IN ${sql(trustedSources)} AND top_contributors IS NOT NULL
        `;

        // Step 3: Compute aggregated metrics for each active canonical person group
        const validCanonicalIds: string[] = [];
        const activeGroups = Array.from(canonicalGroupsMap.values()).filter(g => {
            if (g.isActive === false) return false;
            if (isBotAccount(g.primaryName, Array.from(g.emails)[0], Array.from(g.usernames)[0], g.canonicalId)) return false;
            if (g.primaryName.toLowerCase() === 'ghost' || g.primaryName.toLowerCase().includes('unknown')) return false;
            return true;
        });

        const CONCURRENCY = 4;

        for (let i = 0; i < activeGroups.length; i += CONCURRENCY) {
            const batch = activeGroups.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(batch.map(async (group) => {
                const { canonicalId, primaryName } = group;
                const externalIds = Array.from(group.externalIds);
                const emails = Array.from(group.emails);
                const names = Array.from(group.names);
                const usernames = Array.from(group.usernames);

                const itemSession = neo4jSession();
                try {
                    // 1. Single source of truth for commits and repos: derive from repo_metrics.top_contributors
                    const allMatchNames = new Set<string>([
                        primaryName.toLowerCase(),
                        ...names.map(n => n.toLowerCase()),
                        ...Array.from(group.aliases).map(a => a.toLowerCase()),
                        ...usernames.map(u => u.toLowerCase()),
                    ]);

                    let commitCount = 0;
                    const reposSet = new Set<string>();
                    const repoTechs = new Set<string>();

                    for (const repo of repoRows) {
                        const contributors = Array.isArray(repo.top_contributors) ? repo.top_contributors : [];
                        for (const c of contributors) {
                            const cName = (c.person || '').trim().toLowerCase();
                            if (allMatchNames.has(cName)) {
                                commitCount += Number(c.commits) || 0;
                                reposSet.add(repo.repo_name);
                                if (Array.isArray(repo.technologies)) {
                                    for (const t of repo.technologies) {
                                        if (t) repoTechs.add(t);
                                    }
                                }
                            }
                        }
                    }

                    const repos = Array.from(reposSet);

                    // 2. Query top technologies from Neo4j direct mentions
                    let topTechnologies: Array<{ name: string; score: number }> = [];
                    try {
                        const techRes = await itemSession.run(
                            `MATCH (p:PERSON)
                             WHERE p.source IN $trustedSources AND (p.canonicalPersonId IS NOT NULL AND p.canonicalPersonId = $canonicalId)
                                OR (p.externalId IS NOT NULL AND p.externalId IN $externalIds)
                                OR (p.email IS NOT NULL AND toLower(p.email) IN $emails)
                             OPTIONAL MATCH (p)-[]-(e)-[:MENTIONED_IN|USES]-(t:TECHNOLOGY)
                             WHERE t.name IS NOT NULL
                             RETURN t.name AS tech, count(e) AS techScore
                             ORDER BY techScore DESC
                             LIMIT 5`,
                            { canonicalId, externalIds, emails, trustedSources }
                        );

                        topTechnologies = techRes.records
                            .map((r: any) => ({
                                name: r.get("tech") as string,
                                score: r.get("techScore")?.toNumber ? r.get("techScore").toNumber() : Number(r.get("techScore") || 0)
                            }))
                            .filter((t: { name: string; score: number }) => t.name && t.score > 0);
                    } catch (techErr: any) {
                        console.warn(`[PersonMetrics] Tech query notice for ${primaryName}: ${techErr?.message}`);
                    }

                    // Augment with repo technologies if needed
                    if (topTechnologies.length < 5 && repoTechs.size > 0) {
                        const existingTechs = new Set(topTechnologies.map(t => t.name));
                        for (const rt of repoTechs) {
                            if (!existingTechs.has(rt)) {
                                topTechnologies.push({ name: rt, score: 1 });
                                existingTechs.add(rt);
                                if (topTechnologies.length >= 5) break;
                            }
                        }
                    }

                    // 3. 6-Factor Knowledge Risk Calculation on the canonical person
                    const risk = await calculateKnowledgeRisk(primaryName);
                    const riskScore = Math.round(risk.totalRisk * 100);

                    // 4. Upsert exactly ONE canonical record in person_metrics
                    const isActive = true;
                    const employmentStatus = 'active';

                    await sql`
                        INSERT INTO person_metrics
                            (source, external_id, person_name, risk_score, top_technologies, repos, commit_count, is_active, employment_status, computed_at)
                        VALUES
                            (${source}, ${canonicalId}, ${primaryName}, ${riskScore}, ${sql.json(topTechnologies)},
                             ${sql.json(repos)}, ${commitCount}, ${isActive}, ${employmentStatus}, now())
                        ON CONFLICT (source, external_id)
                        DO UPDATE SET
                            person_name      = EXCLUDED.person_name,
                            risk_score       = EXCLUDED.risk_score,
                            top_technologies = EXCLUDED.top_technologies,
                            repos            = EXCLUDED.repos,
                            commit_count     = EXCLUDED.commit_count,
                            is_active        = EXCLUDED.is_active,
                            employment_status= EXCLUDED.employment_status,
                            computed_at      = EXCLUDED.computed_at
                    `;

                    console.log(`[PersonMetrics] Canonical: "${primaryName}" (${canonicalId}): risk=${riskScore}%, repos=[${repos.join(', ')}], commits=${commitCount}, active=${isActive}`);
                    return canonicalId;
                } catch (personError: any) {
                    console.error(`[PersonMetrics] Failed for canonical person "${primaryName}": ${personError?.message}`);
                    return null;
                } finally {
                    await itemSession.close();
                }
            }));

            for (const cid of batchResults) {
                if (cid) validCanonicalIds.push(cid);
            }
        }

        // Step 4: Purge old fragmented rows and ghost records from person_metrics
        if (validCanonicalIds.length > 0) {
            const deleted = await sql`
                DELETE FROM person_metrics
                WHERE source = ${source} AND external_id NOT IN ${sql(validCanonicalIds)}
            `;
            console.log(`[PersonMetrics] Purged stale/fragmented rows: ${deleted.count ?? 0}`);
        }

        console.log(`=== Person Metrics Computed: ${validCanonicalIds.length} Active Canonical People ===`);
    } catch (error: any) {
        console.error(`[PersonMetrics] Fatal error: ${error?.message}`);
    }
}
