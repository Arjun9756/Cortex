import { driver } from '../apps/api/config/neo4j.js';

async function checkFirewall() {
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (n)
            WHERE toLower(n.name) CONTAINS 'firewall' OR any(lbl in labels(n) WHERE toLower(lbl) CONTAINS 'firewall')
            RETURN elementId(n) as id, labels(n) as labels, properties(n) as props
        `);
        console.log("Firewall nodes in Neo4j:", result.records.map(r => ({
            id: r.get('id'),
            labels: r.get('labels'),
            props: r.get('props'),
        })));
    } finally {
        await session.close();
    }
}

checkFirewall().catch(console.error);
