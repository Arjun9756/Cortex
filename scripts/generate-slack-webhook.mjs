// /**
//  * test-slack-webhook.js
//  *
//  * Sends a fake, correctly-signed Slack "message" event to your local
//  * Cortex server, to test: webhook -> validate signature -> Postgres ->
//  * queue -> worker -> Neo4j/Qdrant.
//  *
//  * Usage:
//  *   1. Set SLACK_SIGNING_SECRET and WEBHOOK_URL below (or via env vars)
//  *   2. node test-slack-webhook.js
//  *   3. For a thread reply test: EVENT_TYPE=thread_reply node test-slack-webhook.js
//  */

// import crypto from "crypto";

// // ---------- CONFIG ----------
// const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/slack/webhook";
// const SLACK_SIGNING_SECRET = "cortex_test_secret_2026";
// const EVENT_TYPE = process.env.EVENT_TYPE || "thread_reply"; // message | thread_reply
// // -----------------------------

// function buildSlackEventPayload() {
//     const now = (Date.now() / 1000).toFixed(6);

//     const baseEvent = {
//         type: "message",
//         channel: "C0123456789",
//         user: "U0987654321",
//         text: "Migrated Redis to Valkey because of licensing issues",
//         ts: now,
//     };

//     if (EVENT_TYPE === "thread_reply") {
//         baseEvent.text = "Yeah, the Redis license change forced our hand — Valkey is a drop-in replacement";
//         baseEvent.thread_ts = (Number(now) - 120).toFixed(6); // parent message 2 min earlier
//     }

//     return {
//         token: "fake-verification-token",
//         team_id: "T0123456",
//         api_app_id: "A0123456",
//         event: baseEvent,
//         type: "event_callback",
//         event_id: "Ev" + crypto.randomBytes(8).toString("hex"),
//         event_time: Math.floor(Number(now)),
//     };
// }

// function signSlackRequest(secret, timestamp, bodyString) {
//     const sigBaseString = `v0:${timestamp}:${bodyString}`;
//     const digest = "v0=" + crypto
//         .createHmac("sha256", secret)
//         .update(sigBaseString)
//         .digest("hex");
//     return digest;
// }

// async function sendTestSlackWebhook() {
//     const payload = buildSlackEventPayload();
//     const bodyString = JSON.stringify(payload);
//     const timestamp = Math.floor(Date.now() / 1000).toString();
//     const signature = signSlackRequest(SLACK_SIGNING_SECRET, timestamp, bodyString);

//     console.log("----------------------------------------");
//     console.log("Sending fake Slack webhook");
//     console.log("URL:        ", WEBHOOK_URL);
//     console.log("Event Type: ", EVENT_TYPE);
//     console.log("Timestamp:  ", timestamp);
//     console.log("Signature:  ", signature);
//     console.log("----------------------------------------");

//     try {
//         const res = await fetch(WEBHOOK_URL, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 "x-slack-signature": signature,
//                 "x-slack-request-timestamp": timestamp,
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
//             console.log("   1. Postgres 'events' table for the new row (provider='slack')");
//             console.log("   2. Your worker logs");
//             console.log("   3. Neo4j Browser for new nodes/relationships");
//             console.log("   4. Qdrant collection for a new point");
//         } else if (res.status === 403) {
//             console.log("\n❌ Signature rejected — check SLACK_SIGNING_SECRET matches your server's env.SLACK_SIGNING_SECRET.");
//         } else {
//             console.log("\n⚠️ Unexpected status — check server logs.");
//         }
//     } catch (error) {
//         console.error("Request failed:", error.message);
//         console.error("Is your server running at", WEBHOOK_URL, "?");
//     }
// }

// // Also test the Slack URL verification handshake separately:
// async function testUrlVerification() {
//     const challenge = crypto.randomBytes(16).toString("hex");
//     const payload = { type: "url_verification", challenge };
//     const bodyString = JSON.stringify(payload);
//     const timestamp = Math.floor(Date.now() / 1000).toString();
//     const signature = signSlackRequest(SLACK_SIGNING_SECRET, timestamp, bodyString);

//     console.log("\n--- Testing Slack URL verification handshake ---");
//     try {
//         const res = await fetch(WEBHOOK_URL, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 "x-slack-signature": signature,
//                 "x-slack-request-timestamp": timestamp,
//             },
//             body: bodyString,
//         });
//         const json = await res.json();
//         const ok = json.challenge === challenge;
//         console.log(ok ? "✅ Challenge echoed correctly" : "❌ Challenge mismatch:", json);
//     } catch (error) {
//         console.error("URL verification test failed:", error.message);
//     }
// }

// (async () => {
//     await testUrlVerification();
//     await sendTestSlackWebhook();
// })();

/**
 * test-slack-webhook-batch.js
 *
 * Sends MULTIPLE distinct Slack messages in a single run (looped), each from
 * a different person, to test batch ingestion and multi-person handling in
 * one go instead of running the script manually per event.
 *
 * Usage:
 *   node test-slack-webhook-batch.js
 *   (Set SLACK_SIGNING_SECRET / WEBHOOK_URL via env vars if different from defaults)
 */

