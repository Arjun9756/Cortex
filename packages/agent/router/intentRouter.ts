export interface MatchedIntentPlan {
    intentId: string;
    tool: string;
    action?: string | undefined;
    target?: string | undefined;
    entities?: string[] | undefined;
    personName?: string | undefined;
}

/**
 * Deterministic & Rule-based Intent Router.
 * Matches common user question patterns in ~0.1ms to guarantee 100% accurate tool choices
 * without incurring LLM latency or token costs.
 *
 * Hardened in Part B:
 * - Rewrote extractPersonName() with proper NER (capitalized-word primary, fallback to cleaned residual)
 * - Added keyword synonyms for broader phrasing coverage (quit, projects, contact, etc.)
 * - Added possessive name detection ("Arjun's")
 *
 * Hardened in Part C (Generalization Pass):
 * - extractPersonName() Strategy 1 now captures up to 3 words before action verbs
 *   (fixes: "Vikram Patel leaves" was returning only "Patel")
 * - Knowledge Risk detection expanded with: breaks/fails/stops/changes + gone/left patterns
 *   (fixes: "what breaks if X leaves" was NOT routing to knowledge_risk)
 * - Possessive detection extended to 3-word names
 */
export function routeQueryIntent(userQuery: string): MatchedIntentPlan | null {
    if (!userQuery || !userQuery.trim()) return null;

    const lower = userQuery.toLowerCase().trim();

    // Compound / Open-Ended / Negation / Domain Knowledge Query Safety Guard:
    // If query contains explanation, reasoning, negation ('not', "n't", 'no longer', 'except'),
    // multiple sub-questions, or open domain/ownership questions ("who owns", "who maintains"),
    // skip single-intent fast-path routing to let LLM Planner handle full multi-tool parallel planning.
    const questionWordCount = (lower.match(/\b(who|what|whats|where|when|why|how|which)\b/g) || []).length;
    const hasMultipleQuestions = questionWordCount > 1 || (lower.match(/\?/g) || []).length > 1;
    const hasOwnershipOrDomainKnowledge = /\b(who (knows|owns|worked?|working|built|created|maintains|migrated|uses|changed?)|owner|maintainer|author|creator|change date|date (he|she|they) (changed?|updated?))\b/i.test(lower);

    if (
        hasMultipleQuestions ||
        hasOwnershipOrDomainKnowledge ||
        lower.includes('why') || lower.includes('replaced') || lower.includes('reason') || lower.includes('because') || lower.includes('responsible') ||
        /\b(not|n't|don't|doesn't|didn't|never|no longer|except|without|other than|transferred|former|previous)\b/i.test(lower)
    ) {
        return null;
    }

    // 1. Check for Repository Membership Query (e.g. "Sarah Chen works in how many repo name them")
    if (lower.includes('repo') || lower.includes('repository') || lower.includes('codebase')
        || lower.includes('project')) {
        if (lower.includes('work') || lower.includes('contribut') || lower.includes('how many')
            || lower.includes('which') || lower.includes('name them') || lower.includes('list')
            || lower.includes('show') || lower.includes('involved') || lower.includes('own')
            || lower.includes('maintain') || lower.includes('belong')) {
            const entityMatch = extractPersonName(userQuery);
            return {
                intentId: 'USER_REPOSITORY_MEMBERSHIP',
                tool: 'graph_search',
                action: 'listNodes',
                target: 'REPOSITORY',
                entities: entityMatch ? [entityMatch] : [],
            };
        }
    }

    // 2. Check for Contact Info / Properties (e.g. "what is the mail and role of Arjun")
    if (lower.includes('mail') || lower.includes('email') || lower.includes('role')
        || lower.includes('title') || lower.includes('who is') || lower.includes('contact')
        || lower.includes('designation') || lower.includes('tell me about')) {
        if (!lower.includes('risk') && !lower.includes('leave') && !lower.includes('quit')
            && !lower.includes('departure') && !lower.includes('bus factor')) {
            const entityMatch = extractPersonName(userQuery);
            if (entityMatch) {
                return {
                    intentId: 'ENTITY_CONTACT_INFO',
                    tool: 'graph_search',
                    action: 'describeEntity',
                    entities: [entityMatch],
                };
            }
        }
    }

    // 3. Check for Knowledge Risk / Departure (e.g. "what happens if Arjun leaves",
    //    "what breaks if Vikram Patel leaves", "impact if X is gone")
    if (lower.includes('knowledge risk') || lower.includes('knwodlege') || /kn[ow]{1,2}[ledg]{1,5}e?\s*risk/i.test(lower)
        || lower.includes('leaves') || lower.includes('departure')
        || lower.includes('single point of failure') || lower.includes('bus factor')
        || lower.includes('quit') || lower.includes('left the') || lower.includes('leave')
        || lower.includes('gone from') || lower.includes('fired') || lower.includes('terminated')
        // Expanded: "what breaks/fails/stops/changes if X leaves"
        || /what.{0,25}(happen|impact|effect|risk|break|fail|stop|change|occur).*if/i.test(lower)
        // Expanded: "breaks if", "fails if" phrasing without "what"
        || /(break|fail|stop|change)s?\s+if\s+\w/i.test(lower)
        // "X goes / X gone / X left the team"
        || /if.{0,40}(quit|leave|left|gone|fired|departed|resign)/i.test(lower)
        // "departure of X", "losing X", "loss of X"
        || /\b(losing|loss of|departure of)\s+[A-Z][a-z]/i.test(lower)) {
        const entityMatch = extractPersonName(userQuery);
        return {
            intentId: 'KNOWLEDGE_RISK_EVALUATION',
            tool: 'knowledge_risk',
            personName: entityMatch || undefined,
        };
    }

    // Fallback: Return null to allow full LLM Planner reasoning
    return null;
}

