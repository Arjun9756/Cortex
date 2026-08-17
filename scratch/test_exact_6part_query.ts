import { cortexAgent } from '../packages/agent/graph/workflow.js';

async function testExact6PartQuery() {
    const query = "How many total repositories and technologies are there, which repos have a bus factor of 1, what is Priya Sharma's knowledge risk and what technologies does she use, why did we replace Redis with Valkey and when, and if Arjun Kumar leaves what breaks and who's the best successor?";

    console.log('================================================================================');
    console.log('🧪 TESTING EXACT 6-PART MASTER QUERY');
    console.log('================================================================================\n');
    console.log(`Query: "${query}"\n`);

    const tStart = Date.now();
    const result = await cortexAgent.invoke({ query }, { recursionLimit: 25 });
    const totalLatency = Date.now() - tStart;

    console.log('--------------------------------------------------------------------------------');
    console.log(`Total End-to-End Latency: ${totalLatency}ms`);
    console.log(`Decomposed Subgoals (${result.subgoals?.length}):`, result.subgoals?.map((g: any) => `[${g.id}] ${g.description}`));
    console.log(`Planned Tools (${result.plan?.length}):`, result.plan?.map((t: any) => `[${t.subgoalId}] ${t.name}(${JSON.stringify(t.args)})`));
    console.log(`Executed Tools: [${(result.executedTools || []).join(', ')}]`);
    console.log(`Structured Evidence Count: ${result.structuredEvidence?.length}`);
    console.log(`Covered Goals (${result.coveredGoals?.length}):`, result.coveredGoals);
    console.log(`Missing Goals (${result.missingGoals?.length}):`, result.missingGoals);
    console.log(`Iterations / Passes: ${result.iterationCount}`);
    console.log(`Evidence Confidence: ${Math.round((result.evidenceConfidence || 1) * 100)}%`);
    console.log('--------------------------------------------------------------------------------');
    console.log('\nFINAL SYNTHESIS ANSWER:\n');
    console.log(result.answer);
    console.log('\n================================================================================\n');

    process.exit(0);
}

testExact6PartQuery().catch(err => {
    console.error('Error running exact 6-part test:', err);
    process.exit(1);
});
