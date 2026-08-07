import { cortexAgent } from '../packages/agent/graph/workflow.js';
import { driver } from '../apps/api/config/neo4j.js';

async function testQuery(label: string, query: string) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`TEST: ${label}`);
    console.log(`QUERY: "${query}"`);
    console.log('='.repeat(80));
    const tStart = Date.now();
    try {
        const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 });
        const elapsed = Date.now() - tStart;
        console.log(`\nEND-TO-END LATENCY: ${elapsed}ms`);
        console.log(`\n--- FINAL ANSWER ---`);
        console.log(result.answer);
        console.log(`--- END ANSWER ---`);
        console.log(`\nEXECUTION METADATA:`);
        console.log(JSON.stringify({
            tools: result.executedTools,
            graphAction: result.graphAction,
            graphTarget: result.graphTarget,
            entities: result.entities,
            needsClarification: Boolean(result.clarificationQuestion),
            clarificationQuestion: result.clarificationQuestion || undefined,
            graphResultCount: result.graphResult?.length ?? 0,
            vectorResultCount: result.vectorResult?.length ?? 0,
            sqlResultCount: result.sqlResult?.length ?? 0,
            hasKnowledgeRisk: Boolean(result.knowledgeRiskResult),
        }, null, 2));
    } catch (err: any) {
        const elapsed = Date.now() - tStart;
        console.error(`ERROR after ${elapsed}ms:`, err.message);
        console.error(err.stack);
    }
}

async function checkAmbiguousNames() {
    console.log('\n' + '='.repeat(80));
    console.log('PRE-CHECK: Finding PERSON nodes with "arjun" in the name');
    console.log('='.repeat(80));
    const session = driver.session();
    try {
        const result = await session.run(`MATCH (n:PERSON) WHERE toLower(n.name) CONTAINS 'arjun' RETURN n.name AS name`);
        const names = result.records.map((r: any) => r.get('name'));
        console.log(`Found ${names.length} PERSON nodes matching "arjun": ${JSON.stringify(names)}`);
        return names;
    } finally {
        await session.close();
    }
}

async function main() {
    // PRE-CHECK: Find ambiguous names for TEST 3
    const arjunNames = await checkAmbiguousNames();

    // TEST 1: countByLabel
    await testQuery(
        'TEST 1: countByLabel — "How many total Priya are there"',
        'How many total Priya are there'
    );

    // TEST 2: Multi-hop (expected to still fail with empty result)
    await testQuery(
        'TEST 2: Multi-hop (expected empty) — "List all developers who worked on Redis"',
        'List all developers who worked on Redis'
    );

    // TEST 3: Compound query with partial clarification
    if (arjunNames.length >= 2) {
        console.log('\n[TEST 3 SETUP] Multiple Arjun names found — testing compound clarification');
        await testQuery(
            'TEST 3: Compound + Clarification — "Why did we switch to Valkey and what is Arjun\'s email?"',
            "Why did we switch to Valkey and what is Arjun's email?"
        );
    } else {
        console.log('\n[TEST 3 SETUP] Only one Arjun found — testing with unambiguous name');
        await testQuery(
            'TEST 3: Compound (no ambiguity) — "Why did we switch to Valkey and what is Arjun\'s email?"',
            "Why did we switch to Valkey and what is Arjun's email?"
        );
    }

    // TEST 4: Edge case — name that doesn't exist
    await testQuery(
        'TEST 4: Edge case — "How many total Zzxyq are there"',
        'How many total Zzxyq are there'
    );

    // TEST 5: Regression check — unambiguous entity query
    await testQuery(
        'TEST 5: Regression — "What is Priya Sharma\'s email?"',
        "What is Priya Sharma's email?"
    );

    console.log('\n' + '='.repeat(80));
    console.log('ALL TESTS COMPLETE');
    console.log('='.repeat(80));
    process.exit(0);
}

main();
