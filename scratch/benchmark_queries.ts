import { driver } from '../apps/api/config/neo4j.js';

async function benchmarkQueries() {
    const session = driver.session();
    try {
        console.log('--- BENCHMARKING QUERIES ---');

        // 1. Current unscoped multi-hop query
        const t0 = Date.now();
        const r1 = await session.run(`
            MATCH (p:PERSON)
            OPTIONAL MATCH (p)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED|WORKS_ON|ASSIGNED_TO|CONTRIBUTED_TO]-(w)-[:USES|MENTIONED_IN]-(t2:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:WORKS_ON|CONTRIBUTED_TO]-(r1:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]-(w)-[:PART_OF|BELONGS_TO]-(r2:REPOSITORY)
            WITH p,
                 collect(DISTINCT toLower(trim(t1.name))) + collect(DISTINCT toLower(trim(t2.name))) AS rawTechs,
                 collect(DISTINCT toLower(trim(r1.name))) + collect(DISTINCT toLower(trim(r2.name))) AS rawRepos,
                 max(coalesce(w.timestamp, w.createdAt, w.created_at)) AS latestTime
            RETURN p.name AS name, p.email AS email, p.externalId AS externalId, rawTechs, rawRepos, latestTime
        `);
        console.log(`Current unscoped multi-hop query: ${Date.now() - t0}ms (records: ${r1.records.length})`);

        // 2. What if we label (w) and direct the edges?
        // Specifically: (w:COMMIT|PULL_REQUEST|ISSUE) and -> arrows!
        const t1 = Date.now();
        const r2 = await session.run(`
            MATCH (p:PERSON)
            OPTIONAL MATCH (p)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED|WORKS_ON]->(w)-[:USES|MENTIONED_IN]->(t2:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:WORKS_ON|CONTRIBUTED_TO]->(r1:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(w)-[:PART_OF|BELONGS_TO]->(r2:REPOSITORY)
            WITH p,
                 collect(DISTINCT toLower(trim(t1.name))) + collect(DISTINCT toLower(trim(t2.name))) AS rawTechs,
                 collect(DISTINCT toLower(trim(r1.name))) + collect(DISTINCT toLower(trim(r2.name))) AS rawRepos,
                 max(coalesce(w.timestamp, w.createdAt, w.created_at)) AS latestTime
            RETURN p.name AS name, p.email AS email, p.externalId AS externalId, rawTechs, rawRepos, latestTime
        `);
        console.log(`Directed edges with labeled arrows: ${Date.now() - t1}ms (records: ${r2.records.length})`);

        // 3. What if we target specific target engineer and candidate set?
        // For a given target person (e.g. 'Priya Sharma'), we only care about candidates!
        // Or if we query tech/repos for target person first, then query other candidates:
        const t2 = Date.now();
        const targetRes = await session.run(`
            MATCH (target:PERSON) WHERE toLower(target.name) = 'priya sharma'
            OPTIONAL MATCH (target)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (target)-[:AUTHORED|CREATED|WORKS_ON]->(w1)-[:USES|MENTIONED_IN]->(t2:TECHNOLOGY)
            OPTIONAL MATCH (target)-[:WORKS_ON|CONTRIBUTED_TO]->(r1:REPOSITORY)
            OPTIONAL MATCH (target)-[:AUTHORED|CREATED]->(w2)-[:PART_OF|BELONGS_TO]->(r2:REPOSITORY)
            RETURN collect(DISTINCT toLower(trim(t1.name))) + collect(DISTINCT toLower(trim(t2.name))) AS targetTechs,
                   collect(DISTINCT toLower(trim(r1.name))) + collect(DISTINCT toLower(trim(r2.name))) AS targetRepos
        `);
        console.log(`Target person only: ${Date.now() - t2}ms`);
        console.log('Target techs:', targetRes.records[0]?.get('targetTechs'));
        console.log('Target repos:', targetRes.records[0]?.get('targetRepos'));

        // 4. How fast is querying only candidates connected to targetTechs or targetRepos?
        const t3 = Date.now();
        const candRes = await session.run(`
            MATCH (target:PERSON) WHERE toLower(target.name) = 'priya sharma'
            // Target repos & techs
            OPTIONAL MATCH (target)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (target)-[:AUTHORED|CREATED|WORKS_ON]->(w1)-[:USES|MENTIONED_IN]->(t2:TECHNOLOGY)
            OPTIONAL MATCH (target)-[:WORKS_ON|CONTRIBUTED_TO]->(r1:REPOSITORY)
            OPTIONAL MATCH (target)-[:AUTHORED|CREATED]->(w2)-[:PART_OF|BELONGS_TO]->(r2:REPOSITORY)
            WITH target,
                 collect(DISTINCT toLower(trim(t1.name))) + collect(DISTINCT toLower(trim(t2.name))) AS targetTechs,
                 collect(DISTINCT toLower(trim(r1.name))) + collect(DISTINCT toLower(trim(r2.name))) AS targetRepos

            // Candidates
            MATCH (c:PERSON) WHERE elementId(c) <> elementId(target)
            OPTIONAL MATCH (c)-[:USES]->(ct1:TECHNOLOGY)
            OPTIONAL MATCH (c)-[:AUTHORED|CREATED|WORKS_ON]->(cw1)-[:USES|MENTIONED_IN]->(ct2:TECHNOLOGY)
            OPTIONAL MATCH (c)-[:WORKS_ON|CONTRIBUTED_TO]->(cr1:REPOSITORY)
            OPTIONAL MATCH (c)-[:AUTHORED|CREATED]->(cw2)-[:PART_OF|BELONGS_TO]->(cr2:REPOSITORY)
            WITH target, targetTechs, targetRepos, c,
                 collect(DISTINCT toLower(trim(ct1.name))) + collect(DISTINCT toLower(trim(ct2.name))) AS candTechs,
                 collect(DISTINCT toLower(trim(cr1.name))) + collect(DISTINCT toLower(trim(cr2.name))) AS candRepos,
                 max(coalesce(cw1.timestamp, cw1.createdAt, cw1.created_at, cw2.timestamp, cw2.createdAt, cw2.created_at)) AS latestTime
            RETURN c.name AS name, candTechs, candRepos, latestTime
        `);
        console.log(`Candidate query: ${Date.now() - t3}ms (candidates: ${candRes.records.length})`);

    } finally {
        await session.close();
        await driver.close();
        process.exit(0);
    }
}

benchmarkQueries();
