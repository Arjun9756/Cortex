import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { integrationService, SupportedIntegrationProvider } from './service.js';

export const integrationsRouter = Router();

// Store temporary state tokens in memory with 10-minute expiry for CSRF protection
const stateStore = new Map<string, { provider: string; createdAt: number; redirectUrl?: string }>();

function cleanExpiredStates() {
    const now = Date.now();
    for (const [state, info] of stateStore.entries()) {
        if (now - info.createdAt > 600000) {
            stateStore.delete(state);
        }
    }
}

// 1. GET /api/integrations/status
integrationsRouter.get('/status', async (req: Request, res: Response) => {
    try {
        const statuses = await integrationService.getAllStatus();
        const hasAnyConnected = Object.values(statuses).some(s => s.status === 'connected');

        return res.json({
            success: true,
            hasAnyConnected,
            connectors: statuses,
        });
    } catch (err: any) {
        console.error('[Integrations] Error fetching status:', err);
        return res.status(500).json({ success: false, error: err?.message });
    }
});

// 2. GET /api/integrations/:provider/authorize
// Returns real authorization URL or redirects browser
integrationsRouter.get('/:provider/authorize', (req: Request, res: Response) => {
    try {
        const provider = req.params.provider as SupportedIntegrationProvider;
        if (!['github', 'slack', 'jira'].includes(provider)) {
            return res.status(400).json({ success: false, error: `Invalid provider: ${provider}` });
        }

        if (!integrationService.hasCredentials(provider)) {
            const envKey = `${provider.toUpperCase()}_CLIENT_ID`;
            return res.status(400).json({
                success: false,
                error: `OAuth credentials not configured for ${provider.toUpperCase()}. Please set ${envKey} and ${provider.toUpperCase()}_CLIENT_SECRET in server .env.`,
                requiresRegistration: true,
                provider,
            });
        }

        cleanExpiredStates();

        const state = crypto.randomBytes(24).toString('hex');
        const customRedirect = (req.query.redirectUrl as string) || '';
        stateStore.set(state, { provider, createdAt: Date.now(), redirectUrl: customRedirect });

        // Default callback URL points to the backend callback handler
        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:3000';
        const callbackUrl = `${protocol}://${host}/api/integrations/${provider}/callback`;

        const authUrl = integrationService.getAuthorizationUrl(provider, callbackUrl, state);

        if (req.query.direct === 'true') {
            return res.redirect(authUrl);
        }

        return res.json({
            success: true,
            url: authUrl,
            state,
        });
    } catch (err: any) {
        console.error('[Integrations] Error initiating authorization:', err);
        return res.status(500).json({ success: false, error: err?.message });
    }
});

