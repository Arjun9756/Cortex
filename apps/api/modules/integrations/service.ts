import sql from '../../config/postgres.js';

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
}

export class IntegrationService {
    public getAdminBaseUrl(): string {
        const raw = process.env.LICENSE_SERVER_URL || process.env.CORTEX_LICENSE_SERVER_URL || 'https://cortex-admin-two.vercel.app';
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
                   scopes, scope_rules, updated_at, token_expires_at, access_token
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
                scopeRules: row?.scope_rules || { allMonitored: true, monitoredItems: ['*'] },
                hasCredentialsConfigured: this.hasCredentials(p),
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
                const botScopes = encodeURIComponent('channels:read,groups:read,users:read,users:read.email,team:read');
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

        const adminBase = this.getAdminBaseUrl();
        const licenseKey = this.getLicenseKey();

        const claimRes = await fetch(`${adminBase}/api/oauth/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket, license_key: licenseKey })
        });

        const claimData = (await claimRes.json()) as any;
        if (!claimRes.ok || !claimData.success || !claimData.accessToken) {
            throw new Error(claimData.error || 'Failed to claim access token from Cortex-Admin broker');
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
                'github', 'connected', ${accessToken}, ${sql.array(scopes)},
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
                'slack', 'connected', ${accessToken}, ${sql.array(scopes)},
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
                'jira', 'connected', ${accessToken}, ${refreshToken}, ${expiresAt}, ${sql.array(scopes)},
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

        if (!conn || !conn.access_token || conn.status !== 'connected') {
            throw new Error('GitHub is not connected. Please complete GitHub OAuth authorization first.');
        }

        const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', {
            headers: {
                Authorization: `Bearer ${conn.access_token}`,
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

        if (!conn || !conn.access_token || conn.status !== 'connected') {
            throw new Error('Slack is not connected. Please complete Slack OAuth authorization first.');
        }

        const res = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100', {
            headers: {
                Authorization: `Bearer ${conn.access_token}`,
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
     * Calls real Jira API to fetch projects using stored OAuth token.
     */
    public async getRealJiraProjects(): Promise<Array<{ id: string; key: string; name: string; projectTypeKey: string; avatarUrl: string }>> {
        const [conn] = await sql`
            SELECT access_token, status, metadata FROM integrations WHERE provider = 'jira'
        `;

        if (!conn || !conn.access_token || conn.status !== 'connected') {
            throw new Error('Jira is not connected. Please complete Jira OAuth authorization first.');
        }

        const cloudId = conn.metadata?.cloudId;
        if (!cloudId) {
            throw new Error('No Jira Cloud ID found in connection metadata.');
        }

        const res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`, {
            headers: {
                Authorization: `Bearer ${conn.access_token}`,
                Accept: 'application/json',
            },
        });

        if (!res.ok) {
            if (res.status === 401) {
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
        await sql`
            UPDATE integrations
            SET scope_rules = ${JSON.stringify(rules)}, updated_at = CURRENT_TIMESTAMP
            WHERE provider = ${provider}
        `;
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
            const adminBase = this.getAdminBaseUrl();
            const licenseKey = this.getLicenseKey();
            if (licenseKey) {
                await fetch(`${adminBase}/api/oauth/disconnect`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ license_key: licenseKey, provider })
                });
            }
        } catch (syncErr: any) {
            console.warn('[Integrations] Could not sync disconnect to Admin:', syncErr?.message);
        }
    }
}

export const integrationService = new IntegrationService();
