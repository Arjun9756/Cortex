import sql from '../../config/postgres.js';
import crypto from 'crypto';
import { encryptSecret, decryptSecret } from '../../../../packages/shared/encryption.js';

export type SupportedIntegrationProvider = 'github' | 'slack' | 'jira';

export interface IntegrationStatus {
    provider: SupportedIntegrationProvider;
    status: 'connected' | 'not_connected' | 'needs_reauth';
    accountName: string | null;
    accountEmail: string | null;
    accountAvatar: string | null;
    scopes: string[];
    updatedAt: string | null;
    scopeRules: {
        allMonitored: boolean;
        monitoredItems: string[];
    };
    hasCredentialsConfigured: boolean;
    webhookRegistered?: boolean;
}

export class IntegrationService {
    public getAdminBaseUrl(): string {
        let raw = process.env.LICENSE_SERVER_URL || process.env.CORTEX_LICENSE_SERVER_URL || 'https://admin.cortexco.in';
        raw = raw.replace('app.cortexco.in', 'admin.cortexco.in');
        return raw.replace(/\/api\/license.*$/, '').replace(/\/$/, '');
    }

    public getLicenseKey(): string {
        return (process.env.CORTEX_LICENSE_KEY || process.env.LICENSE_KEY || '').trim();
    }

    /**
     * Checks if provider OAuth app client credentials are configured locally in environment.
     */
    public hasLocalCredentials(provider: SupportedIntegrationProvider): boolean {
        switch (provider) {
            case 'github':
                return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
            case 'slack':
                return Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
            case 'jira':
                return Boolean(process.env.JIRA_CLIENT_ID && process.env.JIRA_CLIENT_SECRET);
            default:
                return false;
        }
    }

    /**
     * Checks if OAuth is available either via local credentials or Central Cortex-Admin broker.
     */
    public hasCredentials(provider: SupportedIntegrationProvider): boolean {
        return this.hasLocalCredentials(provider) || Boolean(this.getLicenseKey());
    }

    /**
     * Returns the full status of all integrations from PostgreSQL.
     */
    public async getAllStatus(): Promise<Record<SupportedIntegrationProvider, IntegrationStatus>> {
        const rows = await sql`
            SELECT provider, status, account_name, account_email, account_avatar, 
                   scopes, scope_rules, updated_at, token_expires_at, access_token,
                   webhook_registered, webhook_secret
            FROM integrations
        `;

        const statusMap: Record<string, any> = {};
        for (const r of rows) {
            statusMap[r.provider] = r;
        }

        const providers: SupportedIntegrationProvider[] = ['github', 'slack', 'jira'];
        const result: Record<SupportedIntegrationProvider, IntegrationStatus> = {} as any;

        const now = Date.now();
        for (const p of providers) {
            const row = statusMap[p];
            let status: 'connected' | 'not_connected' | 'needs_reauth' = 'not_connected';

            if (row && row.access_token) {
                if (row.token_expires_at && new Date(row.token_expires_at).getTime() <= now) {
                    status = 'needs_reauth';
                } else {
                    status = (row.status as any) || 'connected';
                }
            }

            result[p] = {
                provider: p,
                status,
                accountName: row?.account_name || null,
                accountEmail: row?.account_email || null,
                accountAvatar: row?.account_avatar || null,
                scopes: row?.scopes || [],
                updatedAt: row?.updated_at || null,
                scopeRules: this.normalizeScopeRules(row?.scope_rules),
                hasCredentialsConfigured: this.hasCredentials(p),
                webhookRegistered: Boolean(row?.webhook_registered),
            };
        }

        return result;
    }

