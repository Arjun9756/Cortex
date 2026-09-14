import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const s = driver.session();
    try {
        console.log('--- TESTING DIRECTED EDGES QUERY ACCURACY & SPEED ---');
        // Warmup
        await s.run('RETURN 1');

        const t0 = Date.now();
        const res = await s.run(`
            MATCH (p:PERSON)
            OPTIONAL MATCH (p)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED|WORKS_ON]->(w)-[:USES|MENTIONED_IN]->(t2:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:WORKS_ON|CONTRIBUTED_TO]->(r1:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(w)-[:PART_OF|BELONGS_TO]->(r2:REPOSITORY)
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
        const elapsed = Date.now() - t0;
        console.log(`Directed query took: ${elapsed}ms for ${res.records.length} records!`);
        for (const r of res.records) {
            const name = r.get('name');
            const techs = Array.from(new Set((r.get('rawTechs') || []).filter(Boolean)));
            const repos = Array.from(new Set((r.get('rawRepos') || []).filter(Boolean)));
            console.log(`- ${name}: techs (${techs.length}) = [${techs.join(', ')}], repos (${repos.length}) = [${repos.join(', ')}]`);
        }
    } finally {
        await s.close();
    }
}

main().catch(console.error).finally(() => process.exit(0));
