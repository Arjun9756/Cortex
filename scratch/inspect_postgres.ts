import sql from '../apps/api/config/postgres.js';

async function inspectPostgres() {
    try {
        console.log('=== 1. TABLES IN POSTGRES ===');
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `;
        console.log('Tables:', tables.map(t => t.table_name));

        console.log('\n=== 2. REPO_METRICS ===');
        const repos = await sql`SELECT * FROM repo_metrics`;
        console.table(repos);

        console.log('\n=== 3. PERSON_METRICS (if exists) ===');
        try {
            const persons = await sql`SELECT * FROM person_metrics`;
            console.table(persons);
        } catch (e: any) {
            console.log('person_metrics table error:', e.message);
        }

        console.log('\n=== 4. RECENT EVENTS SAMPLE / AUTHORS ===');
        const authors = await sql`
            SELECT author, count(*) as event_count, max(created_at) as latest_event
            FROM events
            GROUP BY author
            ORDER BY event_count DESC
        `;
        console.table(authors);

    } finally {
        await sql.end();
        process.exit(0);
    }
}

inspectPostgres();
