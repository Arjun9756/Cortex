/**
 * test_a3_a6_fix.ts
 *
 * Verifies that the reasoning_format fix allows fallback model calls to succeed
 * without 400 errors during rate limiting, specifically verifying TEST A3 and TEST A6.
 *
 * Usage:
 *   npx tsx scripts/test_a3_a6_fix.ts
 */

import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { routeQueryIntent } from '../packages/agent/router/intentRouter.js';

function separator(title: string) {
    console.log('\n' + '='.repeat(80));
    console.log(`  ${title}`);
    console.log('='.repeat(80));
}

async function runQuery(label: string, query: string) {
    console.log(`\n--- ${label} ---`);
    console.log(`Query: "${query}"`);

    const routerStart = performance.now();
    const intentMatch = routeQueryIntent(query);
    const routerMs = (performance.now() - routerStart).toFixed(3);

    if (intentMatch) {
        console.log(`[IntentRouter] MATCHED intent: ${intentMatch.intentId} in ${routerMs}ms`);
    } else {
        console.log(`[IntentRouter] NO MATCH (will fall through to LLM Planner) — checked in ${routerMs}ms`);
    }

    const pipelineStart = performance.now();
    try {
        const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 });
        const pipelineMs = (performance.now() - pipelineStart).toFixed(1);

        console.log(`[Pipeline] Total latency: ${pipelineMs}ms`);
        console.log(`[Pipeline] Path taken: ${intentMatch ? 'FAST-PATH' : 'LLM PLANNER'}`);
        console.log(`[Pipeline] Tools executed: ${JSON.stringify(result.executedTools)}`);
        console.log(`[Pipeline] Answer: ${result.answer}`);
        return { label, query, pipelineMs, result, intentMatch };
    } catch (error: any) {
        const pipelineMs = (performance.now() - pipelineStart).toFixed(1);
        console.log(`[Pipeline] ERROR after ${pipelineMs}ms: ${error?.message}`);
        return { label, query, pipelineMs, error, intentMatch };
    }
}

async function main() {
    separator('TEST A3 & A6 VERIFICATION (POST-FIX)');

    console.log('\nRunning A3: Novel Query');
    const a3 = await runQuery('A3', 'Compare code review velocity between the billing team and notification team over the last month.');

    console.log('\nRunning A6: Deep Multi-Hop Query (Shortcut Edge + Fallback Check)');
    const a6 = await runQuery('A6', "What technologies does Sarah Chen's team depend on through her repositories?");

    separator('SUMMARY RESULTS');
    console.log(`A3 Answer: ${a3.result?.answer ? 'GENERATED (' + a3.result.answer.slice(0, 150) + '...)' : 'FAILED'}`);
    console.log(`A6 Answer: ${a6.result?.answer ? 'GENERATED (' + a6.result.answer.slice(0, 150) + '...)' : 'FAILED'}`);
    
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
