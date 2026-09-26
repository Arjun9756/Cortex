/**
 * Enterprise Bot Detection Utility
 *
 * Prevents automated tools, CI/CD runners, and dependency managers
 * (Dependabot, Renovate, GitHub Actions, Snyk, etc.) from being treated as
 * human engineers, stealing codebase ownership, or being recommended as successors.
 */

const KNOWN_BOT_USERNAMES = new Set([
    'dependabot',
    'dependabot[bot]',
    'renovate',
    'renovate[bot]',
    'github-actions',
    'github-actions[bot]',
    'actions-user',
    'snyk-bot',
    'snyk',
    'codecov',
    'codecov[bot]',
    'web-flow',
    'semantic-release-bot',
    'greenkeeper',
    'greenkeeper[bot]',
    'sonarcloud[bot]',
    'slackbot',
    'jira',
    'atlassian-bot',
    'mergify',
    'mergify[bot]',
    'bors',
    'bors[bot]',
    'stale',
    'stale[bot]',
    'allcontributors',
    'allcontributors[bot]',
    'codeclimate',
    'houndci-bot',
    'probot',
    'release-drafter',
    'imgbot',
    'imgbot[bot]',
    'cla-assistant',
    'cla-assistant[bot]',
    'custom-ci-auto',
    'jira-sentry-automation[bot]',
]);

/**
 * Returns true if any of the provided identity attributes belong to a known bot or service account.
 */
export function isBotAccount(
    name?: string | null,
    email?: string | null,
    username?: string | null,
    externalId?: string | null
): boolean {
    const candidates = [name, username, externalId]
        .filter((c): c is string => typeof c === 'string' && Boolean(c.trim()))
        .map(c => c.trim().toLowerCase());

    for (const cand of candidates) {
        if (cand.endsWith('[bot]')) return true;
        if (cand.startsWith('bot-') || cand.endsWith('-bot')) return true;
        if (KNOWN_BOT_USERNAMES.has(cand)) return true;
    }

    if (email) {
        const cleanEmail = email.trim().toLowerCase();
        if (cleanEmail.includes('[bot]@') || cleanEmail.includes('bot@') || cleanEmail.includes('noreply@github.com')) {
            const localPart = cleanEmail.split('@')[0] || '';
            if (localPart.includes('dependabot') || localPart.includes('renovate') || localPart.includes('action')) {
                return true;
            }
        }
        if (cleanEmail.endsWith('@users.noreply.github.com')) {
            const localPart = cleanEmail.split('@')[0] || '';
            const stripped = localPart.includes('+') ? localPart.split('+')[1] || '' : localPart;
            if (stripped.endsWith('[bot]') || KNOWN_BOT_USERNAMES.has(stripped)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Reusable Cypher WHERE fragment to exclude bot nodes when querying `(p:PERSON)`.
 */
export const CYPHER_BOT_FILTER = `
    NOT toLower(COALESCE(p.name, '')) ENDS WITH '[bot]'
    AND NOT toLower(COALESCE(p.name, '')) IN ['dependabot', 'renovate', 'github-actions', 'snyk-bot', 'snyk', 'codecov', 'web-flow', 'semantic-release-bot', 'greenkeeper', 'slackbot', 'custom-ci-auto', 'jira-sentry-automation[bot]']
    AND COALESCE(p.isBot, false) = false
`;
