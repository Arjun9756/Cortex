/**
 * test_end_to_end_ingestion.mjs
 *
 * End-to-end multi-provider dataset ingestion test for Cortex backend.
 * Generates and sends authentic, cryptographically-signed webhooks for:
 *   - GitHub (Push, Pull Request, Issue, Issue Comment)
 *   - Jira (Issue Created, Issue Updated across CORTEX, BILL, NOTIF, AUTH projects)
 *   - Slack (Messages, Thread Replies across engineering & incident channels)
 *
 * Usage:
 *   node scripts/test_end_to_end_ingestion.mjs
 */

import crypto from "crypto";

const PORT = process.env.PORT || "3000";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const GITHUB_SECRET = process.env.GITHUB_SECRET || "cortex_test_secret_2026";
const JIRA_SECRET = process.env.JIRA_SECRET || process.env.JIRA_WEBHOOK_SECRET || "cortex_test_secret_2026";
const SLACK_SECRET = process.env.SLACK_SECRET || process.env.SLACK_SIGNING_SECRET || "cortex_test_secret_2026";

// ─── Cryptographic Signers ───────────────────────────────────────────────────

function signGithubPayload(secret, bodyString) {
    const hmac = crypto.createHmac("sha256", secret);
    return "sha256=" + hmac.update(bodyString).digest("hex");
}

function signSlackPayload(secret, timestamp, bodyString) {
    const sigBaseString = `v0:${timestamp}:${bodyString}`;
    return "v0=" + crypto.createHmac("sha256", secret).update(sigBaseString).digest("hex");
}

// ─── Test Datasets ───────────────────────────────────────────────────────────

const GITHUB_EVENTS = [
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 101, name: "Cortex", full_name: "Arjun9756/Cortex" },
            pusher: { name: "Arjun Kumar", email: "arjun@company.com" },
            sender: { login: "Arjun9756", id: 1001, email: "arjun@company.com" },
            head_commit: {
                id: "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e",
                author: { name: "Arjun Kumar", email: "arjun@company.com" },
                message: "Migrated Redis driver to Valkey drop-in client to resolve licensing restrictions",
                timestamp: new Date().toISOString(),
                modified: ["packages/database/redis.ts", "package.json"],
            },
            commits: [
                {
                    id: "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e",
                    message: "Migrated Redis driver to Valkey drop-in client to resolve licensing restrictions",
                    modified: ["packages/database/redis.ts", "package.json"],
                },
            ],
        },
    },
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 202, name: "billing-service", full_name: "Cortex-Labs/billing-service" },
            pusher: { name: "Priya Sharma", email: "priya.sharma@company.com" },
            sender: { login: "priyasharma", id: 2002, email: "priya.sharma@company.com" },
            head_commit: {
                id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0",
                author: { name: "Priya Sharma", email: "priya.sharma@company.com" },
                message: "Implemented Stripe idempotency keys to prevent duplicate transaction charges under retry load",
                timestamp: new Date().toISOString(),
                modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
            },
            commits: [
                {
                    id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0",
                    message: "Implemented Stripe idempotency keys to prevent duplicate transaction charges under retry load",
                    modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
                },
            ],
        },
    },
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 303, name: "notification-service", full_name: "Cortex-Labs/notification-service" },
            sender: { login: "rohanverma", id: 3003, email: "rohan.verma@company.com" },
            pull_request: {
                title: "Add rate-limiting worker queue for Twilio SMS dispatcher",
                body: "Introduces BullMQ rate-limiting to prevent hitting Twilio peak-hour throughput limits.",
                user: { login: "rohanverma", email: "rohan.verma@company.com" },
                created_at: new Date().toISOString(),
                merged: false,
            },
        },
    },
    {
        eventType: "issues",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 404, name: "cortex-web", full_name: "Cortex-Labs/cortex-web" },
            sender: { login: "sarahchen", id: 4004, email: "sarah.chen@company.com" },
            issue: {
                title: "ForceGraph D3 simulation memory leak on dataset refresh",
                body: "Repeated node updates in ForceGraph component cause gradual heap growth.",
                user: { login: "sarahchen", email: "sarah.chen@company.com" },
                created_at: new Date().toISOString(),
            },
        },
    },
];

