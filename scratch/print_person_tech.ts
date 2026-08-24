import { driver } from '../apps/api/config/neo4j.js';

async function printPersonTech() {
    const session = driver.session();
    try {
        const res = await session.run(`
            MATCH (p:PERSON)-[r1]-(w)-[r2]-(t:TECHNOLOGY)
            RETURN DISTINCT p.name AS person, t.name AS tech, labels(w)[0] AS workType
            ORDER BY person, tech
        `);
        console.log('All 2-hop Person -> Work -> Tech:');
        console.table(res.records.map(r => ({
            person: r.get('person'),
            tech: r.get('tech'),
            work: r.get('workType')
        })));

        const directRes = await session.run(`
            MATCH (p:PERSON)-[r:USES]->(t:TECHNOLOGY)
            RETURN p.name AS person, t.name AS tech
            ORDER BY person, tech
        `);
        console.log('Direct Person -[:USES]-> Tech:');
        console.table(directRes.records.map(r => ({
            person: r.get('person'),
            tech: r.get('tech')
        })));
    } finally {
        await session.close();
        await driver.close();
        process.exit(0);
    }
}
printPersonTech();
