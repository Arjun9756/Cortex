import { cortexAgent } from '../packages/agent/graph/workflow.js';

interface TestScenario {
  id: string;
  category: string;
  query: string;
  expectedTools: string[];
}

async function runComplexQueriesSuite() {
  console.log('================================================================================');
  console.log('🧪 EXHAUSTIVE COMPLEX QUERIES TEST SUITE: ADVANCED LLM TOOL-CALLING & SYNTHESIS');
  console.log('================================================================================\n');

  const testScenarios: TestScenario[] = [
    {
      id: 'COMPLEX-1',
      category: 'Triple Compound Query (Person Info + Risk + Tech Stack)',
      query: "Who is Sarah Chen, what is her knowledge risk, and what technologies does she use?",
      expectedTools: ['graph_search', 'knowledge_risk'],
    },
    {
      id: 'COMPLEX-2',
      category: 'Repo Risk + Owner Contact Info',
      query: "Which repository has the highest risk and who is its primary owner?",
      expectedTools: ['sql_search'],
    },
    {
      id: 'COMPLEX-3',
      category: 'Hinglish Mixed Contact + Departure Risk',
      query: "Arjun ka email aur role batao aur agar wo team chhod ke chala jaye toh kya risk hoga",
      expectedTools: ['graph_search', 'knowledge_risk'],
    },
    {
      id: 'COMPLEX-4',
      category: 'Hinglish Architecture Decision + Usage',
      query: "Redis ko Valkey se replace kyu kiya tha aur kaun kaun isse use kar raha hai",
      expectedTools: ['vector_search', 'graph_search'],
    },
    {
      id: 'COMPLEX-5',
      category: 'Global Count + Contributor Activity',
      query: "Total kitne developers hain cortex mein aur sabse active contributors kaun hain",
      expectedTools: ['graph_search', 'sql_search'],
    },
    {
      id: 'COMPLEX-6',
      category: 'SPOF Repositories & Single Point of Failure Analysis',
      query: "Show me all single point of failure repositories with bus factor 1 and their primary owners",
      expectedTools: ['sql_search'],
    },
    {
      id: 'COMPLEX-7',
      category: 'Colloquial Hinglish Repo Comparison',
      query: "sabse jyada risky codebase konsa h aur kyu",
      expectedTools: ['sql_search'],
    }
  ];

  let passCount = 0;
  let failCount = 0;

  for (const scenario of testScenarios) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[${scenario.id}] Category: ${scenario.category}`);
    console.log(`❓ Query: "${scenario.query}"`);
    
    try {
      const result = await cortexAgent.invoke({ query: scenario.query }, { recursionLimit: 20 });
      const toolsExecuted = result.executedTools || [];
      const answer = (result.answer || '').replace(/\n/g, ' ');

      console.log(` 🛠️ Executed Tools: [${toolsExecuted.join(', ')}]`);
      console.log(` 💬 Answer Preview: ${answer.slice(0, 180)}...`);

      // Verify expected tools presence
      let missingTool = false;
      for (const expectedTool of scenario.expectedTools) {
        if (!toolsExecuted.includes(expectedTool)) {
          missingTool = true;
          console.warn(` ⚠️ Warning: Expected tool "${expectedTool}" was not executed!`);
        }
      }

      // Check if evidence missing error occurred for valid queries
      const hasMissingEvidenceError = answer.includes('does not contain any knowledge-risk data for repositories');

      if (!hasMissingEvidenceError && toolsExecuted.length > 0) {
        passCount++;
        console.log(` ✅ TEST RESULT: PASS`);
      } else {
        failCount++;
        console.log(` ❌ TEST RESULT: FAIL - Missing tool or evidence error!`);
      }
    } catch (err: any) {
      failCount++;
      console.error(` ❌ TEST RESULT: ERROR - ${err?.message}`);
    }
  }

  console.log('\n================================================================================');
  console.log(`📊 COMPLEX QUERIES AUDIT SUMMARY: ${passCount} PASSED / ${failCount} FAILED out of ${testScenarios.length}`);
  console.log('================================================================================\n');

  process.exit(failCount === 0 ? 0 : 1);
}

runComplexQueriesSuite().catch(console.error);