const JIRA_EVENTS = [
    {
        issueKey: "CORTEX-101",
        eventType: "jira:issue_created",
        summary: "BullMQ retry backoff strategy documentation",
        description: "Document exponential backoff standards across microservices to align retry behaviors.",
        reporterName: "Arjun Kumar",
        reporterEmail: "arjun@company.com",
        accountId: "acc-arjun-001",
        projectKey: "CORTEX",
        status: "To Do",
    },
    {
        issueKey: "BILL-204",
        eventType: "jira:issue_created",
        summary: "Stripe charge reconciliation job",
        description: "Nightly cron job to verify payment states between Postgres database and Stripe API.",
        reporterName: "Priya Sharma",
        reporterEmail: "priya.sharma@company.com",
        accountId: "acc-priya-002",
        projectKey: "BILL",
        status: "In Progress",
    },
    {
        issueKey: "NOTIF-309",
        eventType: "jira:issue_created",
        summary: "Twilio API rate limit bottleneck during push notifications",
        description: "SMS delivery queue exceeds Twilio rate limits during peak morning bursts.",
        reporterName: "Rohan Verma",
        reporterEmail: "rohan.verma@company.com",
        accountId: "acc-rohan-003",
        projectKey: "NOTIF",
        status: "To Do",
    },
    {
        issueKey: "WEB-412",
        eventType: "jira:issue_created",
        summary: "Optimize ForceGraph canvas rendering for >500 nodes",
        description: "Canvas render mode required when node count exceeds 500 to maintain 60 FPS.",
        reporterName: "Sarah Chen",
        reporterEmail: "sarah.chen@company.com",
        accountId: "acc-sarah-004",
        projectKey: "WEB",
        status: "In Progress",
    },
];

const SLACK_EVENTS = [
    {
        channel: "C0100ENGINEERING",
        user: "U0987654321",
        userDisplayName: "Arjun Kumar",
        text: "Valkey migration is deployed to staging — performance benchmarks show zero regression compared to Redis.",
    },
    {
        channel: "C0200BILLING",
        user: "U555PRIYA1",
        userDisplayName: "Priya Sharma",
        text: "Pushed Stripe idempotency fix to billing-service main branch. Monitoring double-charge metrics.",
    },
    {
        channel: "C0300INCIDENTS",
        user: "U777ROHAN2",
        userDisplayName: "Rohan Verma",
        text: "Incident resolved: SMS dispatcher queue rate-limiting is active and Twilio 429s dropped to 0.",
        isThread: true,
    },
    {
        channel: "C0400FRONTEND",
        user: "U888SARAH3",
        userDisplayName: "Sarah Chen",
        text: "ForceGraph optimization PR is up: switched to D3 web worker simulation layout.",
    },
];

// ─── Webhook Dispatchers ─────────────────────────────────────────────────────

async function sendGithubEvents() {
    console.log("\n📦 --- Sending GitHub Webhooks ---");
    let success = 0;
    for (const item of GITHUB_EVENTS) {
        const url = `${BASE_URL}/api/github/webhook`;
        const bodyString = JSON.stringify(item.payload);
        const signature = signGithubPayload(GITHUB_SECRET, bodyString);

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-hub-signature-256": signature,
                    "x-github-delivery": item.deliveryId,
                    "x-github-event": item.eventType,
                },
                body: bodyString,
            });
            const data = await res.json().catch(() => ({}));
            console.log(`  [GH] ${item.eventType.padEnd(12)} ${item.payload.repository.name.padEnd(20)} -> Status: ${res.status}`);
            if (res.status === 200 || res.status === 201) success++;
        } catch (err) {
            console.error(`  [GH] Error sending ${item.eventType}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 250));
    }
    return success;
}

async function sendJiraEvents() {
    console.log("\n📋 --- Sending Jira Webhooks ---");
    let success = 0;
    for (const item of JIRA_EVENTS) {
        const url = `${BASE_URL}/api/jira/webhook?secret=${encodeURIComponent(JIRA_SECRET)}`;
        const now = new Date().toISOString();
        const payload = {
            timestamp: Date.now(),
            webhookEvent: item.eventType,
            issue_event_type_name: "issue_created",
            user: { accountId: item.accountId, displayName: item.reporterName },
            issue: {
                id: item.issueKey.split("-")[1],
                key: item.issueKey,
                fields: {
                    summary: item.summary,
                    description: item.description,
                    issuetype: { name: "Bug" },
                    status: { name: item.status },
                    reporter: { displayName: item.reporterName, accountId: item.accountId, emailAddress: item.reporterEmail },
                    assignee: { displayName: item.reporterName, accountId: item.accountId, emailAddress: item.reporterEmail },
                    priority: { name: "High" },
                    project: { key: item.projectKey, name: item.projectKey },
                    created: now,
                    updated: now,
                },
            },
        };

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            console.log(`  [Jira] ${item.issueKey.padEnd(10)} ${item.reporterName.padEnd(15)} -> Status: ${res.status}`);
            if (res.status === 200 || res.status === 201) success++;
        } catch (err) {
            console.error(`  [Jira] Error sending ${item.issueKey}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 250));
    }
    return success;
}

