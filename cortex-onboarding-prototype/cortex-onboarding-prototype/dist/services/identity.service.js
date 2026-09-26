import { store } from '../db/store.js';
export class IdentityService {
    /**
     * Resolves an incoming provider actor to a CanonicalPerson according to
     * Cortex's strict tiered identity resolution policy:
     *
     * Tier 1: Exact Verified Email Match (Confidence: 1.0)
     * - If email matches existing canonical person: link identity, no new person.
     * - If no match: create new canonical person with email as verified identifier.
     *
     * Tier 2: Strong Exact Username Match (Confidence: 0.98)
     * - Cross-provider match when email is absent, but strong clean username matches.
     *
     * Tier 3: Name / Username Fallback when Email Fetch Fails (Confidence: 0.60)
     * - STRICT POLICY: Never auto-merge on name alone!
     * - Create new person with lower confidence flag, or link only to existing identity
     *   explicitly belonging to this provider:externalId.
     */
    resolveIdentity(input) {
        const { provider, externalId, email, username, displayName } = input;
        const cleanEmail = email ? email.trim().toLowerCase() : null;
        const cleanUsername = username ? username.trim().toLowerCase() : null;
        const cleanDisplayName = displayName ? displayName.trim() : cleanUsername || externalId;
        // Step 0: Check if this specific provider:externalId is already linked to a canonical person
        const allPersons = store.getAllPersons();
        for (const person of allPersons) {
            const existingIdentity = person.identities.find((id) => id.provider === provider && id.externalId === externalId);
            if (existingIdentity) {
                // If cleanEmail was newly provided/fetched
                if (cleanEmail && this.isMergeableEmail(cleanEmail)) {
                    // Check if another canonical person already exists with this verified email
                    const existingWithEmail = store.findPersonByEmail(cleanEmail);
                    if (existingWithEmail && existingWithEmail.id !== person.id) {
                        // MERGE person into existingWithEmail!
                        existingIdentity.email = cleanEmail;
                        existingIdentity.confidence = 1.0;
                        existingIdentity.matchedBy = 'EXACT_EMAIL';
                        if (cleanUsername)
                            existingIdentity.username = cleanUsername;
                        for (const id of person.identities) {
                            if (!existingWithEmail.identities.some((x) => x.provider === id.provider && x.externalId === id.externalId)) {
                                existingWithEmail.identities.push(id);
                            }
                        }
                        existingWithEmail.updatedAt = Date.now();
                        store.savePerson(existingWithEmail);
                        store.deletePerson(person.id);
                        store.addAuditLog({
                            provider,
                            eventType: 'IDENTITY_MERGED_ON_EMAIL_DISCOVERY',
                            message: `Merged fallback person ${person.id} into verified person "${existingWithEmail.displayName}" after discovering email: ${cleanEmail}`,
                            metadata: {
                                canonicalPersonId: existingWithEmail.id,
                                previousPersonId: person.id,
                                email: cleanEmail,
                            },
                        });
                        return {
                            canonicalPersonId: existingWithEmail.id,
                            isNewPerson: false,
                            confidence: 1.0,
                            reason: `Merged fallback identity into verified person via newly resolved email: ${cleanEmail}`,
                            matchedBy: 'EXACT_EMAIL',
                            person: existingWithEmail,
                        };
                    }
                    // No other person has this email -> upgrade current person to verified!
                    if (!existingIdentity.email) {
                        existingIdentity.email = cleanEmail;
                        existingIdentity.confidence = 1.0;
                        existingIdentity.matchedBy = 'EXACT_EMAIL';
                    }
                    if (!person.verifiedEmail) {
                        person.verifiedEmail = cleanEmail;
                        person.confidence = 1.0;
                    }
                }
                if (cleanUsername && !existingIdentity.username) {
                    existingIdentity.username = cleanUsername;
                }
                person.updatedAt = Date.now();
                store.savePerson(person);
                return {
                    canonicalPersonId: person.id,
                    isNewPerson: false,
                    confidence: existingIdentity.confidence,
                    reason: `Existing identity match for ${provider}:${externalId}`,
                    matchedBy: existingIdentity.matchedBy,
                    person,
                };
            }
        }
        // Tier 1: Exact Email Match (High Confidence = 1.0)
        if (cleanEmail && this.isMergeableEmail(cleanEmail)) {
            const existingPerson = store.findPersonByEmail(cleanEmail);
            if (existingPerson) {
                // Link this new provider externalId to the existing canonical person
                const newIdentity = {
                    provider,
                    externalId,
                    email: cleanEmail,
                    username: cleanUsername,
                    displayName: cleanDisplayName,
                    confidence: 1.0,
                    matchedBy: 'EXACT_EMAIL',
                    linkedAt: Date.now(),
                };
                existingPerson.identities.push(newIdentity);
                existingPerson.updatedAt = Date.now();
                store.savePerson(existingPerson);
                store.addAuditLog({
                    provider,
                    eventType: 'IDENTITY_LINKED_EXACT_EMAIL',
                    message: `Linked ${provider}:${externalId} to existing person "${existingPerson.displayName}" via exact email: ${cleanEmail}`,
                    metadata: { canonicalPersonId: existingPerson.id, email: cleanEmail },
                });
                return {
                    canonicalPersonId: existingPerson.id,
                    isNewPerson: false,
                    confidence: 1.0,
                    reason: `Linked to existing person via verified email: ${cleanEmail}`,
                    matchedBy: 'EXACT_EMAIL',
                    person: existingPerson,
                };
            }
            else {
                // No match found -> create new canonical person record with this verified email
                const newPersonId = `person_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                const newPerson = {
                    id: newPersonId,
                    verifiedEmail: cleanEmail,
                    displayName: cleanDisplayName,
                    confidence: 1.0,
                    identities: [
                        {
                            provider,
                            externalId,
                            email: cleanEmail,
                            username: cleanUsername,
                            displayName: cleanDisplayName,
                            confidence: 1.0,
                            matchedBy: 'EXACT_EMAIL',
                            linkedAt: Date.now(),
                        },
                    ],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                store.savePerson(newPerson);
                store.addAuditLog({
                    provider,
                    eventType: 'PERSON_CREATED_EMAIL',
                    message: `Created new canonical person "${cleanDisplayName}" with verified email: ${cleanEmail}`,
                    metadata: { canonicalPersonId: newPersonId, email: cleanEmail },
                });
                return {
                    canonicalPersonId: newPersonId,
                    isNewPerson: true,
                    confidence: 1.0,
                    reason: `Created new canonical person with verified email: ${cleanEmail}`,
                    matchedBy: 'NEW_PERSON',
                    person: newPerson,
                };
            }
        }
        // Tier 2: Strong Exact Username Match (Confidence: 0.98)
        if (cleanUsername && this.isStrongUsername(cleanUsername)) {
            const userMatch = store.findPersonByUsername(cleanUsername);
            if (userMatch) {
                const newIdentity = {
                    provider,
                    externalId,
                    email: null,
                    username: cleanUsername,
                    displayName: cleanDisplayName,
                    confidence: 0.98,
                    matchedBy: 'USERNAME_MATCH',
                    linkedAt: Date.now(),
                };
                userMatch.identities.push(newIdentity);
                userMatch.updatedAt = Date.now();
                store.savePerson(userMatch);
                store.addAuditLog({
                    provider,
                    eventType: 'IDENTITY_LINKED_USERNAME',
                    message: `Linked ${provider}:${externalId} to existing person "${userMatch.displayName}" via exact username match: ${cleanUsername}`,
                    metadata: { canonicalPersonId: userMatch.id, username: cleanUsername },
                });
                return {
                    canonicalPersonId: userMatch.id,
                    isNewPerson: false,
                    confidence: 0.98,
                    reason: `Linked to existing person via strong username match: ${cleanUsername}`,
                    matchedBy: 'USERNAME_MATCH',
                    person: userMatch,
                };
            }
        }
        // Tier 3: Email-Fetch Failed / Name-Only Fallback (Lower Confidence: 0.60)
        // STRICT POLICY: "Wrong merge is worse than having 2 separate entries."
        // Never auto-merge on name alone! Create separate record with lower confidence.
        const newPersonId = `person_fallback_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const fallbackPerson = {
            id: newPersonId,
            verifiedEmail: null,
            displayName: cleanDisplayName,
            confidence: 0.6, // Lower confidence flagged due to missing verified email
            identities: [
                {
                    provider,
                    externalId,
                    email: null,
                    username: cleanUsername,
                    displayName: cleanDisplayName,
                    confidence: 0.6,
                    matchedBy: 'NAME_FALLBACK',
                    linkedAt: Date.now(),
                },
            ],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        store.savePerson(fallbackPerson);
        store.addAuditLog({
            provider,
            eventType: 'PERSON_CREATED_NAME_FALLBACK',
            message: `Created person "${cleanDisplayName}" with lower confidence (0.60) using name/username fallback because email was unavailable. Auto-merge blocked.`,
            metadata: { canonicalPersonId: newPersonId, externalId, displayName: cleanDisplayName },
        });
        return {
            canonicalPersonId: newPersonId,
            isNewPerson: true,
            confidence: 0.6,
            reason: 'Email lookup failed/unavailable; fell back to name-based identity with lower confidence (auto-merge blocked by strict policy)',
            matchedBy: 'NAME_FALLBACK',
            person: fallbackPerson,
        };
    }
    isMergeableEmail(email) {
        if (!email)
            return false;
        const clean = email.trim().toLowerCase();
        if (!clean.includes('@') || !clean.includes('.'))
            return false;
        if (clean.length < 5)
            return false;
        const [local, domain] = clean.split('@');
        if (!local || !domain)
            return false;
        const baseLocal = local.split('+')[0];
        const genericPrefixes = [
            'noreply',
            'no-reply',
            'no_reply',
            'donotreply',
            'notifications',
            'notification',
            'mailer-daemon',
            'support',
            'bot',
            'alerts',
            'system',
            'admin',
            'info',
        ];
        if (genericPrefixes.includes(baseLocal) || genericPrefixes.includes(local))
            return false;
        return true;
    }
    isStrongUsername(username) {
        if (!username)
            return false;
        const clean = username.trim().toLowerCase();
        if (clean.length < 3)
            return false;
        const generic = [
            'unknown',
            'bot',
            'admin',
            'user',
            'guest',
            'system',
            'root',
            'service',
            'daemon',
            'anonymous',
            'null',
            'undefined',
            'support',
        ];
        if (generic.includes(clean))
            return false;
        return true;
    }
}
export const identityService = new IdentityService();
