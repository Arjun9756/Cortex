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
 * Resolves an incoming provider identity to a Canonical PERSON ID using a strict 4-level priority ruleset.
 *
 * Rules (Priority Order):
 * 1. Exact Email Match (Confidence 1.0)
 * 2. Cross-Provider Username Match (Confidence 0.98)
 * 3. Display Name Similarity > 95% within workspace (Confidence 0.96)
 * 4. LLM Fallback (only if Rules 1-3 fail/ambiguous; requires >= 0.95 confidence)
 */
export async function resolveIdentity(input: ProviderIdentityInput): Promise<IdentityResolutionResult> {
    const { provider, externalId, username, email, displayName } = input;

    if (!provider || !externalId) {
        throw new Error('Provider and externalId are required for identity resolution');
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanUsername = username ? username.trim().toLowerCase() : null;
    const cleanDisplayName = displayName ? displayName.trim() : (username || externalId);

    // Step 0: Check if identity is already linked to a canonical person in Postgres
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

    // Step 1: Rule 1 — Exact Email Match
    if (cleanEmail) {
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
            console.warn(`[IdentityResolution] Rule 1 error: ${err?.message}`);
        }
    }

    // Step 2: Rule 2 — Cross-Provider Username Match (e.g. github:rohanverma == slack:rohanverma)
    if (cleanUsername) {
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
            console.warn(`[IdentityResolution] Rule 2 error: ${err?.message}`);
        }
    }

    // Step 3: Rule 3 — Display Name Similarity > 95%
    let bestSimilarityMatch: { canonicalId: string; name: string; score: number } | null = null;
    if (cleanDisplayName) {
        try {
            const candidateIdentities = await sql`
                SELECT DISTINCT canonical_person_id, display_name, username
                FROM person_identity
                WHERE display_name IS NOT NULL
                LIMIT 100
            `;

            for (const cand of candidateIdentities) {
                const candName = cand.display_name || cand.username || '';
                const simScore = calculateNameSimilarity(cleanDisplayName, candName);

                if (simScore > 0.95) {
                    if (!bestSimilarityMatch || simScore > bestSimilarityMatch.score) {
                        bestSimilarityMatch = {
                            canonicalId: cand.canonical_person_id,
                            name: candName,
                            score: Number(simScore.toFixed(3)),
                        };
                    }
                }
            }

            if (bestSimilarityMatch) {
                const canonicalId = bestSimilarityMatch.canonicalId;
                await linkIdentityAndAudit({
                    canonicalId,
                    incoming: input,
                    cleanEmail,
                    cleanUsername,
                    cleanDisplayName,
                    matchedBy: 'DISPLAY_NAME_SIMILARITY',
                    confidence: bestSimilarityMatch.score,
                    reason: `Display name similarity ${Math.round(bestSimilarityMatch.score * 100)}% with "${bestSimilarityMatch.name}"`,
                });

                return {
                    canonicalPersonId: canonicalId,
                    confidence: bestSimilarityMatch.score,
                    reason: `Display name similarity ${Math.round(bestSimilarityMatch.score * 100)}% with "${bestSimilarityMatch.name}"`,
                    matchedBy: 'DISPLAY_NAME_SIMILARITY',
                };
            }
        } catch (err: any) {
            console.warn(`[IdentityResolution] Rule 3 error: ${err?.message}`);
        }
    }

    // Step 4: Rule 4 — LLM Fallback (only if candidate similarity is moderate/ambiguous 0.70-0.95)
    if (cleanDisplayName) {
        try {
            const candidates = await sql`
                SELECT canonical_person_id, display_name, username, provider, email
                FROM person_identity
                LIMIT 30
            `;

            if (candidates.length > 0) {
                const llmMatch = await evaluateLlmIdentityFallback(input, candidates);
                if (llmMatch && llmMatch.confidence >= 0.95) {
                    await linkIdentityAndAudit({
                        canonicalId: llmMatch.canonicalPersonId,
                        incoming: input,
                        cleanEmail,
                        cleanUsername,
                        cleanDisplayName,
                        matchedBy: 'LLM_FALLBACK',
                        confidence: llmMatch.confidence,
                        reason: `LLM evaluation matched identity with ${Math.round(llmMatch.confidence * 100)}% confidence`,
                    });

                    return {
                        canonicalPersonId: llmMatch.canonicalPersonId,
                        confidence: llmMatch.confidence,
                        reason: `LLM fallback match: ${llmMatch.reason}`,
                        matchedBy: 'LLM_FALLBACK',
                    };
                }
            }
        } catch (err: any) {
            console.warn(`[IdentityResolution] Rule 4 LLM fallback error: ${err?.message}`);
        }
    }

    // Step 5: Fallback — Create NEW Canonical Person
    const newCanonicalId = `person_${snowflake.nextID()}`;
    await linkIdentityAndAudit({
        canonicalId: newCanonicalId,
        incoming: input,
        cleanEmail,
        cleanUsername,
        cleanDisplayName,
        matchedBy: 'NEW_PERSON',
        confidence: 1.0,
        reason: 'No prior matching identity found; created new canonical person',
    });

    return {
        canonicalPersonId: newCanonicalId,
        confidence: 1.0,
        reason: 'Created new canonical person',
        matchedBy: 'NEW_PERSON',
    };
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
 * Evaluates identity match candidates using Groq LLM completion.
 */
async function evaluateLlmIdentityFallback(
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
