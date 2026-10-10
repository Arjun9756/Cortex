import sql from '../../apps/api/config/postgres.js';
import { neo4jSession } from '../../apps/api/config/neo4j.js';
import { snowflake } from '../../apps/Utils/Snowflake.js';
import { calculateNameSimilarity } from './stringSimilarity.js';
import { createGroqChatCompletion } from '../llm/providers/groq.js';
import { upsertCanonicalPersonNode, upsertIdentityNode, runGraphWrite } from '../database/neo4j/graph.repository.js';
import { assertDataSource, aggregationSources, type DataSource } from '../database/provenance.js';
import { isBotAccount } from '../shared/botDetection.js';

export type SupportedProvider =
    | 'github'
    | 'slack'
    | 'jira'
    | 'email'
    | 'azure_ad'
    | 'google_workspace'
    | 'ldap'
    | 'okta'
    | (string & {});

export interface ProviderIdentityInput {
    source: DataSource;
    provider: SupportedProvider;
    externalId: string;
    username?: string | undefined;
    email?: string | undefined;
    displayName?: string | undefined;
    isBot?: boolean | undefined;
    isActive?: boolean | undefined;
}

export interface IdentityResolutionResult {
    canonicalPersonId: string;
    confidence: number;
    reason: string;
    matchedBy: 'EXACT_EMAIL' | 'USERNAME_MATCH' | 'DISPLAY_NAME_SIMILARITY' | 'LLM_FALLBACK' | 'NEW_PERSON';
}

/**
 * Common generic/placeholder email prefixes to reject from auto-merging.
 * Prevents multiple users/bots from falsely merging via generic addresses.
 */
const GENERIC_EMAIL_PREFIXES = new Set([
    'noreply', 'no-reply', 'notifications', 'mailer-daemon', 'support',
    'admin', 'administrator', 'system', 'bot', 'contact', 'info', 'help', 'sales'
]);

/**
 * Validates that an email is suitable for high-confidence identity merging.
 */
export function isMergeableEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    if (!clean.includes('@') || !clean.includes('.')) return false;
    if (clean.length < 5) return false;

    const [localPart, domain] = clean.split('@');
    if (!localPart || !domain) return false;

    if (GENERIC_EMAIL_PREFIXES.has(localPart)) return false;
    if (domain === 'users.noreply.github.com' && !localPart.includes('+')) {
        return false;
    }

    return true;
}

/**
 * Common generic/placeholder usernames to reject from cross-provider auto-merging.
 */
const GENERIC_USERNAMES = new Set([
    'unknown', 'none', 'null', 'undefined', 'admin', 'administrator', 'user',
    'guest', 'root', 'support', 'team', 'bot', 'system', 'service-account',
    'api', 'test', 'dev', 'prod', 'default', 'someone', 'anonymous', 'contributor'
]);

/**
 * Validates that a username is strong, human, and suitable for high-confidence cross-provider merging.
 */
export function isStrongUsername(username: string | null | undefined): boolean {
    if (!username) return false;
    const clean = username.trim().toLowerCase();
    if (clean.length < 3) return false;
    if (GENERIC_USERNAMES.has(clean)) return false;
    // Reject opaque Slack / provider IDs masquerading as usernames (e.g. U01234567, W01234567)
    if (/^[uw][a-z0-9]{8,12}$/i.test(clean)) return false;

    return true;
}

/**
 * Resolves an incoming provider identity to a Canonical PERSON ID using the Cortex Strict Identity Resolution Policy:
 * 
 * CORE PRINCIPLE: "Wrong merge is worse than having 2 separate entries."
 *
 * High-Confidence Auto-Merge Allowed ONLY for:
 * 1. Exact Email Match (case-insensitive, non-generic) [Confidence 1.0]
 * 2. Strong Exact Username Match (clean + exact, cross-provider) [Confidence 0.98]
 *
 * Auto-Merge STRICTLY BLOCKED for:
 * - Display name similarity (even > 95%)
 * - Partial name matches
 * - LLM guess / fallback based only on name
 *
 * If confidence is low (only name similarity / ambiguous), DO NOT merge.
 * Create a new canonical person and flag the collision to `potential_duplicates` table with status = 'pending'.
 */
