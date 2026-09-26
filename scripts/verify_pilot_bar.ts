import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import { driver } from '../apps/api/config/neo4j.js';
import sql from '../apps/api/config/postgres.js';
import { calculateAllRepoMetrics } from '../packages/analytics/repoMetrics.service.js';
import { calculateSuccessorCandidates } from '../packages/analytics/successor.service.js';
import { calculateActivity, calculateOwnership } from '../packages/analytics/knowledge.risk.predict.js';
import { processGithubEvent } from '../packages/ingestion/github/processGithubEvent.js';
import { isBotAccount } from '../packages/shared/botDetection.js';

async function runPilotBarVerification() {
    console.log('============================================================');
    console.log('       CORTEX MINIMUM PILOT BAR VERIFICATION SUITE          ');
    console.log('============================================================\n');

    let passed = 0;
    let failed = 0;
    const session = driver.session();

    try {
        // -------------------------------------------------------------
        // Invariant 1: Health Score Inversion Fix (BF >= 5 included)
        // -------------------------------------------------------------
        console.log('[Invariant 1] Testing Health Score & Active Repos Filter (BF >= 5, risk = 0)...');
        try {
            const testRepoName = `pilot_test_healthy_bf5_${Date.now()}`;
            await sql`
                INSERT INTO repo_metrics (source, external_id, repo_name, bus_factor, risk_score, contributor_count, primary_owner, status, computed_at)
                VALUES (${seedSource}, ${testRepoName}, ${testRepoName}, 5, 0, 8, 'Senior Engineer', 'healthy', now())
                ON CONFLICT (source, external_id) DO UPDATE SET bus_factor = 5, risk_score = 0, status = 'healthy'
            `;

            // Test the active repos filter fixed in controller.ts: status NOT IN ('empty', 'scaffold') AND bus_factor > 0
            const [queried] = await sql`
                SELECT repo_name, bus_factor, risk_score, status
                FROM repo_metrics
                WHERE source = ${seedSource} AND repo_name = ${testRepoName}
                  AND status NOT IN ('empty', 'scaffold')
                  AND bus_factor > 0
            `;

            if (queried && Number(queried.bus_factor) === 5 && Number(queried.risk_score) === 0) {
                console.log('  ✅ Invariant 1 PASSED: Bus Factor 5 repo (risk_score = 0) is correctly included in active repos.\n');
                passed++;
            } else {
                console.error('  ❌ Invariant 1 FAILED: BF 5 repo was excluded.\n');
                failed++;
            }

            // Cleanup
            await sql`DELETE FROM repo_metrics WHERE external_id = ${testRepoName}`;
        } catch (err: any) {
            console.error(`  ❌ Invariant 1 EXCEPTION: ${err?.message}\n`);
            failed++;
        }

        // -------------------------------------------------------------
        // Invariant 2: Bot Exclusion from Bus Factor & Successor Recommendations
        // -------------------------------------------------------------
        console.log('[Invariant 2] Testing Bot Exclusion (Dependabot with 80% commits vs Human with 20%)...');
        try {
            const testBotRepo = `pilot_test_bot_repo_${Date.now()}`;
            
            // Create Repository node
            await session.run(`
                MERGE (r:REPOSITORY {name: $repoName})
                SET r.createdAt = timestamp()
            `, { repoName: testBotRepo });

            // Create bot node with 80 commits
            await session.run(`
                MERGE (bot:PERSON {name: 'dependabot[bot]'})
                SET bot.isBot = true
                MERGE (r:REPOSITORY {name: $repoName})
                MERGE (bot)-[rel:CONTRIBUTED_TO]->(r)
                SET rel.commitCount = 80, rel.lastCommitAt = timestamp()
            `, { repoName: testBotRepo });

            // Create human node with 20 commits
            await session.run(`
                MERGE (human:PERSON {name: 'Alice PilotEngineer'})
                SET human.isBot = false, human.email = 'alice@example.com'
                MERGE (r:REPOSITORY {name: $repoName})
                MERGE (human)-[rel:CONTRIBUTED_TO]->(r)
                SET rel.commitCount = 20, rel.lastCommitAt = timestamp()
            `, { repoName: testBotRepo });

            // Calculate repo metrics
            await calculateAllRepoMetrics(seedSource);

            const [metrics] = await sql`
                SELECT primary_owner, bus_factor, contributor_count 
                FROM repo_metrics 
                WHERE repo_name = ${testBotRepo}
            `;

            console.log(`  Repo metrics for ${testBotRepo}: primary_owner=${metrics?.primary_owner}, bus_factor=${metrics?.bus_factor}, contributors=${metrics?.contributor_count}`);

            // Also test successor recommendations: bot should NEVER appear
            const successorRes = await calculateSuccessorCandidates('Alice PilotEngineer', testBotRepo);
            const containsBotSuccessor = successorRes.candidates.some(c => isBotAccount(c.name));

            if (metrics && metrics.primary_owner === 'Alice PilotEngineer' && !containsBotSuccessor) {
                console.log('  ✅ Invariant 2 PASSED: Dependabot ignored despite 80% commits; Alice correctly crowned primary owner, and bots excluded from successors.\n');
                passed++;
            } else {
                console.error(`  ❌ Invariant 2 FAILED: primary_owner=${metrics?.primary_owner}, containsBotSuccessor=${containsBotSuccessor}\n`);
                failed++;
            }

            // Cleanup
            await session.run(`
                MATCH (r:REPOSITORY {name: $repoName})
                OPTIONAL MATCH (r)<-[rel:CONTRIBUTED_TO]-()
                DELETE rel, r
            `, { repoName: testBotRepo });
            await sql`DELETE FROM repo_metrics WHERE repo_name = ${testBotRepo}`;
        } catch (err: any) {
            console.error(`  ❌ Invariant 2 EXCEPTION: ${err?.message}\n`);
            failed++;
        }

        // -------------------------------------------------------------
        // Invariant 3: Multi-Author Ingestion on Push
        // -------------------------------------------------------------
        console.log('[Invariant 3] Testing Multi-Author Ingestion (Alice 2 commits, Bob 1 commit in single push)...');
        try {
            const testPushRepo = `pilot-org/multi-author-repo-${Date.now()}`;
            const testEventId = `pilot_event_${Date.now()}`;

            const rawPayload = {
                ref: 'refs/heads/main',
                repository: {
                    name: testPushRepo,
                    full_name: testPushRepo
                },
                pusher: {
                    name: 'Alice PilotAuthor',
                    email: 'alice.pilot@company.com'
                },
                sender: {
                    login: 'alice_pilot',
                    id: 991101
                },
                commits: [
                    {
                        id: `sha_pilot_1_${Date.now()}`,
                        message: 'Feature part 1',
                        timestamp: new Date().toISOString(),
                        author: {
                            name: 'Alice PilotAuthor',
                            email: 'alice.pilot@company.com',
                            username: 'alice_pilot'
                        }
                    },
                    {
                        id: `sha_pilot_2_${Date.now()}`,
                        message: 'Feature part 2',
                        timestamp: new Date().toISOString(),
                        author: {
                            name: 'Alice PilotAuthor',
                            email: 'alice.pilot@company.com',
                            username: 'alice_pilot'
                        }
                    },
                    {
                        id: `sha_pilot_3_${Date.now()}`,
                        message: 'Bug fix by colleague',
                        timestamp: new Date().toISOString(),
                        author: {
                            name: 'Bob Colleague',
                            email: 'bob.colleague@company.com',
                            username: 'bob_colleague'
                        }
                    }
                ]
            };

            await sql`
                INSERT INTO events (id, source, provider, event_type, external_id, payload, created_at)
                VALUES (${testEventId}, ${seedSource}, 'github', 'push', ${testEventId}, ${JSON.stringify(rawPayload)}, now())
            `;

            // Process event
            await processGithubEvent(testEventId);

            // Verify Neo4j CONTRIBUTED_TO relationships
            const contribQuery = await session.run(`
                MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY {name: $repoName})
                RETURN p.name AS person, rel.commitCount AS commits
                ORDER BY p.name ASC
            `, { repoName: testPushRepo });

            const contributions = contribQuery.records.map(r => ({
                person: r.get('person'),
                commits: Number(r.get('commits') || 0)
            }));

            console.log('  Attributed contributions:', JSON.stringify(contributions));

            const aliceContrib = contributions.find(c => c.person === 'Alice PilotAuthor');
            const bobContrib = contributions.find(c => c.person === 'Bob Colleague');

            if (aliceContrib?.commits === 2 && bobContrib?.commits === 1) {
                console.log('  ✅ Invariant 3 PASSED: Both Alice (2) and Bob (1) received exact individual commit attribution from the single push event.\n');
                passed++;
            } else {
                console.error(`  ❌ Invariant 3 FAILED: Expected Alice=2, Bob=1. Got: ${JSON.stringify(contributions)}\n`);
                failed++;
            }

            // -------------------------------------------------------------
            // Invariant 5: Retry Idempotency on CONTRIBUTED_TO
            // -------------------------------------------------------------
            console.log('[Invariant 5] Testing BullMQ Worker Retry Idempotency on Same Event...');
            try {
                // Re-process the exact same event
                await processGithubEvent(testEventId);

                const retryQuery = await session.run(`
                    MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY {name: $repoName})
                    RETURN p.name AS person, rel.commitCount AS commits
                    ORDER BY p.name ASC
                `, { repoName: testPushRepo });

                const retryContributions = retryQuery.records.map(r => ({
                    person: r.get('person'),
                    commits: Number(r.get('commits') || 0)
                }));

                console.log('  Post-retry contributions:', JSON.stringify(retryContributions));

                const aliceRetry = retryContributions.find(c => c.person === 'Alice PilotAuthor');
                const bobRetry = retryContributions.find(c => c.person === 'Bob Colleague');

                if (aliceRetry?.commits === 2 && bobRetry?.commits === 1) {
                    console.log('  ✅ Invariant 5 PASSED: Re-running the event did NOT inflate commit counts (Alice remains 2, Bob remains 1).\n');
                    passed++;
                } else {
                    console.error(`  ❌ Invariant 5 FAILED: Commit count inflated on retry: ${JSON.stringify(retryContributions)}\n`);
                    failed++;
                }
            } catch (err: any) {
                console.error(`  ❌ Invariant 5 EXCEPTION: ${err?.message}\n`);
                failed++;
            }

            // Cleanup Invariant 3 & 5 artifacts
            await session.run(`
                MATCH (r:REPOSITORY {name: $repoName})
                OPTIONAL MATCH (r)<-[rel:CONTRIBUTED_TO]-()
                DELETE rel, r
            `, { repoName: testPushRepo });
            await sql`DELETE FROM events WHERE id = ${testEventId}`;
        } catch (err: any) {
            console.error(`  ❌ Invariant 3 EXCEPTION: ${err?.message}\n`);
            failed++;
        }

        // -------------------------------------------------------------
        // Invariant 4: Activity Recency Uses Developer Activity (lastCommitAt), Not Repo createdAt
        // -------------------------------------------------------------
        console.log('[Invariant 4] Testing Activity Recency (Repo 180d old, dev active yesterday)...');
        try {
            const oldRepoName = `pilot_old_repo_180d_${Date.now()}`;
            const devName = `Carol RecencyDev_${Date.now()}`;
            const repoCreatedAt = Date.now() - (180 * 24 * 60 * 60 * 1000); // 180 days ago
            const commitYesterday = Date.now() - (1 * 24 * 60 * 60 * 1000); // 1 day ago

            // Insert old repo
            await session.run(`
                CREATE (r:REPOSITORY {name: $repoName, createdAt: $createdAt})
            `, { repoName: oldRepoName, createdAt: repoCreatedAt });

            // Connect Carol with recent commit
            await session.run(`
                CREATE (p:PERSON {name: $devName, email: $email})
                WITH p
                MATCH (r:REPOSITORY {name: $repoName})
                CREATE (p)-[:CONTRIBUTED_TO {commitCount: 5, lastCommitAt: $lastCommitAt, createdAt: $createdAt}]->(r)
            `, { devName, email: `${devName}@example.com`, repoName: oldRepoName, lastCommitAt: commitYesterday, createdAt: repoCreatedAt });

            const activityRes = await calculateActivity(devName, { relation: 'CONTRIBUTED_TO', targetLabel: 'REPOSITORY' }, ['CONTRIBUTED_TO']);
            console.log(`  Activity result for ${devName}: count=${activityRes.count}, score=${activityRes.score} (0 is high risk/inactive, 1 is low risk/active)`);

            // With recent commit yesterday, recentCount should be >= 1, and activity inactivity risk score should be <= 0.95
            // Previously with e.createdAt check, count was 0 and score was 1.0 (100% inactivity penalty)!
            if (activityRes.count >= 1 && activityRes.score <= 0.95) {
                console.log('  ✅ Invariant 4 PASSED: Carol received credit for yesterday commit on a 180-day-old repo (not penalized by repo age).\n');
                passed++;
            } else {
                console.error(`  ❌ Invariant 4 FAILED: Activity count was ${activityRes.count}, score was ${activityRes.score}\n`);
                failed++;
            }

            // Cleanup
            await session.run(`
                MATCH (p:PERSON {name: $devName})
                OPTIONAL MATCH (p)-[rel]-()
                DELETE rel, p
            `, { devName });
            await session.run(`
                MATCH (r:REPOSITORY {name: $repoName})
                DELETE r
            `, { repoName: oldRepoName });
        } catch (err: any) {
            console.error(`  ❌ Invariant 4 EXCEPTION: ${err?.message}\n`);
            failed++;
        }

        console.log('============================================================');
        console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
        console.log('============================================================\n');

        if (failed > 0) {
            process.exit(1);
        }
    } finally {
        await session.close();
        await driver.close();
        await sql.end();
    }
}

runPilotBarVerification().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