    /**
     * Generates the real OAuth authorization redirect URL for the provider.
     */
    public getAuthorizationUrl(provider: SupportedIntegrationProvider, redirectUri: string, state: string): string {
        // 1. If Central Broker is configured and no local secrets are set, route through Cortex-Admin
        if (!this.hasLocalCredentials(provider) && this.getLicenseKey()) {
            const adminBase = this.getAdminBaseUrl();
            const licenseKey = encodeURIComponent(this.getLicenseKey());
            const retUrl = encodeURIComponent(redirectUri);
            return `${adminBase}/api/oauth/${provider}/authorize?license_key=${licenseKey}&return_url=${retUrl}`;
        }

        // 2. Direct provider authorization flow (when customer enters their own provider credentials)
        switch (provider) {
            case 'github': {
                const clientId = process.env.GITHUB_CLIENT_ID;
                if (!clientId) {
                    throw new Error('GITHUB_CLIENT_ID is not configured in .env and no CORTEX_LICENSE_KEY found.');
                }
                const scopes = encodeURIComponent('repo read:org user:email read:user');
                return `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${encodeURIComponent(state)}`;
            }
            case 'slack': {
                const clientId = process.env.SLACK_CLIENT_ID;
                if (!clientId) {
                    throw new Error('SLACK_CLIENT_ID is not configured in .env and no CORTEX_LICENSE_KEY found.');
                }
                const botScopes = encodeURIComponent('channels:read,channels:join,groups:read,users:read,users:read.email,team:read');
                return `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(clientId)}&scope=${botScopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
            }
            case 'jira': {
                const clientId = process.env.JIRA_CLIENT_ID;
                if (!clientId) {
                    throw new Error('JIRA_CLIENT_ID is not configured in .env and no CORTEX_LICENSE_KEY found.');
                }
                const scopes = encodeURIComponent('read:jira-work read:jira-user offline_access read:me');
                return `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${encodeURIComponent(clientId)}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&response_type=code&prompt=consent`;
            }
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    /**
     * Claims a short-lived token ticket from Cortex-Admin broker and saves it in local PostgreSQL.
     */
    public async claimBrokerTicket(provider: SupportedIntegrationProvider, ticket: string): Promise<any> {
        if (!ticket) {
            throw new Error('Claim ticket is required');
        }

        const candidateBases = [
            this.getAdminBaseUrl(),
            'https://admin.cortexco.in',
            'https://cortex-admin-two.vercel.app'
        ];
        const uniqueBases = [...new Set(candidateBases.map(b => b.replace(/\/$/, '')))];
        const licenseKey = this.getLicenseKey();

        let claimData: any = null;
        let lastError: any = null;

        for (const adminBase of uniqueBases) {
            try {
                const claimRes = await fetch(`${adminBase}/api/oauth/claim`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticket, license_key: licenseKey }),
                    signal: AbortSignal.timeout(10000)
                });

                claimData = (await claimRes.json()) as any;
                if (claimRes.ok && claimData.success && claimData.accessToken) {
                    break;
                } else if (claimData && claimData.error) {
                    lastError = new Error(claimData.error);
                }
            } catch (err: any) {
                lastError = err;
            }
        }

        if (!claimData || !claimData.success || !claimData.accessToken) {
            throw lastError || new Error('Failed to claim access token from Cortex-Admin broker');
        }

        const accessToken = claimData.accessToken;
        const refreshToken = claimData.refreshToken || null;
        const expiresAt = claimData.expiresAt ? new Date(claimData.expiresAt) : null;
        const scopes = Array.isArray(claimData.scopes) ? claimData.scopes : [];
        const accountId = claimData.accountId || '';
        const accountName = claimData.accountName || `${provider.toUpperCase()} Account`;
        const accountEmail = claimData.accountEmail || '';

        // Save real access token directly in client instance's PostgreSQL
        await sql`
            INSERT INTO integrations (
                provider, status, access_token, refresh_token, token_expires_at, scopes, 
                account_id, account_name, account_email, updated_at
            )
            VALUES (
                ${provider}, 'connected', ${accessToken}, ${refreshToken}, ${expiresAt}, ${sql.array(scopes)},
                ${accountId}, ${accountName}, ${accountEmail}, CURRENT_TIMESTAMP
            )
            ON CONFLICT (provider) DO UPDATE SET
                status = 'connected',
                access_token = EXCLUDED.access_token,
                refresh_token = COALESCE(EXCLUDED.refresh_token, integrations.refresh_token),
                token_expires_at = COALESCE(EXCLUDED.token_expires_at, integrations.token_expires_at),
                scopes = EXCLUDED.scopes,
                account_id = COALESCE(EXCLUDED.account_id, integrations.account_id),
                account_name = COALESCE(EXCLUDED.account_name, integrations.account_name),
                account_email = COALESCE(EXCLUDED.account_email, integrations.account_email),
                updated_at = CURRENT_TIMESTAMP
        `;

        return {
            success: true,
            provider,
            accountName,
            accountEmail,
            scopes
        };
    }

    /**
     * Exchanges OAuth authorization code for real access tokens and stores them in PostgreSQL.
     */
    public async exchangeCode(provider: SupportedIntegrationProvider, code: string, redirectUri: string): Promise<any> {
        if (!code) {
            throw new Error('Authorization code is required');
        }

        switch (provider) {
            case 'github':
                return this.exchangeGitHubCode(code, redirectUri);
            case 'slack':
                return this.exchangeSlackCode(code, redirectUri);
            case 'jira':
                return this.exchangeJiraCode(code, redirectUri);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    private async exchangeGitHubCode(code: string, redirectUri: string) {
        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET missing in server configuration');
        }

        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
            }),
        });

        const tokenData = (await tokenRes.json()) as any;
        if (tokenData.error || !tokenData.access_token) {
            throw new Error(`GitHub OAuth exchange error: ${tokenData.error_description || tokenData.error || 'No access token returned'}`);
        }

        const accessToken = tokenData.access_token;
        const scopes = tokenData.scope ? tokenData.scope.split(',').map((s: string) => s.trim()) : [];

        // Fetch user profile from GitHub
        let accountId = '';
        let accountName = 'GitHub Account';
        let accountEmail = '';
        let accountAvatar = '';

        try {
            const userRes = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'User-Agent': 'Cortex-Onboarding/1.0',
                    Accept: 'application/vnd.github.v3+json',
                },
            });
            if (userRes.ok) {
                const userData = (await userRes.json()) as any;
                accountId = String(userData.id);
                accountName = userData.name || userData.login || 'GitHub User';
                accountEmail = userData.email || '';
                accountAvatar = userData.avatar_url || '';

                // If user has email set to private, fetch verified primary email via /user/emails
                if (!accountEmail && (scopes.includes('user:email') || scopes.includes('user') || scopes.length === 0)) {
                    try {
                        const emailRes = await fetch('https://api.github.com/user/emails', {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                                'User-Agent': 'Cortex-Onboarding/1.0',
                                Accept: 'application/vnd.github.v3+json',
                            },
                        });
                        if (emailRes.ok) {
                            const emails = (await emailRes.json()) as any[];
                            const primary = emails.find((e: any) => e.primary && e.verified) || emails.find((e: any) => e.verified) || emails[0];
                            if (primary?.email) {
                                accountEmail = primary.email.trim().toLowerCase();
                            }
                        }
                    } catch (eErr: any) {
                        console.warn('[Integrations] Could not fetch private GitHub emails:', eErr?.message);
                    }
                }
            }
        } catch (uErr: any) {
            console.warn('[Integrations] Could not fetch GitHub user profile:', uErr?.message);
        }

        // Save real token and profile to PostgreSQL
        await sql`
            INSERT INTO integrations (
                provider, status, access_token, scopes, 
                account_id, account_name, account_email, account_avatar,
                updated_at
            )
            VALUES (
                'github', 'connected', ${encryptSecret(accessToken)}, ${sql.array(scopes)},
                ${accountId}, ${accountName}, ${accountEmail}, ${accountAvatar},
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (provider) DO UPDATE SET
                status = 'connected',
                access_token = EXCLUDED.access_token,
                scopes = EXCLUDED.scopes,
                account_id = COALESCE(EXCLUDED.account_id, integrations.account_id),
                account_name = COALESCE(EXCLUDED.account_name, integrations.account_name),
                account_email = COALESCE(EXCLUDED.account_email, integrations.account_email),
                account_avatar = COALESCE(EXCLUDED.account_avatar, integrations.account_avatar),
                updated_at = CURRENT_TIMESTAMP
        `;

        return {
            success: true,
            provider: 'github',
            accountName,
            accountEmail,
            scopes,
        };
    }

    private async exchangeSlackCode(code: string, redirectUri: string) {
        const clientId = process.env.SLACK_CLIENT_ID;
        const clientSecret = process.env.SLACK_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error('SLACK_CLIENT_ID or SLACK_CLIENT_SECRET missing in server configuration');
        }

        const formData = new URLSearchParams();
        formData.append('client_id', clientId);
        formData.append('client_secret', clientSecret);
        formData.append('code', code);
        formData.append('redirect_uri', redirectUri);

        const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const tokenData = (await tokenRes.json()) as any;
        if (!tokenData.ok) {
            throw new Error(`Slack OAuth exchange error: ${tokenData.error || 'Failed to exchange Slack code'}`);
        }

        const accessToken = tokenData.access_token;
        const teamName = tokenData.team?.name || 'Slack Workspace';
        const teamId = tokenData.team?.id || '';
        const scopes = tokenData.scope ? tokenData.scope.split(',').map((s: string) => s.trim()) : [];

        await sql`
            INSERT INTO integrations (
                provider, status, access_token, scopes, 
                account_id, account_name, metadata, updated_at
            )
            VALUES (
                'slack', 'connected', ${encryptSecret(accessToken)}, ${sql.array(scopes)},
                ${teamId}, ${teamName}, ${JSON.stringify(tokenData)}, CURRENT_TIMESTAMP
            )
            ON CONFLICT (provider) DO UPDATE SET
                status = 'connected',
                access_token = EXCLUDED.access_token,
                scopes = EXCLUDED.scopes,
                account_id = EXCLUDED.account_id,
                account_name = EXCLUDED.account_name,
                metadata = EXCLUDED.metadata,
                updated_at = CURRENT_TIMESTAMP
        `;

        return {
            success: true,
            provider: 'slack',
            accountName: teamName,
            teamId,
            scopes,
        };
    }

    private async exchangeJiraCode(code: string, redirectUri: string) {
        const clientId = process.env.JIRA_CLIENT_ID;
        const clientSecret = process.env.JIRA_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error('JIRA_CLIENT_ID or JIRA_CLIENT_SECRET missing in server configuration');
        }

        const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
            }),
        });

        const tokenData = (await tokenRes.json()) as any;
        if (tokenData.error || !tokenData.access_token) {
            throw new Error(`Jira OAuth exchange error: ${tokenData.error_description || tokenData.error || 'No token returned'}`);
        }

        const accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token || null;
        const expiresIn = tokenData.expires_in || 3600;
        const expiresAt = new Date(Date.now() + expiresIn * 1000);
        const scopes = tokenData.scope ? tokenData.scope.split(' ') : [];

        // Fetch accessible resources (cloudId) from Atlassian
        let cloudId = '';
        let siteName = 'Atlassian Jira';
        let siteAvatar = '';

        try {
            const resRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/json',
                },
            });
            if (resRes.ok) {
                const resources = (await resRes.json()) as any[];
                if (resources && resources.length > 0) {
                    cloudId = resources[0].id;
                    siteName = resources[0].name || 'Jira Cloud';
                    siteAvatar = resources[0].avatarUrl || '';
                }
            }
        } catch (rErr: any) {
            console.warn('[Integrations] Could not fetch Atlassian accessible resources:', rErr?.message);
        }

        await sql`
            INSERT INTO integrations (
                provider, status, access_token, refresh_token, token_expires_at, scopes, 
                account_id, account_name, account_avatar, metadata, updated_at
            )
            VALUES (
                'jira', 'connected', ${encryptSecret(accessToken)}, ${encryptSecret(refreshToken)}, ${expiresAt}, ${sql.array(scopes)},
                ${cloudId}, ${siteName}, ${siteAvatar}, ${JSON.stringify({ cloudId })}, CURRENT_TIMESTAMP
            )
            ON CONFLICT (provider) DO UPDATE SET
                status = 'connected',
                access_token = EXCLUDED.access_token,
                refresh_token = EXCLUDED.refresh_token,
                token_expires_at = EXCLUDED.token_expires_at,
                scopes = EXCLUDED.scopes,
                account_id = EXCLUDED.account_id,
                account_name = EXCLUDED.account_name,
                account_avatar = EXCLUDED.account_avatar,
                metadata = EXCLUDED.metadata,
                updated_at = CURRENT_TIMESTAMP
        `;

        return {
            success: true,
            provider: 'jira',
            accountName: siteName,
            cloudId,
            scopes,
        };
    }

    /**
     * Calls real GitHub API to fetch user's repositories using stored OAuth token.
     */
    public async getRealGitHubRepos(): Promise<Array<{ id: number; name: string; fullName: string; isPrivate: boolean; htmlUrl: string; description: string | null; language: string | null; updatedAt: string }>> {
        const [conn] = await sql`
            SELECT access_token, status FROM integrations WHERE provider = 'github'
        `;

        const token = decryptSecret(conn?.access_token);
        if (!conn || !token || conn.status !== 'connected') {
            throw new Error('GitHub is not connected. Please complete GitHub OAuth authorization first.');
        }

        const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'Cortex-Onboarding/1.0',
            },
        });

        if (!res.ok) {
            if (res.status === 401) {
                await sql`UPDATE integrations SET status = 'needs_reauth' WHERE provider = 'github'`;
                throw new Error('GitHub access token has expired or been revoked. Please re-authorize.');
            }
            throw new Error(`GitHub API returned error ${res.status}: ${res.statusText}`);
        }

        const rawRepos = (await res.json()) as any[];
        return rawRepos.map((r: any) => ({
            id: r.id,
            name: r.name,
            fullName: r.full_name,
            isPrivate: Boolean(r.private),
            htmlUrl: r.html_url,
            description: r.description || null,
            language: r.language || null,
            updatedAt: r.updated_at,
        }));
    }

    /**
     * Calls real Slack API to fetch conversation channels using stored OAuth token.
     */
    public async getRealSlackChannels(): Promise<Array<{ id: string; name: string; isPrivate: boolean; memberCount: number; topic: string }>> {
        const [conn] = await sql`
            SELECT access_token, status FROM integrations WHERE provider = 'slack'
        `;

        const slackToken = decryptSecret(conn?.access_token);
        if (!conn || !slackToken || conn.status !== 'connected') {
            throw new Error('Slack is not connected. Please complete Slack OAuth authorization first.');
        }

        const res = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100', {
            headers: {
                Authorization: `Bearer ${slackToken}`,
            },
        });

        const data = (await res.json()) as any;
        if (!data.ok) {
            if (['token_expired', 'invalid_auth', 'not_authed'].includes(data.error)) {
                await sql`UPDATE integrations SET status = 'needs_reauth' WHERE provider = 'slack'`;
                throw new Error(`Slack authorization error: ${data.error}. Please re-authorize.`);
            }
            throw new Error(`Slack API error: ${data.error}`);
        }

        return (data.channels || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            isPrivate: Boolean(c.is_private),
            memberCount: Number(c.num_members || 0),
            topic: c.topic?.value || '',
        }));
    }

    /**
     * Refreshes Jira OAuth access token using stored refresh_token (rotates tokens).
     */
    public async refreshJiraToken(): Promise<string | null> {
        const [conn] = await sql`
            SELECT access_token, refresh_token, token_expires_at, metadata 
            FROM integrations 
            WHERE provider = 'jira'
        `;
        if (!conn || !conn.refresh_token) {
            return null;
        }

        const clientId = process.env.JIRA_CLIENT_ID;
        const clientSecret = process.env.JIRA_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
            return null;
        }

        try {
            const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'refresh_token',
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: decryptSecret(conn.refresh_token),
                }),
            });

            const tokenData = (await tokenRes.json()) as any;
            if (!tokenRes.ok || !tokenData.access_token) {
                console.warn('[Jira] Token refresh failed:', tokenData.error_description || tokenData.error);
                if (tokenData.error === 'invalid_grant') {
                    await sql`UPDATE integrations SET status = 'needs_reauth' WHERE provider = 'jira'`;
                }
                return null;
            }

            const newAccessToken = tokenData.access_token;
            const newRefreshToken = tokenData.refresh_token || decryptSecret(conn.refresh_token);
            const expiresIn = tokenData.expires_in || 3600;
            const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

            await sql`
                UPDATE integrations
                SET access_token = ${encryptSecret(newAccessToken)},
                    refresh_token = ${encryptSecret(newRefreshToken)},
                    token_expires_at = ${newExpiresAt},
                    status = 'connected',
                    updated_at = CURRENT_TIMESTAMP
                WHERE provider = 'jira'
            `;
            console.log('[Jira] Successfully refreshed OAuth access token. Valid until:', newExpiresAt.toISOString());
            return newAccessToken;
        } catch (err: any) {
            console.error('[Jira] Token refresh exception:', err?.message);
            return null;
        }
    }

    /**
     * Gets a valid, unexpired Jira access token, auto-refreshing if expired or expiring within 5 minutes.
     */
    public async getValidJiraAccessToken(): Promise<{ accessToken: string; cloudId: string }> {
        const [conn] = await sql`
            SELECT access_token, refresh_token, token_expires_at, metadata, status
            FROM integrations 
            WHERE provider = 'jira'
        `;

        const decryptedAccessToken = decryptSecret(conn?.access_token);
        if (!conn || !decryptedAccessToken || conn.status !== 'connected') {
            throw new Error('Jira is not connected. Please complete Jira OAuth authorization first.');
        }

        const cloudId = conn.metadata?.cloudId;
        if (!cloudId) {
            throw new Error('No Jira Cloud ID found in connection metadata.');
        }

        let token = decryptedAccessToken;
        const now = Date.now();
        // If expired or expiring within 5 minutes, refresh proactively
        if (conn.token_expires_at && new Date(conn.token_expires_at).getTime() <= now + 5 * 60 * 1000) {
            console.log('[Jira] Access token expiring soon, refreshing proactively...');
            const refreshed = await this.refreshJiraToken();
            if (refreshed) {
                token = refreshed;
            }
        }

        return { accessToken: token, cloudId };
    }

    /**
     * Calls real Jira API to fetch projects using stored OAuth token.
     */
    public async getRealJiraProjects(): Promise<Array<{ id: string; key: string; name: string; projectTypeKey: string; avatarUrl: string }>> {
        const { accessToken, cloudId } = await this.getValidJiraAccessToken();

        const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
            },
        });

        if (!res.ok) {
            if (res.status === 401) {
                // Try immediate refresh fallback
                const refreshed = await this.refreshJiraToken();
                if (refreshed) {
                    const retryRes = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`, {
                        headers: { Authorization: `Bearer ${refreshed}`, Accept: 'application/json' },
                    });
                    if (retryRes.ok) {
                        const data = (await retryRes.json()) as any;
                        const projects = data.values || data || [];
                        return projects.map((p: any) => ({
                            id: p.id,
                            key: p.key,
                            name: p.name,
                            projectTypeKey: p.projectTypeKey || 'software',
                            avatarUrl: p.avatarUrls?.['48x48'] || '',
                        }));
                    }
                }
                await sql`UPDATE integrations SET status = 'needs_reauth' WHERE provider = 'jira'`;
                throw new Error('Jira access token expired. Please re-authorize.');
            }
            throw new Error(`Jira API returned error ${res.status}: ${res.statusText}`);
        }

