import sql from '../apps/api/config/postgres.js';

async function main() {
    try {
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'workspace_metrics'
        `;
        console.log('workspace_metrics columns:', columns);

        const rows = await sql`SELECT * FROM workspace_metrics LIMIT 5`;
        console.log('workspace_metrics rows count:', rows.length);
    } catch (e: any) {
        console.error('Error checking DB:', e.message);
    } finally {
        process.exit(0);
    }
}

main();