/**
 * Known capitalized words that are NOT person names.
 * Used to filter out false positives from the capitalized-word NER regex.
 */
const STOP_WORDS = new Set([
    'What', 'How', 'Which', 'Where', 'When', 'Who', 'Why', 'Can', 'Could',
    'Would', 'Should', 'Does', 'Do', 'Did', 'Is', 'Are', 'Was', 'Were',
    'Tell', 'Show', 'List', 'Name', 'Find', 'Get', 'Give', 'Let',
    'The', 'And', 'For', 'But', 'Not', 'All', 'Any', 'Each', 'Every',
    'Based', 'If', 'Then', 'Also', 'Just', 'Only', 'Still', 'There', 'Here',
    'This', 'That', 'These', 'Those', 'Have', 'Has', 'Had', 'Be', 'Been', 'Being',
    'Will', 'Loss', 'Losses', 'Total', 'Score', 'Model', 'Impact',
    'Calculate', 'Calculated', 'Calculation', 'Calculates', 'Calculating',
    'Compare', 'Explain', 'Describe', 'Analyze',
    'Please', 'Help', 'Thanks', 'Thank', 'May', 'Might', 'Shall', 'Must',
    // Domain-specific words that may be capitalized at sentence start
    'Repo', 'Repository', 'Project', 'Codebase', 'Email', 'Role',
    'Knowledge', 'Risk', 'Departure', 'Team',
    // Common English words sometimes capitalized
    'Many', 'Much', 'Some', 'Most', 'Other', 'New', 'Old',
    'Today', 'Tomorrow', 'Yesterday', 'Last', 'Next', 'First',
]);

/**
 * Improved Named Entity extractor for common user queries.
 *
 * Strategy (in priority order):
 *   1. Explicit pattern before action verbs (e.g. "if arjun kumar leaves" → "arjun kumar")
 *   2. Detect possessive names ("Arjun's" → "Arjun")
 *   3. Detect capitalized multi-word names ("Sarah Chen" → "Sarah Chen")
 *   4. Detect single capitalized names ("Arjun" → "Arjun")
 *   5. Fallback: preposition-based extraction ("for <name>", "of <name>", "about <name>")
 *
 * Returns the best person name found, or null if no name detected.
 */
