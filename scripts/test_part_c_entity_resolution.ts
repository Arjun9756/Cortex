/**
 * test_part_c_entity_resolution.ts
 *
 * PART C: Entity Resolution Robustness tests.
 * Tests informal name references, typos, and entity extraction edge cases.
 *
 * Usage:
 *   npx tsx scripts/test_part_c_entity_resolution.ts
 */

import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { searchEntityCandidates } from '../packages/graph/cypher/analysis.cypher.js';
import { resolveGraphEntity } from '../packages/graph/graph.service.js';
import { routeQueryIntent } from '../packages/agent/router/intentRouter.js';

function separator(title: string) {
    console.log('\n' + '='.repeat(80));
    console.log(`  ${title}`);
    console.log('='.repeat(80));
}

// ─── C1: Informal name references ────────────────────────────────────────────

async function testC1() {
    separator('TEST C1 — Informal name references');
    console.log('Testing: "does arjun k still own billing" (lowercase, partial name, no punctuation)\n');

    // Step 1: Check intent router
    const query = 'does arjun k still own billing';
    const intentMatch = routeQueryIntent(query);
    console.log(`[IntentRouter] Result: ${intentMatch ? `MATCHED ${intentMatch.intentId}` : 'NO MATCH (falls to LLM)'}`);

    // Step 2: Test entity resolution directly with informal reference
    console.log('\n[Entity Resolution] Direct test with "arjun k":');
    const candidates1 = await searchEntityCandidates('arjun k');
    console.log(`  searchEntityCandidates("arjun k"): ${candidates1.length} candidates`);
    for (const c of candidates1) {
        console.log(`    - ${c.name} (${c.type}) email=${c.email || 'N/A'} externalId=${c.externalId?.slice(0, 20) || 'N/A'}`);
    }

    console.log('\n[Entity Resolution] Direct test with "arjun":');
    const candidates2 = await searchEntityCandidates('arjun');
    console.log(`  searchEntityCandidates("arjun"): ${candidates2.length} candidates`);
    for (const c of candidates2) {
        console.log(`    - ${c.name} (${c.type}) email=${c.email || 'N/A'} externalId=${c.externalId?.slice(0, 20) || 'N/A'}`);
    }

    console.log('\n[Entity Resolution] resolveGraphEntity("arjun"):');
    const resolution = await resolveGraphEntity('arjun');
    console.log(`  Selected: ${resolution.selected?.name || 'NONE'}`);
    console.log(`  Candidates: ${resolution.candidates.length}`);

    // Step 3: Full pipeline test
    console.log('\n[Full Pipeline] Running query through cortexAgent...');
    const pipelineStart = performance.now();
    try {
        const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 });
        const elapsed = (performance.now() - pipelineStart).toFixed(1);
        console.log(`  Latency: ${elapsed}ms`);
        console.log(`  Tools: ${JSON.stringify(result.executedTools)}`);
        console.log(`  Entities: ${JSON.stringify(result.entities)}`);
        console.log(`  Answer (first 300 chars): ${(result.answer || '').slice(0, 300)}`);
    } catch (e: any) {
        console.log(`  ERROR: ${e?.message}`);
    }
}

// ─── C2: Typo handling ────────────────────────────────────────────────────────

