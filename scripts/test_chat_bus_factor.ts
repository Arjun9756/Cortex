import { routeQueryIntent } from '../packages/agent/router/intentRouter.js';
import { runSafeQuery } from '../packages/agent/graph/nodes/sql.node.ts';

async function testHinglishQuery() {
  console.log('=====================================================================');
  console.log('🤖 TESTING HINGLISH QUERY: "konsi repo me risk jyda h sabse"');
  console.log('=====================================================================\n');

  const query = "konsi repo me risk jyda h sabse";
  console.log(`Input Query: "${query}"`);

  const matched = routeQueryIntent(query);
  console.log(`\nMatched Intent Output:`, matched);

  if (matched?.tool === 'sql_search' && matched?.queryType === 'repo_risk') {
    console.log(`\n✅ PASS: Successfully routed to sql_search (repo_risk)!`);
  } else {
    console.error(`\n❌ FAIL: Routed to wrong tool:`, matched);
  }

  const metrics = await runSafeQuery('repo_risk', {});
  console.log(`\nPostgres repo_metrics count:`, metrics.length);
  console.log(`Sample metrics:`, metrics);

  console.log('=====================================================================\n');
  process.exit(0);
}

testHinglishQuery().catch(console.error);