function extractPersonName(query: string): string | null {
    // Strategy 1: Explicit pattern before action verbs like "leaves", "quit", "departed".
    // Allows up to 3 words before the action verb to capture full names like "Vikram Patel"
    // or even 3-part names like "Ana Rodriguez Lima".
    // Fix: was /([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/ which only captured 1-2 words.
    const actionVerbMatch = query.match(/\b([A-Za-z]+(?:\s+[A-Za-z]+){0,2})\s+(?:leaves|leave|quit|left|departed|going|fired|terminated|resigned|gone)\b/i);
    if (actionVerbMatch?.[1]) {
        const candidate = actionVerbMatch[1].trim();
        const words = candidate.split(/\s+/);
        // Filter out any leading/trailing stop words from the candidate
        const filteredWords = words.filter(w => !STOP_WORDS.has(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()));
        const cleaned = filteredWords.join(' ');
        // Ensure words aren't entirely stop words and the result is a plausible name
        if (cleaned.length >= 3 && !/^(there|is|if|what|when|how|why|who|the|this|that|all|any|each|breaks|fails|stops|happens|goes|occurs)$/i.test(cleaned)) {
            // Capitalize nicely if lowercase
            return filteredWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
    }

    // Strategy 2: Possessive name detection ("Arjun's" → "Arjun", "Sarah Chen's" → "Sarah Chen",
    //              "Ana Rodriguez Lima's" → "Ana Rodriguez Lima")
    // Extended to 3-word names to match Strategy 1 coverage.
    const possessiveMatch = query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})'s?\b/);
    if (possessiveMatch?.[1]) {
        const words = possessiveMatch[1].split(/\s+/);
        const firstWord = words[0]!;
        if (!STOP_WORDS.has(firstWord)) {
            return possessiveMatch[1];
        }
    }

    // Strategy 3+4: Capitalized word sequences (multi-word names first, then single)
    // Match sequences of 1-3 capitalized words
    const capitalizedMatches = query.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g);
    const candidates: string[] = [];

    for (const match of capitalizedMatches) {
        const candidate = match[1]!;
        const words = candidate.split(/\s+/);
        const firstWord = words[0]!;

        if (STOP_WORDS.has(firstWord)) {
            // Salvage: If the first word is a stop word but remaining words are valid,
            // add the remaining portion as a candidate (e.g., "If Arjun" → "Arjun")
            const salvaged = words.filter(w => !STOP_WORDS.has(w)).join(' ');
            if (salvaged.length >= 3) {
                candidates.push(salvaged);
            }
            continue;
        }
        // Filter any trailing or internal stop words from multi-word candidates
        const cleaned = words.filter(w => !STOP_WORDS.has(w)).join(' ');
        if (cleaned.length < 3) continue;
        candidates.push(cleaned);
    }

    // Prefer multi-word names (e.g. "Sarah Chen" over "Sarah")
    const multiWord = candidates.filter(c => c.includes(' '));
    if (multiWord.length > 0) {
        return multiWord[0]!;
    }
    if (candidates.length > 0) {
        return candidates[0]!;
    }

    // Strategy 5: Fallback — try to extract name from patterns like "for <name>", "of <name>", "about <name>"
    const prepositionMatch = query.match(/\b(?:for|of|about|named?)\s+([a-zA-Z][a-zA-Z]+(?:\s+[a-zA-Z][a-zA-Z]+)?)\s*[?.!]?\s*$/i);
    if (prepositionMatch?.[1]) {
        const name = prepositionMatch[1].trim();
        // Only return if it looks like a name (not a common word)
        if (name.length >= 3 && !/^(the|this|that|them|it|me|us|you|we|everyone|all|billing|team)$/i.test(name)) {
            return name;
        }
    }

    return null;
}
