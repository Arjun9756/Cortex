/**
 * test-slack-webhook.js
 *
 * Sends a fake, correctly-signed Slack "message" event to your local
 * Cortex server, to test: webhook -> validate signature -> Postgres ->
 * queue -> worker -> Neo4j/Qdrant.
 *
 * Usage:
 *   1. Set SLACK_SIGNING_SECRET and WEBHOOK_URL below (or via env vars)
 *   2. node test-slack-webhook.js
 *   3. For a thread reply test: EVENT_TYPE=thread_reply node test-slack-webhook.js
 */

import crypto from "crypto";

// ---------- CONFIG ----------
const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/slack/webhook";
const SLACK_SIGNING_SECRET = "cortex_test_secret_2026";
const EVENT_TYPE = process.env.EVENT_TYPE || "thread_reply"; // message | thread_reply
// -----------------------------

function buildSlackEventPayload() {
    const now = (Date.now() / 1000).toFixed(6);

    const baseEvent = {
        type: "message",
        channel: "C0123456789",
        user: "U0987654321",
        text: "Migrated Redis to Valkey because of licensing issues",
        ts: now,
    };

    if (EVENT_TYPE === "thread_reply") {
        baseEvent.text = "Yeah, the Redis license change forced our hand — Valkey is a drop-in replacement";
        baseEvent.thread_ts = (Number(now) - 120).toFixed(6); // parent message 2 min earlier
    }

    return {
        token: "fake-verification-token",
        team_id: "T0123456",
        api_app_id: "A0123456",
        event: baseEvent,
        type: "event_callback",
        event_id: "Ev" + crypto.randomBytes(8).toString("hex"),
        event_time: Math.floor(Number(now)),
    };
}

function signSlackRequest(secret, timestamp, bodyString) {
    const sigBaseString = `v0:${timestamp}:${bodyString}`;
    const digest = "v0=" + crypto
        .createHmac("sha256", secret)
        .update(sigBaseString)
        .digest("hex");
    return digest;
}

async function sendTestSlackWebhook() {
    const payload = buildSlackEventPayload();
    const bodyString = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signSlackRequest(SLACK_SIGNING_SECRET, timestamp, bodyString);

    console.log("----------------------------------------");
    console.log("Sending fake Slack webhook");
    console.log("URL:        ", WEBHOOK_URL);
    console.log("Event Type: ", EVENT_TYPE);
    console.log("Timestamp:  ", timestamp);
    console.log("Signature:  ", signature);
    console.log("----------------------------------------");

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
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = text;
        }

        console.log("Status:", res.status);
        console.log("Response:", parsed);

        if (res.status === 200) {
            console.log("\n✅ Webhook accepted. Now check:");
            console.log("   1. Postgres 'events' table for the new row (provider='slack')");
            console.log("   2. Your worker logs");
            console.log("   3. Neo4j Browser for new nodes/relationships");
            console.log("   4. Qdrant collection for a new point");
        } else if (res.status === 403) {
            console.log("\n❌ Signature rejected — check SLACK_SIGNING_SECRET matches your server's env.SLACK_SIGNING_SECRET.");
        } else {
            console.log("\n⚠️ Unexpected status — check server logs.");
        }
    } catch (error) {
        console.error("Request failed:", error.message);
        console.error("Is your server running at", WEBHOOK_URL, "?");
    }
}

// Also test the Slack URL verification handshake separately:
async function testUrlVerification() {
    const challenge = crypto.randomBytes(16).toString("hex");
    const payload = { type: "url_verification", challenge };
    const bodyString = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signSlackRequest(SLACK_SIGNING_SECRET, timestamp, bodyString);

    console.log("\n--- Testing Slack URL verification handshake ---");
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
        const json = await res.json();
        const ok = json.challenge === challenge;
        console.log(ok ? "✅ Challenge echoed correctly" : "❌ Challenge mismatch:", json);
    } catch (error) {
        console.error("URL verification test failed:", error.message);
    }
}

(async () => {
    await testUrlVerification();
    await sendTestSlackWebhook();
})();