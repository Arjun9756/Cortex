import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const s = driver.session();
    try {
        // Warmup
        const tw = Date.now();
        await s.run('RETURN 1');
        console.log(`Warmup bolt handshake: ${Date.now() - tw}ms`);

        // Query 1
        const t1 = Date.now();
        const res1 = await s.run(`
            MATCH (p:PERSON)
            WHERE toLower(p.name) = 'priya sharma'
            RETURN p.name
        `);
        console.log(`Simple match by name: ${Date.now() - t1}ms`);

        // Target profile query
        const t2 = Date.now();
        const res2 = await s.run(`
            MATCH (p:PERSON)
            WHERE toLower(p.name) = 'priya sharma'
            OPTIONAL MATCH (p)-[:USES|AUTHORED]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(c1)-[:USES]->(t2:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:WORKS_ON]->(r1:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(c2)-[:PART_OF]->(r2:REPOSITORY)
            RETURN p.name,
                   collect(DISTINCT toLower(trim(t1.name))) + collect(DISTINCT toLower(trim(t2.name))) AS techs,
                   collect(DISTINCT toLower(trim(r1.name))) + collect(DISTINCT toLower(trim(r2.name))) AS repos
        `);
        console.log(`Target profile query: ${Date.now() - t2}ms`);

        // Full query as originally written (after warmup)
        const t3 = Date.now();
        await s.run(`
            MATCH (p:PERSON)
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
        `);
        console.log(`Original full unscoped query (after warmup): ${Date.now() - t3}ms`);

    } finally {
        await s.close();
    }
}

main().catch(console.error).finally(() => process.exit(0));
