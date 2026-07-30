/**
 * test-github-webhook.js
 *
 * Sends a fake, correctly-signed GitHub "push" webhook event to your local
 * Cortex server, so you can test the full pipeline:
 * webhook -> validate signature -> Postgres -> queue -> worker -> Neo4j/Qdrant
 *
 * Usage:
 *   1. npm install node-fetch   (if on Node < 18; Node 18+ has fetch built-in)
 *   2. Set GITHUB_SECRET and WEBHOOK_URL below (or via env vars)
 *   3. node test-github-webhook.js
 *
 * You can also change EVENT_TYPE and PAYLOAD to test pull_request, issues, etc.
 */

import crypto from "crypto";

// ---------- CONFIG ----------
const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/github/webhook";
const GITHUB_SECRET = "cortex_test_secret_2026"; 
const EVENT_TYPE = process.env.EVENT_TYPE || "issue_comment"; // push | pull_request | issues | issue_comment
// -----------------------------

function generateDeliveryId() {
    return crypto.randomUUID();
}

// Sample payloads per event type — edit these to test different scenarios
const PAYLOADS = {
    push: {
        ref: "refs/heads/main",
        repository: {
            name: "Cortex",
            full_name: "Arjun9756/Cortex",
        },
        pusher: {
            name: "Arjun Kumar",
            email: "arjun@company.com",
        },
        head_commit: {
            id: "0d1a26e67d8f5eaf1f6ba7c57a0d7d7c60a2d5e2",
            author: { name: "Arjun Kumar", email: "arjun@company.com" },
            message: "Migrated Redis to Valkey because of licensing issues",
            timestamp: new Date().toISOString(),
            modified: ["packages/database/redis.ts", "README.md"],
        },
        commits: [
            {
                id: "0d1a26e67d8f5eaf1f6ba7c57a0d7d7c60a2d5e2",
                message: "Migrated Redis to Valkey because of licensing issues",
                modified: ["packages/database/redis.ts", "README.md"],
            },
        ],
    },

    pull_request: {
        action: "opened",
        repository: {
            name: "Cortex",
            full_name: "Arjun9756/Cortex",
        },
        sender: { login: "Arjun", email: "arjun@company.com" },
        pull_request: {
            title: "Add BullMQ retry strategy for failed jobs",
            body: "This PR adds exponential backoff retries to the processing queue to handle transient Redis/Neo4j failures.",
            user: { login: "Arjun", email: "arjun@company.com" },
            created_at: new Date().toISOString(),
            merged: false,
        },
    },

    issues: {
        action: "opened",
        repository: {
            name: "Cortex",
            full_name: "Arjun9756/Cortex",
        },
        sender: { login: "Arjun", email: "arjun@company.com" },
        issue: {
            title: "Qdrant collection dimension mismatch on restart",
            body: "If GEMINI embedding model changes output size, ensureCollection() should detect mismatch and warn instead of silently failing on upsert.",
            user: { login: "Arjun", email: "arjun@company.com" },
            created_at: new Date().toISOString(),
        },
    },

    issue_comment: {
        action: "created",
        repository: {
            name: "Cortex",
            full_name: "Arjun9756/Cortex",
        },
        sender: { login: "Arjun", email: "arjun@company.com" },
        issue: {
            title: "Qdrant collection dimension mismatch on restart",
        },
        comment: {
            user: { login: "Arjun", email: "arjun@company.com" },
            body: "Fixed by adding a dimension check inside ensureCollection() before createCollection().",
            created_at: new Date().toISOString(),
        },
    },
};

function signPayload(secret, bodyString) {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(bodyString).digest("hex");
    return digest;
}

async function sendTestWebhook() {
    const payload = PAYLOADS[EVENT_TYPE];

    if (!payload) {
        console.error(`No sample payload defined for event type "${EVENT_TYPE}"`);
        console.error(`Available types: ${Object.keys(PAYLOADS).join(", ")}`);
        process.exit(1);
    }

    const bodyString = JSON.stringify(payload);
    const signature = signPayload(GITHUB_SECRET, bodyString);
    const deliveryId = generateDeliveryId();

    console.log("----------------------------------------");
    console.log("Sending fake GitHub webhook");
    console.log("URL:        ", WEBHOOK_URL);
    console.log("Event Type: ", EVENT_TYPE);
    console.log("Delivery ID:", deliveryId);
    console.log("Signature:  ", signature);
    console.log("----------------------------------------");

    try {
        const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-hub-signature-256": signature,
                "x-github-delivery": deliveryId,
                "x-github-event": EVENT_TYPE,
            },
            body: bodyString,
        });

        const text = await res.text();
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = text;
        }

        console.log("Status:", res.status);
        console.log("Response:", parsed);

        if (res.status === 200 || res.status === 201) {
            console.log("\n✅ Webhook accepted. Now check:");
            console.log("   1. Postgres 'events' table for the new row");
            console.log("   2. Your worker logs (should pick up the job from the queue)");
            console.log("   3. Neo4j Browser for new nodes/relationships");
            console.log("   4. Qdrant collection for a new point");
        } else if (res.status === 403) {
            console.log("\n❌ Signature rejected — check that GITHUB_SECRET here matches env.GITHUB_SECRET on your server.");
        } else {
            console.log("\n⚠️ Unexpected status — check server logs for details.");
        }
    } catch (error) {
        console.error("Request failed:", error.message);
        console.error("Is your server running at", WEBHOOK_URL, "?");
    }
}

sendTestWebhook();