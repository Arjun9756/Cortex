import { driver } from '../apps/api/config/neo4j.js';

async function inspectRepoTech() {
    const session = driver.session();
    try {
        console.log('--- Direct REPOSITORY -> TECHNOLOGY relations ---');
        const r1 = await session.run(`
            MATCH (r:REPOSITORY)-[rel]-(t:TECHNOLOGY)
            RETURN type(rel) as relType, count(*) as cnt, collect(DISTINCT r.name)[0..5] as sampleRepos, collect(DISTINCT t.name)[0..5] as sampleTechs
        `);
        console.log(r1.records.map(r => r.toObject()));

        console.log('--- 2-hop REPOSITORY -> ... -> TECHNOLOGY relations ---');
        const r2 = await session.run(`
            MATCH (r:REPOSITORY)-[rel1]-(m)-[rel2]-(t:TECHNOLOGY)
            RETURN type(rel1) as r1, labels(m) as intermediate, type(rel2) as r2, count(*) as cnt, collect(DISTINCT r.name)[0..5] as sampleRepos, collect(DISTINCT t.name)[0..5] as sampleTechs
        `);
        console.log(r2.records.map(r => r.toObject()));

        console.log('--- All REPOSITORY to TECHNOLOGY mappings ---');
        const r3 = await session.run(`
            MATCH (r:REPOSITORY)
            OPTIONAL MATCH (r)-[:USES|DEPENDS_ON|MENTIONED_IN*1..2]-(t:TECHNOLOGY)
            RETURN r.name as repo, collect(DISTINCT t.name) as technologies
            ORDER BY r.name
        `);
        console.log(JSON.stringify(r3.records.map(r => r.toObject()), null, 2));

        console.log('--- File / Commit -> TECHNOLOGY mappings ---');
        const r4 = await session.run(`
            MATCH (r:REPOSITORY)<-[:PART_OF|BELONGS_TO|IN_REPOSITORY]-(item)-[:USES|MENTIONED_IN]-(t:TECHNOLOGY)
            RETURN r.name as repo, collect(DISTINCT t.name) as techs
        `);
        console.log(r4.records.map(r => r.toObject()));

        console.log('--- Person -> REPOSITORY + TECHNOLOGY mappings ---');
        const r5 = await session.run(`
            MATCH (p:PERSON)-[:WORKS_ON|AUTHORED|CONTRIBUTED_TO]->(r:REPOSITORY),
                  (p)-[:USES]->(t:TECHNOLOGY)
            RETURN r.name as repo, collect(DISTINCT t.name) as techs
        `);
        console.log(r5.records.map(r => r.toObject()));

    } finally {
        await session.close();
        await driver.close();
        process.exit(0);
    }
}

inspectRepoTech();
