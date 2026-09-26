import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectorsRouter } from './routes/connectors.js';
import { webhooksRouter } from './routes/webhooks.js';
import { tokenMonitor } from './services/tokenMonitor.service.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
// ─── Middleware ─────────────────────────────────────────────────────────────
// Capture raw body for HMAC signature verification while still parsing JSON
app.use(express.json({
    type: ['application/json', 'application/*+json', '*/*'],
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(cors());
// ─── Static Frontend ───────────────────────────────────────────────────────
const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));
// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/connectors', connectorsRouter);
app.use('/api', webhooksRouter);
// ─── Health / Info ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'cortex-onboarding-prototype',
        timestamp: new Date().toISOString(),
    });
});
// ─── SPA Fallback ───────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});
// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🧠 Cortex Onboarding Prototype running at http://localhost:${PORT}`);
    console.log(`   📡 Webhook endpoints:`);
    console.log(`      POST /api/github/webhook`);
    console.log(`      POST /api/slack/webhook`);
    console.log(`      POST /api/jira/webhook`);
    console.log(`   🔌 Connector API: /api/connectors/*`);
    console.log(`   🖥️  Frontend UI:  http://localhost:${PORT}\n`);
    // Start background token health monitor
    tokenMonitor.start();
});
