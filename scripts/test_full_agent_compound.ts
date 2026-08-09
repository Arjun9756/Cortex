import { cortexAgent } from '../packages/agent/graph/workflow.js';

const QUERIES = [
    {
        name: "Test Compound Query (Priya Sharma)",
        query: "Who is Priya Sharma, what's her knowledge risk, and what technologies does she use?"
    },
    {
        name: "Test 2-Hop Technology Traversal (Priya Sharma)",
        query: "What technologies does Priya Sharma use?"
    },
    {
        name: "Test 2-Hop Technology Traversal (Sarah Chen)",
        query: "What technologies does Sarah Chen use?"
    },
    {
        name: "Test 2-Hop Technology Traversal (Rohan Verma)",
        query: "List all technologies used by Rohan Verma"
    }
];

async function main() {
    console.log("======================================================================");
    console.log("       FULL AGENT COMPOUND QUERY DECOMPOSITION & SYNTHESIS TEST        ");
    console.log("======================================================================\n");

    for (const [i, item] of QUERIES.entries()) {
        console.log(`\n----------------------------------------------------------------------`);
        console.log(`[QUERY ${i + 1}] ${item.name}`);
        console.log(`Input Query: "${item.query}"`);
        console.log(`----------------------------------------------------------------------`);

        try {
            const result = await cortexAgent.invoke({
                query: item.query,
                plan: [],
                pendingTools: [],
                executedTools: [],
                entities: [],
                graphAction: '',
                graphTarget: '',
                graphRelation: '',
                vectorQuery: '',
                vectorResult: [],
                graphResult: [],
                evidence: '',
                needMoreSearch: false,
                iterationCount: 0,
                answer: '',
                sqlResult: [],
                webQuery: '',
                WebQueryResult: [],
                knowledgeRiskResult: null
            });

            console.log(`\n[EXECUTED TOOLS]:`, JSON.stringify(result.executedTools));
            console.log(`[ENTITIES DETECTED]:`, JSON.stringify(result.entities));
            console.log(`[GRAPH ACTION / TARGET]:`, `${result.graphAction || 'none'} / ${result.graphTarget || 'none'}`);
            console.log(`[VECTOR QUERY]:`, `"${result.vectorQuery}"`);
            console.log(`\n[FINAL SYNTHESIZED ANSWER]:\n${result.answer}`);
        } catch (err: any) {
            console.error(`❌ Error running query ${i + 1}:`, err?.message || err);
        }
        // Small delay between executions
        await new Promise(res => setTimeout(res, 2000));
    }

    console.log("\n======================================================================");
    console.log("       FULL TEST COMPLETED SUCCESSFULLY                              ");
    console.log("======================================================================\n");
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
