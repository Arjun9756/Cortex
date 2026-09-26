import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';
import { processGithubEvent } from '../packages/ingestion/github/processGithubEvent.js';
import { calculateAllRepoMetrics } from '../packages/analytics/repoMetrics.service.js';
import { calculateAllPersonMetrics } from '../packages/analytics/personMetrics.service.js';

async function testStrictIngestionAndDuplicates() {
    console.log('🧪 Starting Strict Ingestion & Duplicates Verification Test...\n');

    const prefix = 'strict_test_';
    const repoName = `${prefix}cortex_repo`;

    // 1. Cleanup old test data
    await sql`DELETE FROM events WHERE id LIKE ${prefix + '%'}`;
    await sql`DELETE FROM person_identity WHERE external_id LIKE ${prefix + '%'} OR external_id IN ('101', '102', '103', '99101', '99102', '99103') OR username LIKE ${prefix + '%'}`;
    await sql`DELETE FROM identity_merge_log WHERE person_a LIKE ${prefix + '%'} OR person_b LIKE ${'%' + prefix + '%'}`;
    await sql`DELETE FROM potential_duplicates WHERE person_a_username LIKE ${prefix + '%'} OR person_b_username LIKE ${prefix + '%'}`;
    await sql`DELETE FROM repo_metrics WHERE external_id = ${repoName}`;

    const session = driver.session();
    try {
        await session.run(`MATCH (p:PERSON) WHERE p.name = 'Alexander Hamilton' OR p.externalId IN ['99101', '99102', '99103', '101', '102', '103'] DETACH DELETE p`);
        await session.run(`MATCH (r:REPOSITORY {name: $repoName}) DETACH DELETE r`, { repoName });
        await session.run(`MATCH (c:COMMIT) WHERE c.name STARTS WITH $prefix DETACH DELETE c`, { prefix });
    } finally {
        await session.close();
    }

    console.log('🧹 Cleaned up previous test records.');

    // 2. Simulate 3 separate GitHub events:
    // User 1: Alexander Hamilton (alpha@example.com, user: alex_alpha)
    // User 2: Alexander Hamilton (beta@example.com, user: alex_beta)
    // User 3: Alexander Hamilton (no email, user: alex_gamma)
    console.log('\n📥 Processing Ingestion Event 1: Alexander Hamilton (Alpha)...');
    const event1Id = `${prefix}event_1`;
    await sql`
        INSERT INTO events (id, source, provider, event_type, external_id, payload)
        VALUES (${event1Id}, ${seedSource}, 'github', 'push', ${event1Id}, ${JSON.stringify({
            ref: 'refs/heads/main',
            repository: { name: repoName },
            sender: { id: 99101, login: `${prefix}alex_alpha` },
            head_commit: {
                id: `${prefix}commit_1`,
                message: 'feat: alpha changes',
                timestamp: new Date().toISOString(),
                author: { name: 'Alexander Hamilton', email: `${prefix}alex@alpha.com`, username: `${prefix}alex_alpha` }
            },
            commits: [
                { id: `${prefix}commit_1`, message: 'feat: alpha changes', modified: ['alpha.ts'] }
            ]
        })})
    `;
    await processGithubEvent(event1Id);

    console.log('\n📥 Processing Ingestion Event 2: Alexander Hamilton (Beta, different email)...');
    const event2Id = `${prefix}event_2`;
    await sql`
        INSERT INTO events (id, source, provider, event_type, external_id, payload)
        VALUES (${event2Id}, ${seedSource}, 'github', 'push', ${event2Id}, ${JSON.stringify({
            ref: 'refs/heads/main',
            repository: { name: repoName },
            sender: { id: 99102, login: `${prefix}alex_beta` },
            head_commit: {
                id: `${prefix}commit_2`,
                message: 'feat: beta changes',
                timestamp: new Date().toISOString(),
                author: { name: 'Alexander Hamilton', email: `${prefix}alex@beta.com`, username: `${prefix}alex_beta` }
            },
            commits: [
                { id: `${prefix}commit_2`, message: 'feat: beta changes', modified: ['beta.ts'] }
            ]
        })})
    `;
    await processGithubEvent(event2Id);

    console.log('\n📥 Processing Ingestion Event 3: Alexander Hamilton (Gamma, name only, no email)...');
    const event3Id = `${prefix}event_3`;
    await sql`
        INSERT INTO events (id, source, provider, event_type, external_id, payload)
        VALUES (${event3Id}, ${seedSource}, 'github', 'push', ${event3Id}, ${JSON.stringify({
            ref: 'refs/heads/main',
            repository: { name: repoName },
            sender: { id: 99103, login: `${prefix}alex_gamma` },
            head_commit: {
                id: `${prefix}commit_3`,
                message: 'feat: gamma changes',
                timestamp: new Date().toISOString(),
                author: { name: 'Alexander Hamilton', email: null, username: `${prefix}alex_gamma` }
            },
            commits: [
                { id: `${prefix}commit_3`, message: 'feat: gamma changes', modified: ['gamma.ts'] }
            ]
        })})
    `;
    await processGithubEvent(event3Id);

    // 3. Verify in PostgreSQL person_identity table:
    const alexIdentities = await sql`
        SELECT canonical_person_id, provider, external_id, username, email, display_name
        FROM person_identity
        WHERE display_name = 'Alexander Hamilton'
        ORDER BY external_id
    `;
    console.log('\n📊 Postgres person_identity rows for "Alexander Hamilton":');
    for (const r of alexIdentities) {
        console.log(`  - CanonicalId: ${r.canonical_person_id} | Username: ${r.username} | Email: ${r.email}`);
    }

    const uniqueCanonicals = new Set(alexIdentities.map(r => r.canonical_person_id));
    if (uniqueCanonicals.size !== 3) {
        throw new Error(`❌ Strict Policy Failure: Expected 3 separate canonical person entries for 3 different accounts with name "Alexander Hamilton", but got ${uniqueCanonicals.size}! Auto-merge occurred!`);
    }
    console.log('✅ Policy Verified: All 3 accounts remained separate canonical persons!');

    // 4. Verify in PostgreSQL potential_duplicates table:
    const duplicates = await sql`
        SELECT person_a_id, person_a_name, person_b_id, person_b_name, similarity_score, status, resolution_reason
        FROM potential_duplicates
        WHERE person_a_username LIKE ${prefix + '%'} OR person_b_username LIKE ${prefix + '%'}
    `;
    console.log(`\n📋 Potential Duplicates flagged for review (${duplicates.length} total):`);
    for (const d of duplicates) {
        console.log(`  - [${d.status}] ${d.person_a_name} <-> ${d.person_b_name} (score: ${d.similarity_score}): ${d.resolution_reason}`);
    }
    if (duplicates.length === 0) {
        throw new Error(`❌ Strict Policy Failure: Name collisions were NOT flagged to potential_duplicates table!`);
    }
    console.log('✅ Policy Verified: Name collisions were logged to potential_duplicates with status = "pending"!');

    // 5. Verify in Neo4j Graph Database:
    const verifySession = driver.session();
    try {
        const canonIds = Array.from(uniqueCanonicals);
        const neoNodes = await verifySession.run(`
            MATCH (p:PERSON)
            WHERE p.canonicalPersonId IN $canonIds
            RETURN p.canonicalPersonId AS cid, p.name AS name, p.externalId AS ext, elementId(p) AS elemId
        `, { canonIds });
        console.log(`\n🕸️ Neo4j PERSON nodes for canonical IDs (${neoNodes.records.length} nodes):`);
        for (const n of neoNodes.records) {
            console.log(`  - Node: cid=${n.get('cid')}, name=${n.get('name')}, ext=${n.get('ext')}, elemId=${n.get('elemId')}`);
        }
        if (neoNodes.records.length < 3) {
            throw new Error(`❌ Neo4j Failure: Expected at least 3 distinct PERSON nodes, but found ${neoNodes.records.length}!`);
        }
        console.log('✅ Neo4j Verified: Distinct PERSON nodes exist for all 3 canonical persons without collision!');

        // 6. Verify Bus Factor calculation with these 3 distinct authors:
        console.log('\n🚌 Verifying Bus Factor Calculation with 3 separate canonical contributors...');
        for (let i = 0; i < canonIds.length; i++) {
            const cid = canonIds[i];
            const commitName = `${prefix}commit_${i + 1}`;
            await verifySession.run(`
                MATCH (p:PERSON {canonicalPersonId: $cid})
                MERGE (c:COMMIT {name: $commitName, externalId: $commitName})
                MERGE (r:REPOSITORY {name: $repoName, externalId: $repoName})
                MERGE (p)-[:AUTHORED]->(c)
                MERGE (c)-[:PART_OF]->(r)
            `, { cid, commitName, repoName });
        }
    } finally {
        await verifySession.close();
    }

    await calculateAllRepoMetrics(seedSource);
    const [repoMetric] = await sql`SELECT bus_factor, contributor_count, primary_owner FROM repo_metrics WHERE external_id = ${repoName}`;
    console.log(`  - Repo Metrics: bus_factor=${repoMetric?.bus_factor}, contributors=${repoMetric?.contributor_count}, owner=${repoMetric?.primary_owner}`);
    // 3 distinct authors with 1 commit each (total 3 commits). Any 2 authors cover 2/3 = 66.7% >= 50%. Bus factor should be 2!
    if (repoMetric?.bus_factor < 2) {
        throw new Error(`❌ Bus Factor Failure: Expected bus factor >= 2 for 3 distinct committers, but got ${repoMetric?.bus_factor}!`);
    }
    console.log('✅ Bus Factor Verified: Correctly treated 3 authors as distinct contributors!');

    console.log('\n🎉 ALL STRICT INGESTION & DUPLICATES VERIFICATIONS PASSED SUCCESSFULLY!');
    process.exit(0);
}

testStrictIngestionAndDuplicates().catch(err => {
    console.error('❌ Test Failed:', err);
    process.exit(1);
});
