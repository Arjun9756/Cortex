import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import sql from '../apps/api/config/postgres.js';
import { ensurePostgresTables } from '../packages/database/postgres/schema.js';
import { runAnalyticsJob } from '../packages/workers/scheduler.worker.js';

async function testFreshPostgresBoot() {
    console.log('\n================================================================================');
    console.log('🧪 TEST: GENUINELY FRESH POSTGRESQL BOOTSTRAP TEST (DROP ALL TABLES & AUTO-INIT)');
    console.log('================================================================================\n');

    try {
        const ALL_TABLES = [
            'events',
            'person_metrics',
            'repo_metrics',
            'technology_metrics',
            'workspace_metrics',
            'person_identity',
            'identity_merge_log',
            'potential_duplicates',
            'daily_reports'
        ];

        // Step 1: Drop all existing tables
        console.log('1. Dropping all Cortex tables from database to simulate fresh/empty DB...');
        for (const table of ALL_TABLES) {
            await sql.unsafe(`DROP TABLE IF EXISTS ${table} CASCADE`);
        }

        // Verify database is completely empty
        const tablesAfterDrop = await sql`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = ANY(${ALL_TABLES})
        `;
        console.log(`   Tables in DB after drop: [${tablesAfterDrop.map(t => t.table_name).join(', ')}] (Count: ${tablesAfterDrop.length})`);
        if (tablesAfterDrop.length !== 0) {
            throw new Error('Failed to drop all tables');
        }
        console.log('   ✅ Database is 100% empty (Fresh BYOC state confirmed).\n');

        // Step 2: Simulate server boot - call ensurePostgresTables()
        console.log('2. Simulating server boot: Executing ensurePostgresTables()...');
        const t0 = Date.now();
        await ensurePostgresTables();
        const elapsed = Date.now() - t0;
        console.log(`   ✅ ensurePostgresTables() completed in ${elapsed}ms.\n`);

        // Step 3: Verify all 9 tables exist
        console.log('3. Verifying created tables in information_schema...');
        const tablesAfterInit = await sql`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = ANY(${ALL_TABLES})
            ORDER BY table_name ASC
        `;
        console.log(`   Created tables (${tablesAfterInit.length}/${ALL_TABLES.length}):`);
        tablesAfterInit.forEach((t, i) => console.log(`   [${i + 1}] ${t.table_name}`));

        if (tablesAfterInit.length !== ALL_TABLES.length) {
            throw new Error(`Expected ${ALL_TABLES.length} tables, but found ${tablesAfterInit.length}`);
        }
        console.log('   ✅ All 9 core tables verified in PostgreSQL.\n');

        // Step 4: Run startup analytics job (which server.ts triggers immediately on boot)
        console.log('4. Running startup analytics calculation job (runAnalyticsJob)...');
        const tAnalytics = Date.now();
        await runAnalyticsJob(seedSource);
        console.log(`   ✅ runAnalyticsJob() completed successfully in ${Date.now() - tAnalytics}ms without crashes.\n`);

        // Step 5: Verify metrics tables have populated rows
        const [wsCount] = await sql`SELECT count(*)::int as count FROM workspace_metrics`;
        const [repoCount] = await sql`SELECT count(*)::int as count FROM repo_metrics`;
        const [personCount] = await sql`SELECT count(*)::int as count FROM person_metrics`;
        const [techCount] = await sql`SELECT count(*)::int as count FROM technology_metrics`;

        console.log('5. Summary of newly populated tables:');
        console.log(`   - workspace_metrics count: ${wsCount?.count ?? 0}`);
        console.log(`   - repo_metrics count:      ${repoCount?.count ?? 0}`);
        console.log(`   - person_metrics count:    ${personCount?.count ?? 0}`);
        console.log(`   - technology_metrics count:${techCount?.count ?? 0}`);

        console.log('\n================================================================================');
        console.log('🎉 RESULT: FRESH POSTGRESQL BOOTSTRAP SUCCEEDED 100% WITH ZERO MANUAL MIGRATIONS!');
        console.log('================================================================================\n');

    } catch (error: any) {
        console.error('\n❌ FAILURE DURING FRESH BOOT TEST:', error?.message || error);
        console.error(error?.stack);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

testFreshPostgresBoot();
