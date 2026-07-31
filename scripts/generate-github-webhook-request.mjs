// /**
//  * test-github-webhook.js
//  *
//  * Sends a fake, correctly-signed GitHub "push" webhook event to your local
//  * Cortex server, so you can test the full pipeline:
//  * webhook -> validate signature -> Postgres -> queue -> worker -> Neo4j/Qdrant
//  *
//  * Usage:
//  *   1. npm install node-fetch   (if on Node < 18; Node 18+ has fetch built-in)
//  *   2. Set GITHUB_SECRET and WEBHOOK_URL below (or via env vars)
//  *   3. node test-github-webhook.js
//  *
//  * You can also change EVENT_TYPE and PAYLOAD to test pull_request, issues, etc.
//  */

// import crypto from "crypto";

// // ---------- CONFIG ----------
// const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/github/webhook";
// const GITHUB_SECRET = "cortex_test_secret_2026"; 
// const EVENT_TYPE = process.env.EVENT_TYPE || "issue_comment"; // push | pull_request | issues | issue_comment
// // -----------------------------

// function generateDeliveryId() {
//     return crypto.randomUUID();
// }

// // Sample payloads per event type — edit these to test different scenarios
// const PAYLOADS = {
//     push: {
//         ref: "refs/heads/main",
//         repository: {
//             name: "Cortex",
//             full_name: "Arjun9756/Cortex",
//         },
//         pusher: {
//             name: "Arjun Kumar",
//             email: "arjun@company.com",
//         },
//         head_commit: {
//             id: "0d1a26e67d8f5eaf1f6ba7c57a0d7d7c60a2d5e2",
//             author: { name: "Arjun Kumar", email: "arjun@company.com" },
//             message: "Migrated Redis to Valkey because of licensing issues",
//             timestamp: new Date().toISOString(),
//             modified: ["packages/database/redis.ts", "README.md"],
//         },
//         commits: [
//             {
//                 id: "0d1a26e67d8f5eaf1f6ba7c57a0d7d7c60a2d5e2",
//                 message: "Migrated Redis to Valkey because of licensing issues",
//                 modified: ["packages/database/redis.ts", "README.md"],
//             },
//         ],
//     },

//     pull_request: {
//         action: "opened",
//         repository: {
//             name: "Cortex",
//             full_name: "Arjun9756/Cortex",
//         },
//         sender: { login: "Arjun", email: "arjun@company.com" },
//         pull_request: {
//             title: "Add BullMQ retry strategy for failed jobs",
//             body: "This PR adds exponential backoff retries to the processing queue to handle transient Redis/Neo4j failures.",
//             user: { login: "Arjun", email: "arjun@company.com" },
//             created_at: new Date().toISOString(),
//             merged: false,
//         },
//     },

//     issues: {
//         action: "opened",
//         repository: {
//             name: "Cortex",
//             full_name: "Arjun9756/Cortex",
//         },
//         sender: { login: "Arjun", email: "arjun@company.com" },
//         issue: {
//             title: "Qdrant collection dimension mismatch on restart",
//             body: "If GEMINI embedding model changes output size, ensureCollection() should detect mismatch and warn instead of silently failing on upsert.",
//             user: { login: "Arjun", email: "arjun@company.com" },
//             created_at: new Date().toISOString(),
//         },
//     },

//     issue_comment: {
//         action: "created",
//         repository: {
//             name: "Cortex",
//             full_name: "Arjun9756/Cortex",
//         },
//         sender: { login: "Arjun", email: "arjun@company.com" },
//         issue: {
//             title: "Qdrant collection dimension mismatch on restart",
//         },
//         comment: {
//             user: { login: "Arjun", email: "arjun@company.com" },
//             body: "Fixed by adding a dimension check inside ensureCollection() before createCollection().",
//             created_at: new Date().toISOString(),
//         },
//     },
// };

// function signPayload(secret, bodyString) {
//     const hmac = crypto.createHmac("sha256", secret);
//     const digest = "sha256=" + hmac.update(bodyString).digest("hex");
//     return digest;
// }

