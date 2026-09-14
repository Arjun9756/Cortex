import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const s = driver.session();
    try {
        const candidateNames = ['Priya Sharma', 'Devendra Singh', 'Rohan Verma', 'Vikram Patel', 'Neha Gupta', 'Michael', 'Amina Zahra'];

        // Warmup
        await s.run('RETURN 1');

        const t0 = Date.now();
        const res = await s.run(`
            MATCH (p:PERSON)
            WHERE p.name IN $candidateNames
            OPTIONAL MATCH (p)-[]-(e)-[:MENTIONED_IN|USES]-(t:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:WORKS_ON|CONTRIBUTED_TO]-(r:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]-(c:COMMIT)
            RETURN p.name AS name,
                   collect(DISTINCT toLower(trim(t.name))) AS techs,
                   collect(DISTINCT toLower(trim(r.name))) AS repos,
                   max(coalesce(c.timestamp, c.createdAt, c.created_at)) AS latestTime
        `, { candidateNames });
        const elapsed = Date.now() - t0;
        console.log(`Scoped query took: ${elapsed}ms for ${res.records.length} records!`);
        for (const r of res.records) {
            console.log(`- ${r.get('name')}: techs=${r.get('techs').length}, repos=${r.get('repos').length}, latestTime=${r.get('latestTime')}`);
        }
    } finally {
        await s.close();
    }
}

main().catch(console.error).finally(() => process.exit(0));
