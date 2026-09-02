import sql from '../apps/api/config/postgres.js';
import { ensurePostgresTables } from '../packages/database/postgres/schema.js';

async function testAutoTableCreation() {
    console.log('--- Testing PostgreSQL Auto Table Creation ---');
    try {
        // Drop test tables to simulate fresh database
        console.log('1. Dropping potential_duplicates and daily_reports tables to simulate fresh DB...');
        await sql`DROP TABLE IF EXISTS potential_duplicates CASCADE`;
        await sql`DROP TABLE IF EXISTS daily_reports CASCADE`;

        // Verify they are gone
        const checkBefore = await sql`
            SELECT table_name FROM information_schema.tables 
            WHERE table_name IN ('potential_duplicates', 'daily_reports')
        `;
        console.log('Tables present after drop:', checkBefore.map(r => r.table_name));

        // 2. Run ensurePostgresTables
        console.log('2. Running ensurePostgresTables()...');
        await ensurePostgresTables();

        // 3. Verify tables were recreated
        const checkAfter = await sql`
            SELECT table_name FROM information_schema.tables 
            WHERE table_name IN ('potential_duplicates', 'daily_reports')
        `;
        console.log('Tables present after ensurePostgresTables():', checkAfter.map(r => r.table_name));

        if (checkAfter.length === 2) {
            console.log('✅ SUCCESS: All tables auto-created cleanly without manual migration steps!');
        } else {
            console.error('❌ FAILURE: Tables were not auto-created.');
        }

    } catch (e: any) {
        console.error('Error in testAutoTableCreation:', e);
    }
    process.exit(0);
}

testAutoTableCreation();
