import { cortexAgent } from '../packages/agent/graph/workflow.js';

interface TestCase {
    id: number;
    query: string;
    description: string;
    expectedTools: string[];
    forbiddenTools?: string[];
}

const TEST_CASES: TestCase[] = [
    {
        id: 1,
        query: "Who's the most critical person to keep on the team?",
        description: "Evaluates critical personnel retention / knowledge departure risk across the team",
        expectedTools: ["knowledge_risk"],
    },
    {
        id: 2,
        query: "If we lost our best engineer, what would break?",
        description: "Evaluates impact of losing top engineer / team-wide departure risk",
        expectedTools: ["knowledge_risk"],
    },
    {
        id: 3,
        query: "Are there any single points of failure in our codebase?",
        description: "Identifies SPOF / bus factor 1 repositories via PostgreSQL metrics",
        expectedTools: ["sql_search"],
    },
    {
        id: 4,
        query: "Show me repos and who's responsible for each",
        description: "Compound query: requires repository metrics (SQL) and maintainer/contributor relations (Graph)",
        expectedTools: ["sql_search", "graph_search"],
    },
    {
        id: 5,
        query: "How risky is losing Priya from a knowledge standpoint?",
        description: "Evaluates departure knowledge risk for named person (Priya)",
        expectedTools: ["knowledge_risk"],
    },
    {
        id: 6,
        query: "What's the financial risk of this project running over budget?",
        description: "ADVERSARIAL: Non-engineering financial/budget query. Must NOT trigger knowledge_risk or repo sql_search.",
        expectedTools: ["vector_search"],
        forbiddenTools: ["knowledge_risk"],
    },
];

async function runGeneralizationTestSuite() {
    console.log("================================================================================");
    console.log("🚀 TESTING PLANNER INTENT-BASED GENERALIZATION & ADVERSARIAL DOMAIN BOUNDARIES");
    console.log("================================================================================\n");

    const results: any[] = [];

    for (const testCase of TEST_CASES) {
        console.log(`\n--------------------------------------------------------------------------------`);
        console.log(`TEST #${testCase.id}: "${testCase.query}"`);
        console.log(`Intent: ${testCase.description}`);
        console.log(`Expected Tools: ${JSON.stringify(testCase.expectedTools)}`);
        if (testCase.forbiddenTools) {
            console.log(`Forbidden Tools: ${JSON.stringify(testCase.forbiddenTools)}`);
        }
        console.log(`--------------------------------------------------------------------------------`);

        try {
            const t0 = Date.now();
            const output = await cortexAgent.invoke({ query: testCase.query }, { recursionLimit: 20 });
            const elapsed = Date.now() - t0;

            const executed = output.executedTools || [];
            console.log(`[Result] Executed Tools: ${JSON.stringify(executed)} in ${elapsed}ms`);
            console.log(`[Answer Preview]: ${output.answer?.slice(0, 150)}...`);

            // Validate expectations
            const missingExpected = testCase.expectedTools.filter(t => !executed.includes(t));
            const hitForbidden = (testCase.forbiddenTools || []).filter(t => executed.includes(t));

            const passed = missingExpected.length === 0 && hitForbidden.length === 0;

            results.push({
                id: testCase.id,
                query: testCase.query,
                executedTools: executed,
                expected: testCase.expectedTools,
                forbidden: testCase.forbiddenTools || [],
                passed: passed ? "PASSED ✅" : "FAILED ❌",
                latency: `${elapsed}ms`,
            });
        } catch (error: any) {
            console.error(`Error in test #${testCase.id}:`, error.message);
            results.push({
                id: testCase.id,
                query: testCase.query,
                executedTools: [],
                passed: "ERROR ❌",
                error: error.message,
            });
        }
    }

    console.log("\n================================================================================");
    console.log("📊 PLANNER GENERALIZATION & ADVERSARIAL TEST RESULTS");
    console.log("================================================================================");
    console.table(results);
    console.log("================================================================================\n");
}

runGeneralizationTestSuite().catch(console.error);
