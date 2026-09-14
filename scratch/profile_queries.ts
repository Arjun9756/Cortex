import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const s = driver.session();
    try {
        console.log('--- TESTING PROFILE OF DIRECTED VS UNDIRECTED ---');

        // Test 1: Separate queries for target vs candidate
        // Priya Sharma is the target!
        const targetName = 'Priya Sharma';

        const t0 = Date.now();
        // 1. Get target's profile
        const targetRes = await s.run(`
            MATCH (p:PERSON)
            WHERE toLower(p.name) = toLower($targetName)
            OPTIONAL MATCH (p)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(c1)-[:USES]->(t2:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:WORKS_ON]->(r1:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(c2)-[:PART_OF]->(r2:REPOSITORY)
            OPTIONAL MATCH (r1)-[:USES]->(t3:TECHNOLOGY)
            OPTIONAL MATCH (r2)-[:USES]->(t4:TECHNOLOGY)
            RETURN p.name AS name,
                   collect(DISTINCT toLower(trim(t1.name))) +
                   collect(DISTINCT toLower(trim(t2.name))) +
                   collect(DISTINCT toLower(trim(t3.name))) +
                   collect(DISTINCT toLower(trim(t4.name))) AS techs,
                   collect(DISTINCT toLower(trim(r1.name))) +
                   collect(DISTINCT toLower(trim(r2.name))) AS repos
        `, { targetName });
        const targetTime = Date.now() - t0;
        console.log(`Target query: ${targetTime}ms`);
        console.log('Target techs:', targetRes.records[0]?.get('techs'));
        console.log('Target repos:', targetRes.records[0]?.get('repos'));

        // 2. Query candidates: who has shared techs or shared repos with target?
        const targetTechs = Array.from(new Set((targetRes.records[0]?.get('techs') || []).filter(Boolean)));
        const targetRepos = Array.from(new Set((targetRes.records[0]?.get('repos') || []).filter(Boolean)));

        const t1 = Date.now();
        const candRes = await s.run(`
            MATCH (p:PERSON)
            WHERE toLower(p.name) <> toLower($targetName)
            OPTIONAL MATCH (p)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(c1)-[:USES]->(t2:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:WORKS_ON]->(r1:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(c2)-[:PART_OF]->(r2:REPOSITORY)
            OPTIONAL MATCH (r1)-[:USES]->(t3:TECHNOLOGY)
            OPTIONAL MATCH (r2)-[:USES]->(t4:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(act)
            WITH p,
                 collect(DISTINCT toLower(trim(t1.name))) +
                 collect(DISTINCT toLower(trim(t2.name))) +
                 collect(DISTINCT toLower(trim(t3.name))) +
                 collect(DISTINCT toLower(trim(t4.name))) AS rawTechs,
                 collect(DISTINCT toLower(trim(r1.name))) +
                 collect(DISTINCT toLower(trim(r2.name))) AS rawRepos,
                 max(coalesce(act.timestamp, act.createdAt, act.created_at)) AS latestTime
            RETURN p.name AS name, rawTechs, rawRepos, latestTime
        `, { targetName });
        const candTime = Date.now() - t1;
        console.log(`Candidates query: ${candTime}ms (${candRes.records.length} records)`);

    } finally {
        await s.close();
    }
}

main().catch(console.error).finally(() => process.exit(0));
