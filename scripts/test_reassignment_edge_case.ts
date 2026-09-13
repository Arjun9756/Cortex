import { driver } from '../apps/api/config/neo4j.js';
import { calculatePendingWork } from '../packages/analytics/knowledge.risk.predict.js';

async function testReassignment() {
    console.log('--- TESTING REASSIGNMENT EDGE CASE ---');
    const session = driver.session();
    try {
        // Setup: Alice and Bob
        await session.run(`
            MERGE (alice:PERSON {name: "Alice ReassignTest"})
            MERGE (bob:PERSON {name: "Bob ReassignTest"})
            MERGE (i:ISSUE {name: "REASSIGN-TICKET-1"})
            SET i.status = "open", i.assignee = "Alice ReassignTest"
            MERGE (i)-[:ASSIGNED_TO]->(alice)
        `);

        // Check Alice count
        const alice1 = await calculatePendingWork("Alice ReassignTest", { relation: 'ASSIGNED_TO', targetLabel: 'ISSUE' }, ['ASSIGNED_TO']);
        console.log('Alice initial pending count:', alice1.count);

        // Now issue is reassigned to Bob in Jira/GitHub
        // Webhook creates edge to Bob and sets issue.assignee = "Bob ReassignTest"
        await session.run(`
            MATCH (i:ISSUE {name: "REASSIGN-TICKET-1"})
            MATCH (bob:PERSON {name: "Bob ReassignTest"})
            SET i.assignee = "Bob ReassignTest"
            MERGE (i)-[:ASSIGNED_TO]->(bob)
        `);

        // Check Alice and Bob counts
        const alice2 = await calculatePendingWork("Alice ReassignTest", { relation: 'ASSIGNED_TO', targetLabel: 'ISSUE' }, ['ASSIGNED_TO']);
        const bob2 = await calculatePendingWork("Bob ReassignTest", { relation: 'ASSIGNED_TO', targetLabel: 'ISSUE' }, ['ASSIGNED_TO']);

        console.log('After reassignment to Bob:');
        console.log('  Alice pending count:', alice2.count, '(Expected: 0 if properly attributed to Bob only)');
        console.log('  Bob pending count:', bob2.count, '(Expected: 1)');

        // Cleanup
        await session.run(`MATCH (p:PERSON) WHERE p.name IN ["Alice ReassignTest", "Bob ReassignTest"] DETACH DELETE p`);
        await session.run(`MATCH (i:ISSUE {name: "REASSIGN-TICKET-1"}) DETACH DELETE i`);
    } finally {
        await session.close();
        process.exit(0);
    }
}

testReassignment().catch(console.error);
