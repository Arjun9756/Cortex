import type {
    SupportedProvider,
    ConnectorInfo,
    RealGitHubRepo,
    RealSlackChannel,
    RealJiraProject,
    ScopeRules,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function fetchIntegrationsStatus(): Promise<Record<SupportedProvider, ConnectorInfo>> {
    const res = await fetch(`${API_BASE}/api/integrations/status`);
    if (!res.ok) {
        throw new Error(`Failed to fetch status: ${res.statusText}`);
    }
    const data = await res.json();
    return data.connectors;
}

export async function getOAuthAuthorizeUrl(provider: SupportedProvider): Promise<{ url: string; state: string }> {
    const redirectUrl = window.location.origin;
    const res = await fetch(`${API_BASE}/api/integrations/${provider}/authorize?redirectUrl=${encodeURIComponent(redirectUrl)}`);
    const data = await res.json();
    if (!data.success) {
        const err = new Error(data.error || 'Failed to start authorization');
        (err as any).requiresRegistration = data.requiresRegistration;
        (err as any).provider = data.provider;
        throw err;
    }
    return { url: data.url, state: data.state };
}

export async function fetchRealGitHubRepos(): Promise<RealGitHubRepo[]> {
    const res = await fetch(`${API_BASE}/api/integrations/github/repos`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Failed to fetch repositories');
    }
    const data = await res.json();
    return data.repos || [];
}

export async function fetchRealSlackChannels(): Promise<RealSlackChannel[]> {
    const res = await fetch(`${API_BASE}/api/integrations/slack/channels`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Failed to fetch Slack channels');
    }
    const data = await res.json();
    return data.channels || [];
}

export async function fetchRealJiraProjects(): Promise<RealJiraProject[]> {
    const res = await fetch(`${API_BASE}/api/integrations/jira/projects`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Failed to fetch Jira projects');
    }
    const data = await res.json();
    return data.projects || [];
}

export async function claimIntegrationTicket(provider: SupportedProvider, ticket: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/integrations/${provider}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Failed to claim authorization token');
    }
    return res.json();
}

export async function saveIntegrationScope(provider: SupportedProvider, rules: ScopeRules): Promise<void> {
    const res = await fetch(`${API_BASE}/api/integrations/${provider}/scope`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Failed to update scope');
    }
}

export async function disconnectIntegration(provider: SupportedProvider): Promise<void> {
    const res = await fetch(`${API_BASE}/api/integrations/${provider}/disconnect`, {
        method: 'POST',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Failed to disconnect');
    }
}
