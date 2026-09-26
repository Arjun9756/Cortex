import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import { ensurePostgresTables } from '../packages/database/postgres/schema.js';
import { calculateAllRepoMetrics } from '../packages/analytics/repoMetrics.service.js';
import { calculateAllPersonMetrics } from '../packages/analytics/personMetrics.service.js';
import { cortexAgent } from '../packages/agent/graph/workflow.js';
import sql from '../apps/api/config/postgres.js';

async function main() {
    console.log('--- 1. Ensuring Postgres Tables & Schema ---');
    await ensurePostgresTables();

    console.log('--- 2. Computing Repo & Person Metrics ---');
    await calculateAllRepoMetrics(seedSource);
    await calculateAllPersonMetrics(seedSource);

    console.log('\n--- 2. Updated repo_metrics in Postgres ---');
    const repos = await sql`SELECT repo_name, bus_factor, risk_score, primary_owner, contributor_count FROM repo_metrics ORDER BY repo_name`;
    console.table(repos);

    console.log('\n--- 3. Testing Agent on Complex Query ---');
    const query = "What happens if Rohan Verma and Neha Gupta both leave? Who are their successors and which repos become critical? List all repos with bus factor 1 and their primary owners, then tell me who can replace each owner";
    console.log(`Executing Query: "${query}"\n`);
    
    const tStart = Date.now();
    const result = await cortexAgent.invoke({ query }, { recursionLimit: 25 });
    const elapsed = Date.now() - tStart;

    console.log(`\nAgent finished in ${elapsed}ms`);
    console.log(`Executed Tools: ${JSON.stringify(result.executedTools)}`);
    console.log('\n=== CORTEX ANSWER ===\n');
    console.log(result.answer);
    console.log('\n======================\n');

    await sql.end();
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
