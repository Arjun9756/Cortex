import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const s = driver.session();
    try {
        const res = await s.run(`
            MATCH (p:PERSON)
            WHERE toLower(p.name) CONTAINS 'rohan'
            RETURN p.name AS name, p.email AS email, p.externalId AS externalId
        `);
        console.log('Neo4j PERSON nodes for Rohan:');
        console.table(res.records.map(r => ({ name: r.get('name'), email: r.get('email'), externalId: r.get('externalId') })));

        const pm = await sql`SELECT person_name, external_id, repos, risk_score FROM person_metrics WHERE lower(person_name) LIKE '%rohan%'`;
        console.log('Postgres person_metrics for Rohan:');
        console.table(pm);

        const idRecs = await sql`SELECT * FROM person_identity WHERE lower(display_name) LIKE '%rohan%' OR lower(username) LIKE '%rohan%'`;
        console.log('Postgres person_identity:');
        console.table(idRecs);
    } finally {
        await s.close();
        await sql.end();
    }
}

main().catch(console.error);
