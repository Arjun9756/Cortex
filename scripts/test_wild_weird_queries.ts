import { cortexAgent } from '../packages/agent/graph/workflow.js';

async function testHinglishSlangQuery() {
  console.log('================================================================================');
  console.log('🧪 TESTING HINGLISH SLANG QUERY: "bhai ye bata sabse phati hui repo konsi chal rhi h risk k mamle me"');
  console.log('================================================================================\n');

  const query = "bhai ye bata sabse phati hui repo konsi chal rhi h risk k mamle me";
  console.log(`Query: "${query}"`);

  const result = await cortexAgent.invoke({ query }, { recursionLimit: 20 });
  console.log(`\n🛠️ Executed Tools:`, result.executedTools);
  console.log(`\n📄 Generated Answer:\n${result.answer}`);

  console.log('\n================================================================================');
  console.log('✅ TEST COMPLETED');
  console.log('================================================================================\n');

  process.exit(0);
}

testHinglishSlangQuery().catch(console.error);