// 3. GET & POST /api/integrations/:provider/callback
// Handles return from provider with ?code=...&state=...
const handleCallback = async (req: Request, res: Response) => {
    try {
        const provider = req.params.provider as SupportedIntegrationProvider;
        if (!['github', 'slack', 'jira'].includes(provider)) {
            return res.status(400).send('Invalid provider');
        }

        const code = (req.query.code as string) || (req.body?.code as string);
        const state = (req.query.state as string) || (req.body?.state as string);
        const error = (req.query.error as string) || (req.query.error_description as string);

        if (error) {
            console.error(`[Integrations] OAuth error received from ${provider}:`, error);
            if (req.method === 'GET') {
                return res.send(`
                    <html>
                        <body style="font-family: sans-serif; background: #0c1222; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh;">
                            <div style="background: #1e293b; padding: 30px; border-radius: 12px; border: 1px solid #ef4444; max-width: 480px; text-align: center;">
                                <h2 style="color: #ef4444; margin-top: 0;">Authorization Failed</h2>
                                <p style="color: #cbd5e1; font-size: 14px;">${error}</p>
                                <button onclick="window.close()" style="margin-top: 20px; background: #334155; color: #fff; border: 0; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Close Window</button>
                            </div>
                        </body>
                    </html>
                `);
            }
            return res.status(400).json({ success: false, error });
        }

        if (!code) {
            return res.status(400).json({ success: false, error: 'Missing code parameter from OAuth provider' });
        }

        // Validate state if provided
        let targetFrontend = 'http://localhost:5173';
        if (state && stateStore.has(state)) {
            const stateData = stateStore.get(state);
            if (stateData?.redirectUrl) {
                targetFrontend = stateData.redirectUrl;
            }
            stateStore.delete(state);
        }

        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:3000';
        const callbackUrl = `${protocol}://${host}/api/integrations/${provider}/callback`;

        const result = await integrationService.exchangeCode(provider, code, callbackUrl);

        if (req.method === 'GET') {
            // Popup window communication script or fallback redirect
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Authorization Successful</title>
                    <style>
                        body {
                            background: #090d16;
                            color: #f8fafc;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                        }
                        .card {
                            background: #111827;
                            border: 1px solid #22c55e;
                            padding: 36px;
                            border-radius: 16px;
                            text-align: center;
                            max-width: 420px;
                            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                        }
                        .icon {
                            width: 56px;
                            height: 56px;
                            background: rgba(34, 197, 94, 0.15);
                            color: #22c55e;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 28px;
                            margin: 0 auto 18px;
                        }
                        h2 { margin: 0 0 8px; font-size: 20px; }
                        p { color: #94a3b8; font-size: 14px; margin: 0 0 24px; line-height: 1.5; }
                        .btn {
                            background: #6366f1;
                            color: #fff;
                            border: none;
                            padding: 10px 24px;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                        }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="icon">✓</div>
                        <h2>${provider.toUpperCase()} Connected!</h2>
                        <p>Successfully authorized and stored credentials. Returning to Cortex…</p>
                        <button class="btn" onclick="proceed()">Return to App</button>
                    </div>
                    <script>
                        function proceed() {
                            if (window.opener) {
                                window.opener.postMessage({ type: 'CORTEX_OAUTH_SUCCESS', provider: '${provider}' }, '*');
                                window.close();
                            } else {
                                window.location.href = '${targetFrontend}/?connected=${provider}';
                            }
                        }
                        // Automatically notify opener if in popup, else redirect after 1.5s
                        setTimeout(proceed, 1200);
                    </script>
                </body>
                </html>
            `);
        }

        return res.json({
            success: true,
            provider,
            result,
        });
    } catch (err: any) {
        console.error('[Integrations] Callback exchange error:', err);
        if (req.method === 'GET') {
            return res.status(500).send(`
                <html>
                    <body style="font-family: sans-serif; background: #0c1222; color: #fff; padding: 40px; text-align: center;">
                        <h2 style="color: #f43f5e;">Token Exchange Failed</h2>
                        <p style="color: #cbd5e1;">${err?.message}</p>
                        <button onclick="window.close()" style="background: #334155; color: #fff; border: 0; padding: 10px 20px; border-radius: 6px; cursor: pointer;">Close</button>
                    </body>
                </html>
            `);
        }
        return res.status(500).json({ success: false, error: err?.message });
    }
};

integrationsRouter.get('/:provider/callback', handleCallback);
integrationsRouter.post('/:provider/callback', handleCallback);

// 3.5. POST /api/integrations/:provider/claim
// Claims short-lived token ticket from Cortex-Admin broker and saves token in PostgreSQL
integrationsRouter.post('/:provider/claim', async (req: Request, res: Response) => {
    try {
        const provider = req.params.provider as SupportedIntegrationProvider;
        const { ticket } = req.body;

        if (!['github', 'slack', 'jira'].includes(provider)) {
            return res.status(400).json({ success: false, error: 'Invalid provider' });
        }
        if (!ticket) {
            return res.status(400).json({ success: false, error: 'ticket is required' });
        }

        const result = await integrationService.claimBrokerTicket(provider, ticket);
        return res.json({
            success: true,
            provider,
            result,
        });
    } catch (err: any) {
        console.error(`[Integrations] Error claiming ticket for ${req.params.provider}:`, err);
        return res.status(500).json({ success: false, error: err?.message });
    }
});

// 4. GET /api/integrations/github/repos
// Calls real GitHub API with user's stored OAuth token
integrationsRouter.get('/github/repos', async (req: Request, res: Response) => {
    try {
        const repos = await integrationService.getRealGitHubRepos();
        return res.json({
            success: true,
            count: repos.length,
            repos,
        });
    } catch (err: any) {
        console.error('[Integrations] Error fetching GitHub repos:', err?.message);
        return res.status(err?.message?.includes('not connected') ? 401 : 500).json({
            success: false,
            error: err?.message,
        });
    }
});

// 5. GET /api/integrations/slack/channels
// Calls real Slack API with user's stored OAuth token
integrationsRouter.get('/slack/channels', async (req: Request, res: Response) => {
    try {
        const channels = await integrationService.getRealSlackChannels();
        return res.json({
            success: true,
            count: channels.length,
            channels,
        });
    } catch (err: any) {
        console.error('[Integrations] Error fetching Slack channels:', err?.message);
        return res.status(err?.message?.includes('not connected') ? 401 : 500).json({
            success: false,
            error: err?.message,
        });
    }
});

// 6. GET /api/integrations/jira/projects
// Calls real Jira API with user's stored OAuth token
integrationsRouter.get('/jira/projects', async (req: Request, res: Response) => {
    try {
        const projects = await integrationService.getRealJiraProjects();
        return res.json({
            success: true,
            count: projects.length,
            projects,
        });
    } catch (err: any) {
        console.error('[Integrations] Error fetching Jira projects:', err?.message);
        return res.status(err?.message?.includes('not connected') ? 401 : 500).json({
            success: false,
            error: err?.message,
        });
    }
});

// 7. POST /api/integrations/:provider/scope
// Updates scoping rules in PostgreSQL
integrationsRouter.post('/:provider/scope', async (req: Request, res: Response) => {
    try {
        const provider = req.params.provider as SupportedIntegrationProvider;
        const { allMonitored, monitoredItems } = req.body;

        if (!['github', 'slack', 'jira'].includes(provider)) {
            return res.status(400).json({ success: false, error: 'Invalid provider' });
        }

        const rules = {
            allMonitored: Boolean(allMonitored),
            monitoredItems: Array.isArray(monitoredItems) ? monitoredItems : ['*'],
        };

        await integrationService.updateScopeRules(provider, rules);

        return res.json({
            success: true,
            message: `Scope updated for ${provider.toUpperCase()}`,
            scopeRules: rules,
        });
    } catch (err: any) {
        console.error('[Integrations] Error saving scope:', err);
        return res.status(500).json({ success: false, error: err?.message });
    }
});

// 8. POST /api/integrations/:provider/disconnect
// Clears stored OAuth tokens
integrationsRouter.post('/:provider/disconnect', async (req: Request, res: Response) => {
    try {
        const provider = req.params.provider as SupportedIntegrationProvider;
        if (!['github', 'slack', 'jira'].includes(provider)) {
            return res.status(400).json({ success: false, error: 'Invalid provider' });
        }

        await integrationService.disconnectProvider(provider);

        return res.json({
            success: true,
            message: `Disconnected ${provider.toUpperCase()}`,
        });
    } catch (err: any) {
        console.error('[Integrations] Error disconnecting provider:', err);
        return res.status(500).json({ success: false, error: err?.message });
    }
});
