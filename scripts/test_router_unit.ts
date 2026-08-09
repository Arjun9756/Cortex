/**
 * test_router_unit.ts
 *
 * Unit tests for the intent router — no external service connections needed.
 * Tests extractPersonName and routeQueryIntent functions directly.
 *
 * Usage:
 *   npx tsx scripts/test_router_unit.ts
 */

import { routeQueryIntent } from '../packages/agent/router/intentRouter.js';

function test(label: string, query: string) {
    const start = performance.now();
    const result = routeQueryIntent(query);
    const elapsed = (performance.now() - start).toFixed(3);

    console.log(`\n[${label}] Query: "${query}"`);
    console.log(`  Time: ${elapsed}ms`);
    if (result) {
        console.log(`  MATCHED: ${result.intentId}`);
        console.log(`  Tool: ${result.tool}, Action: ${result.action || 'N/A'}, Target: ${result.target || 'N/A'}`);
        console.log(`  Entities: ${JSON.stringify(result.entities)}`);
        console.log(`  PersonName: ${JSON.stringify(result.personName)}`);
    } else {
        console.log(`  NO MATCH (falls through to LLM Planner)`);
    }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  INTENT ROUTER UNIT TESTS — extractPersonName + routing');
console.log('═══════════════════════════════════════════════════════════');

console.log('\n--- A1: EXACT YAML phrasing ---');
test('A1.1', 'What repos does Sarah Chen work on?');
test('A1.2', "What is Arjun's email and role?");
test('A1.3', 'What happens if Arjun leaves?');

console.log('\n--- A2: DIFFERENT phrasing (same intents) ---');
test('A2.1', 'How many repos does Sarah Chen work in?');
test('A2.2', "Can you tell me Arjun's email address");
test('A2.3', 'If Arjun quit tomorrow, what would happen?');

console.log('\n--- A3: Should NOT match (novel query) ---');
test('A3', 'Compare code review velocity between the billing team and notification team over the last month.');

console.log('\n--- A5: Zero-result query ---');
test('A5', 'how many total Zzxyq are there');

console.log('\n--- Additional phrasing variations ---');
test('V1', 'Which repositories is Sarah Chen contributing to?');
test('V2', 'Show me the repos Sarah Chen works on');
test('V3', "Tell me Arjun Kumar's role and email");
test('V4', 'What is the knowledge risk for Arjun?');
test('V5', 'What happens if Sarah Chen leaves the team?');
test('V6', 'does arjun k still own billing');
test('V7', 'What repos does Sarha Chen work on');  // typo test

console.log('\n--- Entity extraction edge cases ---');
test('E1', 'What projects does Priya Sharma work on?');
test('E2', 'email of Rohan Verma');
test('E3', 'who is Sarah Chen');
test('E4', 'What is the departure risk for Priya?');
test('E5', 'list all repositories');

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  TESTS COMPLETE');
console.log('═══════════════════════════════════════════════════════════');
