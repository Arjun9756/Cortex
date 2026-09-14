import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const session = driver.session();
    try {
        const pRes = await session.run('MATCH (p:PERSON) RETURN p.name AS name, p.externalId AS ext, p.email AS email, p.provider AS provider ORDER BY p.name');
        console.log('--- Neo4j PERSON nodes ---');
        for (const r of pRes.records) {
            console.log(JSON.stringify(r.toObject()));
        }

        const stats = await session.run(`
            MATCH (p:PERSON)
            OPTIONAL MATCH (p)-[:AUTHORED]->(c:COMMIT)
            OPTIONAL MATCH (p)-[]-(e)-[:PART_OF]->(r:REPOSITORY)
            RETURN p.name AS name, p.externalId AS externalId, count(DISTINCT c) AS commits, count(DISTINCT r) AS repos
            ORDER BY commits DESC, repos DESC
        `);
        console.log('\n--- Neo4j Person Activity ---');
        for (const r of stats.records) {
            console.log(`${r.get('name')} (ext: ${r.get('externalId')}): commits=${r.get('commits')}, repos=${r.get('repos')}`);
        }
    } finally {
        await session.close();
    }

    console.log('\n--- All rows in person_identity ---');
    const ids = await sql`SELECT * FROM person_identity ORDER BY canonical_person_id`;
    console.log(JSON.stringify(ids, null, 2));
}

main().catch(console.error).finally(async () => {
    await sql.end();
    process.exit(0);
});
