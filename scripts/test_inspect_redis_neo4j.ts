import { driver } from '../apps/api/config/neo4j.js';

async function main() {
    const session = driver.session();
    const result = await session.run(`
        MATCH (n) WHERE toLower(n.name) = 'redis'
        MATCH (n)-[r]-(m)
        RETURN labels(n) AS nLabels, type(r) AS relation, labels(m) AS mLabels, properties(m) AS mProps
    `);
    for (const rec of result.records) {
        console.log(rec.get('relation'), rec.get('mLabels'), rec.get('mProps').name || rec.get('mProps').externalId || rec.get('mProps'));
    }
    await session.close();
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
