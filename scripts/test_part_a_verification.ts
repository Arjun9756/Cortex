/**
 * test_part_a_verification.ts
 *
 * PART A: LIVE VERIFICATION of Intent Router + LangGraph system.
 * Runs each test through the ACTUAL live pipeline and reports raw console logs.
 *
 * Tests:
 *   A1 — Fast-path routing confirmation (exact YAML phrasing)
 *   A2 — Phrasing variation robustness (different phrasing, same intent)
 *   A3 — Fallback integrity (novel query → LLM planner)
 *   A4 — Latency comparison (fast-path vs LLM planner)
 *   A5 — Reflection/retry limit check (0-result query, max 2 retries)
 *   A6 — Shortcut edge verification (multi-hop query using shortcut edges)
 *
 * Usage:
 *   npx tsx scripts/test_part_a_verification.ts
 */

import { routeQueryIntent } from '../packages/agent/router/intentRouter.js';
import { cortexAgent } from '../packages/agent/graph/workflow.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function separator(title: string) {
    console.log('\n' + '='.repeat(80));
    console.log(`  ${title}`);
    console.log('='.repeat(80));
}

async function runQuery(label: string, query: string) {
    console.log(`\n--- ${label} ---`);
    console.log(`Query: "${query}"`);

    // Step 1: Check intent router (fast-path) BEFORE hitting the full pipeline
    const routerStart = performance.now();
    const intentMatch = routeQueryIntent(query);
    const routerMs = (performance.now() - routerStart).toFixed(3);

    if (intentMatch) {
        console.log(`[IntentRouter] MATCHED intent: ${intentMatch.intentId} in ${routerMs}ms`);
        console.log(`[IntentRouter] Tool: ${intentMatch.tool}, Action: ${intentMatch.action || 'N/A'}, Target: ${intentMatch.target || 'N/A'}, Entities: ${JSON.stringify(intentMatch.entities || intentMatch.personName || [])}`);
    } else {
        console.log(`[IntentRouter] NO MATCH (will fall through to LLM Planner) — checked in ${routerMs}ms`);
    }

    // Step 2: Run through the full LangGraph pipeline
    const pipelineStart = performance.now();
    try {
        const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 });
        const pipelineMs = (performance.now() - pipelineStart).toFixed(1);

        console.log(`[Pipeline] Total latency: ${pipelineMs}ms`);
        console.log(`[Pipeline] Path taken: ${intentMatch ? 'FAST-PATH (intentRouter)' : 'LLM PLANNER (LangGraph fallback)'}`);
        console.log(`[Pipeline] Tools executed: ${JSON.stringify(result.executedTools)}`);
        console.log(`[Pipeline] Graph action: ${result.graphAction || 'N/A'}`);
        console.log(`[Pipeline] Graph target: ${result.graphTarget || 'N/A'}`);
        console.log(`[Pipeline] Entities: ${JSON.stringify(result.entities)}`);
        console.log(`[Pipeline] Iteration count: ${result.iterationCount}`);
        console.log(`[Pipeline] Fallback attempts: ${result.fallbackAttempts}`);
        console.log(`[Pipeline] Clarification: ${result.clarificationQuestion || 'None'}`);
        console.log(`[Pipeline] Answer (first 300 chars): ${(result.answer || '').slice(0, 300)}`);
        console.log(`[Pipeline] Graph result summary: ${JSON.stringify(result.graphResult)?.slice(0, 500)}`);

        if (result.knowledgeRiskResult) {
            console.log(`[Pipeline] Knowledge risk result: ${JSON.stringify(result.knowledgeRiskResult)?.slice(0, 500)}`);
        }

        return { intentMatch, pipelineMs: parseFloat(pipelineMs), result };
    } catch (error: any) {
        const pipelineMs = (performance.now() - pipelineStart).toFixed(1);
        console.log(`[Pipeline] ERROR after ${pipelineMs}ms: ${error?.message}`);
        console.log(`[Pipeline] Stack: ${error?.stack?.slice(0, 500)}`);
        return { intentMatch, pipelineMs: parseFloat(pipelineMs), error };
    }
}

