import sql from '../apps/api/config/postgres.js';

async function main() {
    const deleted = await sql`
        DELETE FROM person_identity 
        WHERE external_id LIKE 'gh_shared_%' 
           OR external_id LIKE 'sl_shared_%' 
           OR external_id LIKE 'gh_john_%' 
           OR external_id LIKE 'gh_anon_%' 
           OR external_id LIKE 'sl_anon_%'
           OR external_id LIKE 'gh_id_scale_%'
    `;
    console.log(`Deleted ${deleted.count} leftover test identity rows.`);
    const count = await sql`SELECT count(*)::int FROM person_identity`;
    console.log(`Remaining person_identity count: ${count[0].count}`);
    await sql.end();
}

main().catch(console.error);
