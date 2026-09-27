import sql from '../../apps/api/config/postgres.js';
import { neo4jSession } from '../../apps/api/config/neo4j.js';
import { snowflake } from '../../apps/Utils/Snowflake.js';
import { calculateNameSimilarity } from './stringSimilarity.js';
import { linkCanonicalPersons, setPersonActiveStatus, isMergeableEmail } from './canonicalPerson.service.js';
import { runGraphWrite } from '../database/neo4j/graph.repository.js';
import { markMetricsDirty } from '../analytics/metricsInvalidator.service.js';
import { assertDataSource, aggregationSources, type DataSource } from '../database/provenance.js';

export interface ReconciliationStats {
    totalUnresolvedFound: number;
    githubNoreplyResolved: number;
    localhostAuthorsResolved: number;
    domainAliasesLinked: number;
    namesakeCollisionsProtected: number;
    ambiguousNamespacesFlagged: number;
    botsIdentified: number;
    inactiveAlumniProcessed: number;
    graphNodesRewired: number;
    timestamp: string;
    source: DataSource;
}

const BOT_PATTERNS = [
    /\[bot\]$/i,
    /\(bot\)$/i,
    /^(github-actions|dependabot|renovate|codecov|sonar|snyk|greenkeeper|semantic-release|imgbot)/i,
    /^(slackbot|jira-bot|cortex-bot|datadog|aws-pipeline|gitlab-ci)/i,
    /(-ci|-automation|-deployer|-service-account)$/i,
];

function matchesBotPattern(nameOrUsername: string | null | undefined): boolean {
    if (!nameOrUsername) return false;
    const clean = nameOrUsername.trim();
    return BOT_PATTERNS.some(p => p.test(clean));
}

export function extractNoreplyUsername(email: string | null | undefined): string | null {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    const match = clean.match(/^(?:(\d+)\+)?([a-zA-Z0-9_\-]+)@users\.noreply\.github\.com$/);
    if (match && match[2]) {
        return match[2];
    }
    return null;
}

export function isLocalhostOrDummyEmail(email: string | null | undefined): boolean {
    if (!email) return true; // missing email treated as dummy
    const clean = email.trim().toLowerCase();
    return (
        clean.includes('localhost') ||
        clean.includes('.local') ||
        clean.includes('example.com') ||
        clean.includes('test.com') ||
        clean.includes('invalid') ||
        clean.endsWith('.internal') ||
        !clean.includes('@') ||
        !clean.includes('.')
    );
}

