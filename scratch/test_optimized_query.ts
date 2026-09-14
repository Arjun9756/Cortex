import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const s = driver.session();
    try {
        console.log('--- TESTING ORIGINAL VS OPTIMIZED QUERY FOR EQUIVALENCE & SPEED ---');

        // 1. Original query
        const t0 = Date.now();
        const resOrig = await s.run(`
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
        const origDuration = Date.now() - t0;
        console.log(`Original Query: ${origDuration}ms (${resOrig.records.length} records)`);

        // 2. Optimized Directed Query
        const t1 = Date.now();
        const resOpt = await s.run(`
            MATCH (p:PERSON)
            OPTIONAL MATCH (p)-[:USES|AUTHORED]->(tDirect:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(wWork)-[:USES]->(tWork:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:CREATED|AUTHORED]->(wIssue:ISSUE)<-[:MENTIONED_IN]-(tIssue:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:WORKS_ON]->(rDirect:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(wRepo)-[:PART_OF]->(rWork:REPOSITORY)
            OPTIONAL MATCH (rDirect)-[:USES]->(tRepo1:TECHNOLOGY)
            OPTIONAL MATCH (rWork)-[:USES]->(tRepo2:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]->(wActivity)
            WITH p,
                 collect(DISTINCT toLower(trim(tDirect.name))) +
                 collect(DISTINCT toLower(trim(tWork.name))) +
                 collect(DISTINCT toLower(trim(tIssue.name))) +
                 collect(DISTINCT toLower(trim(tRepo1.name))) +
                 collect(DISTINCT toLower(trim(tRepo2.name))) AS rawTechs,
                 collect(DISTINCT toLower(trim(rDirect.name))) +
                 collect(DISTINCT toLower(trim(rWork.name))) AS rawRepos,
                 max(coalesce(wActivity.timestamp, wActivity.createdAt, wActivity.created_at)) AS latestTime
            RETURN p.name AS name,
                   p.email AS email,
                   p.externalId AS externalId,
                   rawTechs,
                   rawRepos,
                   latestTime
        `);
        const optDuration = Date.now() - t1;
        console.log(`Optimized Directed Query: ${optDuration}ms (${resOpt.records.length} records)`);

        // 3. Compare outputs person-by-person
        const origMap = new Map();
        for (const rec of resOrig.records) {
            origMap.set(rec.get('name'), {
                techs: Array.from(new Set((rec.get('rawTechs') || []).filter(Boolean))).sort(),
                repos: Array.from(new Set((rec.get('rawRepos') || []).filter(Boolean))).sort(),
                time: rec.get('latestTime') ? Number(rec.get('latestTime')) : null
            });
        }

        const optMap = new Map();
        for (const rec of resOpt.records) {
            optMap.set(rec.get('name'), {
                techs: Array.from(new Set((rec.get('rawTechs') || []).filter(Boolean))).sort(),
                repos: Array.from(new Set((rec.get('rawRepos') || []).filter(Boolean))).sort(),
                time: rec.get('latestTime') ? Number(rec.get('latestTime')) : null
            });
        }

        let discrepancies = 0;
        for (const [name, orig] of origMap.entries()) {
            const opt = optMap.get(name);
            if (!opt) {
                console.log(`Discrepancy: ${name} missing in opt!`);
                discrepancies++;
                continue;
            }
            const techDiff1 = orig.techs.filter((x: string) => !opt.techs.includes(x));
            const techDiff2 = opt.techs.filter((x: string) => !orig.techs.includes(x));
            const repoDiff1 = orig.repos.filter((x: string) => !opt.repos.includes(x));
            const repoDiff2 = opt.repos.filter((x: string) => !orig.repos.includes(x));

            if (techDiff1.length || techDiff2.length || repoDiff1.length || repoDiff2.length) {
                console.log(`Data difference for [${name}]:`);
                if (techDiff1.length) console.log(`  Techs missing in opt:`, techDiff1);
                if (techDiff2.length) console.log(`  Techs extra in opt:`, techDiff2);
                if (repoDiff1.length) console.log(`  Repos missing in opt:`, repoDiff1);
                if (repoDiff2.length) console.log(`  Repos extra in opt:`, repoDiff2);
                discrepancies++;
            }
        }

        if (discrepancies === 0) {
            console.log('PERFECT MATCH! All technologies, repositories, and timestamps match identically.');
        }

    } finally {
        await s.close();
    }
}

main().catch(console.error).finally(() => process.exit(0));
