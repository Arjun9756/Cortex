import sql from '../apps/api/config/postgres.js';
import { neo4jSession, driver } from '../apps/api/config/neo4j.js';

async function check() {
    console.log('=== CHECKING VIKRAM PATEL IN POSTGRES ===');
    const identities = await sql`
        SELECT id, provider, external_id, username, email, display_name, canonical_person_id 
        FROM person_identity 
        WHERE display_name ILIKE '%Vikram%' OR username ILIKE '%vikram%' OR email ILIKE '%vikram%'
    `;
    console.log('Identities count:', identities.length);
    console.table(identities);

    const metrics = await sql`
        SELECT external_id, person_name, risk_score, repos, commit_count 
        FROM person_metrics 
        WHERE person_name ILIKE '%Vikram%'
    `;
    console.log('\nMetrics count:', metrics.length);
    console.table(metrics);

    console.log('\n=== CHECKING VIKRAM PATEL IN NEO4J ===');
    const session = neo4jSession();
    try {
        const res = await session.run(`
            MATCH (p:PERSON)
            WHERE toLower(p.name) CONTAINS 'vikram' OR toLower(coalesce(p.email, '')) CONTAINS 'vikram' OR toLower(coalesce(p.username, '')) CONTAINS 'vikram'
            RETURN p.name AS name, p.email AS email, p.canonicalPersonId AS canonicalPersonId, p.externalId AS externalId, labels(p) AS labels
        `);
        console.log('Neo4j PERSON nodes count:', res.records.length);
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