async function testC2() {
    separator('TEST C2 — Typo handling');
    console.log('Testing: "What repos does Sarha Chen work on" (typo in first name)\n');

    // Step 1: Check intent router
    const query = 'What repos does Sarha Chen work on';
    const intentMatch = routeQueryIntent(query);
    console.log(`[IntentRouter] Result: ${intentMatch ? `MATCHED ${intentMatch.intentId}` : 'NO MATCH'}`);
    if (intentMatch) {
        console.log(`  Entities extracted: ${JSON.stringify(intentMatch.entities)}`);
    }

    // Step 2: Test entity resolution with typo
    console.log('\n[Entity Resolution] Direct test with "Sarha Chen":');
    const candidates = await searchEntityCandidates('Sarha Chen');
    console.log(`  searchEntityCandidates("Sarha Chen"): ${candidates.length} candidates`);
    for (const c of candidates) {
        console.log(`    - ${c.name} (${c.type}) email=${c.email || 'N/A'}`);
    }

    // Token-based fallback test
    console.log('\n[Entity Resolution] Direct test with "Chen" token:');
    const chenCandidates = await searchEntityCandidates('Chen');
    console.log(`  searchEntityCandidates("Chen"): ${chenCandidates.length} candidates`);
    for (const c of chenCandidates) {
        console.log(`    - ${c.name} (${c.type}) email=${c.email || 'N/A'}`);
    }

    // Step 3: Full pipeline test
    console.log('\n[Full Pipeline] Running query through cortexAgent...');
    const pipelineStart = performance.now();
    try {
        const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 });
        const elapsed = (performance.now() - pipelineStart).toFixed(1);
        console.log(`  Latency: ${elapsed}ms`);
        console.log(`  Tools: ${JSON.stringify(result.executedTools)}`);
        console.log(`  Entities resolved: ${JSON.stringify(result.entities)}`);
        console.log(`  Graph result: ${JSON.stringify(result.graphResult)?.slice(0, 500)}`);
        console.log(`  Answer (first 300 chars): ${(result.answer || '').slice(0, 300)}`);
        console.log(`  Clarification: ${result.clarificationQuestion || 'None'}`);
    } catch (e: any) {
        console.log(`  ERROR: ${e?.message}`);
    }
}

// ─── C3: Entity extraction mechanism documentation ────────────────────────────

async function testC3() {
    separator('TEST C3 — Entity extraction mechanism documentation');
    console.log('Documenting how entity extraction works in the current system:\n');

    console.log('ENTITY EXTRACTION FLOW:');
    console.log('  1. Intent Router (intentRouter.ts) — extractPersonName()');
    console.log('     - Uses capitalized-word NER regex as primary strategy');
    console.log('     - Possessive detection (Arjun\'s → Arjun)');
    console.log('     - Preposition fallback (for/of/about <name>)');
    console.log('     - Only works with CAPITALIZED names (Sarah Chen, Arjun)');
    console.log('     - Lowercase names (sarah chen) skip this, go to LLM planner\n');

    console.log('  2. LLM Planner (planner.node.ts)');
    console.log('     - Uses Groq function-calling to extract entities from queries');
    console.log('     - Works with ANY casing, informal references, typos');
    console.log('     - Costs ~1.5-28s latency (LLM round-trip)\n');

    console.log('  3. Graph Entity Resolution (graph.service.ts + analysis.cypher.ts)');
    console.log('     - searchEntityCandidates() does CONTAINS matching on name/email/externalId');
    console.log('     - Token-based fallback for multi-word queries with typos');
    console.log('     - resolveGraphEntity() auto-selects if only 1 candidate\n');

    console.log('TRADE-OFF:');
    console.log('  - Fast-path (intent router) requires properly capitalized names');
    console.log('  - Fully novel-phrased or lowercase entity queries always go through slower LLM path');
    console.log('  - This is INTENTIONAL and expected — the fast-path optimizes for the common case');
    console.log('  - Entity resolution (step 3) handles typos/partials AFTER extraction\n');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  PART C: ENTITY RESOLUTION ROBUSTNESS TESTS                                   ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
    console.log(`Start time: ${new Date().toISOString()}\n`);

    await testC1();
    await testC2();
    await testC3();

    console.log('\n' + '='.repeat(80));
    console.log('  PART C TESTS COMPLETE');
    console.log('='.repeat(80));
    console.log(`End time: ${new Date().toISOString()}`);

    process.exit(0);
}

main().catch((err) => {
    console.error('FATAL ERROR:', err);
    process.exit(1);
});
