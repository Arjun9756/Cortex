import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';

async function verifyDataAvailability() {
    console.log('===============================================================');
    console.log('STEP 1: VERIFY DATA AVAILABILITY IN POSTGRESQL VS NEO4J');
    console.log('===============================================================\n');

    const session = driver.session();
    try {
        // 1. Check schema of person_metrics in PostgreSQL
        const columns = await sql`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'person_metrics'
            ORDER BY ordinal_position
        `;
        console.log('--- 1. POSTGRESQL person_metrics TABLE SCHEMA ---');
        console.table(columns.map(c => ({ column: c.column_name, type: c.data_type, nullable: c.is_nullable })));

        // 2. Sample all rows from person_metrics
        const pmRows = await sql`
            SELECT person_name, external_id, risk_score, commit_count, repos, top_technologies, computed_at
            FROM person_metrics
            ORDER BY person_name
        `;
        console.log('\n--- 2. ALL ROWS IN person_metrics ---');
        for (const row of pmRows) {
            console.log(`Person: "${row.person_name}" (${row.external_id})`);
            console.log(`  - Risk Score: ${row.risk_score}`);
            console.log(`  - Commit Count: ${row.commit_count}`);
            console.log(`  - Repos (${Array.isArray(row.repos) ? row.repos.length : 0}):`, row.repos);
            console.log(`  - Top Technologies:`, JSON.stringify(row.top_technologies));
            console.log(`  - Updated At: ${row.updated_at}`);
        }

        // 3. Run the exact Neo4j query currently used in successor.service.ts
        const neo4jRes = await session.run(`
            MATCH (p:PERSON)
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
        `);

        console.log('\n--- 3. EXACT NEO4J QUERY DATA PER PERSON ---');
        for (const record of neo4jRes.records) {
            const name = record.get('name');
            const rawTechs = [...new Set((record.get('rawTechs') || []).filter(Boolean))];
            const rawRepos = [...new Set((record.get('rawRepos') || []).filter(Boolean))];
            const latestTime = record.get('latestTime');
            console.log(`Person: "${name}" (${record.get('email')} / ${record.get('externalId')})`);
            console.log(`  - Neo4j Techs (${rawTechs.length}):`, rawTechs);
            console.log(`  - Neo4j Repos (${rawRepos.length}):`, rawRepos);
            console.log(`  - Neo4j Latest Time:`, latestTime);
        }

        // 4. Detailed comparison for key people: Priya Sharma, Rohan Verma, Devendra Singh, Amina Zahra
        console.log('\n--- 4. SIDE-BY-SIDE CROSS CHECK (POSTGRESQL VS NEO4J) ---');
        const testPeople = ['Priya Sharma', 'Rohan Verma', 'Devendra Singh', 'Amina Zahra'];
        for (const personName of testPeople) {
            const pgMatch = pmRows.find(r => r.person_name && r.person_name.toLowerCase() === personName.toLowerCase());
            const neoRecord = neo4jRes.records.find(r => r.get('name') && r.get('name').toLowerCase() === personName.toLowerCase());

            const pgRepos = new Set((pgMatch?.repos || []).map((r: string) => r.toLowerCase().trim()));
            const pgTechs = new Set((pgMatch?.top_technologies || []).map((t: any) => (typeof t === 'string' ? t : (t?.name || t?.tech))?.toLowerCase().trim()).filter(Boolean));

            const neoRepos = new Set((neoRecord ? neoRecord.get('rawRepos') : []).map((r: string) => r.toLowerCase().trim()).filter(Boolean));
            const neoTechs = new Set((neoRecord ? neoRecord.get('rawTechs') : []).map((t: string) => t.toLowerCase().trim()).filter(Boolean));

            console.log(`\nComparison for [${personName}]:`);
            console.log(`  Repos in PG (${pgRepos.size}): [${Array.from(pgRepos).join(', ')}]`);
            console.log(`  Repos in Neo4j (${neoRepos.size}): [${Array.from(neoRepos).join(', ')}]`);
            const repoDiffPGOnly = Array.from(pgRepos).filter(r => !neoRepos.has(r));
            const repoDiffNeoOnly = Array.from(neoRepos).filter(r => !pgRepos.has(r));
            console.log(`  -> Repos diff: PG-only: [${repoDiffPGOnly}], Neo4j-only: [${repoDiffNeoOnly}]`);

            console.log(`  Techs in PG (${pgTechs.size}): [${Array.from(pgTechs).join(', ')}]`);
            console.log(`  Techs in Neo4j (${neoTechs.size}): [${Array.from(neoTechs).join(', ')}]`);
            const techDiffPGOnly = Array.from(pgTechs).filter(t => !neoTechs.has(t));
            const techDiffNeoOnly = Array.from(neoTechs).filter(t => !pgTechs.has(t));
            console.log(`  -> Techs diff: PG-only: [${techDiffPGOnly}], Neo4j-only: [${techDiffNeoOnly}]`);
        }

        // 5. Check events table in Postgres for timestamps vs Neo4j
        console.log('\n--- 5. TIMESTAMPS / FRESHNESS CHECK (POSTGRES events VS NEO4J) ---');
        const eventsCheck = await sql`
            SELECT 
                coalesce(payload->'sender'->>'login', payload->'pusher'->>'name', payload->'actor'->>'login', payload->>'author') AS author,
                count(*) as event_count,
                MAX(created_at) as latest_created_at
            FROM events
            WHERE payload IS NOT NULL
            GROUP BY author
            ORDER BY latest_created_at DESC
            LIMIT 10
        `;
        console.log('Top authors in Postgres events:');
        console.table(eventsCheck);

        // 6. Check repo_metrics table in Postgres
        const repoMetricsCheck = await sql`
            SELECT repo_name, bus_factor, risk_score, primary_owner, contributor_count, computed_at
            FROM repo_metrics
        `;
        console.log('\n--- 6. repo_metrics in Postgres ---');
        console.table(repoMetricsCheck);

    } catch (err: any) {
        console.error('Error during verification:', err);
    } finally {
        await session.close();
        await driver.close();
        await sql.end();
        process.exit(0);
    }
}

verifyDataAvailability();
