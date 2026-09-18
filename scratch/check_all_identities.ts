import sql from '../apps/api/config/postgres.js';
import { neo4jSession, driver } from '../apps/api/config/neo4j.js';

async function check() {
    console.log('=== ALL PERSON_METRICS ===');
    const metrics = await sql`SELECT external_id, person_name, risk_score, repos, commit_count FROM person_metrics`;
    console.table(metrics);

    console.log('\n=== ALL PERSON_IDENTITY ===');
    const identities = await sql`SELECT provider, external_id, username, email, display_name, canonical_person_id FROM person_identity`;
    console.table(identities);

    console.log('\n=== NEO4J PERSON NODES ===');
    const session = neo4jSession();
    try {
        const res = await session.run(`
            MATCH (p:PERSON)
            RETURN p.name AS name, p.email AS email, p.canonicalPersonId AS canonicalPersonId, p.externalId AS externalId
        `);
        console.table(res.records.map(r => ({
            name: r.get('name'),
            email: r.get('email'),
            canonicalPersonId: r.get('canonicalPersonId'),
            externalId: r.get('externalId')
        })));
    } finally {
        await session.close();
    }

    await sql.end();
    await driver.close();
}

check().catch(console.error);
