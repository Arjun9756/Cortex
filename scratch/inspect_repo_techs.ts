import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const s = driver.session();
    try {
        const res = await s.run(`
            MATCH (r:REPOSITORY)
            OPTIONAL MATCH (r)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (c:COMMIT)-[:PART_OF]->(r)
            OPTIONAL MATCH (c)-[:USES]->(t2:TECHNOLOGY)
            RETURN r.name AS repo,
                   collect(DISTINCT toLower(trim(t1.name))) + collect(DISTINCT toLower(trim(t2.name))) AS techs
        `);
        console.log('Repositories and their technologies in Neo4j:');
        for (const r of res.records) {
            const techs = Array.from(new Set((r.get('techs') || []).filter(Boolean)));
            console.log(`- ${r.get('repo')}: [${techs.join(', ')}]`);
        }
    } finally {
        await s.close();
    }
}

main().catch(console.error).finally(() => process.exit(0));
