import sql from '../apps/api/config/postgres.js';

async function testMissingTableQuery() {
    console.log('Testing what happens when querying a non-existent table in Postgres (simulating fresh DB without migrations)...');
    try {
        await sql`SELECT * FROM non_existent_metrics_table_xyz LIMIT 1`;
        console.log('Success (unexpected)');
    } catch (err: any) {
        console.log('Actual Postgres Error when table is missing:');
        console.log('Error Code:', err.code);
        console.log('Error Message:', err.message);
    }
    process.exit(0);
}

testMissingTableQuery();