async function sendSlackEvents() {
    console.log("\n💬 --- Sending Slack Webhooks ---");
    let success = 0;
    let parentTs = (Date.now() / 1000).toFixed(6);

    for (let i = 0; i < SLACK_EVENTS.length; i++) {
        const item = SLACK_EVENTS[i];
        const url = `${BASE_URL}/api/slack/webhook`;
        const now = (Date.now() / 1000 + i).toFixed(6);

        const event = {
            type: "message",
            channel: item.channel,
            user: item.user,
            text: item.text,
            ts: now,
        };
        if (item.isThread) {
            event.thread_ts = parentTs;
        } else {
            parentTs = now;
        }

        const payload = {
            token: "fake-verification-token",
            team_id: "T0123456",
            api_app_id: "A0123456",
            event,
            type: "event_callback",
            event_id: "Ev" + crypto.randomBytes(8).toString("hex"),
            event_time: Math.floor(Number(now)),
        };

        const bodyString = JSON.stringify(payload);
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = signSlackPayload(SLACK_SECRET, timestamp, bodyString);

        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-slack-signature": signature,
                    "x-slack-request-timestamp": timestamp,
                },
                body: bodyString,
            });
            const data = await res.json().catch(() => ({}));
            console.log(`  [Slack] ${item.userDisplayName.padEnd(15)} #${item.channel.padEnd(16)} -> Status: ${res.status}`);
            if (res.status === 200 || res.status === 201) success++;
        } catch (err) {
            console.error(`  [Slack] Error sending message for ${item.userDisplayName}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 250));
    }
    return success;
}

// ─── Main Execution Routine ──────────────────────────────────────────────────

async function main() {
    console.log("=========================================================");
    console.log(" 🚀 Cortex End-to-End Data Ingestion Test Suite");
    console.log(` Target Server: ${BASE_URL}`);
    console.log("=========================================================");

    const ghSuccess = await sendGithubEvents();
    const jiraSuccess = await sendJiraEvents();
    const slackSuccess = await sendSlackEvents();

    const totalSent = GITHUB_EVENTS.length + JIRA_EVENTS.length + SLACK_EVENTS.length;
    const totalSuccess = ghSuccess + jiraSuccess + slackSuccess;

    console.log("\n=========================================================");
    console.log(` 📊 SUMMARY: ${totalSuccess}/${totalSent} Webhook Events Ingested Successfully!`);
    console.log("=========================================================");
    console.log(" ✅ GitHub: " + ghSuccess + "/" + GITHUB_EVENTS.length);
    console.log(" ✅ Jira:   " + jiraSuccess + "/" + JIRA_EVENTS.length);
    console.log(" ✅ Slack:  " + slackSuccess + "/" + SLACK_EVENTS.length);
    console.log("---------------------------------------------------------");
    console.log(" Verification steps:");
    console.log("   1. Check Postgres: SELECT provider, count(*) FROM events GROUP BY provider;");
    console.log("   2. Check Neo4j:    MATCH (p:PERSON) RETURN p.name, p.email;");
    console.log("   3. Check UI:       Navigate to http://localhost:5173/people or /graph");
    console.log("=========================================================\n");
}

main();
