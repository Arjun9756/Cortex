import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';

async function checkTimestamps() {
    console.log('=== POSTGRES EVENT TIMESTAMPS ===');
    const pEvents = await sql`
        SELECT author, count(*) as count, max(created_at) as max_time, min(created_at) as min_time
        FROM events
        GROUP BY author
    `;
    console.table(pEvents);

    console.log('\n=== NEO4J TIMESTAMPS ===');
    const session = driver.session();
    try {
        const nCommits = await session.run(`
            MATCH (p:PERSON)-[:AUTHORED|CREATED]-(w)
            RETURN p.name as person, labels(w)[0] as type, count(w) as count, max(coalesce(w.timestamp, w.createdAt, w.created_at)) as max_time
        `);
        console.table(nCommits.records.map(r => ({
            person: r.get('person'),
            type: r.get('type'),
            count: r.get('count').toNumber(),
            max_time: r.get('max_time')
        })));
    } finally {
        await session.close();
        await driver.close();
        await sql.end();
        process.exit(0);
    }
}

checkTimestamps();