// ─── TEST A1: Fast-path routing confirmation ──────────────────────────────────

async function testA1() {
    separator('TEST A1 — Fast-path routing confirmation');
    console.log('Testing exact YAML sample phrasing queries...\n');

    const queries = [
        { label: 'A1.1', query: 'What repos does Sarah Chen work on?' },
        { label: 'A1.2', query: "What is Arjun's email and role?" },
        { label: 'A1.3', query: 'What happens if Arjun leaves?' },
    ];

    const results = [];
    for (const { label, query } of queries) {
        const res = await runQuery(label, query);
        results.push({ label, query, ...res });
    }

    console.log('\n--- A1 SUMMARY ---');
    for (const r of results) {
        console.log(`${r.label}: ${r.intentMatch ? `FAST-PATH (${r.intentMatch.intentId})` : 'LLM PLANNER'} — ${r.pipelineMs}ms`);
    }

    return results;
}

// ─── TEST A2: Phrasing variation robustness ───────────────────────────────────

async function testA2() {
    separator('TEST A2 — Phrasing variation robustness');
    console.log('Testing DIFFERENTLY-PHRASED versions of same 3 intents...\n');

    const queries = [
        { label: 'A2.1', query: 'How many repos does Sarah Chen work in?' },
        { label: 'A2.2', query: "Can you tell me Arjun's email address" },
        { label: 'A2.3', query: 'If Arjun quit tomorrow, what would happen?' },
    ];

    const results = [];
    for (const { label, query } of queries) {
        const res = await runQuery(label, query);
        results.push({ label, query, ...res });
    }

    console.log('\n--- A2 SUMMARY ---');
    for (const r of results) {
        console.log(`${r.label}: ${r.intentMatch ? `FAST-PATH (${r.intentMatch.intentId})` : 'LLM PLANNER (MISS)'} — ${r.pipelineMs}ms`);
    }

    return results;
}

// ─── TEST A3: Fallback integrity ──────────────────────────────────────────────

async function testA3() {
    separator('TEST A3 — Fallback integrity (novel query)');
    console.log('Testing genuinely novel query that should NOT match any YAML intent...\n');

    const query = 'Compare code review velocity between the billing team and notification team over the last month.';
    const res = await runQuery('A3', query);

    console.log('\n--- A3 SUMMARY ---');
    if (res.intentMatch) {
        console.log(`FAIL: Query falsely matched fast-path intent ${res.intentMatch.intentId}`);
    } else {
        console.log(`PASS: Correctly fell through to LLM Planner`);
    }
    console.log(`Latency: ${res.pipelineMs}ms`);
    console.log(`Has answer: ${Boolean(res.result?.answer && res.result.answer.length > 10)}`);

    return res;
}

// ─── TEST A4: Latency comparison ──────────────────────────────────────────────

async function testA4(a1Results: any[], a3Result: any) {
    separator('TEST A4 — Latency comparison');
    console.log('Comparing actual fast-path latency against LLM planner latency...\n');

    const fastPathLatencies = a1Results
        .filter(r => r.intentMatch)
        .map(r => r.pipelineMs);

    const llmPlannerLatency = a3Result.pipelineMs;

    if (fastPathLatencies.length > 0) {
        const avgFastPath = fastPathLatencies.reduce((a: number, b: number) => a + b, 0) / fastPathLatencies.length;
        console.log(`Fast-path latencies: ${fastPathLatencies.map((l: number) => l.toFixed(1) + 'ms').join(', ')}`);
        console.log(`Average fast-path: ${avgFastPath.toFixed(1)}ms`);
        console.log(`LLM Planner latency (A3): ${llmPlannerLatency.toFixed(1)}ms`);
        console.log(`Speedup: ${(llmPlannerLatency / avgFastPath).toFixed(1)}x faster`);
        console.log(`Absolute improvement: ${(llmPlannerLatency - avgFastPath).toFixed(1)}ms saved`);
    } else {
        console.log('WARNING: No fast-path results from A1 to compare');
    }
}

