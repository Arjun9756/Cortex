import { cortexAgent } from '../packages/agent/graph/workflow.js';

const COMPLEX_QUERIES = [
    {
        id: 1,
        title: "Compound Relational + Graph Contributor Query",
        query: "List all repositories with bus factor 1, show their risk scores, and list the top contributors and their email addresses for each.",
    },
    {
        id: 2,
        title: "Vector Decision + Knowledge Risk of Author",
        query: "Why was Redis replaced with Valkey, who authored that change, and what happens to our system if that engineer leaves the company?",
    },
    {
        id: 3,
        title: "Shortest Dependency Path + Shared Technologies",
        query: "What is the shortest dependency path between auth-service and billing-engine, what technologies do they share, and who maintains both?",
    },
    {
        id: 4,
        title: "Full Team 6-Component Knowledge Risk Breakdown",
        query: "Give me a full breakdown of all 6 knowledge risk components for every engineer in the system and rank them by vulnerability.",
    }
];

async function runComplexDiagnostics() {
    console.log("================================================================================");
    console.log("🧪 TESTING 4 COMPLEX MULTI-ENGINE QUERIES ON CORTEX QUERY AGENT");
    console.log("================================================================================\n");

    for (const test of COMPLEX_QUERIES) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`[QUERY #${test.id}] ${test.title}`);
        console.log(`Query: "${test.query}"`);
        console.log('='.repeat(80));

        const t0 = Date.now();
        try {
            const result = await cortexAgent.invoke({ query: test.query }, { recursionLimit: 20 });
            const elapsed = Date.now() - t0;

            console.log(`⏱️ Total Pipeline Duration: ${elapsed}ms`);
            console.log(`🔧 Executed Tools: ${JSON.stringify(result.executedTools)}`);
            console.log(`🎯 Graph Action: ${result.graphAction || 'none'}`);
            console.log(`👥 Entities Resolved: ${JSON.stringify(result.entities || [])}`);
            console.log(`📊 Knowledge Risk Result:`, result.knowledgeRiskResult ? (Array.isArray(result.knowledgeRiskResult) ? `Array of ${result.knowledgeRiskResult.length} persons: ${result.knowledgeRiskResult.map((p: any) => p.person).join(', ')}` : result.knowledgeRiskResult.person) : 'null');
            console.log(`\n--- [FINAL ANSWER] ---`);
            console.log(result.answer);
            console.log(`--- [END ANSWER] ---\n`);

        } catch (e: any) {
            console.error(`❌ Error in query #${test.id}:`, e.message);
        }
    }
}

runComplexDiagnostics().catch(console.error);