export class ReconcileWorkerService {
    /**
     * Executes incremental delta identity reconciliation across PostgreSQL and Neo4j.
     * Targets unresolved entries, GitHub noreply addresses, dummy localhost authors,
     * namesake collisions, and bot accounts without heavy full-table rescans.
     */
    public async runReconciliation(source: DataSource = 'backfill'): Promise<ReconciliationStats> {
        assertDataSource(source);
        const trustedSources = aggregationSources(source);

        const stats: ReconciliationStats = {
            totalUnresolvedFound: 0,
            githubNoreplyResolved: 0,
            localhostAuthorsResolved: 0,
            domainAliasesLinked: 0,
            namesakeCollisionsProtected: 0,
            ambiguousNamespacesFlagged: 0,
            botsIdentified: 0,
            inactiveAlumniProcessed: 0,
            graphNodesRewired: 0,
            timestamp: new Date().toISOString(),
            source,
        };

        console.log(`[ReconciliationWorker] Starting delta reconciliation job (source: ${source})...`);

        // Phase 1: Identify and flag Bots & Service Accounts in PostgreSQL & Neo4j
        const botCandidates = await sql`
            SELECT id, canonical_person_id, provider, external_id, username, email, display_name, is_bot
            FROM person_identity
            WHERE source IN ${sql(trustedSources)}
              AND (
                is_bot = true
                OR username ILIKE '%[bot]%'
                OR display_name ILIKE '%[bot]%'
                OR email ILIKE '%[bot]%'
                OR username ILIKE '%github-actions%'
                OR username ILIKE '%dependabot%'
                OR username ILIKE '%slackbot%'
              )
        `;

        for (const cand of botCandidates) {
            if (cand.is_bot || matchesBotPattern(cand.username) || matchesBotPattern(cand.display_name) || (cand.email && matchesBotPattern(cand.email.split('@')[0]))) {
                if (!cand.is_bot) {
                    await sql`
                        UPDATE person_identity
                        SET is_bot = true
                        WHERE id = ${cand.id} AND source = ${source}
                    `;
                }

                // Update Neo4j person node
                const session = neo4jSession();
                try {
                    await runGraphWrite(`
                        MATCH (p:PERSON)
                        WHERE (p.canonicalPersonId = $canonicalPersonId OR p.externalId = $canonicalPersonId)
                          AND p.source = $source
                        SET p.isBot = true
                    `, { canonicalPersonId: cand.canonical_person_id, source }, session);
                } catch (gErr: any) {
                    console.warn(`[ReconciliationWorker] Neo4j bot flag error: ${gErr?.message}`);
                } finally {
                    await session.close();
                }

                stats.botsIdentified++;
            }
        }

        // Phase 2: Target Unresolved and Incomplete Identities (Delta Query)
        const unresolvedIdentities = await sql`
            SELECT id, canonical_person_id, provider, external_id, username, email, display_name, is_active, is_bot, source
            FROM person_identity
            WHERE source IN ${sql(trustedSources)}
              AND (
                email IS NULL
                OR canonical_person_id LIKE 'unresolved:%'
                OR email LIKE '%@users.noreply.github.com'
                OR email LIKE '%localhost%'
                OR email LIKE '%.local%'
                OR email LIKE '%example.com%'
                OR is_active IS NULL
                OR is_bot IS NULL
              )
              AND (is_bot IS FALSE OR is_bot IS NULL)
            ORDER BY created_at ASC
        `;

        stats.totalUnresolvedFound = unresolvedIdentities.length;

        // Phase 3: Fetch all verified human directory identities with real corporate emails
        const verifiedDirectory = await sql`
            SELECT id, canonical_person_id, provider, external_id, username, email, display_name, is_active, is_bot
            FROM person_identity
            WHERE source IN ${sql(trustedSources)}
              AND email IS NOT NULL
              AND email NOT LIKE '%@users.noreply.github.com'
              AND email NOT LIKE '%localhost%'
              AND email NOT LIKE '%.local%'
              AND email NOT LIKE '%example.com%'
              AND (is_bot IS FALSE OR is_bot IS NULL)
        `;

        // Create quick lookup indices for verified identities
        const verifiedByEmail = new Map<string, any>();
        const verifiedByUsername = new Map<string, any>();
        const verifiedByDisplayName = new Map<string, any[]>();

        for (const item of verifiedDirectory) {
            if (item.email) {
                verifiedByEmail.set(item.email.toLowerCase().trim(), item);
                const prefix = item.email.split('@')[0]?.toLowerCase();
                if (prefix && prefix.length >= 3 && !verifiedByUsername.has(prefix)) {
                    verifiedByUsername.set(prefix, item);
                }
            }
            if (item.username) {
                verifiedByUsername.set(item.username.toLowerCase().trim(), item);
            }
            const nameKey = (item.display_name || '').trim().toLowerCase();
            if (nameKey) {
                if (!verifiedByDisplayName.has(nameKey)) {
                    verifiedByDisplayName.set(nameKey, []);
                }
                verifiedByDisplayName.get(nameKey)!.push(item);
            }
        }

        // Phase 4: Reconcile each target identity
        for (const unres of unresolvedIdentities) {
            // Case 1: GitHub Noreply Email (e.g. 12345+username@users.noreply.github.com)
            const noreplyUser = extractNoreplyUsername(unres.email);
            if (noreplyUser || (unres.email && unres.email.includes('@users.noreply.github.com'))) {
                const targetLogin = (noreplyUser || unres.username || '').toLowerCase().trim();
                const matchedVerified = verifiedByUsername.get(targetLogin);

                if (matchedVerified && matchedVerified.canonical_person_id !== unres.canonical_person_id) {
                    await linkCanonicalPersons(
                        matchedVerified.canonical_person_id,
                        unres.canonical_person_id,
                        source,
                        `Reconciled GitHub noreply email (${unres.email}) to verified directory colleague (${matchedVerified.email})`
                    );
                    stats.githubNoreplyResolved++;
                    stats.graphNodesRewired++;
                    continue;
                }
            }

            // Case 2: Localhost or Dummy Author Email (e.g. dev@localhost, user@example.com, or NULL email)
            if (isLocalhostOrDummyEmail(unres.email)) {
                const authorName = (unres.display_name || unres.username || '').trim();
                if (authorName.length >= 3) {
                    // Match against verified directory members
                    const candidates: any[] = [];
                    for (const cand of verifiedDirectory) {
                        const candName = (cand.display_name || cand.username || '').trim();
                        if (candName) {
                            const similarity = calculateNameSimilarity(authorName, candName);
                            if (similarity >= 0.95) {
                                candidates.push({ cand, similarity });
                            }
                        }
                    }

                    // CORNER CASE: Namesake Ambiguity Protection
                    if (candidates.length > 1 && candidates[0]) {
                        // Multiple people share this name! STRICT POLICY: Do NOT auto-merge!
                        const firstCand = candidates[0].cand;
                        const dupId = `dup_${snowflake.nextID()}`;
                        await sql`
                            INSERT INTO potential_duplicates (
                                id, source, person_a_id, person_a_name, person_a_provider, person_a_username,
                                person_b_id, person_b_name, person_b_provider, person_b_username,
                                similarity_score, status, resolution_reason
                            ) VALUES (
                                ${dupId},
                                ${source},
                                ${firstCand.canonical_person_id},
                                ${firstCand.display_name},
                                ${firstCand.provider},
                                ${firstCand.username},
                                ${unres.canonical_person_id},
                                ${authorName},
                                ${unres.provider},
                                ${unres.username},
                                0.96,
                                'pending',
                                ${`AMBIGUOUS_NAMESAKE: Found ${candidates.length} distinct directory matches for name "${authorName}". Auto-merge blocked.`}
                            )
                            ON CONFLICT DO NOTHING
                        `;
                        stats.ambiguousNamespacesFlagged++;
                    } else if (candidates.length === 1 && candidates[0]) {
                        // Exactly one distinct match in company directory! High confidence merge
                        const matched = candidates[0].cand;
                        if (matched.canonical_person_id !== unres.canonical_person_id) {
                            await linkCanonicalPersons(
                                matched.canonical_person_id,
                                unres.canonical_person_id,
                                source,
                                `Reconciled localhost git author "${authorName}" to verified colleague (${matched.email})`
                            );
                            stats.localhostAuthorsResolved++;
                            stats.graphNodesRewired++;
                            continue;
                        }
                    }
                }
            }

            // Case 3: Deactivated / Inactive Account Reconciliation
            if (unres.is_active === false) {
                await setPersonActiveStatus(unres.canonical_person_id, false, source, 'alumni');
                stats.inactiveAlumniProcessed++;
            }
        }

        // Phase 5: Namesake Collision Protection Check across all identities with valid different emails
        // Rule: If two identities have identical or very similar names, but have DIFFERENT valid company emails,
        // they must NEVER be merged, and must be recorded in potential_duplicates with status = 'pending'.
        const allHumans = await sql`
            SELECT DISTINCT canonical_person_id, display_name, username, email, provider
            FROM person_identity
            WHERE source IN ${sql(trustedSources)}
              AND email IS NOT NULL
              AND (is_bot IS FALSE OR is_bot IS NULL)
              AND is_active = true
            ORDER BY canonical_person_id ASC
        `;

        // Group by first name token to avoid O(N^2) comparison across completely unrelated people
        const nameBuckets = new Map<string, any[]>();
        for (const h of allHumans) {
            const name = (h.display_name || h.username || '').trim().toLowerCase();
            const firstToken = name.split(/\s+/)[0] || name;
            if (!firstToken || firstToken.length < 2) continue;
            if (!nameBuckets.has(firstToken)) {
                nameBuckets.set(firstToken, []);
            }
            nameBuckets.get(firstToken)!.push(h);
        }

        for (const group of nameBuckets.values()) {
            if (group.length < 2) continue;

            for (let i = 0; i < group.length; i++) {
                const a = group[i];
                if (!a) continue;

                for (let j = i + 1; j < group.length; j++) {
                    const b = group[j];
                    if (!b) continue;
                    if (a.canonical_person_id === b.canonical_person_id) continue;

                    const nameA = (a.display_name || a.username || '').trim();
                    const nameB = (b.display_name || b.username || '').trim();
                    const emailA = (a.email || '').toLowerCase().trim();
                    const emailB = (b.email || '').toLowerCase().trim();

                    if (emailA && emailB && emailA !== emailB && isMergeableEmail(emailA) && isMergeableEmail(emailB)) {
                        const similarity = calculateNameSimilarity(nameA, nameB);
                        if (similarity >= 0.90) {
                            // Two different employees with same/similar name and different verified company emails!
                            const dupId = `dup_${snowflake.nextID()}`;
                            try {
                                await sql`
                                    INSERT INTO potential_duplicates (
                                        id, source, person_a_id, person_a_name, person_a_provider, person_a_username,
                                        person_b_id, person_b_name, person_b_provider, person_b_username,
                                        similarity_score, status, resolution_reason
                                    ) VALUES (
                                        ${dupId},
                                        ${source},
                                        ${a.canonical_person_id},
                                        ${nameA},
                                        ${a.provider},
                                        ${a.username},
                                        ${b.canonical_person_id},
                                        ${nameB},
                                        ${b.provider},
                                        ${b.username},
                                        ${Number(similarity.toFixed(3))},
                                        'pending',
                                        ${`NAMESAKE_COLLISION_DIFFERENT_EMAILS: "${nameA}" (${emailA}) vs "${nameB}" (${emailB}). Protected from auto-merging.`}
                                    )
                                    ON CONFLICT DO NOTHING
                                `;
                                stats.namesakeCollisionsProtected++;
                            } catch (e) {
                                // Non-fatal
                            }
                        }
                    }
                }
            }
        }

        // Phase 6: Downstream Metrics Recalculation Trigger
        const totalResolved = stats.githubNoreplyResolved + stats.localhostAuthorsResolved + stats.domainAliasesLinked;
        if (totalResolved > 0 || stats.botsIdentified > 0) {
            await markMetricsDirty('identity-reconciliation');
        }

        console.log(`[ReconciliationWorker] Reconciliation complete: ${JSON.stringify(stats)}`);
        return stats;
    }