import crypto from "crypto";

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/slack/webhook";
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || "cortex_test_secret_2026";

// Each entry is a distinct message from a distinct person — batch inserted in one run.
const MESSAGES = [
    {
        channel: "C0111AAAA",
        user: "U555PRIYA1",
        userDisplayName: "Priya Sharma", // used only for the mock Slack profile lookup below
        text: "Just merged the Stripe idempotency key fix — duplicate charges should be gone now on billing-service.",
    },
    {
        channel: "C0111AAAA",
        user: "U555PRIYA1",
        userDisplayName: "Priya Sharma",
        text: "Follow up: we should also add a reconciliation job to catch any charges that slipped through before the fix.",
        threadParent: true, // will be sent as a reply in the same thread
    },
    {
        channel: "C0222BBBB",
        user: "U777ROHAN2",
        userDisplayName: "Rohan Verma",
        text: "Heads up — the notification-service is throwing rate-limit errors from Twilio during peak hours, investigating now.",
    },
    {
        channel: "C0222BBBB",
        user: "U777ROHAN2",
        userDisplayName: "Rohan Verma",
        text: "Root cause found: we weren't batching SMS sends. Adding a queue with rate-limiting via BullMQ, same pattern as the billing retries.",
    },
    {
        channel: "C0111AAAA",
        user: "U0987654321", // same Slack ID used in earlier single-message tests (Arjun, if that's who it was)
        userDisplayName: "Arjun Kumar",
        text: "For visibility — Cortex's BullMQ retry PR is ready for review, same backoff pattern others are now reusing.",
    },
];

function signSlackRequest(secret, timestamp, bodyString) {
    const sigBaseString = `v0:${timestamp}:${bodyString}`;
    return "v0=" + crypto.createHmac("sha256", secret).update(sigBaseString).digest("hex");
}

function buildEventPayload(msg, tsOverride, threadTsOverride) {
    const now = tsOverride || (Date.now() / 1000).toFixed(6);
    const event = {
        type: "message",
        channel: msg.channel,
        user: msg.user,
        text: msg.text,
        ts: now,
    };
    if (threadTsOverride) {
        event.thread_ts = threadTsOverride;
    }
    return {
        token: "fake-verification-token",
        team_id: "T0123456",
        api_app_id: "A0123456",
        event,
        type: "event_callback",
        event_id: "Ev" + crypto.randomBytes(8).toString("hex"),
        event_time: Math.floor(Number(now)),
    };
}

async function sendOne(payload, index, total) {
    const bodyString = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signSlackRequest(SLACK_SIGNING_SECRET, timestamp, bodyString);

    console.log(`\n[${index + 1}/${total}] Sending: "${payload.event.text.slice(0, 60)}..."`);
    console.log(`         user=${payload.event.user} channel=${payload.event.channel}`);

    try {
        const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-slack-signature": signature,
                "x-slack-request-timestamp": timestamp,
            },
            body: bodyString,
        });
        const text = await res.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = text; }
        console.log(`         Status: ${res.status}`, res.status >= 400 ? parsed : "OK");
        return res.status;
    } catch (error) {
        console.error(`         Request failed: ${error.message}`);
        return null;
    }
}

async function runBatch() {
    console.log("========================================");
    console.log(`Sending ${MESSAGES.length} Slack test messages in a batch`);
    console.log("========================================");

    let threadParentTs = null;
    let successCount = 0;

    for (let i = 0; i < MESSAGES.length; i++) {
        const msg = MESSAGES[i];
        const ts = (Date.now() / 1000 + i).toFixed(6); // stagger timestamps so ordering is stable
        const payload = buildEventPayload(msg, ts, msg.threadParent ? threadParentTs : null);

        if (!msg.threadParent) {
            threadParentTs = ts; // remember for the next message if it's a thread reply
        }

        const status = await sendOne(payload, i, MESSAGES.length);
        if (status === 200 || status === 201) successCount++;

        // Small delay between requests so the queue/worker isn't hammered instantly
        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log("\n========================================");
    console.log(`Done. ${successCount}/${MESSAGES.length} accepted.`);
    console.log("========================================");
    console.log("\nNow verify:");
    console.log("  1. Neo4j: MATCH (p:PERSON) RETURN p.name, p.email, p.externalId");
    console.log("     -> should now include Priya Sharma, Rohan Verma, Arjun Kumar as distinct nodes");
    console.log("     (Priya should MERGE with her GitHub identity if externalId matching across providers is implemented — verify this specifically, it's a known open question)");
    console.log("  2. Postgres events table: SELECT COUNT(*) FROM events WHERE provider='slack';");
    console.log(`     -> should have increased by ${MESSAGES.length}`);
    console.log("  3. Ask the chat: 'who is Rohan Verma' and 'what did Rohan work on'");
}

runBatch();