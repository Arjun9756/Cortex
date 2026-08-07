import { cortexAgent } from '../packages/agent/graph/workflow.js';

async function runDiagnostic(query: string) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`DIAGNOSTIC TEST QUERY: "${query}"`);
    console.log('='.repeat(80));

    const overallStart = Date.now();
    try {
        const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 });
        const overallDuration = Date.now() - overallStart;

        console.log(`\n${'='.repeat(80)}`);
        console.log(`DIAGNOSTIC RESULTS FOR: "${query}"`);
        console.log('='.repeat(80));
        console.log(`OVERALL PIPELINE LATENCY: ${overallDuration}ms`);
        console.log(`FINAL REFLECTION ITERATIONS: ${result.iterationCount}`);
        console.log(`EXECUTED TOOLS: ${JSON.stringify(result.executedTools)}`);
        console.log(`GRAPH ACTION: ${result.graphAction}`);
        console.log(`GRAPH TARGET: ${result.graphTarget}`);
        console.log(`ENTITIES: ${JSON.stringify(result.entities)}`);
        console.log(`\n--- FINAL ANSWER ---`);
        console.log(result.answer);
        console.log(`--- END ANSWER ---\n`);
    } catch (err: any) {
        console.error("Diagnostic error:", err.message);
    }
}

async function main() {
    // Test 1: The Part B problem query
    await runDiagnostic("how many developers, name them all");

    // Test 2: Standard list query
    await runDiagnostic("list all developers");

    process.exit(0);
}

main();
