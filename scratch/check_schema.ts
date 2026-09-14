import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const s = driver.session();
    try {
        const rels = await s.run('MATCH (a)-[r]->(b) RETURN DISTINCT labels(a)[0] AS fromNode, type(r) AS rel, labels(b)[0] AS toNode');
        console.log('Graph relationships:');
        console.table(rels.records.map(r => ({
            from: r.get('fromNode'),
            rel: r.get('rel'),
            to: r.get('toNode')
        })));
    } finally {
        await s.close();
    }
}

main().catch(console.error).finally(() => process.exit(0));
