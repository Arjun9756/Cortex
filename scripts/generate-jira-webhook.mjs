/**
 * generate-jira-webhook.mjs
 *
 * Sends a realistic Jira issue webhook with full user profile
 *
 * Usage:
 *   node scripts/generate-jira-webhook.mjs
 *   EVENT_TYPE=jira:issue_updated node scripts/generate-jira-webhook.mjs
 */

import crypto from "crypto";

const BASE_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/jira/webhook";
const JIRA_WEBHOOK_SECRET = "cortex_test_secret_2026";
const EVENT_TYPE = process.env.EVENT_TYPE || "jira:issue_updated"; // jira:issue_created | jira:issue_updated

// ✅ Same user as GitHub & Slack (unified by email)
const USER = {
    accountId: "557058:abc-def-123-456",
    accountType: "atlassian",
    displayName: "Arjun Kumar",
    emailAddress: "arjun@company.com",     // ✅ SAME EMAIL
    active: true,
    timeZone: "Asia/Kolkata",
    locale: "en_US",
    avatarUrls: {
        "16x16": "https://avatar-management.services.atlassian.com/557058/16x16.png",
        "24x24": "https://avatar-management.services.atlassian.com/557058/24x24.png",
        "32x32": "https://avatar-management.services.atlassian.com/557058/32x32.png",
        "48x48": "https://avatar-management.services.atlassian.com/557058/48x48.png"
    }
};

const PROJECT = {
    id: "10000",
    key: "CORTEX",
    name: "Cortex",
    projectTypeKey: "software",
    avatarUrls: {
        "48x48": "https://company.atlassian.net/secure/projectavatar?pid=10000"
    }
};

function buildJiraPayload() {
    const now = new Date().toISOString();
    const issueId = Math.floor(Math.random() * 90000 + 10000).toString();
    const issueKey = `CORTEX-${issueId.slice(-3)}`;

    const basePayload = {
        timestamp: Date.now(),
        webhookEvent: EVENT_TYPE,
        issue_event_type_name: EVENT_TYPE === "jira:issue_created" ? "issue_created" : "issue_generic",
        user: USER,
        issue: {
            id: issueId,
            self: `https://company.atlassian.net/rest/api/3/issue/${issueId}`,
            key: issueKey,
            fields: {
                summary: "BullMQ job retries not respecting exponential backoff config",
                description: {
                    type: "doc",
                    version: 1,
                    content: [{
                        type: "paragraph",
                        content: [{
                            type: "text",
                            text: "When a job fails in the queue, the retry delay does not increase exponentially as configured. The backoff settings appear to be overridden by worker defaults."
                        }]
                    }]
                },
                issuetype: {
                    id: "10001",
                    name: "Bug",
                    subtask: false,
                    avatarId: 10303
                },
                status: {
                    id: EVENT_TYPE === "jira:issue_created" ? "10000" : "10001",
                    name: EVENT_TYPE === "jira:issue_created" ? "To Do" : "In Progress",
                    statusCategory: {
                        id: EVENT_TYPE === "jira:issue_created" ? 2 : 4,
                        key: EVENT_TYPE === "jira:issue_created" ? "new" : "indeterminate",
                        colorName: EVENT_TYPE === "jira:issue_created" ? "blue-gray" : "yellow"
                    }
                },
                reporter: USER,
                assignee: USER,
                priority: {
                    id: "2",
                    name: "High",
                    iconUrl: "https://company.atlassian.net/images/icons/priorities/high.svg"
                },
                project: PROJECT,
                created: now,
                updated: now,
                labels: ["backend", "redis", "queue"],
                components: [],
                fixVersions: []
            }
        }
    };

    if (EVENT_TYPE === "jira:issue_updated") {
        basePayload.changelog = {
            id: "10" + Math.floor(Math.random() * 90000 + 10000),
            items: [{
                field: "status",
                fieldtype: "jira",
                fieldId: "status",
                from: "10000",
                fromString: "To Do",
                to: "10001",
                toString: "In Progress"
            }]
        };
    }

    return basePayload;
}

async function sendTestJiraWebhook() {
    const payload = buildJiraPayload();
    const url = `${BASE_URL}?secret=${encodeURIComponent(JIRA_WEBHOOK_SECRET)}`;

    console.log("━".repeat(60));
    console.log("🚀 Sending Realistic Jira Webhook");
    console.log("━".repeat(60));
    console.log("URL:         ", BASE_URL);
    console.log("Event Type:  ", EVENT_TYPE);
    console.log("Issue Key:   ", payload.issue.key);
    console.log("Reporter:    ", USER.displayName, `(${USER.emailAddress})`);
    console.log("Priority:    ", payload.issue.fields.priority.name);
    console.log("━".repeat(60));

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Atlassian HttpClient 1.0 JiraWebhook"
            },
            body: JSON.stringify(payload),
        });

        const text = await res.text();
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = text;
        }

        console.log("\n📊 Response:");
        console.log("Status:", res.status);
        console.log("Body:", parsed);

        if (res.status === 200 || res.status === 201) {
            console.log("\n✅ Webhook accepted successfully!");
            console.log("\n🔍 Now check:");
            console.log("   1. Postgres events table → provider='jira'");
            console.log("   2. Neo4j → PERSON node merged with email:", USER.emailAddress);
            console.log("   3. Neo4j → providers array includes 'jira'");
            console.log("   4. Neo4j → ISSUE node created:", payload.issue.key);
            console.log("   5. Qdrant → new vector point");
        } else if (res.status === 403) {
            console.log("\n❌ Secret rejected!");
        } else {
            console.log("\n⚠️ Unexpected status — check server logs");
        }
    } catch (error) {
        console.error("\n❌ Request failed:", error.message);
    }
}

sendTestJiraWebhook();
