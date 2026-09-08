import { runSafeQuery } from '../packages/agent/graph/nodes/sql.node.js';
import { cortexAgent } from '../packages/agent/graph/workflow.js';

async function testRecentActivity() {
    console.log('--- Testing Generic recent_activity Tool ---\n');

    // 1. Direct Query Test
    console.log('[TEST 1] Testing runSafeQuery for generic recent_activity...');
    try {
        const teamResults = await runSafeQuery('recent_activity', { limit: 3 });
        console.log(`Team-wide recent_activity returned ${teamResults.length} records:`);
        for (const item of teamResults) {
            console.log(`  - [${item.formatted_date}] ${item.author} -> ${item.event_type} in "${item.repository}": "${item.summary?.slice(0, 60)}"`);
        }
        console.log('✔ [TEST 1 PASSED]: Generic recent activity query succeeded.\n');
    } catch (err: any) {
        console.error('✘ Test 1 failed:', err.message);
    }

    // 2. Query with Author (including partial/typo)
    console.log('[TEST 2] Testing runSafeQuery with author name...');
    try {
        const authorResults = await runSafeQuery('recent_activity', { author: 'Rohan Verma', limit: 3 });
        console.log(`Author recent_activity returned ${authorResults.length} records.`);
        for (const item of authorResults) {
            console.log(`  - [${item.formatted_date}] ${item.author} -> ${item.event_type}: "${item.summary?.slice(0, 60)}"`);
        }
        console.log('✔ [TEST 2 PASSED]: Author query succeeded.\n');
    } catch (err: any) {
        console.error('✘ Test 2 failed:', err.message);
    }

    // 3. End-to-end Agent Test with User's Exact Query
    console.log('[TEST 3] Running full Cortex Agent on User Query:');
    const userQuery = 'rohan vermna ne latest kya kra h abhi english m bta or konsi date m kra';
    console.log(`Query: "${userQuery}"\n`);

    try {
        const stateResult = await cortexAgent.invoke({
            query: userQuery,
            iterationCount: 0,
            pendingTools: [],
            executedTools: [],
            subgoals: [],
            coveredGoals: [],
            missingGoals: [],
            entities: [],
            vectorResult: [],
            graphResult: [],
            sqlResult: [],
            evidence: '',
            structuredEvidence: [],
            metrics: {
                totalDurationMs: 0,
                retrievalPasses: 0,
                toolLatencies: {},
                toolOrder: [],
                evidenceConfidence: 0.85
            }
        });

        console.log('\n============================================================');
        console.log('AGENT FINAL ANSWER:');
        console.log(stateResult.answer);
        console.log('============================================================\n');
        console.log('Executed Tools:', stateResult.executedTools);
        console.log('✔ [TEST 3 PASSED]: End-to-end query executed successfully!');
    } catch (err: any) {
        console.error('✘ Test 3 error:', err);
    }

    process.exit(0);
}

testRecentActivity();
