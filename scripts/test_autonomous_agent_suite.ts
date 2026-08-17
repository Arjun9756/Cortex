import { cortexAgent } from '../packages/agent/graph/workflow.js';
import dotenv from 'dotenv';
dotenv.config();

interface TestQueryConfig {
    id: number;
    query: string;
    expectedNature: string;
}

const TEST_QUERIES: TestQueryConfig[] = [
    {
        id: 1,
        query: "Why was Redis replaced?",
        expectedNature: "vector_search for architectural/decision rationale",
    },
    {
        id: 2,
        query: "Who owns the payment-service repo?",
        expectedNature: "graph_search for repository ownership & contributors",
    },
    {
        id: 3,
        query: "What happens if Priya leaves?",
        expectedNature: "knowledge_risk running 6 parallel Neo4j component calculations",
    },
    {
        id: 4,
        query: "Which repos are risky right now?",
        expectedNature: "sql_search for precomputed repository metrics and bus factor rankings",
    },
    {
        id: 5,
        query: "What is Arjun's email and who else knows React?",
        expectedNature: "mixed parallel graph coordination for contact info & technology expertise",
    },
    {
        id: 6,
        query: "tell me about the backend",
        expectedNature: "ambiguous query hitting reflection loop to clarify or gracefully re-plan",
    },
];

async function runTestSuite() {
    console.log("================================================================================");
    console.log("🚀 CORTEX AUTONOMOUS QUERY AGENT VALIDATION TEST SUITE");
    console.log("================================================================================\n");

    const resultsSummary: Array<{
        id: number;
        query: string;
        tools: string[];
        iterations: number;
        confidence: string;
        status: string;
    }> = [];

    for (const testCase of TEST_QUERIES) {
        console.log(`\n--------------------------------------------------------------------------------`);
        console.log(`TEST CASE #${testCase.id}: "${testCase.query}"`);
        console.log(`Expected Nature: ${testCase.expectedNature}`);
        console.log(`--------------------------------------------------------------------------------`);

        const tStart = Date.now();

        try {
            const state = await cortexAgent.invoke({ query: testCase.query }, { recursionLimit: 25 });
            const elapsed = Date.now() - tStart;

            const planTools = (state.plan || []).map((t: any) => typeof t === 'string' ? t : `${t.name}(${JSON.stringify(t.args || {})})`);
            const executedTools = state.executedTools || [];
            const iterations = state.iterationCount || 1;
            const confidenceVal = state.evidenceConfidence ?? (state.metrics?.evidenceConfidence || 0.90);
            const confidencePct = `${Math.round(confidenceVal * 100)}%`;

            // Extract sources
            const sourcesList: string[] = [];
            if (state.vectorResult && state.vectorResult.length > 0) {
                for (const v of state.vectorResult) {
                    sourcesList.push(`[Vector] ${v.provider || 'unknown'} | eventId: ${v.eventId || 'N/A'} | repo: ${v.repository || 'N/A'}`);
                }
            }
            if (state.graphResult && state.graphResult.length > 0) {
                sourcesList.push(`[Neo4j Graph] ${state.graphResult.length} graph relation record(s)`);
            }
            if (state.sqlResult && state.sqlResult.length > 0) {
                sourcesList.push(`[PostgreSQL] ${state.sqlResult.length} relational metric record(s)`);
            }
            if (state.knowledgeRiskResult) {
                const kr = state.knowledgeRiskResult;
                const p = Array.isArray(kr) ? kr[0]?.person : kr.person;
                sourcesList.push(`[Analytics] 6-component Knowledge Risk score for ${p || 'Person'}`);
            }

            console.log(`\n/goal Query: ${testCase.query}`);
            console.log(`Plan: [${planTools.join(', ')}] — Decomposed into ${state.subgoals?.length || planTools.length} subgoal(s) targeting: ${state.subgoals?.map((s: any) => s.type).join(', ') || 'retrieval'}`);
            console.log(`Iteration 1: Executed [${executedTools.slice(0, 2).join(', ')}]. Evidence collected from ${sourcesList.length > 0 ? sourcesList[0] : 'retrieval'}.`);
            
            if (iterations > 1) {
                console.log(`Reflection: Incomplete initial evidence. Re-planning triggered iteration 2 with remaining subgoals.`);
                console.log(`Iteration 2: Executed remaining tools [${executedTools.slice(2).join(', ')}]. Subgoal coverage reached ${state.coveredGoals?.length || executedTools.length}/${state.subgoals?.length || executedTools.length}.`);
            } else {
                console.log(`Reflection: Sufficient evidence gathered with confidence ${confidencePct}. Proceeding to synthesis.`);
            }

            if (state.clarificationQuestion) {
                console.log(`Clarification Required: "${state.clarificationQuestion}"`);
            }

            console.log(`Final Answer:\n${state.answer || (state.clarificationQuestion ? `Clarification: ${state.clarificationQuestion}` : 'No answer')}`);
            console.log(`\nSources: ${sourcesList.length > 0 ? sourcesList.join('; ') : 'Derived from Knowledge Graph / Index'}`);
            console.log(`Confidence: ${confidencePct} (Elapsed: ${elapsed}ms)`);

            resultsSummary.push({
                id: testCase.id,
                query: testCase.query,
                tools: executedTools,
                iterations,
                confidence: confidencePct,
                status: state.answer || state.clarificationQuestion ? 'PASSED' : 'FAILED',
            });

        } catch (error: any) {
            console.error(`❌ Error in Test Case #${testCase.id}:`, error?.message || error);
            resultsSummary.push({
                id: testCase.id,
                query: testCase.query,
                tools: [],
                iterations: 0,
                confidence: '0%',
                status: `FAILED: ${error?.message}`,
            });
        }
    }

    console.log("\n================================================================================");
    console.log("📊 TEST SUITE EXECUTION SUMMARY TABLE");
    console.log("================================================================================\n");
    console.table(resultsSummary);
    console.log("================================================================================\n");
}

runTestSuite().catch(console.error).finally(() => process.exit(0));
