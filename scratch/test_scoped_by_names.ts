import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';

async function main() {
    const s = driver.session();
    try {
        const pmRows = await sql`SELECT person_name, external_id FROM person_metrics`;
        const candidateNames = pmRows.map(r => r.person_name).filter(Boolean);
        console.log('Candidate names from PG:', candidateNames);

        const t0 = Date.now();
        const res = await s.run(`
            MATCH (p:PERSON)
            WHERE p.name IN $candidateNames
            OPTIONAL MATCH (p)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED|WORKS_ON|ASSIGNED_TO|CONTRIBUTED_TO]-(w)-[:USES|MENTIONED_IN]-(t2:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:WORKS_ON|CONTRIBUTED_TO]-(r1:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]-(w)-[:PART_OF|BELONGS_TO]-(r2:REPOSITORY)
            WITH p,
                 collect(DISTINCT toLower(trim(t1.name))) + collect(DISTINCT toLower(trim(t2.name))) AS rawTechs,
                 collect(DISTINCT toLower(trim(r1.name))) + collect(DISTINCT toLower(trim(r2.name))) AS rawRepos,
                 max(coalesce(w.timestamp, w.createdAt, w.created_at)) AS latestTime
            RETURN p.name AS name,
                   p.email AS email,
                   p.externalId AS externalId,
                   rawTechs,
                   rawRepos,
                   latestTime
        `, { candidateNames });
        console.log(`Scoped by candidate names query time: ${Date.now() - t0}ms (${res.records.length} records)`);

    } finally {
        await s.close();
    }
}

main().catch(console.error).finally(() => process.exit(0));
