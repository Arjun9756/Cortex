import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';

async function main() {
    const s = driver.session();
    try {
        const rawPersonName = 'Priya Sharma';

        console.log('--- TESTING HYBRID FAST APPROACH ---');
        // Warmup
        await sql`SELECT 1`;
        await s.run('RETURN 1');

        const t0 = Date.now();

        const tPG0 = Date.now();
        const [pmRows, rmRows] = await Promise.all([
            sql`SELECT person_name, external_id, risk_score, repos, top_technologies FROM person_metrics`,
            sql`SELECT repo_name, bus_factor FROM repo_metrics`
        ]);
        console.log(`Postgres person_metrics + repo_metrics: ${Date.now() - tPG0}ms`);

        const tEv = Date.now();
        const eventRows = await sql`SELECT coalesce(payload->'sender'->>'login', payload->'pusher'->>'name', payload->'actor'->>'login') AS author, MAX(created_at) as latest_event FROM events WHERE payload IS NOT NULL GROUP BY author`;
        console.log(`Postgres events aggregation: ${Date.now() - tEv}ms`);

        // Filter valid candidates from Postgres
        const SLACK_ID_PATTERN = /^U[A-Z0-9]{6,}$/i;
        const validCandidates = pmRows.filter(r => r.person_name && !SLACK_ID_PATTERN.test(r.person_name.trim()));
        const candidateNames = validCandidates.map(r => r.person_name.trim());
        console.log(`Filtered ${candidateNames.length} valid human candidates from Postgres`);

        // 2. Scoped Neo4j query for ONLY candidate and target persons
        const tNeoStart = Date.now();
        const graphRes = await s.run(`
            MATCH (p:PERSON)
            WHERE toLower(p.name) = toLower($rawPersonName) OR p.name IN $candidateNames
            OPTIONAL MATCH (p)-[:USES]->(t1:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED|WORKS_ON|ASSIGNED_TO|CONTRIBUTED_TO]-(w)-[:USES|MENTIONED_IN]-(t2:TECHNOLOGY)
            OPTIONAL MATCH (p)-[:WORKS_ON|CONTRIBUTED_TO]-(r1:REPOSITORY)
            OPTIONAL MATCH (p)-[:AUTHORED|CREATED]-(w)-[:PART_OF|BELONGS_TO]-(r2:REPOSITORY)
            WITH p,
                 collect(DISTINCT toLower(trim(t1.name))) + collect(DISTINCT toLower(trim(t2.name))) AS rawTechs,
                 collect(DISTINCT toLower(trim(r1.name))) + collect(DISTINCT toLower(trim(r2.name))) AS rawRepos,
                 max(coalesce(w.timestamp, w.createdAt, w.created_at)) AS latestTime
            RETURN p.name AS name,
                   p.email AS email,
                   p.externalId AS externalId,
                   rawTechs,
                   rawRepos,
                   latestTime
        `, { rawPersonName, candidateNames });
        const tNeo = Date.now() - tNeoStart;
        console.log(`Scoped Neo4j query time: ${tNeo}ms (${graphRes.records.length} records)`);
        console.log(`Total data fetch time: ${Date.now() - t0}ms`);

    } finally {
        await s.close();
        await sql.end();
    }
}

main().catch(console.error).finally(() => process.exit(0));
