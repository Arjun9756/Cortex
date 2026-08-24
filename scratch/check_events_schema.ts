import sql from '../apps/api/config/postgres.js';

async function checkEventsSchema() {
    const cols = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'events'
    `;
    console.table(cols);
    const sample = await sql`SELECT * FROM events LIMIT 3`;
    console.log('Sample event:', sample);
    await sql.end();
    process.exit(0);
}
checkEventsSchema();
