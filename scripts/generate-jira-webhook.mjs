// /**
//  * generate-jira-webhook.mjs
//  *
//  * Sends a realistic Jira issue webhook with full user profile
//  *
//  * Usage:
//  *   node scripts/generate-jira-webhook.mjs
//  *   EVENT_TYPE=jira:issue_updated node scripts/generate-jira-webhook.mjs
//  */

// import crypto from "crypto";

// const BASE_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/jira/webhook";
// const JIRA_WEBHOOK_SECRET = "cortex_test_secret_2026";
// const EVENT_TYPE = process.env.EVENT_TYPE || "jira:issue_updated"; // jira:issue_created | jira:issue_updated

// // ✅ Same user as GitHub & Slack (unified by email)
// const USER = {
//     accountId: "557058:abc-def-123-456",
//     accountType: "atlassian",
//     displayName: "Arjun Kumar",
//     emailAddress: "arjun@company.com",     // ✅ SAME EMAIL
//     active: true,
//     timeZone: "Asia/Kolkata",
//     locale: "en_US",
//     avatarUrls: {
//         "16x16": "https://avatar-management.services.atlassian.com/557058/16x16.png",
//         "24x24": "https://avatar-management.services.atlassian.com/557058/24x24.png",
//         "32x32": "https://avatar-management.services.atlassian.com/557058/32x32.png",
//         "48x48": "https://avatar-management.services.atlassian.com/557058/48x48.png"
//     }
// };

// const PROJECT = {
//     id: "10000",
//     key: "CORTEX",
//     name: "Cortex",
//     projectTypeKey: "software",
//     avatarUrls: {
//         "48x48": "https://company.atlassian.net/secure/projectavatar?pid=10000"
//     }
// };

// function buildJiraPayload() {
//     const now = new Date().toISOString();
//     const issueId = Math.floor(Math.random() * 90000 + 10000).toString();
//     const issueKey = `CORTEX-${issueId.slice(-3)}`;

//     const basePayload = {
//         timestamp: Date.now(),
//         webhookEvent: EVENT_TYPE,
//         issue_event_type_name: EVENT_TYPE === "jira:issue_created" ? "issue_created" : "issue_generic",
//         user: USER,
//         issue: {
//             id: issueId,
//             self: `https://company.atlassian.net/rest/api/3/issue/${issueId}`,
//             key: issueKey,
//             fields: {
//                 summary: "BullMQ job retries not respecting exponential backoff config",
//                 description: {
//                     type: "doc",
//                     version: 1,
//                     content: [{
//                         type: "paragraph",
//                         content: [{
//                             type: "text",
//                             text: "When a job fails in the queue, the retry delay does not increase exponentially as configured. The backoff settings appear to be overridden by worker defaults."
//                         }]
//                     }]
//                 },
//                 issuetype: {
//                     id: "10001",
//                     name: "Bug",
//                     subtask: false,
//                     avatarId: 10303
//                 },
//                 status: {
//                     id: EVENT_TYPE === "jira:issue_created" ? "10000" : "10001",
//                     name: EVENT_TYPE === "jira:issue_created" ? "To Do" : "In Progress",
//                     statusCategory: {
//                         id: EVENT_TYPE === "jira:issue_created" ? 2 : 4,
//                         key: EVENT_TYPE === "jira:issue_created" ? "new" : "indeterminate",
//                         colorName: EVENT_TYPE === "jira:issue_created" ? "blue-gray" : "yellow"
//                     }
//                 },
//                 reporter: USER,
//                 assignee: USER,
//                 priority: {
//                     id: "2",
//                     name: "High",
//                     iconUrl: "https://company.atlassian.net/images/icons/priorities/high.svg"
//                 },
//                 project: PROJECT,
//                 created: now,
//                 updated: now,
//                 labels: ["backend", "redis", "queue"],
//                 components: [],
//                 fixVersions: []
//             }
//         }
//     };

