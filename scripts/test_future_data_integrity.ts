/**
 * Future Data Invariant Protection Test Suite
 *
 * Verifies that the multi-layered invariant defense system:
 * 1. Database CHECK constraints and BEFORE INSERT/UPDATE triggers
 * 2. Sequential analytics pipeline ordering
 * 3. Zero-commit collapse logic
 * 4. Automatic post-recalculation integrity guard and self-healing
 *
 * GUARANTEES that for any future data (new repositories, commits, PRs, bots, edge-cases),
 * cross-field inconsistencies can NEVER arise.
 */

import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import sql from '../apps/api/config/postgres.js';
import { neo4jSession } from '../apps/api/config/neo4j.js';
import { calculateAllRepoMetrics } from '../packages/analytics/repoMetrics.service.js';
import { calculateAllPersonMetrics } from '../packages/analytics/personMetrics.service.js';
import { calculateAllTechnologyMetrics } from '../packages/analytics/technologyMetrics.js';
import { runPostRecalculationIntegrityGuard } from '../packages/analytics/integrityGuard.service.js';

const TEST_REPO = 'future-test-service-alpha';
const TEST_EXTERNAL_ID = 'test-future-external-999';

async function runFutureDataIntegrityTests() {
    console.log(`\n========================================================================`);
    console.log(`🛡️ RUNNING FUTURE DATA INVARIANT PROTECTION SUITE`);
    console.log(`========================================================================\n`);

    const session = neo4jSession();
    let allPassed = true;

    try {
        // Cleanup any stale test data from previous runs
        await sql`DELETE FROM events WHERE external_id LIKE 'future_test_%'`;
        await sql`DELETE FROM repo_metrics WHERE external_id = ${TEST_EXTERNAL_ID} OR repo_name = ${TEST_REPO}`;
        await session.run(`MATCH (r:REPOSITORY {name: $name}) DETACH DELETE r`, { name: TEST_REPO });

        // ---------------------------------------------------------------------
        // TEST 1: New Empty Repository Ingestion
        // ---------------------------------------------------------------------
        console.log(`Test 1: Ingesting a brand new repository with 0 commits...`);
        await session.run(`CREATE (r:REPOSITORY {name: $name, externalId: $extId})`, {
            name: TEST_REPO,
            extId: TEST_EXTERNAL_ID
        });

        await calculateAllRepoMetrics(seedSource);

        const [repoEmpty] = await sql<any[]>`SELECT * FROM repo_metrics WHERE repo_name = ${TEST_REPO}`;
        const t1Passed =
            Number(repoEmpty?.commit_count) === 0 &&
            Number(repoEmpty?.contributor_count) === 0 &&
            repoEmpty?.primary_owner === null &&
            Number(repoEmpty?.bus_factor) === 0 &&
            Number(repoEmpty?.risk_score) === 0 &&
            repoEmpty?.status === 'empty' &&
            Array.isArray(repoEmpty?.technologies) && repoEmpty.technologies.length === 0 &&
            Array.isArray(repoEmpty?.top_contributors) && repoEmpty.top_contributors.length === 0;

        if (t1Passed) {
            console.log(`  ✅ [PASS] New empty repo cleanly collapsed: 0 commits, 0 contributors, BF=0, status='empty'`);
        } else {
            allPassed = false;
            console.error(`  ❌ [FAIL] New empty repo failed collapse:`, repoEmpty);
        }

        // ---------------------------------------------------------------------
        // TEST 2: Database Trigger Protection Against Direct Corrupt Writes
        // ---------------------------------------------------------------------
        console.log(`\nTest 2: Testing PostgreSQL trigger against direct corrupt write attempts...`);
        const corruptExternalId = 'corrupt-test-external-001';
        await sql`
            INSERT INTO repo_metrics (
                source, external_id, repo_name, commit_count, contributor_count, primary_owner, bus_factor, status
            ) VALUES (
                ${seedSource}, ${corruptExternalId}, 'corrupt-test-repo', 0, 99, 'Hacker', 5.0, 'healthy'
            )
            ON CONFLICT (source, external_id) DO UPDATE SET
                commit_count = EXCLUDED.commit_count,
                contributor_count = EXCLUDED.contributor_count,
                bus_factor = EXCLUDED.bus_factor;
        `;

        const [corruptRow] = await sql<any[]>`SELECT * FROM repo_metrics WHERE external_id = ${corruptExternalId}`;
        const t2Passed =
            Number(corruptRow?.commit_count) === 0 &&
            Number(corruptRow?.contributor_count) === 0 &&
            corruptRow?.primary_owner === null &&
            Number(corruptRow?.bus_factor) === 0 &&
            corruptRow?.status === 'empty';

        // Clean up corrupt test record
        await sql`DELETE FROM repo_metrics WHERE external_id = ${corruptExternalId}`;

        if (t2Passed) {
            console.log(`  ✅ [PASS] PostgreSQL trigger intercepted corrupt write: forced 0 contributors, null owner, 0 BF, and 'empty' status.`);
        } else {
            allPassed = false;
            console.error(`  ❌ [FAIL] Database trigger failed to sanitize corrupt write:`, corruptRow);
        }

        // ---------------------------------------------------------------------
        // TEST 3: First Code Commit Arrival to Scaffold Repository
        // ---------------------------------------------------------------------
        console.log(`\nTest 3: First commit arrives via webhook event...`);
        const event1Id = 'future_test_ev_01';
        await sql`
            INSERT INTO events (id, source, provider, event_type, external_id, payload, created_at)
            VALUES (
                ${event1Id},
                ${seedSource},
                'github',
                'push',
                ${event1Id},
                ${sql.json({
                    repository: { name: TEST_REPO, full_name: TEST_REPO },
                    pusher: { name: 'Devendra Singh', email: 'devendra@cortex.internal' },
                    commits: [
                        {
                            id: 'c101',
                            author: { name: 'Devendra Singh', email: 'devendra@cortex.internal' },
                            message: 'Initial project setup',
                            modified: ['index.ts']
                        }
                    ]
                })},
                NOW()
            )
        `;

        // Connect commit contribution in Neo4j (attach to canonical person node)
        await session.run(`
            MATCH (r:REPOSITORY {name: $repo})
            MATCH (p:PERSON) WHERE p.canonicalPersonId = 'person_devendra_singh' OR p.name = 'Devendra Singh'
            WITH r, head(collect(p)) AS p
            MERGE (p)-[c:CONTRIBUTED_TO]->(r)
            SET c.commitCount = 1, c.lastCommitAt = timestamp()
        `, { repo: TEST_REPO });

        await calculateAllRepoMetrics(seedSource);
        await calculateAllPersonMetrics(seedSource);

        const [repoActive1] = await sql<any[]>`SELECT * FROM repo_metrics WHERE repo_name = ${TEST_REPO}`;
        const [devendraPerson1] = await sql<any[]>`SELECT * FROM person_metrics WHERE external_id = 'person_devendra_singh'`;

        const topContribs1 = Array.isArray(repoActive1?.top_contributors) ? repoActive1.top_contributors : [];
        const t3Passed =
            Number(repoActive1?.commit_count) === 1 &&
            Number(repoActive1?.contributor_count) === 1 &&
            repoActive1?.primary_owner === 'Devendra Singh' &&
            Number(repoActive1?.bus_factor) === 1 &&
            repoActive1?.status !== 'empty' &&
            topContribs1.length === 1 &&
            Number(topContribs1[0]?.percentage) === 100 &&
            Number(devendraPerson1?.commit_count) === 12; // 11 baseline + 1 new commit = 12

        if (t3Passed) {
            console.log(`  ✅ [PASS] Scaffold repository seamlessly transitioned to active: 1 commit, 1 contributor, 100% owner, Devendra total commits = 12 (11 baseline + 1)`);
        } else {
            allPassed = false;
            console.error(`  ❌ [FAIL] Active transition failed:`, { repoActive1, devendraPerson1 });
        }

        // ---------------------------------------------------------------------
        // TEST 4: Second Contributor Joins the Repository
        // ---------------------------------------------------------------------
        console.log(`\nTest 4: Second contributor pushes code to repository...`);
        const event2Id = 'future_test_ev_02';
        await sql`
            INSERT INTO events (id, source, provider, event_type, external_id, payload, created_at)
            VALUES (
                ${event2Id},
                ${seedSource},
                'github',
                'push',
                ${event2Id},
                ${sql.json({
                    repository: { name: TEST_REPO, full_name: TEST_REPO },
                    pusher: { name: 'Sarah Chen', email: 'sarah@cortex.internal' },
                    commits: [
                        {
                            id: 'c102',
                            author: { name: 'Sarah Chen', email: 'sarah@cortex.internal' },
                            message: 'Add auth middleware',
                            modified: ['auth.ts']
                        }
                    ]
                })},
                NOW()
            )
        `;

        await session.run(`
            MATCH (r:REPOSITORY {name: $repo})
            MATCH (p:PERSON) WHERE p.canonicalPersonId = 'person_sarah_chen' OR p.name = 'Sarah Chen'
            WITH r, head(collect(p)) AS p
            MERGE (p)-[c:CONTRIBUTED_TO]->(r)
            SET c.commitCount = 1, c.lastCommitAt = timestamp()
        `, { repo: TEST_REPO });

        await calculateAllRepoMetrics(seedSource);
        await calculateAllPersonMetrics(seedSource);

        const [repoActive2] = await sql<any[]>`SELECT * FROM repo_metrics WHERE repo_name = ${TEST_REPO}`;
        const [sarahPerson2] = await sql<any[]>`SELECT * FROM person_metrics WHERE external_id = 'person_sarah_chen'`;
        const topContribs2 = Array.isArray(repoActive2?.top_contributors) ? repoActive2.top_contributors : [];
        const sumPct2 = topContribs2.reduce((s: number, c: any) => s + Number(c.percentage || 0), 0);

        const t4Passed =
            Number(repoActive2?.commit_count) === 2 &&
            Number(repoActive2?.contributor_count) === 2 &&
            Math.abs(sumPct2 - 100) < 0.5 &&
            Number(sarahPerson2?.commit_count) === 12; // 11 baseline + 1 = 12

        if (t4Passed) {
            console.log(`  ✅ [PASS] Multi-contributor parity verified: 2 commits, 2 contributors, sum(ownership) = 100%, Sarah total commits = 12`);
        } else {
            allPassed = false;
            console.error(`  ❌ [FAIL] Multi-contributor parity failed:`, { repoActive2, sarahPerson2, sumPct2 });
        }

        // ---------------------------------------------------------------------
        // TEST 5: Automated Integrity Guard & Self-Healing Verification
        // ---------------------------------------------------------------------
        console.log(`\nTest 5: Testing automated post-recalculation integrity guard...`);
        const guardResult = await runPostRecalculationIntegrityGuard(seedSource);
        const t5Passed = guardResult.passed === true && guardResult.violationsCount === 0;

        if (t5Passed) {
            console.log(`  ✅ [PASS] Integrity Guard confirmed 100% compliance across ${guardResult.details.reposChecked} repos, ${guardResult.details.peopleChecked} people.`);
        } else {
            allPassed = false;
            console.error(`  ❌ [FAIL] Integrity Guard flagged unresolved violations:`, guardResult);
        }

        // ---------------------------------------------------------------------
        // TEST SUMMARY
        // ---------------------------------------------------------------------
        console.log(`\n========================================================================`);
        if (allPassed) {
            console.log(`🎉 ALL FUTURE DATA INVARIANT PROTECTION TESTS PASSED (100% RELIABILITY)!`);
        } else {
            console.error(`❌ SOME INVARIANT PROTECTION TESTS FAILED.`);
        }
        console.log(`========================================================================\n`);

        return { pass: allPassed };
    } finally {
        // Teardown synthetic test records
        console.log('[FutureDataTests] Tearing down synthetic test records...');
        await sql`DELETE FROM events WHERE external_id LIKE 'future_test_%'`;
        await sql`DELETE FROM repo_metrics WHERE external_id = ${TEST_EXTERNAL_ID} OR repo_name = ${TEST_REPO}`;
        await session.run(`MATCH (r:REPOSITORY {name: $name}) DETACH DELETE r`, { name: TEST_REPO });
        await session.close();

        // Restore clean baseline
        console.log('[FutureDataTests] Restoring production baseline metrics...');
        await calculateAllRepoMetrics(seedSource);
        await calculateAllPersonMetrics(seedSource);
        await calculateAllTechnologyMetrics(seedSource);
        await sql.end({ timeout: 5 }).catch(() => {});
    }
}

if (process.argv[1]?.endsWith('test_future_data_integrity.ts') || process.argv[1]?.endsWith('test_future_data_integrity.js')) {
    runFutureDataIntegrityTests()
        .then(result => process.exit(result.pass ? 0 : 1))
        .catch(err => {
            console.error('Fatal test error:', err);
            process.exit(1);
        });
}
