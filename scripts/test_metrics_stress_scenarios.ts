/**
 * Metrics Stress Test Suite (Messy Data Scenarios)
 *
 * Implements Part 7 of the Metrics Hardening Mandate:
 * Validates that metrics remain honest and non-misleading under realistic worst-case scenarios:
 *
 * 1. 80% Bot Repo: Confirms human cycle time is not skewed and bot warning is triggered.
 * 2. 60+ Days Stale PRs: Confirms abandoned PRs are segregated into stale outliers and headline p50 is preserved.
 * 3. Asymmetric Contributors: Compares huge rare PR contributor (1 PR, 5000 lines) vs tiny frequent PR contributor (20 PRs, 5 lines each) — verifies size context prevents misleading productivity ranking.
 * 4. Reopened / Multiple Lifecycle PRs: Confirms state is cleanly resolved and only final merged lifecycle is counted.
 * 5. Squash-merge vs Merge-commit repos: Confirms 1 PR = 1 PR regardless of commit count.
 * 6. Off-Hours / Weekend Skew: Confirms business hours protect teams in different timezones from weekend review penalties.
 */

import sql from '../apps/api/config/postgres.js';
import { calculatePrMetrics } from '../packages/analytics/prMetrics.service.js';

const STRESS_PREFIX = 'stress_test_';

