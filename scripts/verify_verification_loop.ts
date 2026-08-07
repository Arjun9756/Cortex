import { runAnalyticsJob } from '../packages/workers/scheduler.worker.js';
import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    console.log('=== Step 1: Running Analytics Job ===');
    await runAnalyticsJob();

    console.log('\n=== Step 2: Querying Neo4j PERSON Nodes ===');
    const session = driver.session();
    try {
        const res = await session.run(`
            MATCH (p:PERSON)
            RETURN p.name AS name, p.email AS email, p.externalId AS externalId, elementId(p) AS elementId
        `);

        console.log(`Found ${res.records.length} PERSON nodes in Neo4j:`);
        for (const rec of res.records) {
            console.log({
                name: rec.get('name'),
                email: rec.get('email'),
                externalId: rec.get('externalId'),
                elementId: rec.get('elementId'),
            });
        }

        console.log('\n=== Step 3: Checking Priya Nodes specifically ===');
        const priyaRes = await session.run(`
            MATCH (p:PERSON) WHERE toLower(p.name) CONTAINS "priya"
            RETURN p.name AS name, p.email AS email, p.externalId AS externalId, elementId(p) AS elementId
        `);
        console.log(`Priya node count: ${priyaRes.records.length}`);
        for (const rec of priyaRes.records) {
            console.log({
                name: rec.get('name'),
                email: rec.get('email'),
                externalId: rec.get('externalId'),
                elementId: rec.get('elementId'),
            });
        }
    } finally {
        await session.close();
        await driver.close();
    }
}

main().catch(console.error);
