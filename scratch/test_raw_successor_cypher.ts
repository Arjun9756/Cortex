import { driver } from '../apps/api/config/neo4j.js';
import neo4j from 'neo4j-driver';

async function testSuccessors() {
    const session = driver.session();
    try {
        console.log('=== 1. CHECK ALL PERSON NODES IN GRAPH ===');
        const personsRes = await session.run(`MATCH (p:PERSON) RETURN p.name AS name, p.email AS email`);
        const persons = personsRes.records.map(r => ({ name: r.get('name'), email: r.get('email') }));
        console.log('All PERSON nodes:', persons);

        console.log('\n=== 2. CHECK RELATIONSHIPS FOR ARJUN KUMAR ===');
        const arjunRelRes = await session.run(`
            MATCH (p:PERSON) WHERE toLower(p.name) CONTAINS 'arjun'
            OPTIONAL MATCH (p)-[r]->(target)
            RETURN type(r) AS relType, labels(target) AS targetLabels, target.name AS targetName
            LIMIT 20
        `);
        console.log('Arjun outgoing relationships:', arjunRelRes.records.map(r => ({
            rel: r.get('relType'),
            labels: r.get('targetLabels'),
            name: r.get('targetName')
        })));

        console.log('\n=== 3. CHECK TECH NODES CONNECTED TO ARJUN KUMAR ===');
        const arjunTech1 = await session.run(`
            MATCH (p:PERSON)-[:AUTHORED|WORKS_ON]->(w)-[:USES|MENTIONED_IN]-(t:TECHNOLOGY)
            WHERE toLower(p.name) CONTAINS 'arjun'
            RETURN DISTINCT t.name AS tech, labels(w) AS workType, w.name AS workName
        `);
        console.log('Arjun 2-hop tech traversal (target)-[:AUTHORED|WORKS_ON]->()-[:USES|MENTIONED_IN]-(t):', 
            arjunTech1.records.map(r => ({ tech: r.get('tech'), workType: r.get('workType'), workName: r.get('workName') })));

        console.log('\n=== 4. CHECK ANY PATH FROM ARJUN TO TECHNOLOGY ===');
        const arjunTechAny = await session.run(`
            MATCH (p:PERSON)-[r1]-(w)-[r2]-(t:TECHNOLOGY)
            WHERE toLower(p.name) CONTAINS 'arjun'
            RETURN type(r1) AS r1, labels(w) AS workLabels, type(r2) AS r2, t.name AS tech
            LIMIT 20
        `);
        console.log('Any 2-hop path to tech for Arjun:', arjunTechAny.records.map(r => ({
            r1: r.get('r1'),
            workLabels: r.get('workLabels'),
            r2: r.get('r2'),
            tech: r.get('tech')
        })));

        console.log('\n=== 5. RUN EXACT OFFBOARDING.SERVICE.TS SUCCESSOR QUERY FOR ARJUN KUMAR ===');
        const targetName = 'Arjun Kumar';
        const successorRes = await session.run(`
            MATCH (target:PERSON) WHERE toLower(target.name) CONTAINS toLower($name)
            MATCH (other:PERSON) WHERE NOT toLower(other.name) CONTAINS toLower($name)
            MATCH (target)-[:AUTHORED|WORKS_ON]->()-[:USES|MENTIONED_IN]-(t:TECHNOLOGY)
            MATCH (other)-[:AUTHORED|WORKS_ON]->()-[:USES|MENTIONED_IN]-(t)
            RETURN other.name AS candidate, count(DISTINCT t) AS sharedTech
            ORDER BY sharedTech DESC
            LIMIT 5
        `, { name: targetName });
        console.log('Raw offboarding.service.ts query output for Arjun Kumar:', successorRes.records.map(r => ({
            candidate: r.get('candidate'),
            sharedTech: neo4j.integer.toNumber(r.get('sharedTech'))
        })));

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await session.close();
        await driver.close();
        process.exit(0);
    }
}

testSuccessors();
