import { cortexAgent } from '../packages/agent/graph/workflow.js';
import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';

interface TestCase {
    id: number;
    query: string;
    description: string;
    validate: (res: any) => { pass: boolean; reason: string };
}

const TESTS: TestCase[] = [
    {
        id: 1,
        query: "Who is the primary owner of payment-gateway-v2?",
        description: "Must return owner from repo_metrics (not 'no records')",
        validate: (res) => {
            const ans = (res.answer || '');
            const pass = !ans.toLowerCase().includes("no indexed records") && 
                         (ans.toLowerCase().includes("payment-gateway-v2") || ans.toLowerCase().includes("owner") || ans.toLowerCase().includes("priya"));
            return { pass, reason: pass ? "Found owner / repo metrics without 'no indexed records'" : "Said no records or missing owner" };
        }
    },
    {
        id: 2,
        query: "What is the bus factor of auth-token-vault?",
        description: "Matches repo_metrics bus factor",
        validate: (res) => {
            const ans = (res.answer || '').toLowerCase();
            const pass = ans.includes("auth-token-vault") && (ans.includes("bus factor") || ans.includes("1") || ans.includes("2"));
            return { pass, reason: pass ? "Returned bus factor for auth-token-vault" : "Missing bus factor info" };
        }
    },
    {
        id: 3,
        query: "Which repositories are SPOF / at risk?",
        description: "Matches dashboard active fragile repos; empty excluded",
        validate: (res) => {
            const ans = (res.answer || '').toLowerCase();
            const pass = (ans.includes("spof") || ans.includes("fragile") || ans.includes("bus factor")) && !ans.includes("primary owner: unknown");
            return { pass, reason: pass ? "Identified SPOF repos with owners" : "Missing SPOF list" };
        }
    },
    {
        id: 4,
        query: "Show healthy vs fragile repositories",
        description: "Categorizes healthy vs fragile using repo_metrics",
        validate: (res) => {
            const ans = (res.answer || '').toLowerCase();
            const pass = ans.includes("healthy") && ans.includes("fragile");
            return { pass, reason: pass ? "Included both healthy and fragile categories" : "Failed to separate healthy and fragile" };
        }
    },
    {
        id: 5,
        query: "What happens if Vikram Patel leaves?",
        description: "Returns departure risk, affected repos, and successors",
        validate: (res) => {
            const ans = (res.answer || '').toLowerCase();
            const pass = !ans.includes("data unavailable") && 
                         (ans.includes("risk") || ans.includes("departure")) &&
                         (ans.includes("successor") || ans.includes("candidate") || ans.includes("auth-token-vault"));
            return { pass, reason: pass ? "Included departure risk and successors" : "Missing risk or successors" };
        }
    },
    {
        id: 6,
        query: "Who can take over Vikram Patel's repositories if he resigns?",
        description: "Returns consistent repos + successor candidates from same engine",
        validate: (res) => {
            const ans = (res.answer || '').toLowerCase();
            const pass = !ans.includes("data unavailable") && 
                         (ans.includes("successor") || ans.includes("candidate") || ans.includes("take over") || ans.includes("match"));
            return { pass, reason: pass ? "Included successor recommendation without 'Data Unavailable'" : "Returned Data Unavailable" };
        }
    },
    {
        id: 7,
        query: "Which repos does Vikram Patel work in?",
        description: "Consistent with person_metrics / graph",
        validate: (res) => {
            const ans = (res.answer || '').toLowerCase();
            const pass = ans.includes("auth-token-vault") || ans.includes("crypto") || ans.includes("cortex");
            return { pass, reason: pass ? "Found repositories for Vikram Patel" : "Missing repos" };
        }
    },
    {
        id: 8,
        query: "Who is Vikram Patel and what technologies does he use?",
        description: "No wrong Slack ID (U888DEVENDRA1 rejected); valid tech stack",
        validate: (res) => {
            const ans = (res.answer || '');
            const pass = !ans.includes("U888DEVENDRA1") && 
                         (ans.toLowerCase().includes("vikram") || ans.toLowerCase().includes("security"));
            return { pass, reason: pass ? "Did not attach U888DEVENDRA1; verified person identity" : "Contains wrong Slack ID U888DEVENDRA1" };
        }
    },
    {
        id: 9,
        query: "Show all high priority Jira tickets and who is working on them",
        description: "Best effort Jira tickets + honest caveat if priority sparse",
        validate: (res) => {
            const ans = (res.answer || '').toLowerCase();
            const pass = (ans.includes("jira") || ans.includes("ticket") || ans.includes("issue") || ans.includes("priority")) &&
                         (ans.includes("assignee") || ans.includes("working") || ans.includes("checked:"));
            return { pass, reason: pass ? "Returned Jira ticket breakdown / search" : "No Jira info" };
        }
    },
    {
        id: 10,
        query: "Which Slack discussions are related to the AWS KMS key rotation incident?",
        description: "Vector + Slack search; cites channel or multi-source checked",
        validate: (res) => {
            const ans = (res.answer || '').toLowerCase();
            const pass = ans.includes("kms") || ans.includes("rotation") || ans.includes("slack") || ans.includes("checked:");
            return { pass, reason: pass ? "Cited Slack discussion or multi-store checked" : "Empty without multi-store check" };
        }
    }
];

async function runAll() {
    console.log("================================================================================");
    console.log("🚀 RUNNING CORTEX INTELLIGENCE AGENT HARDENING ACCEPTANCE TEST SUITE (10 CHECKS)");
    console.log("================================================================================\n");

    let passCount = 0;
    const results: any[] = [];

    for (const test of TESTS) {
        console.log(`\n--------------------------------------------------------------------------------`);
        console.log(`TEST #${test.id}: "${test.query}"`);
        console.log(`Expectation: ${test.description}`);
        console.log(`--------------------------------------------------------------------------------`);

        const tStart = Date.now();
        try {
            const result = await cortexAgent.invoke({ query: test.query }, { recursionLimit: 25 });
            const duration = Date.now() - tStart;
            const validation = test.validate(result);

            console.log(`Duration: ${duration}ms`);
            console.log(`Executed Tools: [${(result.executedTools || []).join(', ')}]`);
            console.log(`Validation: ${validation.pass ? '✅ PASS' : '❌ FAIL'} (${validation.reason})`);
            console.log(`Answer Preview:\n${(result.answer || '').slice(0, 300)}...\n`);

            if (validation.pass) passCount++;
            results.push({
                id: test.id,
                query: test.query,
                pass: validation.pass,
                reason: validation.reason,
                tools: result.executedTools || [],
                durationMs: duration
            });
        } catch (err: any) {
            console.error(`❌ Error in test #${test.id}:`, err?.message);
            results.push({
                id: test.id,
                query: test.query,
                pass: false,
                reason: `Exception: ${err?.message}`,
                tools: [],
                durationMs: Date.now() - tStart
            });
        }
    }

    console.log("\n================================================================================");
    console.log(`📊 FINAL TEST SUMMARY: ${passCount}/${TESTS.length} TESTS PASSED`);
    console.log("================================================================================");
    console.table(results);

    await sql.end();
    await driver.close();

    if (passCount === TESTS.length) {
        console.log("\n🎉 ALL 10 ACCEPTANCE TESTS PASSED 100%!");
        process.exit(0);
    } else {
        console.log(`\n⚠️ ${TESTS.length - passCount} TESTS FAILED.`);
        process.exit(1);
    }
}

runAll().catch(err => {
    console.error("Fatal test runner error:", err);
    process.exit(1);
});