    /**
     * Retrieves high-level identity resolution statistics from PostgreSQL.
     */
    public async getReconciliationStats(source: DataSource = 'backfill'): Promise<{
        totalIdentities: number;
        resolvedWithEmail: number;
        unresolvedCount: number;
        botCount: number;
        inactiveCount: number;
        pendingDuplicatesCount: number;
        mergedCount: number;
    }> {
        assertDataSource(source);
        const trustedSources = aggregationSources(source);

        const [idStats] = await sql`
            SELECT 
                COUNT(*)::int AS total_identities,
                COUNT(CASE WHEN email IS NOT NULL AND email NOT LIKE '%@users.noreply.github.com' AND email NOT LIKE '%localhost%' THEN 1 END)::int AS resolved_email,
                COUNT(CASE WHEN email IS NULL OR canonical_person_id LIKE 'unresolved:%' OR email LIKE '%@users.noreply.github.com' OR email LIKE '%localhost%' THEN 1 END)::int AS unresolved,
                COUNT(CASE WHEN is_bot = true THEN 1 END)::int AS bot_count,
                COUNT(CASE WHEN is_active = false THEN 1 END)::int AS inactive_count
            FROM person_identity
            WHERE source IN ${sql(trustedSources)}
        `;

        const [dupStats] = await sql`
            SELECT COUNT(*)::int AS pending_count
            FROM potential_duplicates
            WHERE source IN ${sql(trustedSources)} AND status = 'pending'
        `;

        const [mergeStats] = await sql`
            SELECT COUNT(*)::int AS merge_count
            FROM identity_merge_log
            WHERE source IN ${sql(trustedSources)}
        `;

        return {
            totalIdentities: idStats?.total_identities || 0,
            resolvedWithEmail: idStats?.resolved_email || 0,
            unresolvedCount: idStats?.unresolved || 0,
            botCount: idStats?.bot_count || 0,
            inactiveCount: idStats?.inactive_count || 0,
            pendingDuplicatesCount: dupStats?.pending_count || 0,
            mergedCount: mergeStats?.merge_count || 0,
        };
    }
}

export const reconcileWorkerService = new ReconcileWorkerService();
