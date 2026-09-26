import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import { calculateAllPersonMetrics } from '../packages/analytics/personMetrics.service.js';
import { calculateWorkspaceMetrics } from '../packages/analytics/workspaceMetrics.service.js';
import sql from '../apps/api/config/postgres.js';

async function main() {
    console.log('--- Step 1: Running calculateAllPersonMetrics ---');
    await calculateAllPersonMetrics(seedSource);
    
    console.log('\n--- Step 2: Running calculateWorkspaceMetrics ---');
    await calculateWorkspaceMetrics(seedSource);

    console.log('\n--- Done! ---');
}

main().catch(console.error).finally(async () => {
    await sql.end();
    process.exit(0);
});