//     if (EVENT_TYPE === "jira:issue_updated") {
//         basePayload.changelog = {
//             id: "10" + Math.floor(Math.random() * 90000 + 10000),
//             items: [{
//                 field: "status",
//                 fieldtype: "jira",
//                 fieldId: "status",
//                 from: "10000",
//                 fromString: "To Do",
//                 to: "10001",
//                 toString: "In Progress"
//             }]
//         };
//     }

//     return basePayload;
// }

// async function sendTestJiraWebhook() {
//     const payload = buildJiraPayload();
//     const url = `${BASE_URL}?secret=${encodeURIComponent(JIRA_WEBHOOK_SECRET)}`;

//     console.log("━".repeat(60));
//     console.log("🚀 Sending Realistic Jira Webhook");
//     console.log("━".repeat(60));
//     console.log("URL:         ", BASE_URL);
//     console.log("Event Type:  ", EVENT_TYPE);
//     console.log("Issue Key:   ", payload.issue.key);
//     console.log("Reporter:    ", USER.displayName, `(${USER.emailAddress})`);
//     console.log("Priority:    ", payload.issue.fields.priority.name);
//     console.log("━".repeat(60));

//     try {
//         const res = await fetch(url, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 "User-Agent": "Atlassian HttpClient 1.0 JiraWebhook"
//             },
//             body: JSON.stringify(payload),
//         });

//         const text = await res.text();
//         let parsed;
//         try {
//             parsed = JSON.parse(text);
//         } catch {
//             parsed = text;
//         }

//         console.log("\n📊 Response:");
//         console.log("Status:", res.status);
//         console.log("Body:", parsed);

//         if (res.status === 200 || res.status === 201) {
//             console.log("\n✅ Webhook accepted successfully!");
//             console.log("\n🔍 Now check:");
//             console.log("   1. Postgres events table → provider='jira'");
//             console.log("   2. Neo4j → PERSON node merged with email:", USER.emailAddress);
//             console.log("   3. Neo4j → providers array includes 'jira'");
//             console.log("   4. Neo4j → ISSUE node created:", payload.issue.key);
//             console.log("   5. Qdrant → new vector point");
//         } else if (res.status === 403) {
//             console.log("\n❌ Secret rejected!");
//         } else {
//             console.log("\n⚠️ Unexpected status — check server logs");
//         }
//     } catch (error) {
//         console.error("\n❌ Request failed:", error.message);
//     }
// }

// sendTestJiraWebhook();
/**
 * test-jira-webhook-batch.js
 *
 * Sends MULTIPLE distinct Jira issue events in a single run (looped), across
 * different people and projects, to test batch ingestion in one go.
 *
 * Usage:
 *   node test-jira-webhook-batch.js
 */

import crypto from "crypto";

const BASE_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/jira/webhook";
const JIRA_WEBHOOK_SECRET = process.env.JIRA_WEBHOOK_SECRET || "cortex_test_secret_2026";

// Each entry is a distinct Jira issue event — batch inserted in one run.
const ISSUES = [
    {
        eventType: "jira:issue_created",
        issueId: "40001",
        issueKeySuffix: "801",
        summary: "Add reconciliation job for Stripe charge mismatches",
        description: "Following up on the idempotency key fix — need a nightly job that cross-checks Stripe charges against our payment records and flags mismatches.",
        reporterName: "Priya Sharma",
        reporterEmail: "priya.sharma@company.com",
        reporterAccountId: "acc-priya-001",
        projectKey: "BILL",
        status: "To Do",
    },
    {
        eventType: "jira:issue_created",
        issueId: "40002",
        issueKeySuffix: "205",
        summary: "SMS delivery rate-limit errors during peak hours",
        description: "notification-service is hitting Twilio rate limits during peak load. Needs a queue with rate-limiting, similar pattern to billing retries.",
        reporterName: "Rohan Verma",
        reporterEmail: "rohan.verma@company.com",
        reporterAccountId: "acc-rohan-001",
        projectKey: "NOTIF",
        status: "To Do",
    },
    {
        eventType: "jira:issue_updated",
        issueId: "40002",
        issueKeySuffix: "205",
        summary: "SMS delivery rate-limit errors during peak hours",
        description: "Root cause confirmed: sends were not batched. Fix in progress using BullMQ.",
        reporterName: "Rohan Verma",
        reporterEmail: "rohan.verma@company.com",
        reporterAccountId: "acc-rohan-001",
        projectKey: "NOTIF",
        status: "In Progress",
    },
    {
        eventType: "jira:issue_created",
        issueId: "40003",
        issueKeySuffix: "512",
        summary: "Document BullMQ retry/backoff pattern as a shared internal guide",
        description: "Multiple teams (Cortex, billing-service, notification-service) are now independently implementing the same BullMQ exponential backoff pattern — should be documented once and reused.",
        reporterName: "Arjun Kumar",
        reporterEmail: "arjun@company.com",
        reporterAccountId: "acc-arjun-001",
        projectKey: "CORTEX",
        status: "To Do",
    },
];