// async function sendTestWebhook() {
//     const payload = PAYLOADS[EVENT_TYPE];

//     if (!payload) {
//         console.error(`No sample payload defined for event type "${EVENT_TYPE}"`);
//         console.error(`Available types: ${Object.keys(PAYLOADS).join(", ")}`);
//         process.exit(1);
//     }

//     const bodyString = JSON.stringify(payload);
//     const signature = signPayload(GITHUB_SECRET, bodyString);
//     const deliveryId = generateDeliveryId();

//     console.log("----------------------------------------");
//     console.log("Sending fake GitHub webhook");
//     console.log("URL:        ", WEBHOOK_URL);
//     console.log("Event Type: ", EVENT_TYPE);
//     console.log("Delivery ID:", deliveryId);
//     console.log("Signature:  ", signature);
//     console.log("----------------------------------------");

//     try {
//         const res = await fetch(WEBHOOK_URL, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 "x-hub-signature-256": signature,
//                 "x-github-delivery": deliveryId,
//                 "x-github-event": EVENT_TYPE,
//             },
//             body: bodyString,
//         });

//         const text = await res.text();
//         let parsed;
//         try {
//             parsed = JSON.parse(text);
//         } catch {
//             parsed = text;
//         }

//         console.log("Status:", res.status);
//         console.log("Response:", parsed);

//         if (res.status === 200 || res.status === 201) {
//             console.log("\n✅ Webhook accepted. Now check:");
//             console.log("   1. Postgres 'events' table for the new row");
//             console.log("   2. Your worker logs (should pick up the job from the queue)");
//             console.log("   3. Neo4j Browser for new nodes/relationships");
//             console.log("   4. Qdrant collection for a new point");
//         } else if (res.status === 403) {
//             console.log("\n❌ Signature rejected — check that GITHUB_SECRET here matches env.GITHUB_SECRET on your server.");
//         } else {
//             console.log("\n⚠️ Unexpected status — check server logs for details.");
//         }
//     } catch (error) {
//         console.error("Request failed:", error.message);
//         console.error("Is your server running at", WEBHOOK_URL, "?");
//     }
// }

// sendTestWebhook();

/**
 * test-github-webhook-2.js
 *
 * A SECOND, distinct test dataset — different person, different email,
 * different repo, different technologies, different event content.
 *
 * Purpose: the current graph only has data from ONE person (Arjun Kumar).
 * This script exists to verify that:
 *   1. A second, genuinely different PERSON node gets created (not merged
 *      into Arjun's node by mistake).
 *   2. Their email/name/externalId are captured correctly and distinctly.
 *   3. Bus factor / knowledge risk / findings correctly update to reflect
 *      TWO contributors instead of one (e.g. bus factor for a repo touched
 *      by both people should no longer show "depends entirely on Arjun").
 *   4. Cross-entity queries work — e.g. "who is Priya", "how many commits
 *      did Priya make", "what is Priya's knowledge risk".
 *
 * Usage: same as test-github-webhook.js
 *   EVENT_TYPE=push node test-github-webhook-2.js
 *   EVENT_TYPE=pull_request node test-github-webhook-2.js
 *   EVENT_TYPE=issues node test-github-webhook-2.js
 */

import crypto from "crypto";

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/github/webhook";
const GITHUB_SECRET = "cortex_test_secret_2026";
const EVENT_TYPE = process.env.EVENT_TYPE || "push";

function generateDeliveryId() {
    return crypto.randomUUID();
}

