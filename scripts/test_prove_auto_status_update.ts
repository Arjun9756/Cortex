import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import { driver } from '../apps/api/config/neo4j.js';
import { saveExtractionToGraph } from '../packages/extraction/processExtraction.js';
import { calculatePendingWork } from '../packages/analytics/knowledge.risk.predict.js';

async function testAutoStatusUpdate() {
    console.log('=== VERIFYING AUTOMATIC STATUS UPDATE VIA EXTRACTION PIPELINE ===\n');
    const session = driver.session();
    const testPerson = 'Alex AutoTest';
    const testIssueName = 'AUTO-UPDATE-TICKET-99';

    try {
        // Step 1: Initial event arrives (e.g. Issue created / open)
        console.log('Step 1: Webhook received -> Issue created (status = "open")');
        await saveExtractionToGraph(
            [
                { name: testPerson, type: 'PERSON' },
                { name: testIssueName, type: 'ISSUE' }
            ],
            [],
            [
                { from: testIssueName, to: testPerson, type: 'ASSIGNED_TO', evidence: 'assigned via webhook' }
            ],
            [],
            { source: seedSource },
            [{ name: testPerson, email: 'alex.autotest@company.io', role: 'Staff Engineer' }],
            [{ name: testIssueName, properties: { status: 'open' } }]
        );

        // Check node in Neo4j
        const node1 = await session.run(
            `MATCH (i:ISSUE {name: $name}) RETURN elementId(i) as id, i.status as status`,
            { name: testIssueName, source: seedSource }
        );
        const elementId1 = node1.records[0]?.get('id');
        const status1 = node1.records[0]?.get('status');
        console.log(`-> Node created: elementId=${elementId1}, status=${status1}`);

        const openPending = await calculatePendingWork(
            testPerson,
            { relation: 'ASSIGNED_TO', targetLabel: 'ISSUE' },
            ['ASSIGNED_TO'],
            seedSource
        );
        console.log(`-> Pending Work Count while OPEN: ${openPending.count} (Expected: 1)`);

        // Step 2: Next event arrives (e.g. Issue closed / Done)
        console.log('\nStep 2: Webhook received -> EXACT SAME issue is closed (status = "Done")');
        await saveExtractionToGraph(
            [
                { name: testPerson, type: 'PERSON' },
                { name: testIssueName, type: 'ISSUE' }
            ],
            [],
            [
                { from: testIssueName, to: testPerson, type: 'ASSIGNED_TO', evidence: 'still linked in graph' }
            ],
            [],
            { source: seedSource },
            [{ name: testPerson, email: 'alex.autotest@company.io', role: 'Staff Engineer' }],
            [{ name: testIssueName, properties: { status: 'Done' } }]
        );

        // Check node in Neo4j again
        const node2 = await session.run(
            `MATCH (i:ISSUE {name: $name}) RETURN elementId(i) as id, i.status as status`,
            { name: testIssueName, source: seedSource }
        );
        const elementId2 = node2.records[0]?.get('id');
        const status2 = node2.records[0]?.get('status');
        console.log(`-> Node after update: elementId=${elementId2}, status=${status2}`);

        const totalNodes = await session.run(
            `MATCH (i:ISSUE {name: $name}) RETURN count(i) as count`,
            { name: testIssueName }
        );
        console.log(`-> Total nodes with name "${testIssueName}": ${totalNodes.records[0]?.get('count')}`);

        const closedPending = await calculatePendingWork(
            testPerson,
            { relation: 'ASSIGNED_TO', targetLabel: 'ISSUE' },
            ['ASSIGNED_TO'],
            seedSource
        );
        console.log(`-> Pending Work Count after DONE: ${closedPending.count} (Expected: 0)`);

        if (elementId1 === elementId2 && status2 === 'Done' && openPending.count === 1 && closedPending.count === 0) {
            console.log('\n SUCCESS: 100% PROVEN:');
            console.log('  1. Same node elementId retained (no duplicate node created).');
            console.log('  2. Status automatically updated in place from "open" -> "Done".');
            console.log('  3. Pending work count automatically dropped from 1 -> 0!');
        } else {
            console.error('\n❌ FAILED: Unexpected verification results.');
        }

        // Cleanup
        await session.run(`MATCH (p:PERSON {name: $person}) DETACH DELETE p`, { person: testPerson });
        await session.run(`MATCH (i:ISSUE {name: $name}) DETACH DELETE i`, { name: testIssueName });
    } finally {
        await session.close();
        process.exit(0);
    }
}

testAutoStatusUpdate().catch(console.error);
import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