function buildJiraPayload(issue) {
    const now = new Date().toISOString();
    const payload = {
        timestamp: Date.now(),
        webhookEvent: issue.eventType,
        issue_event_type_name: issue.eventType === "jira:issue_created" ? "issue_created" : "issue_generic",
        user: {
            accountId: issue.reporterAccountId,
            displayName: issue.reporterName,
        },
        issue: {
            id: issue.issueId,
            key: `${issue.projectKey}-${issue.issueKeySuffix}`,
            fields: {
                summary: issue.summary,
                description: issue.description,
                issuetype: { name: "Bug" },
                status: { name: issue.status },
                reporter: {
                    displayName: issue.reporterName,
                    accountId: issue.reporterAccountId,
                    emailAddress: issue.reporterEmail,
                },
                assignee: {
                    displayName: issue.reporterName,
                    accountId: issue.reporterAccountId,
                    emailAddress: issue.reporterEmail,
                },
                priority: { name: "High" },
                project: { key: issue.projectKey, name: issue.projectKey },
                created: now,
                updated: now,
            },
        },
    };

    if (issue.eventType === "jira:issue_updated") {
        payload.changelog = {
            items: [{ field: "status", fromString: "To Do", toString: issue.status }],
        };
    }

    return payload;
}

async function sendOne(issue, index, total) {
    const payload = buildJiraPayload(issue);
    const url = `${BASE_URL}?secret=${encodeURIComponent(JIRA_WEBHOOK_SECRET)}`;

    console.log(`\n[${index + 1}/${total}] ${payload.issue.key} — "${issue.summary.slice(0, 50)}..."`);
    console.log(`         reporter=${issue.reporterName} (${issue.reporterEmail}) status=${issue.status}`);

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
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
    console.log(`Sending ${ISSUES.length} Jira test events in a batch`);
    console.log("========================================");

    let successCount = 0;
    for (let i = 0; i < ISSUES.length; i++) {
        const status = await sendOne(ISSUES[i], i, ISSUES.length);
        if (status === 200 || status === 201) successCount++;
        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    console.log("\n========================================");
    console.log(`Done. ${successCount}/${ISSUES.length} accepted.`);
    console.log("========================================");
    console.log("\nNow verify:");
    console.log("  1. Neo4j: MATCH (p:PERSON) RETURN p.name, p.email, p.externalId");
    console.log("     -> should now include Priya Sharma, Rohan Verma, Arjun Kumar");
    console.log("     -> IMPORTANT: check whether Priya/Arjun's Jira-sourced node MERGED with");
    console.log("        their GitHub-sourced node, or created a SEPARATE node (jira:acc-priya-001");
    console.log("        vs github:998877665 are different externalId values by design — this is");
    console.log("        expected to create separate nodes unless cross-provider identity linking");
    console.log("        was explicitly implemented, which it was not per the current architecture)");
    console.log("  2. Neo4j: MATCH (i:ISSUE) RETURN i.name -> should show 4 issues across 3 projects");
    console.log("  3. Postgres events table: SELECT COUNT(*) FROM events WHERE provider='jira';");
    console.log(`     -> should have increased by ${ISSUES.length}`);
    console.log("  4. Ask the chat: 'what is Rohan working on' and 'who reported the SMS rate limit issue'");
}

runBatch();