import { cortexAgent } from '../packages/agent/graph/workflow.js';

async function runComplexMasterTest() {
    console.log('\n================================================================================');
    console.log('🔥 TESTING VERY COMPLEX MASTER COMPOUND QUERY');
    console.log('================================================================================\n');

    const complexQuery = "Who is Arjun, what is his knowledge departure risk if he quits, which repos does he work on, and why was Redis replaced with Valkey in Cortex?";
    
    console.log(`📌 Master Query: "${complexQuery}"\n`);

    const result = await cortexAgent.invoke({ query: complexQuery }, { recursionLimit: 25 });
    console.log('RAW_AGENT_STATE_BEGIN');
    console.log(JSON.stringify({
        query: complexQuery,
        plan: result.plan,
        subgoals: result.subgoals,
        executedTools: result.executedTools,
        evidence: result.structuredEvidence,
        coveredGoals: result.coveredGoals,
        missingGoals: result.missingGoals,
        iterations: result.iterationCount,
        metrics: result.metrics,
        answer: result.answer,
    }, null, 2));
    console.log('RAW_AGENT_STATE_END');

    console.log('\n================================================================================');
    console.log('✅ COMPLEX QUERY TEST COMPLETE');
    console.log('================================================================================\n');

    process.exit(0);
}

runComplexMasterTest().catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
});
