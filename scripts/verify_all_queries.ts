import { cortexAgent } from '../packages/agent/graph/workflow.js';

async function verifyAllQueriesInNode() {
  console.log('================================================================================');
  console.log('🧪 VERIFYING ALL CHATBOT QUERY SCENARIOS DIRECTLY THROUGH CORTEX AGENT WORKFLOW');
  console.log('================================================================================\n');

  const testCases = [
    { name: 'Repo Bus Factor 1', query: 'which repo has bus factor 1' },
    { name: 'Hinglish Repo Risk', query: 'konsi repo me risk jyda h sabse' },
    { name: 'English Repo Risk', query: 'Which repository has higher risk' },
    { name: 'SPOF Query', query: 'single point of failure repositories' },
    { name: 'Person Departure Risk', query: 'what happens if Arjun Kumar leaves' },
    { name: 'Person Contact Info', query: 'what is Arjun Kumar email and role' },
    { name: 'Technology Usage', query: 'what technologies does Arjun Kumar use' },
    { name: 'Vector Architectural Decision', query: 'why was Redis replaced with Valkey' },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[TEST: ${tc.name}] Query: "${tc.query}"`);
    try {
      const result = await cortexAgent.invoke({ query: tc.query }, { recursionLimit: 20 });
      console.log(` 🛠️ Executed Tools: [${result.executedTools.join(', ')}]`);
      const answer = (result.answer || '').replace(/\n/g, ' ');
      console.log(` 💬 Answer Preview: ${answer.slice(0, 160)}...`);

      let isSuccess = true;
      let failureReason = '';

      if (!result.executedTools.length) {
        isSuccess = false;
        failureReason = 'No tools executed';
      } else if (answer.includes('does not contain any knowledge-risk data for repositories')) {
        isSuccess = false;
        failureReason = 'Confused person risk with repo risk';
      }

      if (isSuccess) {
        passed++;
        console.log(` ✅ RESULT: PASS`);
      } else {
        failed++;
        console.log(` ❌ RESULT: FAIL - ${failureReason}`);
      }
    } catch (err: any) {
      failed++;
      console.error(` ❌ RESULT: ERROR - ${err?.message}`);
    }
  }

  console.log('\n================================================================================');
  console.log(`📊 FINAL VERIFICATION: ${passed} PASSED / ${failed} FAILED out of ${testCases.length}`);
  console.log('================================================================================\n');

  process.exit(failed === 0 ? 0 : 1);
}

verifyAllQueriesInNode().catch(console.error);
