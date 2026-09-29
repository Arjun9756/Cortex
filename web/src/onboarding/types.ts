export type SupportedProvider = 'github' | 'slack' | 'jira';

export interface ScopeRules {
    allMonitored: boolean;
    monitoredItems: string[];
}

export interface ConnectorInfo {
    provider: SupportedProvider;
    status: 'connected' | 'not_connected' | 'needs_reauth';
    accountName: string | null;
    accountEmail: string | null;
    accountAvatar: string | null;
    scopes: string[];
    updatedAt: string | null;
    scopeRules: ScopeRules;
    hasCredentialsConfigured: boolean;
    webhookRegistered?: boolean;
}

export interface WebhookSyncResult {
    status: 'installed' | 'channels_joined' | 'skipped_localhost' | 'skipped_no_token' | 'partial' | 'error';
    message: string;
    targetUrl?: string;
    webhookUrl?: string;
    results?: Array<{ repo?: string; channelId?: string; action: string; hookId?: number; error?: string }>;
}

export interface RealGitHubRepo {
    id: number;
    name: string;
    fullName: string;
    isPrivate: boolean;
    htmlUrl: string;
    description: string | null;
    language: string | null;
    updatedAt: string;
}

export interface RealSlackChannel {
    id: string;
    name: string;
    isPrivate: boolean;
    memberCount: number;
    topic: string;
}

export interface RealJiraProject {
    id: string;
    key: string;
    name: string;
    projectTypeKey: string;
    avatarUrl: string;
}