        const data = (await res.json()) as any;
        const projects = data.values || data || [];

        return projects.map((p: any) => ({
            id: p.id,
            key: p.key,
            name: p.name,
            projectTypeKey: p.projectTypeKey || 'software',
            avatarUrl: p.avatarUrls?.['48x48'] || '',
        }));
    }

    /**
     * Updates scoping rules (monitored items) for a provider.
     */
    public async updateScopeRules(provider: SupportedIntegrationProvider, rules: { allMonitored: boolean; monitoredItems: string[] }) {
        const normalized = this.normalizeScopeRules(rules);
        await sql`
            UPDATE integrations
            SET scope_rules = ${sql.json(normalized)}, updated_at = CURRENT_TIMESTAMP
            WHERE provider = ${provider}
        `;
    }

    /**
     * Normalizes raw scoping rules to guarantee a consistent object shape.
     */
    public normalizeScopeRules(raw: any): { allMonitored: boolean; monitoredItems: string[] } {
        if (!raw) {
            return { allMonitored: true, monitoredItems: ['*'] };
        }
        let val = raw;
        while (typeof val === 'string') {
            try {
                val = JSON.parse(val);
            } catch {
                break;
            }
        }
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            return {
                allMonitored: Boolean(val.allMonitored),
                monitoredItems: Array.isArray(val.monitoredItems) ? val.monitoredItems : ['*'],
            };
        }
        return { allMonitored: true, monitoredItems: ['*'] };
    }

    /**
     * Disconnects a provider and clears stored tokens.
     */
    public async disconnectProvider(provider: SupportedIntegrationProvider) {
        await sql`
            UPDATE integrations
            SET status = 'not_connected', access_token = NULL, refresh_token = NULL,
                token_expires_at = NULL, scopes = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE provider = ${provider}
        `;

        // Sync disconnect with Cortex-Admin
        try {
            const candidateBases = [
                this.getAdminBaseUrl(),
                'https://admin.cortexco.in',
                'https://cortex-admin-two.vercel.app'
            ];
            const uniqueBases = [...new Set(candidateBases.map(b => b.replace(/\/$/, '')))];
            const licenseKey = this.getLicenseKey();
            if (licenseKey) {
                for (const base of uniqueBases) {
                    try {
                        const res = await fetch(`${base}/api/oauth/disconnect`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ license_key: licenseKey, provider }),
                            signal: AbortSignal.timeout(5000)
                        });
                        if (res.ok) break;
                    } catch {
                        // ignore and try next candidate
                    }
                }
            }
        } catch (syncErr: any) {
            console.warn('[Integrations] Could not sync disconnect to Admin:', syncErr?.message);
        }
    }

    /**
     * Checks if a URL points to localhost or private network.
     */
    public isLocalhostUrl(urlStr: string): boolean {
        if (!urlStr) return true;
        try {
            const parsed = new URL(urlStr);
            const hostname = parsed.hostname.toLowerCase();
            return (
                hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname === '0.0.0.0' ||
                hostname.endsWith('.localhost') ||
                hostname === '::1'
            );
        } catch {
            return true;
        }
    }

    /**
     * Automatically creates or updates webhooks on GitHub for scoped repositories.
     */
    public async syncGitHubWebhooks(
        rules: { allMonitored: boolean; monitoredItems: string[] },
        webhookBaseUrl?: string
    ): Promise<{
        status: 'installed' | 'skipped_localhost' | 'skipped_no_token' | 'partial' | 'error';
        message: string;
        targetUrl?: string | undefined;
        results?: Array<{ repo: string; action: 'created' | 'updated' | 'failed'; hookId?: number | undefined; error?: string | undefined }> | undefined;
    }> {
        const [conn] = await sql`
            SELECT access_token, status, webhook_secret FROM integrations WHERE provider = 'github'
        `;

        const ghAccessToken = decryptSecret(conn?.access_token);
        if (!conn || !ghAccessToken || conn.status !== 'connected') {
            return {
                status: 'skipped_no_token',
                message: 'GitHub is not connected. Scope saved locally.',
            };
        }

        const resolvedBaseUrl = (webhookBaseUrl || process.env.WEBHOOK_BASE_URL || process.env.PUBLIC_APP_URL || '').trim();
        if (!resolvedBaseUrl || this.isLocalhostUrl(resolvedBaseUrl)) {
            return {
                status: 'skipped_localhost',
                message: 'GitHub requires a public HTTPS URL (e.g. Port Shift, Ngrok, or custom domain) to install webhooks. Enter your tunnel URL to auto-install.',
            };
        }

        const targetWebhookUrl = `${resolvedBaseUrl.replace(/\/$/, '')}/api/github/webhook`;
        const rawSecret = decryptSecret(conn.webhook_secret);
        const secret = rawSecret || (process.env.GITHUB_SECRET && process.env.GITHUB_SECRET !== 'cortex_test_secret_2026' ? process.env.GITHUB_SECRET : null) || crypto.randomBytes(32).toString('hex');

        let targetRepos: string[] = [];
        if (rules.allMonitored || rules.monitoredItems.includes('*')) {
            const allRepos = await this.getRealGitHubRepos();
            targetRepos = allRepos.map(r => r.fullName);
        } else {
            targetRepos = rules.monitoredItems;
        }

        if (targetRepos.length === 0) {
            return {
                status: 'installed',
                message: 'No repositories selected for webhook attachment.',
                targetUrl: targetWebhookUrl,
                results: [],
            };
        }

        const results: Array<{ repo: string; action: 'created' | 'updated' | 'failed'; hookId?: number; error?: string }> = [];

        for (const fullName of targetRepos) {
            if (!fullName.includes('/')) {
                results.push({ repo: fullName, action: 'failed', error: 'Invalid repository name (expected owner/repo)' });
                continue;
            }

            const [owner, repo] = fullName.split('/');

            try {
                // List existing webhooks on this repository
                const hooksRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks?per_page=100`, {
                    headers: {
                        Authorization: `Bearer ${ghAccessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                        'User-Agent': 'Cortex-Integrations/1.0',
                    },
                });

                if (!hooksRes.ok) {
                    const errBody = await hooksRes.text();
                    results.push({ repo: fullName, action: 'failed', error: `GitHub API error (${hooksRes.status}): ${errBody}` });
                    continue;
                }

                const hooks = (await hooksRes.json()) as any[];
                const existingHook = hooks.find(h => {
                    const hookUrl = h.config?.url || '';
                    return hookUrl === targetWebhookUrl || hookUrl.endsWith('/api/github/webhook');
                });

                const webhookPayload = {
                    name: 'web',
                    active: true,
                    events: ['push', 'pull_request', 'issues', 'issue_comment', 'pull_request_review'],
                    config: {
                        url: targetWebhookUrl,
                        content_type: 'json',
                        secret,
                        insecure_ssl: '0',
                    },
                };

                if (existingHook) {
                    // Update existing webhook to target the new URL, secret, and events
                    const patchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks/${existingHook.id}`, {
                        method: 'PATCH',
                        headers: {
                            Authorization: `Bearer ${ghAccessToken}`,
                            Accept: 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json',
                            'User-Agent': 'Cortex-Integrations/1.0',
                        },
                        body: JSON.stringify(webhookPayload),
                    });

                    if (patchRes.ok) {
                        results.push({ repo: fullName, action: 'updated', hookId: existingHook.id });
                    } else {
                        const patchErr = await patchRes.text();
                        results.push({ repo: fullName, action: 'failed', error: `Failed to update hook: ${patchErr}` });
                    }
                } else {
                    // Create new webhook
                    const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${ghAccessToken}`,
                            Accept: 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json',
                            'User-Agent': 'Cortex-Integrations/1.0',
                        },
                        body: JSON.stringify(webhookPayload),
                    });

                    if (createRes.ok) {
                        const createdHook = (await createRes.json()) as any;
                        results.push({ repo: fullName, action: 'created', hookId: createdHook.id });
                    } else {
                        const createErr = await createRes.text();
                        results.push({ repo: fullName, action: 'failed', error: `Failed to create hook: ${createErr}` });
                    }
                }
            } catch (err: any) {
                results.push({ repo: fullName, action: 'failed', error: err?.message || 'Network error' });
            }
        }

        const successCount = results.filter(r => r.action === 'created' || r.action === 'updated').length;
        const failedCount = results.filter(r => r.action === 'failed').length;

        if (successCount > 0) {
            await sql`
                UPDATE integrations
                SET webhook_registered = true, webhook_secret = ${encryptSecret(secret)}, updated_at = CURRENT_TIMESTAMP
                WHERE provider = 'github'
            `;
        }

        return {
            status: failedCount === 0 ? 'installed' : (successCount > 0 ? 'partial' : 'error'),
            message: `GitHub webhooks synchronized: ${successCount} installed/updated${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
            targetUrl: targetWebhookUrl,
            results,
        };
    }

    /**
     * Automatically adds the Slack bot into the monitored channels so message events stream.
     */
    public async syncSlackChannels(
        rules: { allMonitored: boolean; monitoredItems: string[] },
        webhookBaseUrl?: string
    ): Promise<{
        status: 'channels_joined' | 'skipped_no_token' | 'partial' | 'error';
        message: string;
        webhookUrl?: string | undefined;
        results?: Array<{ channelId: string; action: 'joined' | 'already_in_channel' | 'failed'; error?: string | undefined }> | undefined;
    }> {
        const [conn] = await sql`
            SELECT access_token, status FROM integrations WHERE provider = 'slack'
        `;

        const slackAccessToken = decryptSecret(conn?.access_token);
        if (!conn || !slackAccessToken || conn.status !== 'connected') {
            return {
                status: 'skipped_no_token',
                message: 'Slack is not connected. Scope saved locally.',
            };
        }

        const allChannels = await this.getRealSlackChannels();
        let targetChannelIds: Array<{ id: string; name: string }> = [];

        if (rules.allMonitored || rules.monitoredItems.includes('*')) {
            targetChannelIds = allChannels.filter(c => !c.isPrivate).map(c => ({ id: c.id, name: c.name }));
        } else {
            // rules.monitoredItems may contain channel names (e.g. 'all-cortexco') or channel IDs (e.g. 'C08123')
            for (const item of rules.monitoredItems) {
                const cleanItem = item.replace(/^#/, '');
                const matched = allChannels.find(c => c.id === item || c.name === cleanItem);
                if (matched) {
                    targetChannelIds.push({ id: matched.id, name: matched.name });
                } else if (item.startsWith('C') || item.startsWith('G')) {
                    targetChannelIds.push({ id: item, name: item });
                }
            }
        }

        const results: Array<{ channelId: string; action: 'joined' | 'already_in_channel' | 'failed'; error?: string }> = [];

        for (const target of targetChannelIds) {
            try {
                const joinRes = await fetch('https://slack.com/api/conversations.join', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${slackAccessToken}`,
                        'Content-Type': 'application/json; charset=utf-8',
                    },
                    body: JSON.stringify({ channel: target.id }),
                });

                const data = (await joinRes.json()) as any;
                console.log(`[Slack] Auto-join channel #${target.name} (${target.id}):`, data);

                if (data.ok) {
                    results.push({ channelId: target.id, action: 'joined' });
                } else if (data.error === 'method_not_supported_for_channel_type') {
                    results.push({ channelId: target.id, action: 'already_in_channel', error: 'Private channel: invite bot with /invite @Cortex in Slack' });
                } else if (data.error === 'already_in_channel') {
                    results.push({ channelId: target.id, action: 'already_in_channel' });
                } else {
                    results.push({ channelId: target.id, action: 'failed', error: data.error });
                }
            } catch (err: any) {
                console.error(`[Slack] Error auto-joining channel #${target.name}:`, err?.message);
                results.push({ channelId: target.id, action: 'failed', error: err?.message });
            }
        }

        const resolvedBaseUrl = (webhookBaseUrl || process.env.WEBHOOK_BASE_URL || process.env.PUBLIC_APP_URL || '').trim();
        const targetWebhookUrl = resolvedBaseUrl && !this.isLocalhostUrl(resolvedBaseUrl)
            ? `${resolvedBaseUrl.replace(/\/$/, '')}/api/slack/webhook`
            : undefined;

        await sql`
            UPDATE integrations
            SET webhook_registered = true, updated_at = CURRENT_TIMESTAMP
            WHERE provider = 'slack'
        `;

        const joinedCount = results.filter(r => r.action === 'joined' || r.action === 'already_in_channel').length;

        return {
            status: 'channels_joined',
            message: `Slack bot joined ${joinedCount} monitored channel(s).`,
            webhookUrl: targetWebhookUrl,
            results,
        };
    }

    /**
     * Automatically registers dynamic webhooks with Jira Cloud for the scoped projects.
     */
    public async syncJiraWebhooks(
        rules: { allMonitored: boolean; monitoredItems: string[] },
        webhookBaseUrl?: string
    ): Promise<{
        status: 'installed' | 'skipped_localhost' | 'skipped_no_token' | 'error';
        message: string;
        targetUrl?: string;
        webhookIds?: number[];
    }> {
        let accessToken: string;
        let cloudId: string;
        try {
            const valid = await this.getValidJiraAccessToken();
            accessToken = valid.accessToken;
            cloudId = valid.cloudId;
        } catch (err: any) {
            return {
                status: 'skipped_no_token',
                message: err?.message || 'Jira is not connected.',
            };
        }

        const resolvedBaseUrl = (webhookBaseUrl || process.env.WEBHOOK_BASE_URL || process.env.PUBLIC_APP_URL || '').trim();
        if (!resolvedBaseUrl || this.isLocalhostUrl(resolvedBaseUrl)) {
            return {
                status: 'skipped_localhost',
                message: 'Jira Cloud requires a public HTTPS URL to deliver dynamic webhooks. Enter your tunnel URL to auto-install.',
            };
        }

        const targetWebhookUrl = `${resolvedBaseUrl.replace(/\/$/, '')}/api/jira/webhook`;

        let jqlFilter = '';
        if (!rules.allMonitored && !rules.monitoredItems.includes('*') && rules.monitoredItems.length > 0) {
            const escaped = rules.monitoredItems.map(p => `"${p.replace(/"/g, '\\"')}"`).join(', ');
            jqlFilter = `project IN (${escaped})`;
        }

        const payload = {
            url: targetWebhookUrl,
            webhooks: [
                {
                    events: [
                        'jira:issue_created',
                        'jira:issue_updated',
                        'jira:issue_deleted',
                        'comment_created',
                        'comment_updated',
                    ],
                    ...(jqlFilter ? { jqlFilter } : {}),
                },
            ],
        };

        const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/webhook`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errText = await res.text();
            return {
                status: 'error',
                message: `Jira dynamic webhook registration failed (${res.status}): ${errText}`,
            };
        }

        const data = (await res.json()) as any;
        const webhookIds = (data.webhookRegistrationResult || []).map((w: any) => w.createdWebhookId).filter(Boolean);

        await sql`
            UPDATE integrations
            SET webhook_registered = true, updated_at = CURRENT_TIMESTAMP
            WHERE provider = 'jira'
        `;

        return {
            status: 'installed',
            message: 'Jira dynamic webhook registered successfully.',
            targetUrl: targetWebhookUrl,
            webhookIds,
        };
    }
}

export const integrationService = new IntegrationService();
