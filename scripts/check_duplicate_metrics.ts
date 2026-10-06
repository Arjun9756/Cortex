import sql from '../apps/api/config/postgres.js';

async function main() {
    try {
        console.log('Checking duplicates in repo_metrics...');
        const dupes = await sql`
            SELECT external_id, count(*), array_agg(id) as ids, array_agg(source) as sources
            FROM repo_metrics
            GROUP BY external_id
            HAVING count(*) > 1
        `;
        console.log('Duplicates in repo_metrics:', JSON.stringify(dupes, null, 2));

        const personDupes = await sql`
            SELECT external_id, count(*), array_agg(id) as ids, array_agg(source) as sources
            FROM person_metrics
            GROUP BY external_id
            HAVING count(*) > 1
        `;
        console.log('Duplicates in person_metrics:', JSON.stringify(personDupes, null, 2));

        const techDupes = await sql`
            SELECT tech_name, count(*), array_agg(id) as ids, array_agg(source) as sources
            FROM technology_metrics
            GROUP BY tech_name
            HAVING count(*) > 1
        `;
        console.log('Duplicates in technology_metrics:', JSON.stringify(techDupes, null, 2));
    } catch (err) {
        console.error('Error querying DB:', err);
    } finally {
        await sql.end();
    }
}

main();
