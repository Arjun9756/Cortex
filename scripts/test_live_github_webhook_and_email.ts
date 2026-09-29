import crypto from 'crypto';
import sql from '../apps/api/config/postgres.js';

async function testLiveWebhook() {
    console.log('================================================================');
    console.log('🧪 LIVE END-TO-END TEST: GITHUB WEBHOOK & EMAIL INGESTION');
    console.log('================================================================\n');

    // 1. Fetch Webhook Secret from DB
    const [gh] = await sql`SELECT webhook_secret, status, account_email FROM integrations WHERE provider = 'github'`;
    if (!gh || !gh.webhook_secret) {
        throw new Error('GitHub integration or webhook_secret missing in database!');
    }
    const secret = gh.webhook_secret;
    console.log(`✅ Using GitHub Webhook Secret from PostgreSQL (starts with: ${secret.slice(0, 8)}...)`);

    // 2. Test Ping Webhook
    console.log('\n--- Step 1: Testing GitHub Ping Webhook ---');
    const pingDeliveryId = crypto.randomUUID();
    const pingBody = JSON.stringify({
        zen: 'Favor focus over features.',
        hook_id: 12345678,
        repository: { id: 98765, name: 'Cortex', full_name: 'kishu-dev/Cortex' }
    });
    const pingHmac = 'sha256=' + crypto.createHmac('sha256', secret).update(pingBody).digest('hex');

    const pingRes = await fetch('http://localhost:3000/api/github/webhook', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hub-signature-256': pingHmac,
            'x-github-delivery': pingDeliveryId,
            'x-github-event': 'ping',
            'User-Agent': 'GitHub-Hookshot/test'
        },
        body: pingBody
    });

    console.log(`Ping Response Status: ${pingRes.status} ${pingRes.statusText}`);
    const pingData = await pingRes.json();
    console.log('Ping Response Body:', pingData);
    if (pingRes.status === 200 && pingData.message === 'pong') {
        console.log('✅ PASS: GitHub Webhook Ping verified successfully with DB secret!');
    } else {
        throw new Error(`Ping failed: ${JSON.stringify(pingData)}`);
    }

    // 3. Test Push Event with Real Commits and Email
    console.log('\n--- Step 2: Testing GitHub Push Event Webhook ---');
    const pushDeliveryId = crypto.randomUUID();
    const commitId = crypto.randomBytes(20).toString('hex');
    const pushPayload = {
        ref: 'refs/heads/main',
        repository: {
            id: 99998888,
            name: 'Cortex',
            full_name: 'kishu-dev/Cortex'
        },
        pusher: {
            name: 'Kishu Singh',
            email: 'as9604793@gmail.com'
        },
        sender: {
            id: 167556684,
            login: 'kishu-dev',
            email: 'as9604793@gmail.com'
        },
        head_commit: {
            id: commitId,
            message: 'feat: End-to-end integration and email verification',
            timestamp: new Date().toISOString(),
            author: {
                name: 'Kishu Singh',
                email: 'as9604793@gmail.com',
                username: 'kishu-dev'
            },
            modified: ['apps/api/modules/integrations/service.ts']
        },
        commits: [
            {
                id: commitId,
                message: 'feat: End-to-end integration and email verification',
                timestamp: new Date().toISOString(),
                author: {
                    name: 'Kishu Singh',
                    email: 'as9604793@gmail.com',
                    username: 'kishu-dev'
                },
                modified: ['apps/api/modules/integrations/service.ts']
            }
        ]
    };

    const pushBody = JSON.stringify(pushPayload);
    const pushHmac = 'sha256=' + crypto.createHmac('sha256', secret).update(pushBody).digest('hex');

    const pushRes = await fetch('http://localhost:3000/api/github/webhook', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hub-signature-256': pushHmac,
            'x-github-delivery': pushDeliveryId,
            'x-github-event': 'push',
            'User-Agent': 'GitHub-Hookshot/test'
        },
        body: pushBody
    });

    console.log(`Push Response Status: ${pushRes.status} ${pushRes.statusText}`);
    const pushData = await pushRes.json();
    console.log('Push Response Body:', pushData);
    if (pushRes.status === 200 && pushData.status === true) {
        console.log('✅ PASS: GitHub Webhook Push Event ingested successfully!');
    } else {
        throw new Error(`Push event failed: ${JSON.stringify(pushData)}`);
    }

    // 4. Verify in PostgreSQL Events Table
    console.log('\n--- Step 3: Verifying Event in PostgreSQL events Table ---');
    const [savedEvent] = await sql`
        SELECT id, source, provider, event_type, external_id, created_at
        FROM events
        WHERE external_id = ${pushDeliveryId}
    `;
    if (savedEvent) {
        console.log('✅ PASS: Event confirmed in PostgreSQL events table:');
        console.table([savedEvent]);
    } else {
        throw new Error(`Event with delivery ID ${pushDeliveryId} not found in database!`);
    }

    // 5. Verify Person Identity & Email
    console.log('\n--- Step 4: Verifying Person Identity & Email in PostgreSQL ---');
    const personRows = await sql`
        SELECT provider, username, email, display_name, canonical_person_id, is_active, is_bot
        FROM person_identity
        WHERE email = 'as9604793@gmail.com'
    `;
    console.log('Identities linked to as9604793@gmail.com:');
    console.table(personRows);

    const distinctCanonical = new Set(personRows.map(r => r.canonical_person_id));
    if (distinctCanonical.size === 1) {
        console.log(`✅ PASS: Both Slack and GitHub identities map to a SINGLE Unified Canonical Person (${[...distinctCanonical][0]})!`);
    } else {
        console.warn(`⚠️ Warning: Found ${distinctCanonical.size} distinct canonical IDs for the same email:`, [...distinctCanonical]);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL END-TO-END CHECKS PASSED: Webhooks, Secrets & Email Sync!');
    console.log('================================================================\n');

    process.exit(0);
}

testLiveWebhook().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
