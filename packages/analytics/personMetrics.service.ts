import { neo4jSession } from "../../apps/api/config/neo4j.js";
import { calculateKnowledgeRisk } from "./knowledge.service.js";
import sql from "../../apps/api/config/postgres.js";
import { CYPHER_BOT_FILTER, isBotAccount } from "../shared/botDetection.js";

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
export async function calculateAllPersonMetrics() {
    const session = neo4jSession();
    try {
        console.log("[PersonMetrics] Starting canonical identity metrics calculation...");

        // Step 1: Load all identity mappings from Postgres person_identity table
        let identityRows: any[] = [];
        try {
            identityRows = await sql`
                SELECT canonical_person_id, provider, external_id, username, email, display_name, is_active
                FROM person_identity
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
             WHERE ${CYPHER_BOT_FILTER}
             RETURN p.name AS name, p.externalId AS externalId, p.email AS email, p.provider AS provider, p.canonicalPersonId AS canonicalPersonId, p.isActive AS isActive`
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
                };
                canonicalGroupsMap.set(canonId, newGroup);
            }
        }

        // Refine primary display name for each group
        for (const group of canonicalGroupsMap.values()) {
            group.primaryName = chooseBestDisplayName(Array.from(group.names));
        }

        await session.close();

        // Step 3: Compute aggregated metrics for each canonical person group in parallel batches
        const validCanonicalIds: string[] = [];
        const groups = Array.from(canonicalGroupsMap.values());
        const CONCURRENCY = 6;

        for (let i = 0; i < groups.length; i += CONCURRENCY) {
            const batch = groups.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(batch.map(async (group) => {
                const { canonicalId, primaryName } = group;
                const externalIds = Array.from(group.externalIds);
                const emails = Array.from(group.emails);
                const names = Array.from(group.names);
                const usernames = Array.from(group.usernames);

                const itemSession = neo4jSession();
                try {
                    // P1-4 & P0-1: Single combined query for repos, commit count (CONTRIBUTED_TO + legacy), and top technologies
                    const metricsRes = await itemSession.run(
                        `MATCH (p:PERSON)
                         WHERE (p.canonicalPersonId IS NOT NULL AND p.canonicalPersonId = $canonicalId)
                            OR (p.externalId IS NOT NULL AND p.externalId IN $externalIds)
                            OR (p.email IS NOT NULL AND toLower(p.email) IN $emails)
                            OR (p.canonicalPersonId IS NULL AND p.externalId IS NULL AND p.email IS NULL AND p.name IN $names)
                         WITH collect(DISTINCT p) AS matchedPeople
                         WHERE size(matchedPeople) > 0

                         UNWIND matchedPeople AS pContrib
                         OPTIONAL MATCH (pContrib)-[rel:CONTRIBUTED_TO]->(r1:REPOSITORY)
                         OPTIONAL MATCH (pContrib)-[:WORKS_ON]->(r2:REPOSITORY)
                         OPTIONAL MATCH (pContrib)-[]-(:PULL_REQUEST|ISSUE|COMMIT)-[:PART_OF]->(r3:REPOSITORY)
                         WITH matchedPeople,
                              collect(DISTINCT r1.name) + collect(DISTINCT r2.name) + collect(DISTINCT r3.name) AS rawRepos,
                              sum(COALESCE(rel.commitCount, 1)) AS contribCommits

                         UNWIND matchedPeople AS pLegacy
                         OPTIONAL MATCH (pLegacy)-[:AUTHORED]->(c:COMMIT)
                         WITH rawRepos, contribCommits, count(DISTINCT c) AS legacyCommits, matchedPeople

                         UNWIND matchedPeople AS pTech
                         OPTIONAL MATCH (pTech)-[]-(e)-[:MENTIONED_IN|USES]-(t:TECHNOLOGY)
                         WITH [r IN rawRepos WHERE r IS NOT NULL] AS cleanRepos,
                              (contribCommits + legacyCommits) AS totalCommits,
                              t.name AS tech, count(e) AS techScore
                         ORDER BY techScore DESC
                         WITH cleanRepos, totalCommits,
                              [item IN collect({name: tech, score: techScore}) WHERE item.name IS NOT NULL][0..5] AS topTechnologies
                         RETURN cleanRepos AS repos, totalCommits AS commitCount, topTechnologies`,
                        { canonicalId, externalIds, emails, names }
                    );

                    const metricsRec = metricsRes.records[0];
                    const repos: string[] = [...new Set((metricsRec?.get("repos") || []).filter(Boolean))] as string[];
                    const commitCount: number = metricsRec?.get("commitCount")?.toNumber ? metricsRec?.get("commitCount")?.toNumber() : Number(metricsRec?.get("commitCount") || 0);
                    const rawTopTechs = metricsRec?.get("topTechnologies") || [];
                    const topTechnologies = rawTopTechs.map((t: any) => ({
                        name: t.name,
                        score: t.score?.toNumber ? t.score.toNumber() : Number(t.score || 0)
                    }));

                    // 3c. Filter out bots and ghost users with zero real activity (0 commits + 0 repos)
                    if (isBotAccount(primaryName, emails[0], usernames[0], canonicalId)) {
                        return null;
                    }
                    if (commitCount === 0 && repos.length === 0) {
                        return null;
                    }

                    // 3e. 6-Factor Knowledge Risk Calculation on the canonical person
                    const risk = await calculateKnowledgeRisk(primaryName);
                    const riskScore = Math.round(risk.totalRisk * 100);

                    // 3f. Upsert exactly ONE canonical record in person_metrics
                    const isActive = group.isActive ?? true;
                    const employmentStatus = isActive ? 'active' : 'alumni';

                    await sql`
                        INSERT INTO person_metrics
                            (external_id, person_name, risk_score, top_technologies, repos, commit_count, is_active, employment_status, computed_at)
                        VALUES
                            (${canonicalId}, ${primaryName}, ${riskScore}, ${sql.json(topTechnologies)},
                             ${sql.json(repos)}, ${commitCount}, ${isActive}, ${employmentStatus}, now())
                        ON CONFLICT (external_id)
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
                WHERE external_id NOT IN ${sql(validCanonicalIds)}
            `;
            console.log(`[PersonMetrics] Purged stale/fragmented rows: ${deleted.count ?? 0}`);
        }

        console.log(`=== Person Metrics Computed: ${validCanonicalIds.length} Active Canonical People ===`);
    } catch (error: any) {
        console.error(`[PersonMetrics] Fatal error: ${error?.message}`);
    }
}
