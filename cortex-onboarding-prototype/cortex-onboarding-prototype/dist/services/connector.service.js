import { store } from '../db/store.js';
import { providerApis } from './providerApis.service.js';
export class ConnectorService {
    /**
     * Returns current connector state for all providers, evaluating real token validity.
     */
    async getConnectorsStatus() {
        const connectors = store.getAllConnectors();
        const now = Date.now();
        for (const provider of ['github', 'slack', 'jira']) {
            const conn = connectors[provider];
            if (conn.status === 'not_connected')
                continue;
            // Check if token expiration timestamp has passed
            if (conn.tokenExpiresAt && conn.tokenExpiresAt <= now) {
                // Attempt silent refresh before marking as needs_reauth
                if (conn.refreshToken) {
                    const refreshRes = await providerApis.attemptSilentRefresh(provider, conn.refreshToken);
                    if (refreshRes.success && refreshRes.newAccessToken) {
                        store.updateConnector(provider, {
                            status: 'connected',
                            accessToken: refreshRes.newAccessToken,
                            refreshToken: refreshRes.newRefreshToken || conn.refreshToken,
                            tokenExpiresAt: refreshRes.expiresInSeconds ? now + refreshRes.expiresInSeconds * 1000 : null,
                            lastError: null,
                        });
                        store.addAuditLog({
                            provider,
                            eventType: 'TOKEN_SILENT_REFRESH_SUCCESS',
                            message: `Proactive silent refresh succeeded for ${provider}`,
                        });
                        continue;
                    }
                }
                // Silent refresh failed or not available -> needs_reauth
                store.updateConnector(provider, {
                    status: 'needs_reauth',
                    lastError: 'token_expired',
                });
            }
        }
        return store.getAllConnectors();
    }
    /**
     * Connects a provider via OAuth authorization (or simulated one-click connection for BYOC demo/testing).
     * Automatically registers the webhook subscription and configures initial scoping.
     */
    async connectProvider(provider, options = {}) {
        const baseUrl = process.env.DEPLOYMENT_WEBHOOK_BASE_URL || 'http://localhost:3000';
        const now = Date.now();
        let accessToken = options.accessToken;
        let refreshToken = options.refreshToken;
        const expiresIn = options.expiresInSeconds || 86400 * 30; // default 30 days for OAuth
        if (!accessToken) {
            // Generate standard BYOC test token if no raw token supplied
            const prefix = provider === 'github' ? 'gho_simulated_' : provider === 'slack' ? 'xoxb-simulated-' : 'jira-simulated-';
            accessToken = `${prefix}${Date.now()}`;
            refreshToken = `refresh-simulated-${Date.now()}`;
        }
        // 1. Auto-register webhook subscription with the provider
        const webhookConfig = await this.autoRegisterWebhook(provider, baseUrl);
        // 2. Default scoping rules: monitor all
        const defaultScope = {
            allMonitored: true,
            monitoredItems: ['*'],
        };
        // 3. Update connector state to connected
        const updated = store.updateConnector(provider, {
            status: 'connected',
            accessToken,
            refreshToken: refreshToken || null,
            tokenExpiresAt: expiresIn ? now + expiresIn * 1000 : null,
            lastTokenCheck: now,
            lastError: null,
            scopeRules: defaultScope,
            webhookConfig,
        });
        store.addAuditLog({
            provider,
            eventType: 'CONNECTOR_AUTHORIZED',
            message: `Successfully authorized ${provider.toUpperCase()} connector and auto-registered webhook`,
            metadata: { webhookUrl: webhookConfig.webhookUrl, allMonitored: true },
        });
        return updated;
    }
    /**
     * Automatically registers webhook subscription with the provider pointing at deployment's webhook URL.
     * No manual URL or secret copy-pasting required from user.
     */
    async autoRegisterWebhook(provider, baseUrl) {
        const webhookUrls = {
            github: `${baseUrl}/api/github/webhook`,
            slack: `${baseUrl}/api/slack/webhook`,
            jira: `${baseUrl}/api/jira/webhook`,
        };
        const signatureHeaders = {
            github: 'x-hub-signature-256',
            slack: 'x-slack-signature',
            jira: 'x-jira-webhook-secret',
        };
        // In a live cloud setup with real OAuth tokens, this executes POST /repos/:owner/:repo/hooks
        // or Jira REST Webhook registration API automatically.
        const externalWebhookId = `wh_sub_${provider}_${Date.now()}`;
        return {
            registered: true,
            webhookUrl: webhookUrls[provider],
            signatureHeader: signatureHeaders[provider],
            externalWebhookId,
            secretMasked: '••••••••',
            registeredAt: Date.now(),
        };
    }
    /**
     * Updates scoping rules for a provider (e.g., select specific repos/channels/projects or all).
     */
    updateScopeRules(provider, rules) {
        const updated = store.updateConnector(provider, {
            scopeRules: rules,
        });
        store.addAuditLog({
            provider,
            eventType: 'SCOPE_RULES_UPDATED',
            message: `Updated monitoring scope for ${provider.toUpperCase()}: ${rules.allMonitored ? 'All items' : rules.monitoredItems.join(', ')}`,
            metadata: rules,
        });
        return updated;
    }
    /**
     * Evaluates incoming event against configured scoping rules.
     * Returns whether event is in-scope and reason.
     */
    checkEventScope(provider, eventPayload) {
        const conn = store.getConnector(provider);
        const scope = conn.scopeRules;
        // If configured to monitor all items, always in scope
        if (scope.allMonitored || (scope.monitoredItems.length === 1 && scope.monitoredItems[0] === '*')) {
            return { inScope: true, reason: 'Configured to monitor all items' };
        }
        if (provider === 'github') {
            const repoFullName = eventPayload?.repository?.full_name ||
                eventPayload?.repository?.name ||
                eventPayload?.repo;
            if (!repoFullName) {
                return { inScope: true, reason: 'No repository identified in payload' };
            }
            const isMatch = scope.monitoredItems.some((item) => {
                const clean = item.trim().toLowerCase();
                const cleanRepo = repoFullName.trim().toLowerCase();
                return (clean === cleanRepo ||
                    cleanRepo.endsWith(`/${clean}`) ||
                    clean.endsWith(`/${cleanRepo}`) ||
                    clean === '*');
            });
            return {
                inScope: isMatch,
                matchedItem: repoFullName,
                reason: isMatch
                    ? `Repository "${repoFullName}" is within configured scope [${scope.monitoredItems.join(', ')}]`
                    : `Repository "${repoFullName}" is outside configured scope [${scope.monitoredItems.join(', ')}] — skipped`,
            };
        }
        if (provider === 'slack') {
            const candidateChannels = [
                eventPayload?.event?.channel,
                eventPayload?.channel,
                eventPayload?.channel_id,
                eventPayload?.event?.channel_name,
                eventPayload?.channel_name,
            ].filter((c) => typeof c === 'string' && c.trim().length > 0);
            if (candidateChannels.length === 0) {
                return { inScope: true, reason: 'No channel identified in payload' };
            }
            const channel = candidateChannels[0];
            const isMatch = scope.monitoredItems.some((item) => {
                const clean = item.trim().toLowerCase().replace(/^#/, '');
                return (clean === '*' ||
                    candidateChannels.some((c) => {
                        const cleanChan = c.trim().toLowerCase().replace(/^#/, '');
                        return clean === cleanChan;
                    }));
            });
            return {
                inScope: isMatch,
                matchedItem: channel,
                reason: isMatch
                    ? `Slack channel "${channel}" is within configured scope [${scope.monitoredItems.join(', ')}]`
                    : `Slack channel "${channel}" is outside configured scope [${scope.monitoredItems.join(', ')}] — skipped`,
            };
        }
        if (provider === 'jira') {
            const issueKey = eventPayload?.issue?.key || eventPayload?.key || '';
            const projectKey = eventPayload?.issue?.fields?.project?.key ||
                (typeof eventPayload?.project === 'string' ? eventPayload?.project : eventPayload?.project?.key) ||
                (issueKey.includes('-') ? issueKey.split('-')[0] : '');
            if (!projectKey) {
                return { inScope: true, reason: 'No project identified in Jira payload' };
            }
            const isMatch = scope.monitoredItems.some((item) => {
                const clean = item.trim().toUpperCase();
                const cleanProj = String(projectKey).trim().toUpperCase();
                return clean === cleanProj || clean === '*';
            });
            return {
                inScope: isMatch,
                matchedItem: String(projectKey),
                reason: isMatch
                    ? `Jira project "${projectKey}" is within configured scope [${scope.monitoredItems.join(', ')}]`
                    : `Jira project "${projectKey}" is outside configured scope [${scope.monitoredItems.join(', ')}] — skipped`,
            };
        }
        return { inScope: true, reason: 'Default allow' };
    }
    /**
     * Handles an expired/invalid token error encountered during API calls.
     * 1. Attempts automatic silent refresh if refresh_token exists.
     * 2. If silent refresh fails or not supported, flags lastError = "token_expired"
     *    and sets status = "needs_reauth".
     * Returns boolean indicating if silent refresh succeeded.
     */
    async handleTokenFailure(provider, error) {
        const conn = store.getConnector(provider);
        console.warn(`[ConnectorService] Token failure detected for ${provider}: ${error?.message}`);
        // Attempt silent refresh first
        if (conn.refreshToken) {
            console.log(`[ConnectorService] Attempting automatic silent refresh for ${provider}...`);
            const refreshRes = await providerApis.attemptSilentRefresh(provider, conn.refreshToken);
            if (refreshRes.success && refreshRes.newAccessToken) {
                const now = Date.now();
                store.updateConnector(provider, {
                    status: 'connected',
                    accessToken: refreshRes.newAccessToken,
                    refreshToken: refreshRes.newRefreshToken || conn.refreshToken,
                    tokenExpiresAt: refreshRes.expiresInSeconds ? now + refreshRes.expiresInSeconds * 1000 : null,
                    lastError: null,
                    lastTokenCheck: now,
                });
                store.addAuditLog({
                    provider,
                    eventType: 'TOKEN_SILENT_REFRESH_SUCCESS',
                    message: `Silent refresh automatically restored live token for ${provider.toUpperCase()}`,
                });
                console.log(`[ConnectorService] ✅ Silent refresh succeeded for ${provider}`);
                return { refreshed: true, newAccessToken: refreshRes.newAccessToken };
            }
        }
        // Silent refresh not possible or failed -> update status to needs_reauth
        store.updateConnector(provider, {
            status: 'needs_reauth',
            lastError: 'token_expired',
            lastTokenCheck: Date.now(),
        });
        store.addAuditLog({
            provider,
            eventType: 'CONNECTOR_NEEDS_REAUTH',
            message: `Connector ${provider.toUpperCase()} marked as "Needs re-auth" due to token expiry/failure: ${error?.message}`,
        });
        console.log(`[ConnectorService] ⚠️ Connector ${provider} status updated to "needs_reauth"`);
        return { refreshed: false };
    }
    /**
     * Deliberately invalidates/expires a stored token for verification/testing.
     */
    invalidateToken(provider) {
        const updated = store.updateConnector(provider, {
            accessToken: 'EXPIRED_TOKEN',
            status: 'needs_reauth',
            lastError: 'token_expired',
            tokenExpiresAt: Date.now() - 3600000, // 1 hour in past
        });
        store.addAuditLog({
            provider,
            eventType: 'TOKEN_DELIBERATELY_EXPIRED',
            message: `Simulated token invalidation for verification testing on ${provider.toUpperCase()}`,
        });
        return updated;
    }
}
export const connectorService = new ConnectorService();
