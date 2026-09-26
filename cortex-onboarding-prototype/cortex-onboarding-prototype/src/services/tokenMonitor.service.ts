import { store } from '../db/store.js';
import { providerApis } from './providerApis.service.js';
import { connectorService } from './connector.service.js';
import { SupportedProvider } from '../types/index.js';

export interface TokenScanResult {
  provider: SupportedProvider;
  previousStatus: string;
  currentStatus: string;
  testedToken: boolean;
  valid: boolean;
  refreshedSilently: boolean;
  message: string;
}

export class TokenMonitorService {
  private intervalTimer: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours (daily background check)

  public start(): void {
    if (this.intervalTimer) return;
    console.log('[TokenMonitor] Starting daily proactive connector token health monitor');
    this.intervalTimer = setInterval(() => {
      this.checkAllTokensProactively().catch((err) =>
        console.error('[TokenMonitor] Error during scheduled token scan:', err)
      );
    }, this.CHECK_INTERVAL_MS);
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  /**
   * Proactively scans all configured connectors using cheap test API calls
   * so expired tokens are caught before they degrade identity resolution quality.
   */
  public async checkAllTokensProactively(): Promise<TokenScanResult[]> {
    const connectors = store.getAllConnectors();
    const results: TokenScanResult[] = [];
    const providers: SupportedProvider[] = ['github', 'slack', 'jira'];

    console.log('[TokenMonitor] Executing proactive token health check across all connectors...');

    for (const provider of providers) {
      const conn = connectors[provider];
      const previousStatus = conn.status;

      if (conn.status === 'not_connected' || !conn.accessToken) {
        results.push({
          provider,
          previousStatus,
          currentStatus: conn.status,
          testedToken: false,
          valid: false,
          refreshedSilently: false,
          message: 'Connector is not connected — skipped',
        });
        continue;
      }

      // Check if expiration timestamp has already lapsed
      const now = Date.now();
      const isExpiredByTimestamp = Boolean(conn.tokenExpiresAt && conn.tokenExpiresAt <= now);

      let validation = isExpiredByTimestamp
        ? { valid: false, status: 'expired' as const, errorMessage: 'Token timestamp has expired' }
        : await providerApis.testTokenValidity(provider, conn.accessToken);

      let refreshedSilently = false;

      // If invalid or expired, attempt automatic silent refresh
      if (!validation.valid) {
        console.warn(`[TokenMonitor] Token invalid for ${provider} (${validation.errorMessage}). Attempting silent refresh...`);
        const refreshAttempt = await connectorService.handleTokenFailure(provider, new Error(validation.errorMessage));
        refreshedSilently = refreshAttempt.refreshed;

        const updated = store.getConnector(provider);
        results.push({
          provider,
          previousStatus,
          currentStatus: updated.status,
          testedToken: true,
          valid: refreshedSilently,
          refreshedSilently,
          message: refreshedSilently
            ? 'Token was expired but successfully refreshed silently'
            : `Token expired: ${validation.errorMessage}. Status updated to Needs re-auth.`,
        });
      } else {
        // Token is healthy
        store.updateConnector(provider, {
          status: 'connected',
          lastTokenCheck: now,
          lastError: null,
        });

        results.push({
          provider,
          previousStatus,
          currentStatus: 'connected',
          testedToken: true,
          valid: true,
          refreshedSilently: false,
          message: 'Token is valid and active',
        });
      }
    }

    store.addAuditLog({
      eventType: 'PROACTIVE_TOKEN_HEALTH_SCAN',
      message: `Completed proactive token validity scan across 3 providers`,
      metadata: { results },
    });

    return results;
  }
}

export const tokenMonitor = new TokenMonitorService();