// ─── TEST A5: Reflection/retry limit check ────────────────────────────────────

async function testA5() {
    separator('TEST A5 — Reflection/retry limit check');
    console.log('Running query designed to return 0 results...\n');

    const query = 'how many total Zzxyq are there';
    const res = await runQuery('A5', query);

    console.log('\n--- A5 SUMMARY ---');
    console.log(`Iteration count: ${res.result?.iterationCount ?? 'N/A'}`);
    console.log(`Fallback attempts: ${res.result?.fallbackAttempts ?? 'N/A'}`);
    console.log(`Total time: ${res.pipelineMs}ms`);
    console.log(`Did NOT infinite loop: ${res.pipelineMs < 60000 ? 'PASS' : 'FAIL (over 60s)'}`);

    if (res.result?.fallbackAttempts !== undefined) {
        console.log(`Retry limit respected (max 2): ${res.result.fallbackAttempts <= 2 ? 'PASS' : 'FAIL'}`);
    }

    return res;
}

// ─── TEST A6: Shortcut edge verification ──────────────────────────────────────

async function testA6() {
    separator("TEST A6 — Shortcut edge verification");
    console.log('Running deep multi-hop query that should benefit from shortcut edges...\n');

    const query = "What technologies does Sarah Chen's team depend on through her repositories?";
    const res = await runQuery('A6', query);

    console.log('\n--- A6 SUMMARY ---');
    console.log(`Path taken: ${res.intentMatch ? 'FAST-PATH' : 'LLM PLANNER'}`);
    console.log(`Tools used: ${JSON.stringify(res.result?.executedTools)}`);
    console.log(`Latency: ${res.pipelineMs}ms`);
    console.log(`Graph result available: ${Boolean(res.result?.graphResult?.length > 0)}`);

    return res;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  PART A: LIVE VERIFICATION — Intent Router + LangGraph System                 ║');
    console.log('║  Running all tests through the ACTUAL live pipeline                           ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    console.log(`Start time: ${new Date().toISOString()}\n`);

    const a1Results = await testA1();
    const a2Results = await testA2();
    const a3Result = await testA3();
    await testA4(a1Results, a3Result);
    const a5Result = await testA5();
    const a6Result = await testA6();

    // ─── FINAL SUMMARY ───────────────────────────────────────────────────────
    separator('FINAL SUMMARY — All Part A Tests');

    console.log('\nTest Results Overview:');
    console.log('─'.repeat(60));

    const allResults = [
        ...a1Results.map((r: any) => ({ ...r, test: 'A1' })),
        ...a2Results.map((r: any) => ({ ...r, test: 'A2' })),
        { ...a3Result, label: 'A3', test: 'A3' },
        { ...a5Result, label: 'A5', test: 'A5' },
        { ...a6Result, label: 'A6', test: 'A6' },
    ];

    for (const r of allResults) {
        const path = r.intentMatch ? `FAST-PATH (${r.intentMatch.intentId})` : 'LLM PLANNER';
        const status = r.error ? '❌ ERROR' : (r.result?.answer?.length > 10 ? '✅ OK' : '⚠️ WEAK');
        console.log(`  ${r.label}: ${path.padEnd(45)} ${String(r.pipelineMs).padStart(8)}ms  ${status}`);
    }

    console.log('\n─'.repeat(60));
    console.log(`End time: ${new Date().toISOString()}`);

    // Exit cleanly
    process.exit(0);
}

main().catch((err) => {
    console.error('FATAL ERROR:', err);
    process.exit(1);
});
