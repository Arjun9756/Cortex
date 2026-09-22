import sql from '../apps/api/config/postgres.js';
import { driver } from '../apps/api/config/neo4j.js';
import { runAnalyticsJob } from '../packages/workers/scheduler.worker.js';

async function cleanupTestData() {
    console.log('============================================================');
    console.log('CLEANING UP TEST ARTIFACTS TO PREVENT GHOST INFLATION');
    console.log('============================================================\n');

    const session = driver.session();
    try {
        // 1. Delete test entities from Neo4j
        console.log('[1/4] Deleting test nodes from Neo4j...');
        const neoRes = await session.run(`
            MATCH (n)
            WHERE n.name =~ '.*(17900|pilot_test|repo_alumni|repo_decay|repo_u1|repo_u2|repo_bot_heavy|coauthor|scale-push|Daniel_17900|Dan_17900|TargetDev|RealHuman|Active_Junior|Alumni_Lead|OldHero|FreshDev|Partner Dev|lead_dev|scale_dev|Alice Pilot|Bob Colleague|Carol Recency|AuditTestPerson).*'
               OR n.externalId =~ '.*(17900|pilot_test|repo_alumni|repo_decay|repo_u1|repo_u2|repo_bot_heavy|can_alumni|can_active|can_hero|can_fresh|can_daniel|can_dan|can_target|person_realhuman|gh_Alumni_Lead|person_alice_example_com|person_audit_alpha).*'
               OR n.canonicalPersonId =~ '.*(17900|pilot_test|can_alumni|can_active|can_hero|can_fresh|can_daniel|can_dan|can_target|person_realhuman).*'
            DETACH DELETE n
            RETURN count(n) AS deleted
        `);
        const deletedNeo = neoRes.records[0]?.get('deleted')?.toNumber ? neoRes.records[0].get('deleted').toNumber() : Number(neoRes.records[0]?.get('deleted') || 0);
        console.log(`  -> Deleted ${deletedNeo} test nodes from Neo4j.`);

        // 2. Delete test events from Postgres
        console.log('[2/4] Deleting test records from Postgres events...');
        const delEvents = await sql`
            DELETE FROM events 
            WHERE id::text ILIKE '%17900%' 
               OR id::text ILIKE '%pilot%' 
               OR payload::text ILIKE '%17900%' 
               OR payload::text ILIKE '%pilot_test%'
            RETURNING id
        `;
        console.log(`  -> Deleted ${delEvents.length} test events.`);

        // 3. Delete test identities and logs from Postgres
        console.log('[3/4] Deleting test records from person_identity, potential_duplicates, and merge logs...');
        const delIdentities = await sql`
            DELETE FROM person_identity
            WHERE canonical_person_id ILIKE '%17900%'
               OR canonical_person_id ILIKE '%can_%'
               OR canonical_person_id ILIKE '%pilot%'
               OR external_id ILIKE '%17900%'
               OR username ILIKE '%17900%'
               OR display_name ILIKE '%17900%'
               OR display_name ILIKE '%pilot%'
            RETURNING id
        `;
        console.log(`  -> Deleted ${delIdentities.length} test identities.`);

        await sql`
            DELETE FROM potential_duplicates
            WHERE person_a_id ILIKE '%17900%'
               OR person_b_id ILIKE '%17900%'
               OR person_a_name ILIKE '%17900%'
               OR person_b_name ILIKE '%17900%'
        `.catch(() => {});

        await sql`
            DELETE FROM identity_merge_log
            WHERE person_a ILIKE '%17900%'
               OR person_b ILIKE '%17900%'
        `;

        // 4. Delete test repo metrics & person metrics
        console.log('[4/4] Deleting test repo_metrics and person_metrics...');
        await sql`
            DELETE FROM person_metrics
            WHERE person_name ILIKE '%17900%'
               OR person_name ILIKE '%pilot%'
               OR external_id ILIKE '%17900%'
               OR external_id ILIKE '%can_%'
               OR external_id IN ('person_alice_example_com', 'person_466784662002345139335168')
        `;

        const delRepos = await sql`
            DELETE FROM repo_metrics
            WHERE repo_name ILIKE '%17900%'
               OR repo_name ILIKE '%pilot%'
               OR repo_name ILIKE '%coauthor%'
               OR repo_name ILIKE '%scale-push%'
               OR external_id ILIKE '%17900%'
            RETURNING external_id
        `;
        console.log(`  -> Deleted ${delRepos.length} test repos.`);

        // 5. Re-run analytics job to compute pristine canonical state
        console.log('\n--- Re-running Analytics Job on Pristine Enterprise Dataset ---');
        await runAnalyticsJob();

        // 6. Verify ghost count is 0
        const [ghostP] = await sql`SELECT count(*)::int as c FROM person_metrics WHERE person_name ILIKE '%17900%' OR person_name ILIKE '%pilot%'`;
        const [ghostR] = await sql`SELECT count(*)::int as c FROM repo_metrics WHERE repo_name ILIKE '%17900%' OR repo_name ILIKE '%pilot%'`;
        const [totalP] = await sql`SELECT count(*)::int as c FROM person_metrics`;
        const [totalR] = await sql`SELECT count(*)::int as c FROM repo_metrics`;

        console.log('\n============================================================');
        console.log('PRISTINE DATABASE VERIFICATION');
        console.log('============================================================');
        console.log(`Ghost Persons: ${ghostP.c} (Expected: 0)`);
        console.log(`Ghost Repos: ${ghostR.c} (Expected: 0)`);
        console.log(`Real Canonical Persons: ${totalP.c}`);
        console.log(`Real Canonical Repos: ${totalR.c}`);

        if (ghostP.c === 0 && ghostR.c === 0) {
            console.log('\n✅ SCENARIO N PASSED: Analytics completed with ZERO ghost inflation.');
        } else {
            console.error('\n❌ SCENARIO N FAILED: Ghost records still present.');
        }

    } finally {
        await session.close();
        await driver.close();
        process.exit(0);
    }
}

cleanupTestData();
