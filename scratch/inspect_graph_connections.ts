import { driver } from '../apps/api/config/neo4j.js';

async function inspectGraphConnections() {
    const session = driver.session();
    try {
        console.log('=== 1. ALL PERSON -> TECH CONNECTIONS IN GRAPH ===');
        const res1 = await session.run(`
            MATCH (p:PERSON)-[r1]-(w)-[r2]-(t:TECHNOLOGY)
            RETURN DISTINCT p.name AS person, type(r1) AS r1, labels(w) AS wLabels, type(r2) AS r2, t.name AS tech
            ORDER BY person, tech
        `);
        console.table(res1.records.map(r => ({
            person: r.get('person'),
            r1: r.get('r1'),
            wLabels: r.get('wLabels')?.[0],
            r2: r.get('r2'),
            tech: r.get('tech')
        })));

        console.log('\n=== 2. ALL DIRECT OR INDIRECT PERSON -> REPOSITORY CONNECTIONS ===');
        const res2 = await session.run(`
            MATCH (p:PERSON)-[r]-(target)
            WHERE target:REPOSITORY OR (target)-[:PART_OF|BELONGS_TO|CONTAINS]-(:REPOSITORY)
            RETURN DISTINCT p.name AS person, type(r) AS rel, labels(target) AS targetLabels, target.name AS targetName
            ORDER BY person
        `);
        console.table(res2.records.map(r => ({
            person: r.get('person'),
            rel: r.get('rel'),
            targetLabels: r.get('targetLabels')?.[0],
            targetName: r.get('targetName')
        })));

        console.log('\n=== 3. ALL RELATIONSHIP TYPES CONNECTED TO PERSON NODES ===');
        const res3 = await session.run(`
            MATCH (p:PERSON)-[r]-(other)
            RETURN labels(p)[0] AS pLabel, type(r) AS rel, labels(other)[0] AS otherLabel, count(*) AS count
            ORDER BY rel, otherLabel
        `);
        console.table(res3.records.map(r => ({
            rel: r.get('rel'),
            otherLabel: r.get('otherLabel'),
            count: r.get('count').toNumber()
        })));

        console.log('\n=== 4. HOW ARE REPOSITORIES CONNECTED TO TECHNOLOGIES? ===');
        const res4 = await session.run(`
            MATCH (r:REPOSITORY)-[rel]-(t:TECHNOLOGY)
            RETURN r.name AS repo, type(rel) AS rel, t.name AS tech
            LIMIT 30
        `);
        console.table(res4.records.map(r => ({
            repo: r.get('repo'),
            rel: r.get('rel'),
            tech: r.get('tech')
        })));

    } finally {
        await session.close();
        await driver.close();
        process.exit(0);
    }
}

inspectGraphConnections();
