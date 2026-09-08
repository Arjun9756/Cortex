import http from 'http';

const PORT = parseInt(process.env.MOCK_SERVER_PORT || '4000', 10);

let currentMode: 'active' | 'revoked' | 'inactive' = 'active';

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    // Admin endpoint to switch mock server simulation state
    if (url.pathname === '/admin/mode' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                if (['active', 'revoked', 'inactive'].includes(parsed.mode)) {
                    currentMode = parsed.mode;
                    console.log(`[MOCK SERVER] Switched simulation mode to: ${currentMode.toUpperCase()}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, mode: currentMode }));
                    return;
                }
            } catch {}
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid mode. Use "active", "revoked", or "inactive".' }));
        });
        return;
    }

    // Ping endpoint for Cortex client
    if (url.pathname === '/api/v1/license/ping' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            let payload: any = {};
            try {
                payload = JSON.parse(body);
            } catch {
                console.error('[MOCK SERVER] Invalid JSON received');
            }

            console.log('\n[MOCK SERVER] Received License Ping from Cortex Client:');
            console.log(JSON.stringify(payload, null, 2));

            // Determine response based on key or currentMode
            const key = payload.license_key || '';

            if (currentMode === 'revoked' || key.includes('REVOKED')) {
                console.log('[MOCK SERVER] Responding with: LICENSE_REVOKED');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    allowed: false,
                    code: 'LICENSE_REVOKED',
                    message: 'This license has been revoked by the administrator'
                }));
                return;
            }

            if (currentMode === 'inactive' || key.includes('SUSPENDED') || key.includes('INACTIVE')) {
                console.log('[MOCK SERVER] Responding with: CLIENT_INACTIVE');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    allowed: false,
                    code: 'CLIENT_INACTIVE',
                    message: 'Client organization account is suspended'
                }));
                return;
            }

            // Default Active Response matching user specification
            const now = new Date();
            const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later

            const activeResponse = {
                allowed: true,
                status: 'active',
                client: {
                    org_name: 'Info Tech Solution Pvt Ltd by Debentures',
                    contact_name: 'Amit Pandey',
                    email: 'pandeyamit@infotech.com'
                },
                expiry_date: expiry.toISOString(),
                expiry_date_12h: '06 Oct 2026, 03:44 AM',
                next_ping_interval_hours: 6,
                server_time: now.toISOString(),
                server_time_12h: '08 Sep 2026, 06:58:01 AM'
            };

            console.log('[MOCK SERVER] Responding with: ACTIVE LICENSE');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(activeResponse));
        });
        return;
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` Cortex License Mock Admin Server Running`);
    console.log(` Port: ${PORT}`);
    console.log(` Endpoint: http://localhost:${PORT}/api/v1/license/ping`);
    console.log(` Current Mode: ${currentMode.toUpperCase()}`);
    console.log(`======================================================\n`);
});
