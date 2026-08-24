import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';

async function checkCollaborations() {
    const session = driver.session();
    try {
        console.log('=== 1. SHARED REPOS IN NEO4J ===');
        const res1 = await session.run(`
            MATCH (p1:PERSON)-[:WORKS_ON|CONTRIBUTED_TO|AUTHORED]-(w)-[:PART_OF|BELONGS_TO*0..1]-(r:REPOSITORY)
            MATCH (p2:PERSON)-[:WORKS_ON|CONTRIBUTED_TO|AUTHORED]-(w2)-[:PART_OF|BELONGS_TO*0..1]-(r)
            WHERE p1.name < p2.name
            RETURN p1.name as p1, p2.name as p2, r.name as repo
        `);
        console.table(res1.records.map(r => ({ p1: r.get('p1'), p2: r.get('p2'), repo: r.get('repo') })));

        console.log('=== 2. SHARED PRs OR ISSUES ===');
        const res2 = await session.run(`
            MATCH (p1:PERSON)-[r1]-(item)-[r2]-(p2:PERSON)
            WHERE p1.name < p2.name AND NOT item:REPOSITORY AND NOT item:TECHNOLOGY
            RETURN p1.name as p1, type(r1) as r1, labels(item) as labels, item.name as name, type(r2) as r2, p2.name as p2
        `);
        console.table(res2.records.map(r => ({
            p1: r.get('p1'),
            r1: r.get('r1'),
            item: r.get('name'),
            labels: r.get('labels')?.[0],
            r2: r.get('r2'),
            p2: r.get('p2')
        })));

    } finally {
        await session.close();
        await driver.close();
        await sql.end();
        process.exit(0);
    }
}

checkCollaborations();