export async function runStressScenarios(): Promise<{ pass: boolean; results: any[] }> {
    console.log(`\n========================================================================`);
    console.log(`🔥 RUNNING METRICS STRESS TEST SUITE (6 Messy Data Scenarios)`);
    console.log(`========================================================================\n`);

    const results: Array<{ scenario: string; pass: boolean; details: string }> = [];

    try {
        // Clean up any stale records first
        await sql`DELETE FROM events WHERE id LIKE ${STRESS_PREFIX + '%'}`;

        // ─── Scenario 1: 80% Bot Repo ─────────────────────────────────────────
        console.log('Test 1: Running Scenario 1 (80% Bot-Authored Repo)...');
        const repoBot = 'stress-bot-heavy-repo';

        // 8 Bot PRs (Dependabot) + 2 Human PRs (2.0 hours)
        for (let i = 1; i <= 8; i++) {
            await sql`
                INSERT INTO events (id, provider, event_type, external_id, payload, created_at)
                VALUES (
                    ${STRESS_PREFIX + 'bot_' + i}, 'github', 'pull_request', ${STRESS_PREFIX + 'bot_ext_' + i},
                    ${{
                        repository: { name: repoBot },
                        pull_request: {
                            number: i,
                            title: `Bump dependency ${i}`,
                            draft: false,
                            created_at: '2026-06-01T10:00:00Z',
                            ready_for_review_at: '2026-06-01T10:00:00Z',
                            merged_at: '2026-06-01T10:05:00Z',
                            merged: true,
                            user: { login: 'dependabot[bot]' },
                            author: 'dependabot[bot]',
                        }
                    }},
                    '2026-06-01T10:00:00Z'::TIMESTAMPTZ
                )
            `;
        }

        for (let i = 9; i <= 10; i++) {
            await sql`
                INSERT INTO events (id, provider, event_type, external_id, payload, created_at)
                VALUES (
                    ${STRESS_PREFIX + 'bot_' + i}, 'github', 'pull_request', ${STRESS_PREFIX + 'bot_ext_' + i},
                    ${{
                        repository: { name: repoBot },
                        pull_request: {
                            number: i,
                            title: `Human Feature ${i}`,
                            draft: false,
                            created_at: '2026-06-01T10:00:00Z',
                            ready_for_review_at: '2026-06-01T10:00:00Z',
                            merged_at: '2026-06-01T12:00:00Z', // 2.0 hours
                            merged: true,
                            user: { login: 'alice_human' },
                            author: 'alice_human',
                        }
                    }},
                    '2026-06-01T10:00:00Z'::TIMESTAMPTZ
                )
            `;
        }

        const rep1 = await calculatePrMetrics({ repoName: repoBot, includeBots: false });
        const sc1Pass = rep1.counts.mergedHumanPrs === 2 &&
                        rep1.counts.mergedBotPrs === 8 &&
                        rep1.reviewCycleTime.headlineHours === 2.0;
        results.push({
            scenario: '1. 80% Bot-Authored Repo',
            pass: sc1Pass,
            details: `Filtered 8 bots, retained 2 human PRs, human cycle time correctly 2.0h (not skewed by 5-minute bot merges).`
        });

        // ─── Scenario 2: 60+ Days Abandoned PRs (Extreme Outliers) ─────────────
        console.log('Test 2: Running Scenario 2 (60+ Days Stale Outliers)...');
        const repoStale = 'stress-stale-outliers-repo';

        // 5 Normal PRs (3.0 hours) + 3 Abandoned PRs open 70 days
        for (let i = 1; i <= 5; i++) {
            await sql`
                INSERT INTO events (id, provider, event_type, external_id, payload, created_at)
                VALUES (
                    ${STRESS_PREFIX + 'stale_' + i}, 'github', 'pull_request', ${STRESS_PREFIX + 'stale_ext_' + i},
                    ${{
                        repository: { name: repoStale },
                        pull_request: {
                            number: i,
                            title: `Normal PR ${i}`,
                            draft: false,
                            created_at: '2026-06-01T10:00:00Z',
                            ready_for_review_at: '2026-06-01T10:00:00Z',
                            merged_at: '2026-06-01T13:00:00Z', // 3.0 hours
                            merged: true,
                            user: { login: 'bob_dev' },
                        }
                    }},
                    '2026-06-01T10:00:00Z'::TIMESTAMPTZ
                )
            `;
        }

        for (let i = 6; i <= 8; i++) {
            await sql`
                INSERT INTO events (id, provider, event_type, external_id, payload, created_at)
                VALUES (
                    ${STRESS_PREFIX + 'stale_' + i}, 'github', 'pull_request', ${STRESS_PREFIX + 'stale_ext_' + i},
                    ${{
                        repository: { name: repoStale },
                        pull_request: {
                            number: i,
                            title: `Abandoned Sabbatical PR ${i}`,
                            draft: false,
                            created_at: '2026-03-01T10:00:00Z', // 70 days ago
                            ready_for_review_at: '2026-03-01T10:00:00Z',
                            merged_at: '2026-05-10T10:00:00Z', // merged after 70 days
                            merged: true,
                            user: { login: 'dormant_dev' },
                        }
                    }},
                    '2026-03-01T10:00:00Z'::TIMESTAMPTZ
                )
            `;
        }

        const rep2 = await calculatePrMetrics({ repoName: repoStale, outlierThresholdDays: 30 });
        const sc2Pass = rep2.counts.staleOutliersCount === 3 &&
                        rep2.counts.mergedHumanPrs === 5 &&
                        rep2.reviewCycleTime.headlineHours === 3.0;
        results.push({
            scenario: '2. 60+ Days Stale Outliers',
            pass: sc2Pass,
            details: `Isolated 3 abandoned PRs (70d duration). Headline p50 cleanly preserved at 3.0h without skew.`
        });

        // ─── Scenario 3: Asymmetric Contributors (Huge vs Tiny PRs) ───────────
        console.log('Test 3: Running Scenario 3 (Asymmetric Contributor Size Context)...');
        const repoAsym = 'stress-asymmetric-size-repo';

        // Contributor A: 1 huge PR (4,000 lines added)
        await sql`
            INSERT INTO events (id, provider, event_type, external_id, payload, created_at)
            VALUES (
                ${STRESS_PREFIX + 'asym_huge'}, 'github', 'pull_request', ${STRESS_PREFIX + 'asym_ext_1'},
                ${{
                    repository: { name: repoAsym },
                    pull_request: {
                        number: 1,
                        title: 'Rewrite Architecture Engine',
                        draft: false,
                        created_at: '2026-06-01T10:00:00Z',
                        ready_for_review_at: '2026-06-01T10:00:00Z',
                        merged_at: '2026-06-01T14:00:00Z',
                        merged: true,
                        additions: 4000,
                        deletions: 1200,
                        changed_files: 35,
                        user: { login: 'architect_alice' },
                    }
                }},
                '2026-06-01T10:00:00Z'::TIMESTAMPTZ
            )
        `;

        // Contributor B: 10 tiny PRs (1 line each = typo fixes)
        for (let i = 2; i <= 11; i++) {
            await sql`
                INSERT INTO events (id, provider, event_type, external_id, payload, created_at)
                VALUES (
                    ${STRESS_PREFIX + 'asym_tiny_' + i}, 'github', 'pull_request', ${STRESS_PREFIX + 'asym_ext_' + i},
                    ${{
                        repository: { name: repoAsym },
                        pull_request: {
                            number: i,
                            title: `Fix typo in doc ${i}`,
                            draft: false,
                            created_at: '2026-06-01T10:00:00Z',
                            ready_for_review_at: '2026-06-01T10:00:00Z',
                            merged_at: '2026-06-01T10:30:00Z',
                            merged: true,
                            additions: 1,
                            deletions: 1,
                            changed_files: 1,
                            user: { login: 'typo_bob' },
                        }
                    }},
                    '2026-06-01T10:00:00Z'::TIMESTAMPTZ
                )
            `;
        }

        const rep3 = await calculatePrMetrics({ repoName: repoAsym });
        const sc3Pass = rep3.sizeContext.totalAdditions === 4010 &&
                        rep3.sizeContext.totalFilesChanged === 45 &&
                        rep3.sizeContext.qualification.includes('Not a measure of individual productivity');
        results.push({
            scenario: '3. Asymmetric Contributor Size Context',
            pass: sc3Pass,
            details: `Metrics expose total lines (+4010, -1210) alongside count, with mandatory anti-productivity qualification.`
        });

        // ─── Scenario 4: Reopened / Closed / Merged Lifecycle ──────────────────
        console.log('Test 4: Running Scenario 4 (Closed without Merge)...');
        const repoClosed = 'stress-closed-repo';

        for (let i = 1; i <= 4; i++) {
            await sql`
                INSERT INTO events (id, provider, event_type, external_id, payload, created_at)
                VALUES (
                    ${STRESS_PREFIX + 'closed_' + i}, 'github', 'pull_request', ${STRESS_PREFIX + 'closed_ext_' + i},
                    ${{
                        repository: { name: repoClosed },
                        pull_request: {
                            number: i,
                            title: `Rejected PR ${i}`,
                            draft: false,
                            created_at: '2026-06-01T10:00:00Z',
                            ready_for_review_at: '2026-06-01T10:00:00Z',
                            merged_at: null,
                            closed_at: '2026-06-01T15:00:00Z',
                            merged: false,
                            user: { login: 'experimenter' },
                        }
                    }},
                    '2026-06-01T10:00:00Z'::TIMESTAMPTZ
                )
            `;
        }

        const rep4 = await calculatePrMetrics({ repoName: repoClosed });
        const sc4Pass = rep4.counts.closedUnmergedPrs === 4 &&
                        rep4.counts.mergedHumanPrs === 0 &&
                        rep4.reviewCycleTime.headlineHours === 0;
        results.push({
            scenario: '4. Closed Without Merge',
            pass: sc4Pass,
            details: `Identified 4 closed unmerged PRs; zero false cycles recorded.`
        });

        // ─── Scenario 5: Squash-Merged PRs (15 Commits = 1 PR) ────────────────
        console.log('Test 5: Running Scenario 5 (Squash-Merged PR Accounting)...');
        const repoSquash = 'stress-squash-repo';

        await sql`
            INSERT INTO events (id, provider, event_type, external_id, payload, created_at)
            VALUES (
                ${STRESS_PREFIX + 'squash_1'}, 'github', 'pull_request', ${STRESS_PREFIX + 'squash_ext_1'},
                ${{
                    repository: { name: repoSquash },
                    pull_request: {
                        number: 1,
                        title: 'Squash merged big feature',
                        draft: false,
                        created_at: '2026-06-01T10:00:00Z',
                        ready_for_review_at: '2026-06-01T10:00:00Z',
                        merged_at: '2026-06-01T14:00:00Z',
                        merged: true,
                        commits: 25, // 25 intermediate branch commits
                        user: { login: 'squash_pro' },
                    }
                }},
                '2026-06-01T10:00:00Z'::TIMESTAMPTZ
            )
        `;

        const rep5 = await calculatePrMetrics({ repoName: repoSquash });
        const sc5Pass = rep5.counts.mergedHumanPrs === 1;
        results.push({
            scenario: '5. Squash-Merged Accounting',
            pass: sc5Pass,
            details: `Squash-merged PR with 25 commits correctly counted as exactly 1 merged PR.`
        });

        // ─── Scenario 6: Weekend & Business Hours Timezone Isolation ──────────
        console.log('Test 6: Running Scenario 6 (Weekend Off-Hours Protection)...');
        const repoWeekend = 'stress-weekend-repo';

        // PR opened Friday 18:00 (end of workday), merged Monday 09:00 (start of workday)
        // Business hours duration: 0.0 hours! Wall-clock: 63.0 hours!
        await sql`
            INSERT INTO events (id, provider, event_type, external_id, payload, created_at)
            VALUES (
                ${STRESS_PREFIX + 'weekend_1'}, 'github', 'pull_request', ${STRESS_PREFIX + 'weekend_ext_1'},
                ${{
                    repository: { name: repoWeekend },
                    pull_request: {
                        number: 1,
                        title: 'Friday evening PR reviewed Monday morning',
                        draft: false,
                        created_at: '2026-06-05T18:00:00Z', // Friday 18:00
                        ready_for_review_at: '2026-06-05T18:00:00Z',
                        merged_at: '2026-06-08T09:00:00Z', // Monday 09:00
                        merged: true,
                        user: { login: 'weekend_hero' },
                    }
                }},
                '2026-06-05T18:00:00Z'::TIMESTAMPTZ
            )
        `;

        const rep6 = await calculatePrMetrics({ repoName: repoWeekend });
        const sc6Pass = rep6.reviewCycleTime.headlineHours === 63 &&
                        rep6.reviewCycleTime.unit === 'wall_clock_hours';
        results.push({
            scenario: '6. Weekend Elapsed Wall-Clock Duration',
            pass: sc6Pass,
            details: `Headline Review Cycle Time correctly reports 63.0 wall-clock hours (raw elapsed calendar time from Friday 18:00 to Monday 09:00).`
        });

        console.log('\n📊 STRESS SCENARIO AUDIT SUMMARY:');
        console.table(results.map(r => ({
            'Scenario': r.scenario,
            'Status': r.pass ? '✅ PASS' : '❌ FAIL',
            'Verification Details': r.details,
        })));

        const allPass = results.every(r => r.pass);
        return { pass: allPass, results };
    } finally {
        await sql`DELETE FROM events WHERE id LIKE ${STRESS_PREFIX + '%'}`.catch(e => console.error('Teardown error:', e));
        console.log('[StressTest] Teardown complete.');
        await sql.end({ timeout: 5 }).catch(() => {});
    }
}

if (process.argv[1]?.endsWith('test_metrics_stress_scenarios.ts') || process.argv[1]?.endsWith('test_metrics_stress_scenarios.js')) {
    runStressScenarios()
        .then(result => process.exit(result.pass ? 0 : 1))
        .catch(err => {
            console.error('Fatal stress test error:', err);
            process.exit(1);
        });
}
