import sql from '../../apps/api/config/postgres.js';
import { snowflake } from '../../apps/Utils/Snowflake.js';
import { calculateNameSimilarity } from './stringSimilarity.js';
import { createGroqChatCompletion } from '../llm/providers/groq.js';
import { upsertCanonicalPersonNode, upsertIdentityNode } from '../database/neo4j/graph.repository.js';

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
    provider: SupportedProvider;
    externalId: string;
    username?: string | undefined;
    email?: string | undefined;
    displayName?: string | undefined;
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

    if (!provider || !externalId) {
        throw new Error('Provider and externalId are required for identity resolution');
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanUsername = username ? username.trim().toLowerCase() : null;
    const cleanDisplayName = displayName ? displayName.trim() : (username || externalId);

    // Step 0: Check if identity is already linked to a canonical person in Postgres (Preserves confirmed merges)
    try {
        const [existing] = await sql`
            SELECT canonical_person_id, email, username, display_name 
            FROM person_identity 
            WHERE provider = ${provider} AND external_id = ${externalId}
            LIMIT 1
        `;

        if (existing) {
            // Update latest metadata for existing identity
            await sql`
                UPDATE person_identity 
                SET email = COALESCE(${cleanEmail}, email),
                    username = COALESCE(${cleanUsername}, username),
                    display_name = COALESCE(${cleanDisplayName}, display_name)
                WHERE provider = ${provider} AND external_id = ${externalId}
            `;

            // Sync Graph nodes
            await upsertIdentityNode({
                provider,
                externalId,
                username: cleanUsername || externalId,
                displayName: cleanDisplayName,
                canonicalPersonId: existing.canonical_person_id
            });

            return {
                canonicalPersonId: existing.canonical_person_id,
                confidence: 1.0,
                reason: `Existing identity match for ${provider}:${externalId}`,
                matchedBy: 'EXACT_EMAIL',
            };
        }
    } catch (dbErr: any) {
        console.warn(`[IdentityResolution] DB check error: ${dbErr?.message}`);
    }

    // Tier 1: Exact Email Match (High-Confidence Auto-Merge)
    if (cleanEmail && isMergeableEmail(cleanEmail)) {
        try {
            const [emailMatch] = await sql`
                SELECT canonical_person_id, display_name
                FROM person_identity
                WHERE LOWER(email) = ${cleanEmail}
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

    // Tier 2: Strong Exact Username Match (High-Confidence Auto-Merge, e.g. github:rohanverma == slack:rohanverma)
    if (cleanUsername && isStrongUsername(cleanUsername)) {
        try {
            const [userMatch] = await sql`
                SELECT canonical_person_id, display_name
                FROM person_identity
                WHERE LOWER(username) = ${cleanUsername}
                LIMIT 1
            `;

            if (userMatch) {
                const canonicalId = userMatch.canonical_person_id;
                await linkIdentityAndAudit({
                    canonicalId,
                    incoming: input,
                    cleanEmail,
                    cleanUsername,
                    cleanDisplayName,
                    matchedBy: 'USERNAME_MATCH',
                    confidence: 0.98,
                    reason: `Matched username "${cleanUsername}" across providers`,
                });

                return {
                    canonicalPersonId: canonicalId,
                    confidence: 0.98,
                    reason: `Username match on "${cleanUsername}"`,
                    matchedBy: 'USERNAME_MATCH',
                };
            }
        } catch (err: any) {
            console.warn(`[IdentityResolution] Tier 2 Username error: ${err?.message}`);
        }
    }

    // Tier 3 & Tier 4: Low-Confidence / Name Similarity / LLM Guess — STRICTLY BLOCKED FROM AUTO-MERGING
    // Policy: "Wrong merge is worse than having 2 separate entries."
    // If only name similarity matches, create a new separate canonical person and record potential duplicate for review.
    const newCanonicalId = `person_${snowflake.nextID()}`;
    await linkIdentityAndAudit({
        canonicalId: newCanonicalId,
        incoming: input,
        cleanEmail,
        cleanUsername,
        cleanDisplayName,
        matchedBy: 'NEW_PERSON',
        confidence: 1.0,
        reason: 'No high-confidence email or username match; created new canonical person (name-only auto-merge prohibited)',
    });

    // Audit check: If display name is similar to an existing person, log to potential_duplicates table (status = 'pending')
    if (cleanDisplayName) {
        try {
            const candidateIdentities = await sql`
                SELECT DISTINCT canonical_person_id, display_name, username, provider
                FROM person_identity
                WHERE display_name IS NOT NULL AND canonical_person_id != ${newCanonicalId}
                LIMIT 100
            `;

            for (const cand of candidateIdentities) {
                const candName = cand.display_name || cand.username || '';
                const simScore = calculateNameSimilarity(cleanDisplayName, candName);

                if (simScore >= 0.85) {
                    await recordPotentialDuplicate({
                        personAId: cand.canonical_person_id,
                        personAName: candName,
                        personAProvider: cand.provider,
                        personAUsername: cand.username,
                        personBId: newCanonicalId,
                        personBName: cleanDisplayName,
                        personBProvider: provider,
                        personBUsername: cleanUsername,
                        similarityScore: Number(simScore.toFixed(3)),
                        reason: `High display name similarity (${Math.round(simScore * 100)}%) with "${candName}". Auto-merge blocked by strict identity resolution policy ("Wrong merge is worse than having 2 separate entries").`,
                    });
                    console.log(`[IdentityResolution] [STRICT POLICY] Blocked name-only auto-merge between "${cleanDisplayName}" and "${candName}" (similarity: ${(simScore * 100).toFixed(1)}%). Created separate canonical person ${newCanonicalId} and flagged to potential_duplicates.`);
                    break; // Log top candidate collision
                }
            }
        } catch (auditErr: any) {
            console.warn(`[IdentityResolution] Potential duplicate audit warning: ${auditErr?.message}`);
        }
    }

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
                id, person_a_id, person_a_name, person_a_provider, person_a_username,
                person_b_id, person_b_name, person_b_provider, person_b_username,
                similarity_score, status, resolution_reason
            ) VALUES (
                ${id},
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
    canonicalId: string;
    incoming: ProviderIdentityInput;
    cleanEmail: string | null;
    cleanUsername: string | null;
    cleanDisplayName: string;
    matchedBy: IdentityResolutionResult['matchedBy'];
    confidence: number;
    reason: string;
}): Promise<void> {
    const { canonicalId, incoming, cleanEmail, cleanUsername, cleanDisplayName, matchedBy, confidence, reason } = params;
    const identityId = `identity_${snowflake.nextID()}`;

    // 1. Insert into person_identity table
    await sql`
        INSERT INTO person_identity (id, canonical_person_id, provider, external_id, username, email, display_name)
        VALUES (
            ${identityId},
            ${canonicalId},
            ${incoming.provider},
            ${incoming.externalId},
            ${cleanUsername},
            ${cleanEmail},
            ${cleanDisplayName}
        )
        ON CONFLICT (provider, external_id) DO UPDATE SET
            canonical_person_id = ${canonicalId},
            username = COALESCE(${cleanUsername}, person_identity.username),
            email = COALESCE(${cleanEmail}, person_identity.email),
            display_name = COALESCE(${cleanDisplayName}, person_identity.display_name)
    `;

    // 2. Audit log if merging into an existing identity
    if (matchedBy !== 'NEW_PERSON') {
        const auditLogId = `merge_${snowflake.nextID()}`;
        await sql`
            INSERT INTO identity_merge_log (id, person_a, person_b, confidence, matched_by, reason)
            VALUES (
                ${auditLogId},
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
    });

    await upsertIdentityNode({
        provider: incoming.provider,
        externalId: incoming.externalId,
        username: cleanUsername || incoming.externalId,
        displayName: cleanDisplayName,
        canonicalPersonId: canonicalId,
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
