if (!process.argv.includes('--target=local')) process.argv.push('--target=local');
process.env.CORTEX_ENV = 'local-dev';
import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);

import sql from '../apps/api/config/postgres.js';
import { neo4jSession } from '../apps/api/config/neo4j.js';
import { runGraphWrite } from '../packages/database/neo4j/graph.repository.js';
import { resolveIdentity, setPersonActiveStatus, linkCanonicalPersons } from '../packages/identity/canonicalPerson.service.js';
import { reconcileWorkerService } from '../packages/identity/reconcileWorker.service.js';
import { ensurePostgresTables } from '../packages/database/postgres/schema.js';
import express from 'express';
import { integrationsRouter } from '../apps/api/modules/integrations/router.js';

async function runTestSuite() {
    console.log('================================================================');
    console.log('🚀 CORTEX DIRECTORY SYNC & RECONCILIATION ENGINE TEST SUITE');
    console.log(`Provenance Source: ${seedSource}`);
    console.log('================================================================\n');

    await ensurePostgresTables();

    let passed = 0;
    let failed = 0;

    // Cleanup any prior test artifacts for this seedSource
    const session = neo4jSession();
    try {
        await sql`DELETE FROM person_identity WHERE source = ${seedSource}`;
        await sql`DELETE FROM identity_merge_log WHERE source = ${seedSource}`;
        await sql`DELETE FROM potential_duplicates WHERE source = ${seedSource}`;
        await sql`DELETE FROM person_metrics WHERE source = ${seedSource}`;
        await runGraphWrite(`
            MATCH (n {source: $source})
            DETACH DELETE n
        `, { source: seedSource }, session);
    } finally {
        await session.close();
    }

    // -------------------------------------------------------------
    // TEST 1: Exact Email Auto-Merge Across Slack and Jira (Confidence 1.0)
    // -------------------------------------------------------------
    try {
        console.log('[Test 1] Testing Exact Email Cross-Provider Auto-Merge...');
        const email = 'priya.sharma@cortex.co';

        // 1. Resolve Slack identity
        const resSlack = await resolveIdentity({
            source: seedSource,
            provider: 'slack',
            externalId: 'U_PRIYA_SLACK',
            username: 'priyasharma',
            email,
            displayName: 'Priya Sharma',
            isBot: false,
            isActive: true,
        });

        // 2. Resolve Jira identity with identical email
        const resJira = await resolveIdentity({
            source: seedSource,
            provider: 'jira',
            externalId: 'ACC_PRIYA_JIRA',
            username: 'priya.sharma',
            email,
            displayName: 'Priya S.',
            isBot: false,
            isActive: true,
        });

        if (resSlack.canonicalPersonId === resJira.canonicalPersonId) {
            console.log(`✅ Test 1 PASSED: Identical email merged to canonical ID: ${resSlack.canonicalPersonId}\n`);
            passed++;
        } else {
            console.error(`❌ Test 1 FAILED: Canonical IDs differ: ${resSlack.canonicalPersonId} vs ${resJira.canonicalPersonId}\n`);
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 1 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 2: GitHub Noreply Email Resolution & Neo4j Edge Re-wiring
    // -------------------------------------------------------------
    try {
        console.log('[Test 2] Testing GitHub Noreply Email Resolution & Neo4j Edge Rewiring...');
        const rohanEmail = 'rohan.verma@cortex.co';
        const rohanUsername = 'rohanverma';

        // 1. Verified Directory User (Slack)
        const rohanSlack = await resolveIdentity({
            source: seedSource,
            provider: 'slack',
            externalId: 'U_ROHAN_SLACK',
            username: rohanUsername,
            email: rohanEmail,
            displayName: 'Rohan Verma',
            isBot: false,
            isActive: true,
        });

        // 2. GitHub identity with noreply address
        const rohanGithub = await resolveIdentity({
            source: seedSource,
            provider: 'github',
            externalId: 'GH_ROHAN_987',
            username: rohanUsername,
            email: `123456+${rohanUsername}@users.noreply.github.com`,
            displayName: 'Rohan Verma',
            isBot: false,
            isActive: true,
        });

        // Add a test repository and CONTRIBUTED_TO edge in Neo4j from GitHub person node
        const testSession = neo4jSession();
        try {
            await runGraphWrite(`
                MERGE (r:REPOSITORY {name: 'cortex-core', source: $source})
                WITH r
                MATCH (p:PERSON {canonicalPersonId: $ghCanonicalId, source: $source})
                MERGE (p)-[rel:CONTRIBUTED_TO {source: $source}]->(r)
                SET rel.commitCount = 12, rel.weightedScore = 12
            `, { source: seedSource, ghCanonicalId: rohanGithub.canonicalPersonId }, testSession);
        } finally {
            await testSession.close();
        }

        // Run reconciliation
        const stats = await reconcileWorkerService.runReconciliation(seedSource);

        // Verify Postgres: GitHub identity should now point to rohanSlack canonical ID
        const [updatedGh] = await sql`
            SELECT canonical_person_id FROM person_identity
            WHERE provider = 'github' AND external_id = 'GH_ROHAN_987' AND source = ${seedSource}
        `;

        // Verify Neo4j: The CONTRIBUTED_TO relationship must be rewired to rohanSlack canonical person
        const verifySession = neo4jSession();
        let rewiredEdges = 0;
        let duplicateDeleted = false;
        try {
            const edgeRes = await verifySession.run(`
                MATCH (p:PERSON {canonicalPersonId: $canonicalId, source: $source})-[r:CONTRIBUTED_TO]->(repo:REPOSITORY {name: 'cortex-core'})
                RETURN r.commitCount AS count
            `, { canonicalId: rohanSlack.canonicalPersonId, source: seedSource });
            rewiredEdges = edgeRes.records[0]?.get('count')?.toNumber ? edgeRes.records[0].get('count').toNumber() : Number(edgeRes.records[0]?.get('count') || 0);

            const dupCheck = await verifySession.run(`
                MATCH (p:PERSON {canonicalPersonId: $ghCanonicalId, source: $source})
                RETURN count(p) AS c
            `, { ghCanonicalId: rohanGithub.canonicalPersonId, source: seedSource });
            const dupCount = Number(dupCheck.records[0]?.get('c') || 0);
            duplicateDeleted = (dupCount === 0);
        } finally {
            await verifySession.close();
        }

        if (updatedGh?.canonical_person_id === rohanSlack.canonicalPersonId && rewiredEdges === 12 && duplicateDeleted) {
            console.log(`✅ Test 2 PASSED: GitHub noreply reconciled into canonical ID ${rohanSlack.canonicalPersonId}. Neo4j edge successfully rewired (commits: ${rewiredEdges}) and duplicate node removed.\n`);
            passed++;
        } else {
            console.error(`❌ Test 2 FAILED: updatedGh=${updatedGh?.canonical_person_id}, expected=${rohanSlack.canonicalPersonId}, rewiredEdges=${rewiredEdges}, duplicateDeleted=${duplicateDeleted}\n`);
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 2 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 3: Localhost / Dummy Git Author Fallback
    // -------------------------------------------------------------
    try {
        console.log('[Test 3] Testing Localhost / Dummy Git Author Name Match Fallback...');
        const vikramEmail = 'vikram.patel@cortex.co';

        // 1. Verified Directory User
        const vikramDir = await resolveIdentity({
            source: seedSource,
            provider: 'slack',
            externalId: 'U_VIKRAM_SLACK',
            username: 'vikrampatel',
            email: vikramEmail,
            displayName: 'Vikram Patel',
            isBot: false,
            isActive: true,
        });

        // 2. Dummy author with localhost email
        const vikramGit = await resolveIdentity({
            source: seedSource,
            provider: 'github',
            externalId: 'GH_VIKRAM_LOCAL',
            username: 'vikram',
            email: 'dev@localhost',
            displayName: 'Vikram Patel',
            isBot: false,
            isActive: true,
        });

        // Run reconciliation
        await reconcileWorkerService.runReconciliation(seedSource);

        const [updatedGit] = await sql`
            SELECT canonical_person_id FROM person_identity
            WHERE provider = 'github' AND external_id = 'GH_VIKRAM_LOCAL' AND source = ${seedSource}
        `;

        if (updatedGit?.canonical_person_id === vikramDir.canonicalPersonId) {
            console.log(`✅ Test 3 PASSED: Localhost Git author successfully linked to verified colleague (${vikramEmail}).\n`);
            passed++;
        } else {
            console.error(`❌ Test 3 FAILED: expected=${vikramDir.canonicalPersonId}, got=${updatedGit?.canonical_person_id}\n`);
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 3 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 4: Namesake Collision Protection (CRITICAL PRINCIPLE)
    // -------------------------------------------------------------
    try {
        console.log('[Test 4] Testing Namesake Collision Protection (Identical Names with Different Emails)...');
        // Two distinct colleagues named "Alex Smith" with different company emails
        const alex1 = await resolveIdentity({
            source: seedSource,
            provider: 'slack',
            externalId: 'U_ALEX_1',
            username: 'alexsmith',
            email: 'alex.smith@cortex.co',
            displayName: 'Alex Smith',
            isBot: false,
            isActive: true,
        });

        const alex2 = await resolveIdentity({
            source: seedSource,
            provider: 'jira',
            externalId: 'ACC_ALEX_2',
            username: 'alex.s',
            email: 'alex.s@cortex.co',
            displayName: 'Alex Smith',
            isBot: false,
            isActive: true,
        });

        // Run reconciliation
        const stats = await reconcileWorkerService.runReconciliation(seedSource);

        // Verify: They must NOT be merged!
        const [a1] = await sql`SELECT canonical_person_id FROM person_identity WHERE external_id = 'U_ALEX_1' AND source = ${seedSource}`;
        const [a2] = await sql`SELECT canonical_person_id FROM person_identity WHERE external_id = 'ACC_ALEX_2' AND source = ${seedSource}`;

        // Verify: Must be recorded in potential_duplicates as 'pending'
        const [dup] = await sql`
            SELECT status, resolution_reason FROM potential_duplicates
            WHERE source = ${seedSource} AND status = 'pending'
              AND ((person_a_name = 'Alex Smith' AND person_b_name = 'Alex Smith'))
            LIMIT 1
        `;

        if (a1.canonical_person_id !== a2.canonical_person_id && dup) {
            console.log(`✅ Test 4 PASSED: Namesake collision protected. Both remain separate personas (${a1.canonical_person_id} != ${a2.canonical_person_id}). Flagged to potential_duplicates table: "${dup.resolution_reason}".\n`);
            passed++;
        } else {
            console.error(`❌ Test 4 FAILED: Over-merged or missing potential_duplicates record: a1=${a1?.canonical_person_id}, a2=${a2?.canonical_person_id}, dup=${Boolean(dup)}\n`);
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 4 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 5: Ambiguous Namesake on Localhost / Missing Email
    // -------------------------------------------------------------
    try {
        console.log('[Test 5] Testing Ambiguous Namesake on Localhost Commit Author...');
        // Two colleagues named "Rahul Roy"
        await resolveIdentity({
            source: seedSource,
            provider: 'slack',
            externalId: 'U_RAHUL_ENG',
            username: 'rahul.eng',
            email: 'rahul.eng@cortex.co',
            displayName: 'Rahul Roy',
            isBot: false,
            isActive: true,
        });

        await resolveIdentity({
            source: seedSource,
            provider: 'jira',
            externalId: 'ACC_RAHUL_DESIGN',
            username: 'rahul.design',
            email: 'rahul.design@cortex.co',
            displayName: 'Rahul Roy',
            isBot: false,
            isActive: true,
        });

        // Git commit author with no email / localhost
        const rahulGit = await resolveIdentity({
            source: seedSource,
            provider: 'github',
            externalId: 'GH_RAHUL_LOCAL',
            username: 'rahul',
            email: 'root@localhost',
            displayName: 'Rahul Roy',
            isBot: false,
            isActive: true,
        });

        // Run reconciliation
        const stats = await reconcileWorkerService.runReconciliation(seedSource);

        // Verify: Git author should NOT be blindly auto-merged into either candidate
        const [currGit] = await sql`
            SELECT canonical_person_id FROM person_identity
            WHERE external_id = 'GH_RAHUL_LOCAL' AND source = ${seedSource}
        `;

        const [ambigDup] = await sql`
            SELECT resolution_reason FROM potential_duplicates
            WHERE source = ${seedSource} AND status = 'pending'
              AND resolution_reason LIKE '%AMBIGUOUS_NAMESAKE%'
            LIMIT 1
        `;

        if (currGit.canonical_person_id === rahulGit.canonicalPersonId && ambigDup) {
            console.log(`✅ Test 5 PASSED: Ambiguous namesake blocked from auto-merging. Logged to potential_duplicates for admin review: "${ambigDup.resolution_reason}".\n`);
            passed++;
        } else {
            console.error(`❌ Test 5 FAILED: Auto-merged ambiguous namesake or missing potential duplicate audit.\n`);
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 5 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 6: Bot and Service Account Isolation
    // -------------------------------------------------------------
    try {
        console.log('[Test 6] Testing Bot and CI/CD Account Filtering...');
        const bot1 = await resolveIdentity({
            source: seedSource,
            provider: 'github',
            externalId: 'BOT_DEP',
            username: 'dependabot[bot]',
            displayName: 'dependabot[bot]',
            email: 'dependabot[bot]@users.noreply.github.com',
            isBot: true,
            isActive: true,
        });

        const bot2 = await resolveIdentity({
            source: seedSource,
            provider: 'github',
            externalId: 'BOT_GHA',
            username: 'github-actions[bot]',
            displayName: 'github-actions',
            email: 'actions@github.com',
            isBot: true,
            isActive: true,
        });

        // Run reconciliation
        await reconcileWorkerService.runReconciliation(seedSource);

        const botRows = await sql`
            SELECT external_id, is_bot FROM person_identity
            WHERE external_id IN ('BOT_DEP', 'BOT_GHA') AND source = ${seedSource}
        `;

        const allBots = botRows.length === 2 && botRows.every(b => b.is_bot === true);

        // Check Neo4j bot flag
        const verifySession = neo4jSession();
        let neo4jBotFlagged = false;
        try {
            const neoRes = await verifySession.run(`
                MATCH (p:PERSON {source: $source})
                WHERE p.isBot = true
                RETURN count(p) AS c
            `, { source: seedSource });
            neo4jBotFlagged = Number(neoRes.records[0]?.get('c') || 0) >= 2;
        } finally {
            await verifySession.close();
        }

        if (allBots && neo4jBotFlagged) {
            console.log(`✅ Test 6 PASSED: Bot accounts successfully flagged (is_bot: true) in PostgreSQL & Neo4j.\n`);
            passed++;
        } else {
            console.error(`❌ Test 6 FAILED: allBots=${allBots}, neo4jBotFlagged=${neo4jBotFlagged}\n`);
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 6 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 7: Inactive / Departed Employee Handling
    // -------------------------------------------------------------
    try {
        console.log('[Test 7] Testing Inactive / Alumni Status Propagation...');
        const departed = await resolveIdentity({
            source: seedSource,
            provider: 'slack',
            externalId: 'U_DEPARTED_USER',
            username: 'exemployee',
            email: 'ex.employee@cortex.co',
            displayName: 'Ex Employee',
            isBot: false,
            isActive: false, // marked departed
        });

        // Set active status
        await setPersonActiveStatus(departed.canonicalPersonId, false, seedSource, 'alumni');

        // Verify Postgres person_identity
        const [idRow] = await sql`
            SELECT is_active FROM person_identity
            WHERE canonical_person_id = ${departed.canonicalPersonId} AND source = ${seedSource}
        `;

        // Verify Neo4j
        const verifySession = neo4jSession();
        let neo4jAlumni = false;
        try {
            const nRes = await verifySession.run(`
                MATCH (p:PERSON {canonicalPersonId: $id, source: $source})
                RETURN p.isActive AS isActive, p.employmentStatus AS status
            `, { id: departed.canonicalPersonId, source: seedSource });
            const rec = nRes.records[0];
            neo4jAlumni = (rec?.get('isActive') === false && rec?.get('status') === 'alumni');
        } finally {
            await verifySession.close();
        }

        if (idRow?.is_active === false && neo4jAlumni) {
            console.log(`✅ Test 7 PASSED: Alumni status successfully propagated to Postgres (is_active: false) and Neo4j (isActive: false, employmentStatus: 'alumni').\n`);
            passed++;
        } else {
            console.error(`❌ Test 7 FAILED: idRow=${idRow?.is_active}, neo4jAlumni=${neo4jAlumni}\n`);
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 7 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 8: Reconciliation Stats Query
    // -------------------------------------------------------------
    try {
        console.log('[Test 8] Testing Reconciliation Statistics Reporting...');
        const stats = await reconcileWorkerService.getReconciliationStats(seedSource);
        console.log('Reconciliation Stats:', JSON.stringify(stats, null, 2));

        if (stats.totalIdentities > 0 && stats.botCount >= 2 && stats.pendingDuplicatesCount >= 1) {
            console.log('✅ Test 8 PASSED: Statistics query accurately reports identity resolution state.\n');
            passed++;
        } else {
            console.error('❌ Test 8 FAILED: Statistics output missing expected totals.\n');
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 8 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // -------------------------------------------------------------
    // TEST 9: REST API Endpoints Verification via Express Router
    // -------------------------------------------------------------
    try {
        console.log('[Test 9] Testing REST API Endpoints on Express App...');
        const testApp = express();
        testApp.use(express.json());
        testApp.use('/api/integrations', integrationsRouter);

        const server = testApp.listen(0);
        const address = server.address() as any;
        const testPort = address.port;

        // 1. GET /api/integrations/reconcile/stats
        const resStats = await fetch(`http://127.0.0.1:${testPort}/api/integrations/reconcile/stats?source=${seedSource}`);
        const dataStats = (await resStats.json()) as any;

        // 2. POST /api/integrations/reconcile
        const resReconcile = await fetch(`http://127.0.0.1:${testPort}/api/integrations/reconcile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: seedSource }),
        });
        const dataReconcile = (await resReconcile.json()) as any;

        server.close();

        if (resStats.ok && dataStats.success && resReconcile.ok && dataReconcile.success) {
            console.log('✅ Test 9 PASSED: REST API endpoints (/reconcile and /reconcile/stats) respond with 200 OK and valid JSON.\n');
            passed++;
        } else {
            console.error('❌ Test 9 FAILED: API response invalid:', { dataStats, dataReconcile });
            failed++;
        }
    } catch (err: any) {
        console.error(`❌ Test 9 EXCEPTION: ${err.message}\n`);
        failed++;
    }

    // Clean up test data
    console.log('[Cleanup] Purging temporary test provenance artifacts...');
    const cleanupSession = neo4jSession();
    try {
        await sql`DELETE FROM person_identity WHERE source = ${seedSource}`;
        await sql`DELETE FROM identity_merge_log WHERE source = ${seedSource}`;
        await sql`DELETE FROM potential_duplicates WHERE source = ${seedSource}`;
        await sql`DELETE FROM person_metrics WHERE source = ${seedSource}`;
        await runGraphWrite(`
            MATCH (n {source: $source})
            DETACH DELETE n
        `, { source: seedSource }, cleanupSession);
    } finally {
        await cleanupSession.close();
    }

    console.log('================================================================');
    console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log('================================================================\n');

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTestSuite().catch(err => {
    console.error('FATAL TEST RUN ERROR:', err);
    process.exit(1);
});
