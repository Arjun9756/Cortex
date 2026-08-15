import { cortexAgent } from '../packages/agent/graph/workflow.js';

async function testAutonomousLLMFunctionCalling() {
  console.log('=====================================================================');
  console.log('🤖 TESTING AUTONOMOUS LLM DYNAMIC FUNCTION CALLING (NO INTENT ROUTER)');
  console.log('=====================================================================\n');

  const testQueries = [
    "konsi repo me risk jyda h sabse",
    "which repo has bus factor 1",
    "what is Arjun's email and role",
    "what happens if Arjun leaves the team",
    "why was Redis replaced with Valkey",
    "Who is Priya Sharma, what's her knowledge risk, and which repository is riskiest?"
  ];

  for (const query of testQueries) {
    console.log(`\n---------------------------------------------------------------------`);
    console.log(`User Query: "${query}"`);
    try {
      const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 });
      console.log(`Executed Tools:`, result.executedTools);
      if (result.sqlResult?.length) console.log(`SQL Context Count:`, result.sqlResult.length);
      if (result.knowledgeRiskResult) console.log(`Knowledge Risk Result:`, Boolean(result.knowledgeRiskResult));
      if (result.graphResult?.length) console.log(`Graph Context Count:`, result.graphResult.length);
      console.log(`Answer Preview:\n${(result.answer || '').slice(0, 200)}...`);
    } catch (err: any) {
      console.error(`Error executing query:`, err?.message);
    }
  }

  console.log('\n=====================================================================');
  console.log('✅ AUTONOMOUS LLM DYNAMIC FUNCTION CALLING AUDIT COMPLETED');
  console.log('=====================================================================\n');

  process.exit(0);
}

testAutonomousLLMFunctionCalling().catch(console.error);
