/**
 * test_compound_query_diag.ts
 *
 * Diagnostic script to investigate compound query failure:
 * Query A: "how many developers knows redis get their contact details also and why redis was replaced with valkey which date"
 * Query B: "why did we switch to Valkey and what date"
 *
 * Measures:
 * 1. Intent Router match / skip
 * 2. Planner node tool choices, extracted entities, reasoning
 * 3. Execution of graph_search and vector_search nodes
 * 4. Evidence aggregation (final evidence string passed to LLM)
 * 5. Answer node response
 */

import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { routeQueryIntent } from '../packages/agent/router/intentRouter.js';

function separator(title: string) {
    console.log('\n' + '='.repeat(80));
    console.log(`  ${title}`);
    console.log('='.repeat(80));
}

async function runDiagnostic(label: string, query: string) {
    separator(`DIAGNOSTIC: ${label}`);
    console.log(`Query: "${query}"\n`);

    const intentMatch = routeQueryIntent(query);
    console.log(`[IntentRouter] Match result: ${intentMatch ? JSON.stringify(intentMatch) : 'NULL (falls through to Planner)'}`);

    const start = performance.now();
    try {
        const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 });
        const elapsed = (performance.now() - start).toFixed(1);

        console.log(`\n[Pipeline] Completed in ${elapsed}ms`);
        console.log(`[Pipeline] Executed Tools: ${JSON.stringify(result.executedTools)}`);
        console.log(`[Pipeline] Entities Extracted: ${JSON.stringify(result.entities)}`);
        console.log(`[Pipeline] Graph Action: ${result.graphAction || 'N/A'}`);
        console.log(`[Pipeline] Vector Result Count: ${result.vectorResult?.length ?? 0}`);
        console.log(`[Pipeline] Graph Result Count: ${result.graphResult?.length ?? 0}`);
        console.log(`[Pipeline] Evidence String Length: ${result.evidence?.length ?? 0}`);
        console.log(`\n=== FINAL EVIDENCE PASSED TO ANSWER NODE ===\n${result.evidence || '(NONE)'}\n`);
        console.log(`=== FINAL ANSWER ===\n${result.answer || '(NONE)'}\n`);

        return { label, query, elapsed, result };
    } catch (error: any) {
        const elapsed = (performance.now() - start).toFixed(1);
        console.error(`[Pipeline] ERROR after ${elapsed}ms:`, error?.message, error?.stack);
        return { label, query, elapsed, error };
    }
}

async function main() {
    // 1. Compound Query
    const qA = "how many developers knows redis get their contact details also and why redis was replaced with valkey which date";
    await runDiagnostic("Query A (3-Part Compound)", qA);

    // 2. Standalone Query
    const qB = "why did we switch to Valkey and what date";
    await runDiagnostic("Query B (Standalone 2-Part Valkey)", qB);

    process.exit(0);
}

main().catch(err => {
    console.error('Fatal diagnostic error:', err);
    process.exit(1);
});
