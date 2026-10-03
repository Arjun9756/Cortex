import sql from '../../apps/api/config/postgres.js';
import { resolveIdentity, setPersonActiveStatus } from './canonicalPerson.service.js';
import { markMetricsDirty } from '../analytics/metricsInvalidator.service.js';
import { assertDataSource, type DataSource } from '../database/provenance.js';
import { integrationService } from '../../apps/api/modules/integrations/service.js';
import { decryptSecret } from '../shared/encryption.js';

export interface ProviderSyncStats {
    provider: string;
    status: 'success' | 'skipped' | 'failed';
    totalProcessed: number;
    activeCount: number;
    botCount: number;
    linkedCount: number;
    error?: string;
}

export interface DirectorySyncReport {
    timestamp: string;
    source: DataSource;
    providers: Record<string, ProviderSyncStats>;
    totalProcessed: number;
}

export class DirectorySyncService {
    /**
     * Synchronizes Slack directory members into Cortex canonical person identity table.
     * Extracts emails, marks bot accounts, and flags deleted/inactive members as alumni.
     */
    public async syncSlackDirectory(source: DataSource = 'backfill'): Promise<ProviderSyncStats> {
        assertDataSource(source);
        const stats: ProviderSyncStats = {
            provider: 'slack',
            status: 'skipped',
            totalProcessed: 0,
            activeCount: 0,
            botCount: 0,
            linkedCount: 0,
        };

        try {
            const [conn] = await sql`
                SELECT access_token, status, token_expires_at 
                FROM integrations 
                WHERE provider = 'slack'
            `;

            if (!conn || !conn.access_token || conn.status !== 'connected') {
                stats.error = 'Slack is not connected';
                return stats;
            }

            const slackToken = decryptSecret(conn.access_token);
            if (!slackToken) {
                stats.error = 'Slack access token is invalid';
                return stats;
            }

            stats.status = 'success';
            let cursor: string | undefined = undefined;
            const seenIds = new Set<string>();

            do {
                const url = new URL('https://slack.com/api/users.list');
                url.searchParams.set('limit', '200');
                if (cursor) url.searchParams.set('cursor', cursor);

                const res = await fetch(url.toString(), {
                    headers: {
                        Authorization: `Bearer ${slackToken}`,
                    },
                });

                const data = (await res.json()) as any;
                if (!data.ok) {
                    if (['token_expired', 'invalid_auth', 'not_authed'].includes(data.error)) {
                        await sql`UPDATE integrations SET status = 'needs_reauth' WHERE provider = 'slack'`;
                    }
                    stats.error = `Slack API error: ${data.error}`;
                    stats.status = 'failed';
                    return stats;
                }

                const members = Array.isArray(data.members) ? data.members : [];
                for (const user of members) {
                    if (!user.id || seenIds.has(user.id)) continue;
                    seenIds.add(user.id);
                    stats.totalProcessed++;

                    const isBot = Boolean(user.is_bot || user.id === 'USLACKBOT' || user.is_app_user || user.name === 'slackbot');
                    const isActive = !user.deleted;
                    const email = user.profile?.email ? user.profile.email.trim().toLowerCase() : null;
                    const username = user.name || null;
                    const displayName = (user.profile?.real_name || user.real_name || user.profile?.display_name || user.name || user.id).trim();

                    if (isBot) stats.botCount++;
                    if (isActive && !isBot) stats.activeCount++;

                    try {
                        const resResult = await resolveIdentity({
                            source,
                            provider: 'slack',
                            externalId: user.id,
                            username: username || undefined,
                            email: email || undefined,
                            displayName,
                            isBot,
                            isActive,
                        });

                        if (resResult.matchedBy !== 'NEW_PERSON') {
                            stats.linkedCount++;
                        }

                        // If user is deleted in Slack, update their active/alumni status in Postgres & Neo4j
                        if (!isActive) {
                            await setPersonActiveStatus(resResult.canonicalPersonId, false, source, 'alumni');
                        }
                    } catch (idErr: any) {
                        console.warn(`[DirectorySync] Slack user resolve warning for ${user.id}: ${idErr?.message}`);
                    }
                }

                cursor = data.response_metadata?.next_cursor;
            } while (cursor);

            return stats;
        } catch (err: any) {
            console.error('[DirectorySync] Slack sync failed:', err?.message);
            stats.status = 'failed';
            stats.error = err?.message;
            return stats;
        }
    }

