import { cortexAgent } from '../packages/agent/graph/workflow.js';

async function testQuery(label: string, query: string) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${label}`);
    console.log(`QUERY: "${query}"`);
    console.log('='.repeat(60));
    const tStart = Date.now();
    try {
        const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 });
        const elapsed = Date.now() - tStart;
        const response = {
            answer: result.answer,
            latency_ms: elapsed,
            execution: { tools: result.executedTools },
            hasRisk: Boolean(result.knowledgeRiskResult),
            knowledgeRiskResult: result.knowledgeRiskResult ?? undefined,
        };
        console.log(`\nEND-TO-END LATENCY: ${elapsed}ms`);
        console.log("RESPONSE JSON:");
        console.log(JSON.stringify(response, null, 2));
    } catch (err: any) {
        const elapsed = Date.now() - tStart;
        console.error(`ERROR after ${elapsed}ms:`, err.message);
    }
}

async function main() {
    // Primary verification: knowledge risk for arjun kumar
    await testQuery(
        "Knowledge Risk Latency Test",
        "what is the knowledge risk for arjun kumar"
    );

    // Confirm correctness is unchanged on compound query
    await testQuery(
        "Compound: risk + email (correctness check)",
        "How much Knowledge Loss Will There is arjun kumar leaves how you have calculated that ? what the email of arjun"
    );

    process.exit(0);
}

main();