// A distinct persona: different name, different email, different repo,
// different technology stack, different kind of work — deliberately NOT
// overlapping with Arjun's data so any accidental entity-merging is obvious.
const PAYLOADS = {
    push: {
        ref: "refs/heads/main",
        repository: {
            id: 555111222,
            name: "billing-service",
            full_name: "Cortex-Labs/billing-service",
        },
        pusher: {
            name: "Priya Sharma",
            email: "priya.sharma@company.com",
        },
        sender: {
            login: "priyasharma",
            id: 998877665,
            email: "priya.sharma@company.com",
        },
        head_commit: {
            id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0",
            author: { name: "Priya Sharma", email: "priya.sharma@company.com" },
            message: "Switched payment retries to use Stripe idempotency keys to avoid duplicate charges",
            timestamp: new Date().toISOString(),
            modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
        },
        commits: [
            {
                id: "b7e2f91a4c3d8056e1f2a9b8c7d6e5f4a3b2c1d0",
                message: "Switched payment retries to use Stripe idempotency keys to avoid duplicate charges",
                modified: ["services/billing/stripeClient.ts", "services/billing/retryPolicy.ts"],
            },
        ],
    },

    pull_request: {
        action: "opened",
        repository: {
            id: 555111222,
            name: "billing-service",
            full_name: "Cortex-Labs/billing-service",
        },
        sender: { login: "priyasharma", id: 998877665, email: "priya.sharma@company.com" },
        pull_request: {
            title: "Add webhook signature verification for Stripe events",
            body: "Stripe webhooks were previously unverified — this adds HMAC signature checking using the endpoint secret, matching the pattern already used for GitHub/Slack in this codebase.",
            user: { login: "priyasharma", email: "priya.sharma@company.com" },
            created_at: new Date().toISOString(),
            merged: false,
        },
    },

    issues: {
        action: "opened",
        repository: {
            id: 555111222,
            name: "billing-service",
            full_name: "Cortex-Labs/billing-service",
        },
        sender: { login: "priyasharma", id: 998877665, email: "priya.sharma@company.com" },
        issue: {
            title: "Duplicate Stripe charges under high retry load",
            body: "Under concurrent retries, the same payment intent occasionally gets charged twice. Root cause likely missing idempotency key on retry path — see PR discussion.",
            user: { login: "priyasharma", email: "priya.sharma@company.com" },
            created_at: new Date().toISOString(),
        },
    },
};

function signPayload(secret, bodyString) {
    const hmac = crypto.createHmac("sha256", secret);
    return "sha256=" + hmac.update(bodyString).digest("hex");
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
    console.log("Sending SECOND test dataset (distinct person)");
    console.log("URL:        ", WEBHOOK_URL);
    console.log("Event Type: ", EVENT_TYPE);
    console.log("Person:     ", "Priya Sharma (priya.sharma@company.com)");
    console.log("Repo:       ", "billing-service");
    console.log("Delivery ID:", deliveryId);
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
        try { parsed = JSON.parse(text); } catch { parsed = text; }

        console.log("Status:", res.status);
        console.log("Response:", parsed);

        if (res.status === 200 || res.status === 201) {
            console.log("\n✅ Webhook accepted. Now verify specifically:");
            console.log("   1. Neo4j: MATCH (p:PERSON) RETURN p.name, p.email, p.externalId");
            console.log("      -> should show BOTH Arjun Kumar AND Priya Sharma as separate nodes");
            console.log("   2. Neo4j: MATCH (r:REPOSITORY) RETURN r.name");
            console.log("      -> should show BOTH Cortex AND billing-service");
            console.log("   3. Postgres person_metrics: SELECT person_name, external_id, risk_score FROM person_metrics;");
            console.log("      -> should show 2 distinct rows after next analytics run");
            console.log("   4. Dashboard 'Contributors' count should now read 2, not 1");
            console.log("   5. Ask the chat: 'who is Priya Sharma' -> should resolve correctly,");
            console.log("      not accidentally return Arjun's data");
            console.log("   6. Ask the chat: 'what is Priya's email' -> should return priya.sharma@company.com");
        } else if (res.status === 403) {
            console.log("\n❌ Signature rejected — check GITHUB_SECRET matches server env.");
        } else {
            console.log("\n⚠️ Unexpected status — check server logs.");
        }
    } catch (error) {
        console.error("Request failed:", error.message);
        console.error("Is your server running at", WEBHOOK_URL, "?");
    }
}

sendTestWebhook();