    /**
     * Synchronizes Atlassian Jira Cloud users into Cortex canonical person identity table.
     * Fetches user profiles, emails (if visible), and handles inactive accounts.
     */
    public async syncJiraDirectory(source: DataSource = 'backfill'): Promise<ProviderSyncStats> {
        assertDataSource(source);
        const stats: ProviderSyncStats = {
            provider: 'jira',
            status: 'skipped',
            totalProcessed: 0,
            activeCount: 0,
            botCount: 0,
            linkedCount: 0,
        };

        try {
            let accessToken: string;
            let cloudId: string;
            try {
                const tokenData = await integrationService.getValidJiraAccessToken();
                accessToken = tokenData.accessToken;
                cloudId = tokenData.cloudId;
            } catch (authErr: any) {
                stats.error = authErr?.message || 'Jira is not connected';
                return stats;
            }

            stats.status = 'success';
            let startAt = 0;
            const maxResults = 100;
            let hasMore = true;

            while (hasMore) {
                let res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/users/search?startAt=${startAt}&maxResults=${maxResults}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: 'application/json',
                    },
                });

                if (res.status === 401) {
                    console.warn('[DirectorySync] Jira returned 401 Unauthorized. Attempting token refresh...');
                    const refreshedToken = await integrationService.refreshJiraToken();
                    if (refreshedToken) {
                        accessToken = refreshedToken;
                        res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/users/search?startAt=${startAt}&maxResults=${maxResults}`, {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                Accept: 'application/json',
                            },
                        });
                    }
                }

                if (!res.ok) {
                    if (res.status === 401) {
                        await sql`UPDATE integrations SET status = 'needs_reauth' WHERE provider = 'jira'`;
                    }
                    stats.error = `Jira API returned error ${res.status}: ${res.statusText}`;
                    stats.status = 'failed';
                    return stats;
                }

                const users = (await res.json()) as any[];
                if (!Array.isArray(users) || users.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const user of users) {
                    if (!user.accountId) continue;
                    stats.totalProcessed++;

                    const isBot = user.accountType === 'app' || user.accountType === 'bot';
                    const isActive = user.active !== false;
                    const email = user.emailAddress ? user.emailAddress.trim().toLowerCase() : null;
                    const displayName = (user.displayName || user.name || user.accountId).trim();
                    const username = user.name || (email ? email.split('@')[0] : null) || user.accountId;

                    if (isBot) stats.botCount++;
                    if (isActive && !isBot) stats.activeCount++;

                    try {
                        const resResult = await resolveIdentity({
                            source,
                            provider: 'jira',
                            externalId: user.accountId,
                            username: username || undefined,
                            email: email || undefined,
                            displayName,
                            isBot,
                            isActive,
                        });

                        if (resResult.matchedBy !== 'NEW_PERSON') {
                            stats.linkedCount++;
                        }

                        if (!isActive) {
                            await setPersonActiveStatus(resResult.canonicalPersonId, false, source, 'alumni');
                        }
                    } catch (idErr: any) {
                        console.warn(`[DirectorySync] Jira user resolve warning for ${user.accountId}: ${idErr?.message}`);
                    }
                }

                if (users.length < maxResults) {
                    hasMore = false;
                } else {
                    startAt += users.length;
                }
            }

            return stats;
        } catch (err: any) {
            console.error('[DirectorySync] Jira sync failed:', err?.message);
            stats.status = 'failed';
            stats.error = err?.message;
            return stats;
        }
    }

    /**
     * Synchronizes GitHub repository contributors and collaborators into Cortex identity table.
     * Traverses monitored repositories according to scoping rules.
     */
    public async syncGitHubDirectory(source: DataSource = 'backfill'): Promise<ProviderSyncStats> {
        assertDataSource(source);
        const stats: ProviderSyncStats = {
            provider: 'github',
            status: 'skipped',
            totalProcessed: 0,
            activeCount: 0,
            botCount: 0,
            linkedCount: 0,
        };

        try {
            const [conn] = await sql`
                SELECT access_token, status, scope_rules 
                FROM integrations 
                WHERE provider = 'github'
            `;

            if (!conn || !conn.access_token || conn.status !== 'connected') {
                stats.error = 'GitHub is not connected';
                return stats;
            }

            const ghToken = decryptSecret(conn.access_token);
            if (!ghToken) {
                stats.error = 'GitHub access token is invalid';
                return stats;
            }

            stats.status = 'success';
            const headers = {
                Authorization: `Bearer ${ghToken}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'Cortex-Directory-Sync/1.0',
            };

            // 1. Determine scoped repositories to fetch contributors from
            let repoFullNames: string[] = [];
            const scopeRules = conn.scope_rules || { allMonitored: true, monitoredItems: ['*'] };

            if (!scopeRules.allMonitored && Array.isArray(scopeRules.monitoredItems) && scopeRules.monitoredItems.length > 0 && !scopeRules.monitoredItems.includes('*')) {
                repoFullNames = scopeRules.monitoredItems;
            } else {
                // Fetch top repositories from user
                const repoRes = await fetch('https://api.github.com/user/repos?per_page=15&sort=updated', { headers });
                if (repoRes.ok) {
                    const repoData = (await repoRes.json()) as any[];
                    repoFullNames = repoData.map((r: any) => r.full_name);
                }
            }

            // Fetch authenticated GitHub user login and verified primary email
            let authUserLogin = '';
            let authUserEmail = conn.account_email || '';
            try {
                const userRes = await fetch('https://api.github.com/user', { headers });
                if (userRes.ok) {
                    const uData = (await userRes.json()) as any;
                    authUserLogin = (uData.login || '').toLowerCase();
                }
                if (!authUserEmail) {
                    const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
                    if (emailsRes.ok) {
                        const emails = (await emailsRes.json()) as any[];
                        const primary = emails.find((e: any) => e.primary && e.verified) || emails.find((e: any) => e.verified) || emails[0];
                        if (primary?.email) {
                            authUserEmail = primary.email.trim().toLowerCase();
                            await sql`UPDATE integrations SET account_email = ${authUserEmail} WHERE provider = 'github'`;
                        }
                    }
                }
            } catch (err: any) {
                // Non-fatal
            }

            const seenLogins = new Set<string>();

            for (const repoName of repoFullNames) {
                // Handle either "owner/repo" or just "repo"
                const cleanRepo = repoName.includes('/') ? repoName : repoName;
                try {
                    const contribRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contributors?per_page=50`, { headers });
                    if (contribRes.status === 403 || contribRes.status === 429) {
                        const remaining = contribRes.headers.get('x-ratelimit-remaining');
                        console.warn(`[DirectorySync] GitHub rate limit hit (${remaining ?? 0} remaining). Halting repository scan to protect quota.`);
                        break;
                    }
                    if (!contribRes.ok) continue;

                    const contributors = (await contribRes.json()) as any[];
                    if (!Array.isArray(contributors)) continue;

                    for (const contrib of contributors) {
                        if (!contrib.login || seenLogins.has(contrib.login.toLowerCase())) continue;
                        seenLogins.add(contrib.login.toLowerCase());
                        stats.totalProcessed++;

                        const isBot = contrib.type === 'Bot' || /\[bot\]$/i.test(contrib.login) || /^(dependabot|github-actions|renovate)/i.test(contrib.login);
                        if (isBot) stats.botCount++;
                        else stats.activeCount++;

                        let userEmail: string | null = null;
                        let userDisplayName = contrib.login;

                        // Fetch detailed user profile if not a bot (with polite pacing delay to prevent secondary rate-limit bursts)
                        if (!isBot) {
                            if (authUserLogin && contrib.login.toLowerCase() === authUserLogin && authUserEmail) {
                                userEmail = authUserEmail;
                            }

                            if (!userEmail) {
                                try {
                                    await new Promise((r) => setTimeout(r, 60));
                                    const profileRes = await fetch(`https://api.github.com/users/${contrib.login}`, { headers });
                                    if (profileRes.ok) {
                                        const prof = (await profileRes.json()) as any;
                                        if (prof.email) userEmail = prof.email.trim().toLowerCase();
                                        if (prof.name) userDisplayName = prof.name.trim();
                                    } else if (profileRes.status === 403 || profileRes.status === 429) {
                                        console.warn(`[DirectorySync] GitHub rate limit reached during profile fetch for ${contrib.login}`);
                                        break;
                                    }
                                } catch (pErr: any) {
                                    // Non-fatal profile fetch warning
                                }
                            }

                            // If profile email is hidden or noreply, check latest commits on this repo for real author email
                            if (!userEmail || userEmail.includes('noreply')) {
                                try {
                                    await new Promise((r) => setTimeout(r, 60));
                                    const commitRes = await fetch(`https://api.github.com/repos/${cleanRepo}/commits?author=${encodeURIComponent(contrib.login)}&per_page=5`, { headers });
                                    if (commitRes.ok) {
                                        const commits = (await commitRes.json()) as any[];
                                        for (const c of commits) {
                                            const cEmail = c?.commit?.author?.email;
                                            if (cEmail && !cEmail.includes('noreply') && cEmail.includes('@') && !cEmail.includes('localhost')) {
                                                userEmail = cEmail.trim().toLowerCase();
                                                break;
                                            }
                                        }
                                    } else if (commitRes.status === 403 || commitRes.status === 429) {
                                        console.warn(`[DirectorySync] GitHub rate limit reached during commit email search for ${contrib.login}`);
                                        break;
                                    }
                                } catch (cErr: any) {
                                    // Non-fatal commit email fetch warning
                                }
                            }
                        }

