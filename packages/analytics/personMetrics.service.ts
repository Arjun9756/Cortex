import { driver } from "../../apps/api/config/neo4j.js";
import { calculateKnowledgeRisk } from "./knowledge.service.js";
import sql from "../../apps/api/config/postgres.js";

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
    const session = driver.session();
    try {
        console.log("[PersonMetrics] Starting canonical identity metrics calculation...");

        // Step 1: Load all identity mappings from Postgres person_identity table
        let identityRows: any[] = [];
        try {
            identityRows = await sql`
                SELECT canonical_person_id, provider, external_id, username, email, display_name
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
                };
                canonicalGroupsMap.set(cId, group);
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

        // Step 2: Fetch all PERSON nodes from Neo4j to ensure complete coverage
        const neo4jPersons = await session.run(
            `MATCH (p:PERSON) RETURN p.name AS name, p.externalId AS externalId, p.email AS email, p.provider AS provider, p.canonicalPersonId AS canonicalPersonId`
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

        const validCanonicalIds: string[] = [];

        // Step 3: Compute aggregated metrics for each canonical person group
        for (const group of canonicalGroupsMap.values()) {
            const { canonicalId, primaryName } = group;
            const externalIds = Array.from(group.externalIds);
            const emails = Array.from(group.emails);
            const names = Array.from(group.names);

            try {
                // 3a. Aggregated Repositories across all provider aliases
                const repoResult = await session.run(
                    `MATCH (p:PERSON)-[]-(e)-[:PART_OF]->(r:REPOSITORY)
                     WHERE (p.canonicalPersonId IS NOT NULL AND p.canonicalPersonId = $canonicalId)
                        OR (p.externalId IS NOT NULL AND p.externalId IN $externalIds)
                        OR (p.email IS NOT NULL AND toLower(p.email) IN $emails)
                        OR (p.canonicalPersonId IS NULL AND p.externalId IS NULL AND p.email IS NULL AND p.name IN $names)
                     RETURN DISTINCT r.name AS repo`,
                    { canonicalId, externalIds, emails, names }
                );
                const repos = repoResult.records.map((r: any) => r.get("repo"));

                // 3b. Aggregated Commit Count across all provider aliases
                const commitResult = await session.run(
                    `MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)
                     WHERE (p.canonicalPersonId IS NOT NULL AND p.canonicalPersonId = $canonicalId)
                        OR (p.externalId IS NOT NULL AND p.externalId IN $externalIds)
                        OR (p.email IS NOT NULL AND toLower(p.email) IN $emails)
                        OR (p.canonicalPersonId IS NULL AND p.externalId IS NULL AND p.email IS NULL AND p.name IN $names)
                     RETURN count(DISTINCT c) AS count`,
                    { canonicalId, externalIds, emails, names }
                );
                const commitCount = commitResult.records[0]?.get("count")?.toNumber() ?? 0;

                // 3c. Filter out ghost users with zero real activity (0 commits + 0 repos)
                if (commitCount === 0 && repos.length === 0) {
                    console.log(`[PersonMetrics] Skipping ghost/inactive identity: "${primaryName}" (${canonicalId})`);
                    continue;
                }

                // 3d. Aggregated Top Technologies across all provider aliases
                const techResult = await session.run(
                    `MATCH (p:PERSON)-[]-(e)-[:MENTIONED_IN|USES]-(t:TECHNOLOGY)
                     WHERE (p.canonicalPersonId IS NOT NULL AND p.canonicalPersonId = $canonicalId)
                        OR (p.externalId IS NOT NULL AND p.externalId IN $externalIds)
                        OR (p.email IS NOT NULL AND toLower(p.email) IN $emails)
                        OR (p.canonicalPersonId IS NULL AND p.externalId IS NULL AND p.email IS NULL AND p.name IN $names)
                     RETURN t.name AS tech, count(*) AS score
                     ORDER BY score DESC
                     LIMIT 5`,
                    { canonicalId, externalIds, emails, names }
                );
                const topTechnologies = techResult.records.map((r: any) => ({
                    name: r.get("tech"),
                    score: r.get("score")?.toNumber() ?? 0,
                }));

                // 3e. 6-Factor Knowledge Risk Calculation on the canonical person
                const risk = await calculateKnowledgeRisk(primaryName);
                const riskScore = Math.round(risk.totalRisk * 100);

                // 3f. Upsert exactly ONE canonical record in person_metrics
                await sql`
                    INSERT INTO person_metrics
                        (external_id, person_name, risk_score, top_technologies, repos, commit_count, computed_at)
                    VALUES
                        (${canonicalId}, ${primaryName}, ${riskScore}, ${sql.json(topTechnologies)},
                         ${sql.json(repos)}, ${commitCount}, now())
                    ON CONFLICT (external_id)
                    DO UPDATE SET
                        person_name      = EXCLUDED.person_name,
                        risk_score       = EXCLUDED.risk_score,
                        top_technologies = EXCLUDED.top_technologies,
                        repos            = EXCLUDED.repos,
                        commit_count     = EXCLUDED.commit_count,
                        computed_at      = EXCLUDED.computed_at
                `;

                validCanonicalIds.push(canonicalId);
                console.log(`[PersonMetrics] Canonical: "${primaryName}" (${canonicalId}): risk=${riskScore}%, repos=[${repos.join(', ')}], commits=${commitCount}`);
            } catch (personError: any) {
                console.error(`[PersonMetrics] Failed for canonical person "${primaryName}": ${personError?.message}`);
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
    } finally {
        await session.close();
    }
}