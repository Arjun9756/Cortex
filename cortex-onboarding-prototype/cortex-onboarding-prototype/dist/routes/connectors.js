import { Router } from 'express';
import { store } from '../db/store.js';
import { connectorService } from '../services/connector.service.js';
import { tokenMonitor } from '../services/tokenMonitor.service.js';
export const connectorsRouter = Router();
// GET /api/connectors/status
// Returns real, current token validity and status for all 3 providers
connectorsRouter.get('/status', async (req, res) => {
    try {
        const connectors = await connectorService.getConnectorsStatus();
        const hasAnyConnected = store.hasAnyConnected();
        res.json({
            success: true,
            hasAnyConnected,
            isFirstRun: !hasAnyConnected,
            connectors,
        });
    }
    catch (err) {
        console.error('[ConnectorsRouter] Error fetching status:', err);
        res.status(500).json({ success: false, error: err?.message });
    }
});
// POST /api/connectors/oauth/authorize
// Initiates OAuth connection (Dual-mode: supports simulated connection or real OAuth URL)
connectorsRouter.post('/oauth/authorize', async (req, res) => {
    try {
        const { provider, simulate, accessToken, refreshToken } = req.body;
        if (!['github', 'slack', 'jira'].includes(provider)) {
            return res.status(400).json({ success: false, error: 'Invalid provider' });
        }
        // If simulated or test token provided, connect immediately
        const conn = await connectorService.connectProvider(provider, {
            accessToken,
            refreshToken,
            isSimulated: simulate !== false,
        });
        res.json({
            success: true,
            message: `Successfully authorized and registered webhook for ${provider.toUpperCase()}`,
            connector: conn,
        });
    }
    catch (err) {
        console.error('[ConnectorsRouter] Error authorizing provider:', err);
        res.status(500).json({ success: false, error: err?.message });
    }
});
// POST /api/connectors/:provider/scope
// Updates scoping rules for a provider (e.g. repos, channels, projects)
connectorsRouter.post('/:provider/scope', async (req, res) => {
    try {
        const provider = req.params.provider;
        const { allMonitored, monitoredItems } = req.body;
        if (!['github', 'slack', 'jira'].includes(provider)) {
            return res.status(400).json({ success: false, error: 'Invalid provider' });
        }
        const rules = {
            allMonitored: Boolean(allMonitored),
            monitoredItems: Array.isArray(monitoredItems) ? monitoredItems : ['*'],
        };
        const updated = connectorService.updateScopeRules(provider, rules);
        res.json({
            success: true,
            message: `Updated scope rules for ${provider.toUpperCase()}`,
            connector: updated,
        });
    }
    catch (err) {
        console.error('[ConnectorsRouter] Error updating scope:', err);
        res.status(500).json({ success: false, error: err?.message });
    }
});
// POST /api/connectors/:provider/invalidate
// Deliberately expires/invalidates a stored token (used for Verification Scenario 3)
connectorsRouter.post('/:provider/invalidate', (req, res) => {
    try {
        const provider = req.params.provider;
        if (!['github', 'slack', 'jira'].includes(provider)) {
            return res.status(400).json({ success: false, error: 'Invalid provider' });
        }
        const updated = connectorService.invalidateToken(provider);
        res.json({
            success: true,
            message: `Deliberately invalidated stored token for ${provider.toUpperCase()}`,
            connector: updated,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message });
    }
});
// POST /api/connectors/check-all
// Proactively tests token validity across all connectors
connectorsRouter.post('/check-all', async (req, res) => {
    try {
        const results = await tokenMonitor.checkAllTokensProactively();
        const connectors = store.getAllConnectors();
        res.json({
            success: true,
            results,
            connectors,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message });
    }
});
// GET /api/connectors/events
connectorsRouter.get('/events', (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 50;
    res.json({
        success: true,
        events: store.getEvents(limit),
    });
});
// GET /api/connectors/persons
connectorsRouter.get('/persons', (_req, res) => {
    res.json({
        success: true,
        persons: store.getAllPersons(),
    });
});
// GET /api/connectors/audit
connectorsRouter.get('/audit', (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 50;
    res.json({
        success: true,
        auditLogs: store.getAuditLogs(limit),
    });
});
// POST /api/connectors/reset
// Resets all connectors and state for fresh first-run onboarding testing
connectorsRouter.post('/reset', (req, res) => {
    try {
        store.resetAll();
        res.json({
            success: true,
            message: 'Reset all connectors and data for fresh first-run setup',
            connectors: store.getAllConnectors(),
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message });
    }
});