                        const resResult = await resolveIdentity({
                            source,
                            provider: 'github',
                            externalId: String(contrib.id),
                            username: contrib.login,
                            email: userEmail || undefined,
                            displayName: userDisplayName,
                            isBot,
                            isActive: true,
                        });

                        if (resResult.matchedBy !== 'NEW_PERSON') {
                            stats.linkedCount++;
                        }
                    }
                } catch (rErr: any) {
                    console.warn(`[DirectorySync] GitHub repo contributors error for ${repoName}:`, rErr?.message);
                }
            }

            return stats;
        } catch (err: any) {
            console.error('[DirectorySync] GitHub sync failed:', err?.message);
            stats.status = 'failed';
            stats.error = err?.message;
            return stats;
        }
    }

    /**
     * Runs directory sync across all connected providers and notifies analytics layer.
     */
    public async syncAllDirectories(source: DataSource = 'backfill'): Promise<DirectorySyncReport> {
        assertDataSource(source);
        console.log(`[DirectorySync] Starting automated directory sync across providers (source: ${source})...`);

        const slackStats = await this.syncSlackDirectory(source);
        const jiraStats = await this.syncJiraDirectory(source);
        const githubStats = await this.syncGitHubDirectory(source);

        const totalProcessed = slackStats.totalProcessed + jiraStats.totalProcessed + githubStats.totalProcessed;
        const totalLinked = slackStats.linkedCount + jiraStats.linkedCount + githubStats.linkedCount;

        if (totalLinked > 0 || totalProcessed > 0) {
            await markMetricsDirty('directory-sync');
        }

        console.log(`[DirectorySync] Sync complete. Processed ${totalProcessed} accounts across providers.`);

        return {
            timestamp: new Date().toISOString(),
            source,
            providers: {
                slack: slackStats,
                jira: jiraStats,
                github: githubStats,
            },
            totalProcessed,
        };
    }
}

export const directorySyncService = new DirectorySyncService();
