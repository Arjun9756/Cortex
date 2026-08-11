/**
 * test_end_to_end_ingestion.mjs
 *
 * End-to-end multi-provider interconnected dataset ingestion test for Cortex backend.
 * Contains explicit "WHY" context, commit hashes, Jira ticket links, and Slack discussions.
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

// ─── Hyper-Detailed Interconnected Dataset ────────────────────────────────────

const GITHUB_EVENTS = [
    // 1. Arjun Kumar - Redis to Valkey License Migration
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 101, name: "Cortex", full_name: "Arjun9756/Cortex" },
            pusher: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
            sender: { login: "Arjun9756", id: 1001, email: "arjun.kumar@company.com" },
            head_commit: {
                id: "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e",
                author: { name: "Arjun Kumar", email: "arjun.kumar@company.com" },
                message: "GRAPH-108: Migrated Redis driver to Valkey drop-in client (commit a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e) due to Redis Inc SSPL dual-licensing changes. Optimized multi-hop Cypher graph traversal for shortest path analysis.",
                timestamp: new Date().toISOString(),
                modified: ["packages/database/redis.ts", "packages/graph/graph.service.ts", "package.json"],
            },
            commits: [
                {
                    id: "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e",
                    message: "GRAPH-108: Migrated Redis driver to Valkey drop-in client (commit a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e) due to Redis Inc SSPL dual-licensing changes. Optimized multi-hop Cypher graph traversal for shortest path analysis.",
                    modified: ["packages/database/redis.ts", "packages/graph/graph.service.ts", "package.json"],
                },
            ],
        },
    },
    // 2. Priya Sharma - Billing Service Stripe Idempotency
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 202, name: "billing-engine", full_name: "Cortex-Labs/billing-engine" },
            pusher: { name: "Priya Sharma", email: "priya.sharma@company.com" },
            sender: { login: "priyasharma", id: 2002, email: "priya.sharma@company.com" },
            head_commit: {
                id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0",
                author: { name: "Priya Sharma", email: "priya.sharma@company.com" },
                message: "BILL-204: Implemented Stripe idempotency key locks in Valkey (commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0) to prevent duplicate transaction charges under retry load.",
                timestamp: new Date().toISOString(),
                modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
            },
            commits: [
                {
                    id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0",
                    message: "BILL-204: Implemented Stripe idempotency key locks in Valkey (commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0) to prevent duplicate transaction charges under retry load.",
                    modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
                },
            ],
        },
    },
    // 3. Vikram Patel - Auth Service Security Fix & CVE-2026-1082 Commit
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 505, name: "auth-service", full_name: "Cortex-Labs/auth-service" },
            pusher: { name: "Vikram Patel", email: "vikram.patel@company.com" },
            sender: { login: "vikrampatel", id: 5005, email: "vikram.patel@company.com" },
            head_commit: {
                id: "c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d9",
                author: { name: "Vikram Patel", email: "vikram.patel@company.com" },
                message: "AUTH-501: Remediated CVE-2026-1082 vulnerability in auth-service via commit c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d9. Enforced OAuth2 PKCE flow and rotated JWT signing keys to RS256 algorithm.",
                timestamp: new Date().toISOString(),
                modified: ["services/auth/jwt.ts", "services/auth/pkce.ts", "config/keys.json"],
            },
            commits: [
                {
                    id: "c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d9",
                    message: "AUTH-501: Remediated CVE-2026-1082 vulnerability in auth-service via commit c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d9. Enforced OAuth2 PKCE flow and rotated JWT signing keys to RS256 algorithm.",
                    modified: ["services/auth/jwt.ts", "services/auth/pkce.ts", "config/keys.json"],
                },
            ],
        },
    },
    // 4. Neha Gupta - Vector Engine & Qdrant Hybrid Indexing
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 606, name: "search-vector", full_name: "Cortex-Labs/search-vector" },
            pusher: { name: "Neha Gupta", email: "neha.gupta@company.com" },
            sender: { login: "nehagupta", id: 6006, email: "neha.gupta@company.com" },
            head_commit: {
                id: "d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0",
                author: { name: "Neha Gupta", email: "neha.gupta@company.com" },
                message: "VEC-302: Upgraded Qdrant client to v1.9 and enabled hybrid sparse-dense vector search indexing in search-vector (commit d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0).",
                timestamp: new Date().toISOString(),
                modified: ["packages/vector/qdrantClient.ts", "packages/vector/hybridSearch.ts"],
            },
            commits: [
                {
                    id: "d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0",
                    message: "VEC-302: Upgraded Qdrant client to v1.9 and enabled hybrid sparse-dense vector search indexing in search-vector (commit d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0).",
                    modified: ["packages/vector/qdrantClient.ts", "packages/vector/hybridSearch.ts"],
                },
            ],
        },
    },
    // 5. Amit Shah - Infrastructure K8s & PostgreSQL Pooler Migration
    {
        eventType: "push",
        deliveryId: crypto.randomUUID(),
        payload: {
            ref: "refs/heads/main",
            repository: { id: 707, name: "infra-k8s", full_name: "Cortex-Labs/infra-k8s" },
            pusher: { name: "Amit Shah", email: "amit.shah@company.com" },
            sender: { login: "amitshah", id: 7007, email: "amit.shah@company.com" },
            head_commit: {
                id: "e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1",
                author: { name: "Amit Shah", email: "amit.shah@company.com" },
                message: "INFRA-703: Replaced PgBouncer with Supavisor connection pooler on Kubernetes cluster (commit e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1) to fix PostgreSQL connection exhaustion under peak traffic spikes.",
                timestamp: new Date().toISOString(),
                modified: ["helm/values.yaml", "scripts/db-pool.sh", "k8s/supavisor-deployment.yaml"],
            },
            commits: [
                {
                    id: "e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1",
                    message: "INFRA-703: Replaced PgBouncer with Supavisor connection pooler on Kubernetes cluster (commit e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1) to fix PostgreSQL connection exhaustion under peak traffic spikes.",
                    modified: ["helm/values.yaml", "scripts/db-pool.sh", "k8s/supavisor-deployment.yaml"],
                },
            ],
        },
    },
    // 6. Rohan Verma - Notification Hub Pull Request
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 303, name: "notification-hub", full_name: "Cortex-Labs/notification-hub" },
            sender: { login: "rohanverma", id: 3003, email: "rohan.verma@company.com" },
            pull_request: {
                title: "NOTIF-405: Add BullMQ exponential backoff worker queue for Twilio SMS dispatcher",
                body: "Introduces BullMQ rate-limiting worker queue to prevent hitting Twilio peak-hour SMS throughput limits and resolve 429 error incident INC-902.",
                user: { login: "rohanverma", email: "rohan.verma@company.com" },
                created_at: new Date().toISOString(),
                merged: true,
            },
        },
    },
    // 7. Sarah Chen - Web Dashboard Pull Request
    {
        eventType: "pull_request",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 404, name: "web-dashboard", full_name: "Cortex-Labs/web-dashboard" },
            sender: { login: "sarahchen", id: 4004, email: "sarah.chen@company.com" },
            pull_request: {
                title: "WEB-601: Optimize ForceGraph D3 canvas simulation layout with Web Workers",
                body: "Transfers force simulation calculations to Web Worker threads for 60 FPS rendering at >1000 nodes and fixes canvas memory leak on dataset refresh.",
                user: { login: "sarahchen", email: "sarah.chen@company.com" },
                created_at: new Date().toISOString(),
                merged: true,
            },
        },
    },
    // 8. Vikram Patel - Security Issue in Auth Service
    {
        eventType: "issues",
        deliveryId: crypto.randomUUID(),
        payload: {
            action: "opened",
            repository: { id: 505, name: "auth-service", full_name: "Cortex-Labs/auth-service" },
            sender: { login: "vikrampatel", id: 5005, email: "vikram.patel@company.com" },
            issue: {
                title: "AUTH-502: Audit OAuth2 PKCE callback token leak on staging environment",
                body: "Investigate query string code parameter logging in Nginx access logs for auth-service.",
                user: { login: "vikrampatel", email: "vikram.patel@company.com" },
                created_at: new Date().toISOString(),
            },
        },
    },
];

const JIRA_EVENTS = [
    {
        issueKey: "GRAPH-108",
        eventType: "jira:issue_created",
        summary: "Optimize Neo4j APOC multi-hop Cypher queries and Valkey cache for shortest path analysis",
        description: "Migrated Redis driver to Valkey client due to Redis Inc SSPL licensing changes. Refactored Cypher queries in graph.service.ts to calculate multi-hop impact trees under 50ms.",
        reporterName: "Arjun Kumar",
        reporterEmail: "arjun.kumar@company.com",
        accountId: "acc-arjun-001",
        projectKey: "GRAPH",
        status: "In Progress",
    },
    {
        issueKey: "BILL-204",
        eventType: "jira:issue_created",
        summary: "Stripe webhook idempotency key lock in billing-engine to prevent double billing",
        description: "Priya Sharma implemented Stripe idempotency key lock via commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0 in billing-engine to resolve duplicate transaction charges.",
        reporterName: "Priya Sharma",
        reporterEmail: "priya.sharma@company.com",
        accountId: "acc-priya-002",
        projectKey: "BILL",
        status: "Done",
    },
    {
        issueKey: "AUTH-501",
        eventType: "jira:issue_created",
        summary: "Remediate CVE-2026-1082 JWT signature validation vulnerability in auth-service",
        description: "Resolved CVE-2026-1082 by Vikram Patel via commit c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d9. Enforced RS256 algorithm verification and rotated signing keys across authentication nodes.",
        reporterName: "Vikram Patel",
        reporterEmail: "vikram.patel@company.com",
        accountId: "acc-vikram-003",
        projectKey: "AUTH",
        status: "Done",
    },
    {
        issueKey: "VEC-302",
        eventType: "jira:issue_created",
        summary: "Qdrant hybrid sparse-dense vector indexing for code snippet search in search-vector",
        description: "Neha Gupta upgraded Qdrant client to v1.9 and enabled BM25 sparse vectors alongside dense embeddings to improve code search latency to 24ms.",
        reporterName: "Neha Gupta",
        reporterEmail: "neha.gupta@company.com",
        accountId: "acc-neha-004",
        projectKey: "VEC",
        status: "In Progress",
    },
    {
        issueKey: "NOTIF-405",
        eventType: "jira:issue_created",
        summary: "Twilio API 429 rate limit bottleneck during push notifications in notification-hub",
        description: "Rohan Verma added BullMQ rate-limiting worker queue to eliminate Twilio 429 errors during peak morning push notification bursts.",
        reporterName: "Rohan Verma",
        reporterEmail: "rohan.verma@company.com",
        accountId: "acc-rohan-005",
        projectKey: "NOTIF",
        status: "Done",
    },
    {
        issueKey: "WEB-601",
        eventType: "jira:issue_created",
        summary: "ForceGraph canvas rendering optimization and memory leak fix in web-dashboard",
        description: "Sarah Chen transferred D3 force simulation layout to Web Worker threads to maintain 60 FPS rendering for >1000 nodes and fixed canvas memory leak on refresh.",
        reporterName: "Sarah Chen",
        reporterEmail: "sarah.chen@company.com",
        accountId: "acc-sarah-006",
        projectKey: "WEB",
        status: "Done",
    },
    {
        issueKey: "INFRA-703",
        eventType: "jira:issue_created",
        summary: "PostgreSQL pooler migration from PgBouncer to Supavisor in infra-k8s",
        description: "Amit Shah replaced PgBouncer with Supavisor connection pooler via commit e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1, dropping active DB connections from 450 to 35.",
        reporterName: "Amit Shah",
        reporterEmail: "amit.shah@company.com",
        accountId: "acc-amit-007",
        projectKey: "INFRA",
        status: "Done",
    },
];

const SLACK_EVENTS = [
    {
        channel: "C0100ENGINEERING",
        user: "U0987654321",
        userDisplayName: "Arjun Kumar",
        text: "GRAPH-108 update: Redis driver was migrated to Valkey drop-in client because of Redis Inc's SSPL license change. Multi-hop Cypher queries on Neo4j are now 4x faster.",
    },
    {
        channel: "C0200BILLING",
        user: "U555PRIYA1",
        userDisplayName: "Priya Sharma",
        text: "Pushed fix for BILL-204 via commit b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0 to billing-engine main branch. Double-charge metrics are back to zero.",
    },
    {
        channel: "C0500SECURITY",
        user: "U999VIKRAM4",
        userDisplayName: "Vikram Patel",
        text: "AUTH-501 patch applied via commit c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d9 to fix CVE-2026-1082: JWT RS256 key rotation is complete in auth-service. Legacy HS256 tokens expire at midnight.",
    },
    {
        channel: "C0600DATAPLATFORM",
        user: "U111NEHA5",
        userDisplayName: "Neha Gupta",
        text: "VEC-302 update: Hybrid vector search benchmarks on Qdrant reduced embedding query latency from 180ms to 24ms in search-vector!",
    },
    {
        channel: "C0300INCIDENTS",
        user: "U777ROHAN2",
        userDisplayName: "Rohan Verma",
        text: "Resolved incident INC-902 for NOTIF-405: SMS dispatcher queue rate-limiting active in notification-hub. Twilio 429 errors dropped to 0.",
        isThread: true,
    },
    {
        channel: "C0400FRONTEND",
        user: "U888SARAH3",
        userDisplayName: "Sarah Chen",
        text: "ForceGraph D3 web worker PR #601 is merged in web-dashboard. Canvas memory leak is resolved and 60 FPS rendering at >1000 nodes is verified.",
    },
    {
        channel: "C0700DEVOPS",
        user: "U222AMIT6",
        userDisplayName: "Amit Shah",
        text: "INFRA-703 update: Supavisor pooler deployed via commit e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1 on K8s cluster. Database active connections dropped from 450 to 35.",
    },
    {
        channel: "C0300INCIDENTS",
        user: "U999VIKRAM4",
        userDisplayName: "Vikram Patel",
        text: "Keycloak SSO login timeout issue resolved in auth-service: missing firewall egress rule added in infra-k8s by Amit Shah.",
        isThread: true,
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
            console.log(`  [GH] ${item.eventType.padEnd(14)} ${item.payload.repository.name.padEnd(22)} -> Status: ${res.status}`);
            if (res.status === 200 || res.status === 201) success++;
        } catch (err) {
            console.error(`  [GH] Error sending ${item.eventType}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 200));
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
            console.log(`  [Jira] ${item.issueKey.padEnd(10)} ${item.reporterName.padEnd(18)} -> Status: ${res.status}`);
            if (res.status === 200 || res.status === 201) success++;
        } catch (err) {
            console.error(`  [Jira] Error sending ${item.issueKey}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 200));
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
            console.log(`  [Slack] ${item.userDisplayName.padEnd(18)} #${item.channel.padEnd(18)} -> Status: ${res.status}`);
            if (res.status === 200 || res.status === 201) success++;
        } catch (err) {
            console.error(`  [Slack] Error sending message for ${item.userDisplayName}:`, err.message);
        }
        await new Promise((r) => setTimeout(r, 200));
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