export async function resolveIdentity(input: ProviderIdentityInput): Promise<IdentityResolutionResult> {
    const { provider, externalId, username, email, displayName } = input;
    assertDataSource(input.source);

    if (!provider || !externalId) {
        throw new Error('Provider and externalId are required for identity resolution');
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanUsername = username ? username.trim().toLowerCase() : null;
    const cleanDisplayName = displayName ? displayName.trim() : (username || externalId);
    const trustedSources = aggregationSources(input.source);
    const isBot = Boolean(input.isBot) || isBotAccount(cleanDisplayName, cleanEmail, cleanUsername, externalId);
    const isActive = input.isActive !== false;

    // Step 0: Check if identity is already linked to a canonical person in Postgres (Preserves confirmed merges)
    try {
        const [existing] = await sql`
            SELECT canonical_person_id, email, username, display_name 
            FROM person_identity 
            WHERE provider = ${provider} AND external_id = ${externalId} AND source IN ${sql(trustedSources)}
            LIMIT 1
        `;

        if (existing) {
            // Update latest metadata for existing identity
            await sql`
                UPDATE person_identity 
                SET email = COALESCE(${cleanEmail}, email),
                    username = COALESCE(${cleanUsername}, username),
                    display_name = COALESCE(${cleanDisplayName}, display_name),
                    is_active = COALESCE(${input.isActive ?? null}, is_active),
                    is_bot = COALESCE(${input.isBot ?? null}, is_bot)
                WHERE provider = ${provider} AND external_id = ${externalId} AND source IN ${sql(trustedSources)}
            `;

            let canonicalPersonId = existing.canonical_person_id;
            if (cleanEmail && isMergeableEmail(cleanEmail)) {
                const [targetPerson] = await sql`
                    SELECT canonical_person_id 
                    FROM person_identity 
                    WHERE LOWER(email) = ${cleanEmail} 
                      AND canonical_person_id != ${canonicalPersonId}
                      AND source IN ${sql(trustedSources)}
                      AND (is_bot IS FALSE OR is_bot IS NULL)
                    LIMIT 1
                `;
                if (targetPerson) {
                    await linkCanonicalPersons(
                        targetPerson.canonical_person_id,
                        canonicalPersonId,
                        input.source,
                        `Updated verified email (${cleanEmail}) matches existing canonical person`
                    );
                    canonicalPersonId = targetPerson.canonical_person_id;
                }
            }

            // Sync Graph nodes
            await upsertIdentityNode({
                provider,
                externalId,
                username: cleanUsername || externalId,
                displayName: cleanDisplayName,
                canonicalPersonId,
                source: input.source
            });

            return {
                canonicalPersonId,
                confidence: 1.0,
                reason: `Existing identity match for ${provider}:${externalId}`,
                matchedBy: 'EXACT_EMAIL',
            };
        }
    } catch (dbErr: any) {
        console.warn(`[IdentityResolution] DB check error: ${dbErr?.message}`);
    }

    // Step 0.5: Bots and CI/CD service accounts are strictly isolated from human identities
    if (isBot) {
        const botCanonicalId = `bot_${snowflake.nextID()}`;
        await linkIdentityAndAudit({
            canonicalId: botCanonicalId,
            incoming: input,
            cleanEmail,
            cleanUsername,
            cleanDisplayName,
            matchedBy: 'NEW_PERSON',
            confidence: 1.0,
            reason: `Service account / Bot detected (${cleanDisplayName || cleanUsername || externalId}); kept separate from human identities`,
            source: input.source,
        });

        return {
            canonicalPersonId: botCanonicalId,
            confidence: 1.0,
            reason: 'Bot / service account registered',
            matchedBy: 'NEW_PERSON',
        };
    }

    // Tier 1: Exact Email Match (High-Confidence Auto-Merge)
    if (cleanEmail && isMergeableEmail(cleanEmail)) {
        try {
            const [emailMatch] = await sql`
                SELECT canonical_person_id, display_name
                FROM person_identity
                WHERE LOWER(email) = ${cleanEmail}
                  AND source IN ${sql(trustedSources)}
                  AND (is_bot IS FALSE OR is_bot IS NULL)
                LIMIT 1
            `;

            if (emailMatch) {
                const canonicalId = emailMatch.canonical_person_id;
                await linkIdentityAndAudit({
                    canonicalId,
                    incoming: input,
                    cleanEmail,
                    cleanUsername,
                    cleanDisplayName,
                    matchedBy: 'EXACT_EMAIL',
                    confidence: 1.0,
                    reason: `Matched exact email address: ${cleanEmail}`,
                    source: input.source,
                });

                return {
                    canonicalPersonId: canonicalId,
                    confidence: 1.0,
                    reason: `Exact email match on ${cleanEmail}`,
                    matchedBy: 'EXACT_EMAIL',
                };
            }
        } catch (err: any) {
            console.warn(`[IdentityResolution] Tier 1 Exact Email error: ${err?.message}`);
        }
    }

    // Tier 2 & Beyond: Exact email match is the SOLE auto-merge criterion.
    // As confirmed: No fuzzy name-matching, no cross-provider username auto-merging.
    // If no exact email match was found, create a new separate canonical person.
    const newCanonicalId = `person_${snowflake.nextID()}`;
    await linkIdentityAndAudit({
        canonicalId: newCanonicalId,
        incoming: input,
        cleanEmail,
        cleanUsername,
        cleanDisplayName,
        matchedBy: 'NEW_PERSON',
        confidence: 1.0,
        reason: cleanEmail 
            ? `New canonical person created (no existing verified email match for ${cleanEmail})`
            : `New canonical person created without verified email (externalId: ${externalId})`,
        source: input.source,
    });

    return {
        canonicalPersonId: newCanonicalId,
        confidence: 1.0,
        reason: 'Created new canonical person (strict policy: name similarity auto-merge disabled)',
        matchedBy: 'NEW_PERSON',
    };
}

/**
 * Records an ambiguous identity collision into the PostgreSQL potential_duplicates table for manual admin review.
 * NEVER auto-merges; keeps entries separate with status = 'pending'.
 */
async function recordPotentialDuplicate(params: {
    source: DataSource;
    personAId: string;
    personAName: string;
    personAProvider: string | null;
    personAUsername: string | null;
    personBId: string;
    personBName: string;
    personBProvider: string | null;
    personBUsername: string | null;
    similarityScore: number;
    reason: string;
}): Promise<void> {
    const id = `dup_${snowflake.nextID()}`;
    try {
        await sql`
            INSERT INTO potential_duplicates (
                id, source, person_a_id, person_a_name, person_a_provider, person_a_username,
                person_b_id, person_b_name, person_b_provider, person_b_username,
                similarity_score, status, resolution_reason
            ) VALUES (
                ${id},
                ${params.source},
                ${params.personAId},
                ${params.personAName},
                ${params.personAProvider},
                ${params.personAUsername},
                ${params.personBId},
                ${params.personBName},
                ${params.personBProvider},
                ${params.personBUsername},
                ${params.similarityScore},
                'pending',
                ${params.reason}
            )
        `;
    } catch (e: any) {
        console.warn(`[IdentityResolution] Failed to insert into potential_duplicates: ${e?.message}`);
    }
}

/**
 * Links a provider identity to a canonical person in Postgres & Neo4j,
 * and creates a merge audit record if joining an existing person.
 */
async function linkIdentityAndAudit(params: {
    source: DataSource;
    canonicalId: string;
    incoming: ProviderIdentityInput;
    cleanEmail: string | null;
    cleanUsername: string | null;
    cleanDisplayName: string;
    matchedBy: IdentityResolutionResult['matchedBy'];
    confidence: number;
    reason: string;
}): Promise<void> {
    const { canonicalId, incoming, cleanEmail, cleanUsername, cleanDisplayName, matchedBy, confidence, reason, source } = params;
    const identityId = `identity_${snowflake.nextID()}`;

    // 1. Insert into person_identity table
    await sql`
        INSERT INTO person_identity (
            id, source, canonical_person_id, provider, external_id, username, email, display_name, is_active, is_bot
        )
        VALUES (
            ${identityId},
            ${source},
            ${canonicalId},
            ${incoming.provider},
            ${incoming.externalId},
            ${cleanUsername},
            ${cleanEmail},
            ${cleanDisplayName},
            ${incoming.isActive !== false},
            ${Boolean(incoming.isBot)}
        )
        ON CONFLICT (source, provider, external_id) DO UPDATE SET
            canonical_person_id = ${canonicalId},
            username = COALESCE(${cleanUsername}, person_identity.username),
            email = COALESCE(${cleanEmail}, person_identity.email),
            display_name = COALESCE(${cleanDisplayName}, person_identity.display_name),
            is_active = COALESCE(${incoming.isActive ?? null}, person_identity.is_active),
            is_bot = COALESCE(${incoming.isBot ?? null}, person_identity.is_bot)
    `;

    // 2. Audit log if merging into an existing identity
    if (matchedBy !== 'NEW_PERSON') {
        const auditLogId = `merge_${snowflake.nextID()}`;
        await sql`
            INSERT INTO identity_merge_log (id, source, person_a, person_b, confidence, matched_by, reason)
            VALUES (
                ${auditLogId},
                ${source},
                ${canonicalId},
                ${`${incoming.provider}:${incoming.externalId}`},
                ${confidence},
                ${matchedBy},
                ${reason}
            )
        `;
    }

    // 3. Upsert Graph Nodes & Relationships in Neo4j
    await upsertCanonicalPersonNode({
        id: canonicalId,
        name: cleanDisplayName,
        email: cleanEmail || undefined,
        isActive: incoming.isActive !== false,
        isBot: Boolean(incoming.isBot),
        source,
    });

    await upsertIdentityNode({
        provider: incoming.provider,
        externalId: incoming.externalId,
        username: cleanUsername || incoming.externalId,
        displayName: cleanDisplayName,
        canonicalPersonId: canonicalId,
        isBot: Boolean(incoming.isBot),
        source,
    });
}

/**
 * Advisory helper for evaluating candidate identity similarity using Groq LLM.
 * Strictly forbidden from triggering auto-merge; used only for potential duplicate scoring/reasoning.
 */
export async function evaluateLlmIdentityFallback(
    incoming: ProviderIdentityInput,
    candidates: any[]
): Promise<{ canonicalPersonId: string; confidence: number; reason: string } | null> {
    try {
        const prompt = `
You are an Enterprise Identity Resolution Engine. Determine if the incoming provider user identity belongs to an existing canonical person.

INCOMING IDENTITY:
- Provider: ${incoming.provider}
- External ID: ${incoming.externalId}
- Username: ${incoming.username || 'N/A'}
- Display Name: ${incoming.displayName || 'N/A'}
- Email: ${incoming.email || 'N/A'}

CANDIDATE PERSONS:
${candidates.map((c, i) => `${i + 1}. CanonicalId: ${c.canonical_person_id} | Name: ${c.display_name || c.username} | Email: ${c.email || 'N/A'} | Provider: ${c.provider}`).join('\n')}

INSTRUCTIONS:
1. Compare name structure, handle variations, typos, and username patterns.
2. Return JSON ONLY with structure:
{
  "matchFound": true|false,
  "canonicalPersonId": "canonical_id_or_null",
  "confidence": 0.00-1.00,
  "reason": "explanation of decision"
}
3. ONLY set matchFound = true if confidence >= 0.95. If uncertain or < 0.95, set matchFound = false.
`;

        const response = await createGroqChatCompletion({
            messages: [
                { role: 'system', content: 'You are an AI Identity Resolution expert. Output JSON only.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);

        if (parsed.matchFound && parsed.canonicalPersonId && parsed.confidence >= 0.95) {
            return {
                canonicalPersonId: parsed.canonicalPersonId,
                confidence: Number(parsed.confidence),
                reason: parsed.reason || 'LLM identity resolution match',
            };
        }
    } catch (e: any) {
        console.warn(`[IdentityResolution] LLM evaluation error: ${e?.message}`);
    }

    return null;
}

/**
 * P1-1: Safely updates the active/alumni status of a canonical person across PostgreSQL and Neo4j.
 * Excludes inactive employees from current Bus Factor, Primary Owner, and Successor pools.
 */
export async function setPersonActiveStatus(
    canonicalPersonId: string,
    isActive: boolean, 
    source: DataSource,
    employmentStatus: 'active' | 'alumni' = isActive ? 'active' : 'alumni'
): Promise<{ updatedPostgres: number; updatedNeo4j: number }> {
    assertDataSource(source);
    // 1. Update PostgreSQL person_identity table
    const identityResult = await sql`
        UPDATE person_identity 
        SET is_active = ${isActive}
        WHERE canonical_person_id = ${canonicalPersonId} AND source = ${source}
        RETURNING id
    `;

    // 2. Update PostgreSQL person_metrics table
    await sql`
        UPDATE person_metrics
        SET is_active = ${isActive},
            employment_status = ${employmentStatus}
        WHERE external_id = ${canonicalPersonId} AND source = ${source}
    `;

    // 3. Update Neo4j (p:PERSON) node
    const session = neo4jSession();
    let updatedNeo4j = 0;
    try {
        const neoRes = await runGraphWrite(`
            MATCH (p:PERSON)
            WHERE (p.canonicalPersonId = $canonicalPersonId OR p.externalId = $canonicalPersonId)
              AND p.source = $source
            SET p.isActive = $isActive,
                p.employmentStatus = $employmentStatus
            RETURN count(p) AS c
        `, { canonicalPersonId, isActive, employmentStatus, source }, session);
        updatedNeo4j = neoRes.records[0]?.get('c')?.toNumber ? neoRes.records[0].get('c').toNumber() : Number(neoRes.records[0]?.get('c') || 0);
    } finally {
        await session.close();
    }

    console.log(`[IdentityResolution] setPersonActiveStatus for ${canonicalPersonId}: isActive=${isActive}, employmentStatus=${employmentStatus} (Postgres: ${identityResult.length}, Neo4j: ${updatedNeo4j})`);
    return { updatedPostgres: identityResult.length, updatedNeo4j };
}

/**
 * P1-3: Links two canonical person IDs into one unified identity.
 * Merges Postgres person_identity, rewires CONTRIBUTED_TO rollup edges, and resolves potential duplicates.
 */
export async function linkCanonicalPersons(
    keepCanonicalId: string,
    mergeCanonicalId: string,
    source: DataSource,
    reason: string = 'Manual administrative link / potential duplicate resolution'
): Promise<void> {
    assertDataSource(source);
    if (keepCanonicalId === mergeCanonicalId) return;

    const trustedSources = aggregationSources(source);

    // 1. Update Postgres person_identity to point all mergeCanonicalId rows to keepCanonicalId
    await sql`
        UPDATE person_identity
        SET canonical_person_id = ${keepCanonicalId}
        WHERE canonical_person_id = ${mergeCanonicalId} AND source IN ${sql(trustedSources)}
    `;

    // 2. Audit log the merge
    const auditLogId = `merge_${snowflake.nextID()}`;
    await sql`
        INSERT INTO identity_merge_log (id, source, person_a, person_b, confidence, matched_by, reason)
        VALUES (
            ${auditLogId},
            ${source},
            ${keepCanonicalId},
            ${mergeCanonicalId},
            1.0,
            'CANONICAL_LINK',
            ${reason}
        )
    `;

    // 3. Mark in potential_duplicates as resolved
    await sql`
        UPDATE potential_duplicates
        SET status = 'resolved',
            resolution_reason = ${`Linked to canonical person ${keepCanonicalId}: ${reason}`}
        WHERE source = ${source} AND ((person_a_id = ${keepCanonicalId} AND person_b_id = ${mergeCanonicalId})
           OR (person_a_id = ${mergeCanonicalId} AND person_b_id = ${keepCanonicalId})
           OR person_a_id = ${mergeCanonicalId}
           OR person_b_id = ${mergeCanonicalId})
    `;

    // 4. Update Neo4j:
    // Rewire CONTRIBUTED_TO relationships from merge person to keep person, summing commitCount and weightedScore
    const session = neo4jSession();
    try {
        await runGraphWrite(`
            MATCH (keep:PERSON)
            WHERE (keep.canonicalPersonId = $keepCanonicalId OR keep.externalId = $keepCanonicalId) AND keep.source = $source
            MATCH (merge:PERSON)
            WHERE (merge.canonicalPersonId = $mergeCanonicalId OR merge.externalId = $mergeCanonicalId)
              AND merge.source = $source AND elementId(merge) <> elementId(keep)
            
            // Transfer CONTRIBUTED_TO relationships
            OPTIONAL MATCH (merge)-[r:CONTRIBUTED_TO {source: $source}]->(repo:REPOSITORY {source: $source})
            WITH keep, merge, r, repo
            FOREACH (_ IN CASE WHEN r IS NOT NULL THEN [1] ELSE [] END |
                MERGE (keep)-[newR:CONTRIBUTED_TO {source: $source}]->(repo)
                ON CREATE SET 
                    newR.commitCount = COALESCE(r.commitCount, 1),
                    newR.lastCommitAt = COALESCE(r.lastCommitAt, timestamp()),
                    newR.weightedScore = COALESCE(r.weightedScore, r.commitCount, 1),
                    newR.createdAt = timestamp()
                ON MATCH SET 
                    newR.commitCount = COALESCE(newR.commitCount, 0) + COALESCE(r.commitCount, 1),
                    newR.weightedScore = COALESCE(newR.weightedScore, 0) + COALESCE(r.weightedScore, r.commitCount, 1),
                    newR.lastCommitAt = CASE WHEN r.lastCommitAt > COALESCE(newR.lastCommitAt, 0) THEN r.lastCommitAt ELSE newR.lastCommitAt END,
                    newR.updatedAt = timestamp()
                DELETE r
            )

            WITH keep, merge
            // Transfer AUTHORED relationships
            OPTIONAL MATCH (merge)-[rAuth:AUTHORED {source: $source}]->(targetAuth)
            WITH keep, merge, rAuth, targetAuth
            FOREACH (_ IN CASE WHEN rAuth IS NOT NULL THEN [1] ELSE [] END |
                MERGE (keep)-[newAuth:AUTHORED {source: $source}]->(targetAuth)
                ON CREATE SET newAuth.createdAt = timestamp()
                DELETE rAuth
            )

            WITH keep, merge
            // Transfer WORKS_ON relationships
            OPTIONAL MATCH (merge)-[rWork:WORKS_ON {source: $source}]->(targetWork)
            WITH keep, merge, rWork, targetWork
            FOREACH (_ IN CASE WHEN rWork IS NOT NULL THEN [1] ELSE [] END |
                MERGE (keep)-[newWork:WORKS_ON {source: $source}]->(targetWork)
                ON CREATE SET newWork.createdAt = timestamp()
                DELETE rWork
            )

            WITH keep, merge
            // Transfer incoming ASSIGNED_TO relationships
            OPTIONAL MATCH (sourceAssign)-[rAssign:ASSIGNED_TO {source: $source}]->(merge)
            WITH keep, merge, rAssign, sourceAssign
            FOREACH (_ IN CASE WHEN rAssign IS NOT NULL THEN [1] ELSE [] END |
                MERGE (sourceAssign)-[newAssign:ASSIGNED_TO {source: $source}]->(keep)
                ON CREATE SET newAssign.createdAt = timestamp()
                DELETE rAssign
            )
            
            WITH merge
            // Delete the duplicate PERSON node
            DETACH DELETE merge
        `, { keepCanonicalId, mergeCanonicalId, source }, session);
    } finally {
        await session.close();
    }

    // 5. Clean up duplicate person_metrics row in Postgres
    await sql`DELETE FROM person_metrics WHERE external_id = ${mergeCanonicalId} AND source = ${source}`;

    console.log(`[IdentityResolution] Successfully linked canonical person ${mergeCanonicalId} into ${keepCanonicalId}`);
}
