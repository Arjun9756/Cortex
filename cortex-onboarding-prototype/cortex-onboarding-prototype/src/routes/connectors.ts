import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';
import { connectorService } from '../services/connector.service.js';
import { tokenMonitor } from '../services/tokenMonitor.service.js';
import { SupportedProvider, ScopeRules } from '../types/index.js';

export const connectorsRouter = Router();

// GET /api/connectors/status
// Returns real, current token validity and status for all 3 providers
connectorsRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const connectors = await connectorService.getConnectorsStatus();
    const hasAnyConnected = store.hasAnyConnected();

    res.json({
      success: true,
      hasAnyConnected,
      isFirstRun: !hasAnyConnected,
      connectors,
    });
  } catch (err: any) {
    console.error('[ConnectorsRouter] Error fetching status:', err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/connectors/oauth/authorize
// Initiates OAuth connection (Dual-mode: supports simulated connection or real OAuth URL)
connectorsRouter.post('/oauth/authorize', async (req: Request, res: Response) => {
  try {
    const { provider, simulate, accessToken, refreshToken } = req.body;

    if (!['github', 'slack', 'jira'].includes(provider)) {
      return res.status(400).json({ success: false, error: 'Invalid provider' });
    }

    // If simulated or test token provided, connect immediately
    const conn = await connectorService.connectProvider(provider as SupportedProvider, {
      accessToken,
      refreshToken,
      isSimulated: simulate !== false,
    });

    res.json({
      success: true,
      message: `Successfully authorized and registered webhook for ${provider.toUpperCase()}`,
      connector: conn,
    });
  } catch (err: any) {
    console.error('[ConnectorsRouter] Error authorizing provider:', err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/connectors/:provider/scope
// Updates scoping rules for a provider (e.g. repos, channels, projects)
connectorsRouter.post('/:provider/scope', async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as string;
    const { allMonitored, monitoredItems } = req.body;

    if (!['github', 'slack', 'jira'].includes(provider)) {
      return res.status(400).json({ success: false, error: 'Invalid provider' });
    }

    const rules: ScopeRules = {
      allMonitored: Boolean(allMonitored),
      monitoredItems: Array.isArray(monitoredItems) ? monitoredItems : ['*'],
    };

    const updated = connectorService.updateScopeRules(provider as SupportedProvider, rules);

    res.json({
      success: true,
      message: `Updated scope rules for ${provider.toUpperCase()}`,
      connector: updated,
    });
  } catch (err: any) {
    console.error('[ConnectorsRouter] Error updating scope:', err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/connectors/:provider/invalidate
// Deliberately expires/invalidates a stored token (used for Verification Scenario 3)
connectorsRouter.post('/:provider/invalidate', (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as string;
    if (!['github', 'slack', 'jira'].includes(provider)) {
      return res.status(400).json({ success: false, error: 'Invalid provider' });
    }

    const updated = connectorService.invalidateToken(provider as SupportedProvider);

    res.json({
      success: true,
      message: `Deliberately invalidated stored token for ${provider.toUpperCase()}`,
      connector: updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/connectors/check-all
// Proactively tests token validity across all connectors
connectorsRouter.post('/check-all', async (req: Request, res: Response) => {
  try {
    const results = await tokenMonitor.checkAllTokensProactively();
    const connectors = store.getAllConnectors();

    res.json({
      success: true,
      results,
      connectors,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// GET /api/connectors/events
connectorsRouter.get('/events', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  res.json({
    success: true,
    events: store.getEvents(limit),
  });
});

// GET /api/connectors/persons
connectorsRouter.get('/persons', (_req: Request, res: Response) => {
  res.json({
    success: true,
    persons: store.getAllPersons(),
  });
});

// GET /api/connectors/audit
connectorsRouter.get('/audit', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  res.json({
    success: true,
    auditLogs: store.getAuditLogs(limit),
  });
});

// POST /api/connectors/reset
// Resets all connectors and state for fresh first-run onboarding testing
connectorsRouter.post('/reset', (req: Request, res: Response) => {
  try {
    store.resetAll();
    res.json({
      success: true,
      message: 'Reset all connectors and data for fresh first-run setup',
      connectors: store.getAllConnectors(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});
