import { driver } from '../apps/api/config/neo4j.js';

async function checkRepoGraph() {
    const session = driver.session();
    try {
        console.log("Checking repositories in Neo4j:");
        const r1 = await session.run(`MATCH (r) WHERE r.name CONTAINS 'service' OR r.name CONTAINS 'engine' OR r.name CONTAINS 'infra' OR r.name CONTAINS 'Cortex' RETURN elementId(r) as id, labels(r) as labels, r.name as name`);
        console.log("Repo nodes:", r1.records.map(r => ({ name: r.get('name'), labels: r.get('labels') })));

        const r2 = await session.run(`MATCH (p:PERSON)-[rel]-(target) RETURN p.name as person, type(rel) as relType, labels(target) as targetLabels, target.name as targetName LIMIT 20`);
        console.log("Person connections:", r2.records.map(r => ({ person: r.get('person'), rel: r.get('relType'), targetLabels: r.get('targetLabels'), target: r.get('targetName') })));

    } finally {
        await session.close();
    }
}

checkRepoGraph().catch(console.error);
