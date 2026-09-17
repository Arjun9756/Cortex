import { driver } from '../apps/api/config/neo4j.js';
import { calculatePendingWork } from '../packages/analytics/knowledge.risk.predict.js';

async function proveLifecycle() {
    console.log('--- PROVING ISSUE LIFECYCLE (OPEN -> CLOSED) ON THE EXACT SAME NODE ---\n');
    const session = driver.session();
    const testPerson = 'Priya Sharma';

    try {
        // Step 1: Create an issue with status = "open"
        console.log('Step 1: Webhook arrives -> Issue created with status = "open"');
        await session.run(`
            MERGE (p:PERSON {name: $person})
            MERGE (i:ISSUE {name: "LIFECYCLE-TEST-42"})
            SET i.status = "open"
            MERGE (i)-[:ASSIGNED_TO]->(p)
        `, { person: testPerson });

        const openState = await calculatePendingWork(
            testPerson,
            { relation: 'ASSIGNED_TO', targetLabel: 'ISSUE' },
            ['ASSIGNED_TO']
        );
        console.log(`-> Jab issue OPEN tha: pendingCount = ${openState.count}`);

        // Step 2: Exact same node gets updated via webhook to status = "Done"
        console.log('\nStep 2: Developer finishes work -> Webhook arrives -> EXACT SAME node gets status = "Done"');
        await session.run(`
            MATCH (i:ISSUE {name: "LIFECYCLE-TEST-42"})
            SET i.status = "Done"
        `);

        // Check node count in Neo4j to prove NO duplicate was created
        const nodeCheck = await session.run(`
            MATCH (i:ISSUE {name: "LIFECYCLE-TEST-42"})
            RETURN count(i) AS nodesCount, i.status AS currentStatus
        `);
        console.log(`   (Neo4j Check: Total nodes with name "LIFECYCLE-TEST-42" = ${nodeCheck.records[0]!.get('nodesCount')}, Status = "${nodeCheck.records[0]!.get('currentStatus')}")`);

        // Step 3: Run calculatePendingWork again on the exact same node
        const closedState = await calculatePendingWork(
            testPerson,
            { relation: 'ASSIGNED_TO', targetLabel: 'ISSUE' },
            ['ASSIGNED_TO']
        );
        console.log(`-> Wahi SAME issue CLOSE hone ke baad: pendingCount = ${closedState.count}`);

        if (openState.count === 1 && closedState.count === 0) {
            console.log('\n✅ 100% MATHEMATICAL & LOGICAL PROOF:');
            console.log('   Jab open tha toh count = 1 tha.');
            console.log('   Jab wahi same issue close hua toh count = 0 ho gaya!');
        }

        // Cleanup
        await session.run(`
            MATCH (i:ISSUE {name: "LIFECYCLE-TEST-42"})
            DETACH DELETE i
        `);
    } finally {
        await session.close();
        process.exit(0);
    }
}

proveLifecycle().catch(console.error);
