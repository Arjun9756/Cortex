export type SupportedProvider = 'github' | 'slack' | 'jira';

export type ConnectorStatus = 'connected' | 'needs_reauth' | 'not_connected';

export interface ScopeRules {
  // github: list of repo full names e.g. ["acme/auth-service"] or ["*"] for all repos
  // slack: list of channel IDs/names e.g. ["C12345", "#general"] or ["*"] for all channels
  // jira: list of project keys e.g. ["ENG", "OPS"] or ["*"] for all projects
  monitoredItems: string[];
  allMonitored: boolean; // true if 'all repos in org', 'all channels bot is in', 'all projects'
}

export interface WebhookConfig {
  registered: boolean;
  webhookUrl: string;
  externalWebhookId?: string;
  secretMasked?: string;
  signatureHeader: string;
  registeredAt?: number;
}

export interface ConnectorState {
  provider: SupportedProvider;
  name: string;
  status: ConnectorStatus;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null; // epoch ms
  lastTokenCheck: number | null; // epoch ms
  lastError: string | null;      // e.g. "token_expired", "invalid_grant"
  scopeRules: ScopeRules;
  webhookConfig: WebhookConfig;
  eventCount: number;
  updatedAt: number;
}

export interface ProviderIdentity {
  provider: SupportedProvider;
  externalId: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  confidence: number;
  matchedBy: 'EXACT_EMAIL' | 'USERNAME_MATCH' | 'NAME_FALLBACK' | 'NEW_PERSON';
  linkedAt: number;
}

export interface CanonicalPerson {
  id: string;
  verifiedEmail: string | null;
  displayName: string;
  confidence: number; // 1.0 = verified email, 0.98 = strong username, 0.60 = name-based fallback
  identities: ProviderIdentity[];
  createdAt: number;
  updatedAt: number;
}

export interface IdentityResolutionResult {
  canonicalPersonId: string;
  isNewPerson: boolean;
  confidence: number;
  reason: string;
  matchedBy: 'EXACT_EMAIL' | 'USERNAME_MATCH' | 'NAME_FALLBACK' | 'NEW_PERSON';
  person: CanonicalPerson;
}

export interface IngestedEventRecord {
  id: string;
  provider: SupportedProvider;
  eventType: string;
  deliveryId: string;
  actorExternalId: string;
  actorUsername?: string;
  actorDisplayName?: string;
  actorEmail: string | null;
  emailFetchMethod: 'payload_direct' | 'api_lookup' | 'fallback_failed';
  inScope: boolean;
  scopeReason: string;
  resolvedPersonId: string | null;
  resolutionMatchedBy?: string;
  confidence?: number;
  rawPayload: any;
  createdAt: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  provider?: SupportedProvider;
  eventType: string;
  message: string;
  metadata?: Record<string, any>;
}
