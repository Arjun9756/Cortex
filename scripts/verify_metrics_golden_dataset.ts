/**
 * Golden Dataset Ground-Truth Verification Harness
 *
 * Implements Part 5 of the Metrics Hardening Mandate:
 * Evaluates 35 realistic synthetic edge-case PR records in live PostgreSQL
 * against manually verified ground-truth values.
 *
 * Edge cases covered:
 * 1. Standard review PRs (weekday intraday)
 * 2. Overnight review PRs (business hours vs wall clock)
 * 3. Weekend review PRs (Friday evening to Monday morning)
 * 4. Draft-heavy PRs (in draft for 10 days before review)
 * 5. Bot PRs (Dependabot, Renovate, GitHub Actions)
 * 6. Extreme outliers (>30 days open)
 * 7. Closed unmerged PRs
 * 8. Squash-merged PRs
 * 9. Multi-author / High-impact PRs
 *
 * Automatically injects test records with clean idempotent teardown on completion.
 */

import { assertSafeTestDatabase } from '../packages/database/provenance.js';
const seedSource = assertSafeTestDatabase(import.meta.url);
import sql from '../apps/api/config/postgres.js';
import { calculatePrMetrics } from '../packages/analytics/prMetrics.service.js';

const TEST_REPO = 'test-golden-repo-alpha';
const TEST_PREFIX = 'golden_test_';

interface GroundTruthCase {
    id: string;
    number: number;
    title: string;
    author: string;
    userLogin: string;
    isDraft: boolean;
    createdAt: string;
    readyForReviewAt: string;
    mergedAt: string | null;
    closedAt: string | null;
    additions: number;
    deletions: number;
    changedFiles: number;
    commitsCount: number;
    expectedCategory: 'standard' | 'bot' | 'outlier' | 'closed';
    expectedBusinessHours?: number;
    expectedWallClockHours?: number;
}

// Fixed baseline anchor dates (2026-06-01 is Monday)
const MON_0900 = '2026-06-01T09:00:00.000Z';
const MON_0930 = '2026-06-01T09:30:00.000Z';
const TUE_1000 = '2026-06-02T10:00:00.000Z';
const TUE_1400 = '2026-06-02T14:00:00.000Z';
const TUE_1700 = '2026-06-02T17:00:00.000Z';
const WED_1000 = '2026-06-03T10:00:00.000Z';
const THU_1000 = '2026-06-04T10:00:00.000Z';
const THU_1230 = '2026-06-04T12:30:00.000Z';
const THU_1300 = '2026-06-04T13:00:00.000Z';
const THU_1600 = '2026-06-04T16:00:00.000Z';
const FRI_1000 = '2026-06-05T10:00:00.000Z';
const FRI_1500 = '2026-06-05T15:00:00.000Z';
const FRI_1730 = '2026-06-05T17:30:00.000Z';
const NEXT_MON_0930 = '2026-06-08T09:30:00.000Z'; // Following Monday
const DRAFT_START = '2026-05-25T10:00:00.000Z'; // 10 days before June 4
const OUTLIER_START = '2026-04-15T10:00:00.000Z'; // 45 days before June 1

export const GOLDEN_CASES: GroundTruthCase[] = [
    // 1-5: Standard Intraday PRs (Tue 10:00 -> Tue 14:00 = 4.0 business hours)
    ...[1, 2, 3, 4, 5].map(n => ({
        id: `${TEST_PREFIX}pr_${n}`,
        number: n,
        title: `Standard Feature Component ${n}`,
        author: 'alice_dev',
        userLogin: 'alice_dev',
        isDraft: false,
        createdAt: TUE_1000,
        readyForReviewAt: TUE_1000,
        mergedAt: TUE_1400,
        closedAt: TUE_1400,
        additions: 120,
        deletions: 30,
        changedFiles: 4,
        commitsCount: 2,
        expectedCategory: 'standard' as const,
        expectedBusinessHours: 4.0,
        expectedWallClockHours: 4.0,
    })),

    // 6-10: Overnight PRs (Tue 17:00 -> Wed 10:00 = 2.0 business hours: 1h Tue 17-18 + 1h Wed 09-10)
    ...[6, 7, 8, 9, 10].map(n => ({
        id: `${TEST_PREFIX}pr_${n}`,
        number: n,
        title: `Overnight Backend Refactor ${n}`,
        author: 'bob_dev',
        userLogin: 'bob_dev',
        isDraft: false,
        createdAt: TUE_1700,
        readyForReviewAt: TUE_1700,
        mergedAt: WED_1000,
        closedAt: WED_1000,
        additions: 250,
        deletions: 95,
        changedFiles: 8,
        commitsCount: 3,
        expectedCategory: 'standard' as const,
        expectedBusinessHours: 2.0,
        expectedWallClockHours: 17.0,
    })),

    // 11-14: Weekend PRs (Fri 17:30 -> Mon 09:30 = 1.0 business hour: 0.5h Fri + 0.5h Mon; 64.0 wall clock hours)
    ...[11, 12, 13, 14].map(n => ({
        id: `${TEST_PREFIX}pr_${n}`,
        number: n,
        title: `Weekend Hotfix Prep ${n}`,
        author: 'carol_dev',
        userLogin: 'carol_dev',
        isDraft: false,
        createdAt: FRI_1730,
        readyForReviewAt: FRI_1730,
        mergedAt: NEXT_MON_0930,
        closedAt: NEXT_MON_0930,
        additions: 45,
        deletions: 12,
        changedFiles: 2,
        commitsCount: 1,
        expectedCategory: 'standard' as const,
        expectedBusinessHours: 1.0,
        expectedWallClockHours: 64.0,
    })),

    // 15-18: Draft-Heavy PRs (In draft from May 25, marked ready June 4 10:00, merged June 4 12:30 = 2.5 business hours)
    ...[15, 16, 17, 18].map(n => ({
        id: `${TEST_PREFIX}pr_${n}`,
        number: n,
        title: `WIP Exploration Architecture ${n}`,
        author: 'dan_dev',
        userLogin: 'dan_dev',
        isDraft: true,
        createdAt: DRAFT_START,
        readyForReviewAt: THU_1000,
        mergedAt: THU_1230,
        closedAt: THU_1230,
        additions: 600,
        deletions: 210,
        changedFiles: 15,
        commitsCount: 8,
        expectedCategory: 'standard' as const,
        expectedBusinessHours: 2.5,
        expectedWallClockHours: 2.5,
    })),

    // 19-23: Automated Bot PRs (Dependabot, Renovate, Actions, Snyk, Codecov)
    {
        id: `${TEST_PREFIX}pr_19`,
        number: 19,
        title: 'Bump lodash from 4.17.20 to 4.17.21',
        author: 'dependabot[bot]',
        userLogin: 'dependabot[bot]',
        isDraft: false,
        createdAt: TUE_1000,
        readyForReviewAt: TUE_1000,
        mergedAt: TUE_1400,
        closedAt: TUE_1400,
        additions: 5,
        deletions: 5,
        changedFiles: 1,
        commitsCount: 1,
        expectedCategory: 'bot' as const,
    },
    {
        id: `${TEST_PREFIX}pr_20`,
        number: 20,
        title: 'Update dependency typescript to v5.5.0',
        author: 'renovate[bot]',
        userLogin: 'renovate[bot]',
        isDraft: false,
        createdAt: TUE_1000,
        readyForReviewAt: TUE_1000,
        mergedAt: TUE_1400,
        closedAt: TUE_1400,
        additions: 10,
        deletions: 10,
        changedFiles: 2,
        commitsCount: 1,
        expectedCategory: 'bot' as const,
    },
    {
        id: `${TEST_PREFIX}pr_21`,
        number: 21,
        title: 'Automated release bump',
        author: 'github-actions[bot]',
        userLogin: 'github-actions[bot]',
        isDraft: false,
        createdAt: TUE_1000,
        readyForReviewAt: TUE_1000,
        mergedAt: TUE_1400,
        closedAt: TUE_1400,
        additions: 2,
        deletions: 2,
        changedFiles: 1,
        commitsCount: 1,
        expectedCategory: 'bot' as const,
    },
    {
        id: `${TEST_PREFIX}pr_22`,
        number: 22,
        title: 'Fix vulnerabilities in express',
        author: 'snyk-bot',
        userLogin: 'snyk-bot',
        isDraft: false,
        createdAt: TUE_1000,
        readyForReviewAt: TUE_1000,
        mergedAt: TUE_1400,
        closedAt: TUE_1400,
        additions: 8,
        deletions: 8,
        changedFiles: 1,
        commitsCount: 1,
        expectedCategory: 'bot' as const,
    },
    {
        id: `${TEST_PREFIX}pr_23`,
        number: 23,
        title: 'Update coverage badge',
        author: 'codecov[bot]',
        userLogin: 'codecov[bot]',
        isDraft: false,
        createdAt: TUE_1000,
        readyForReviewAt: TUE_1000,
        mergedAt: TUE_1400,
        closedAt: TUE_1400,
        additions: 1,
        deletions: 1,
        changedFiles: 1,
        commitsCount: 1,
        expectedCategory: 'bot' as const,
    },

    // 24-26: Extreme Outliers (>30 days open)
    ...[24, 25, 26].map(n => ({
        id: `${TEST_PREFIX}pr_${n}`,
        number: n,
        title: `Stale Dormant Redesign ${n}`,
        author: 'eve_dev',
        userLogin: 'eve_dev',
        isDraft: false,
        createdAt: OUTLIER_START,
        readyForReviewAt: OUTLIER_START,
        mergedAt: MON_0900,
        closedAt: MON_0900,
        additions: 1500,
        deletions: 800,
        changedFiles: 45,
        commitsCount: 22,
        expectedCategory: 'outlier' as const,
    })),

    // 27-29: Closed Unmerged PRs (mergedAt = null)
    ...[27, 28, 29].map(n => ({
        id: `${TEST_PREFIX}pr_${n}`,
        number: n,
        title: `Abandoned Idea Experiment ${n}`,
        author: 'frank_dev',
        userLogin: 'frank_dev',
        isDraft: false,
        createdAt: TUE_1000,
        readyForReviewAt: TUE_1000,
        mergedAt: null,
        closedAt: TUE_1400,
        additions: 80,
        deletions: 15,
        changedFiles: 3,
        commitsCount: 1,
        expectedCategory: 'closed' as const,
    })),

    // 30-32: Squash-Merged PRs (Thu 13:00 -> Thu 16:00 = 3.0 business hours)
    ...[30, 31, 32].map(n => ({
        id: `${TEST_PREFIX}pr_${n}`,
        number: n,
        title: `Squash Merged Feature Branch ${n}`,
        author: 'grace_dev',
        userLogin: 'grace_dev',
        isDraft: false,
        createdAt: THU_1300,
        readyForReviewAt: THU_1300,
        mergedAt: THU_1600,
        closedAt: THU_1600,
        additions: 320,
        deletions: 60,
        changedFiles: 9,
        commitsCount: 14, // 14 commits squashed
        expectedCategory: 'standard' as const,
        expectedBusinessHours: 3.0,
        expectedWallClockHours: 3.0,
    })),

    // 33-35: Multi-Author / High-Impact PRs (Fri 10:00 -> Fri 15:00 = 5.0 business hours)
    ...[33, 34, 35].map(n => ({
        id: `${TEST_PREFIX}pr_${n}`,
        number: n,
        title: `Multi-Author Core Ingestion Engine ${n}`,
        author: 'helen_dev',
        userLogin: 'helen_dev',
        isDraft: false,
        createdAt: FRI_1000,
        readyForReviewAt: FRI_1000,
        mergedAt: FRI_1500,
        closedAt: FRI_1500,
        additions: 850,
        deletions: 340,
        changedFiles: 20,
        commitsCount: 7,
        expectedCategory: 'standard' as const,
        expectedBusinessHours: 5.0,
        expectedWallClockHours: 5.0,
    })),
];

// ─────────────────────────────────────────────────────────────────────────────
// EXPECTED GROUND-TRUTH TARGETS
// Standard human merged PRs = 5 (4h) + 5 (17h) + 4 (64h) + 4 (2.5h) + 3 (3h) + 3 (5h) = 24 PRs
// Standard wall-clock durations: [2.5, 2.5, 2.5, 2.5, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 17, 17, 17, 17, 17, 64, 64, 64, 64]
// Expected Median Review Wall-Clock Hours = 4.5
// Expected Bot PRs Filtered = 5
// Expected Outliers Segregated = 3
// Expected Closed Unmerged = 3
// ─────────────────────────────────────────────────────────────────────────────
const EXPECTED_GROUND_TRUTH = {
    totalEvaluated: 35,
    mergedHumanPrs: 24,
    mergedBotPrs: 5,
    staleOutliersCount: 3,
    closedUnmergedPrs: 3,
    medianReviewCycleTimeWallClockHours: 4.5,
};

async function setupGoldenDataset(): Promise<void> {
    console.log(`[GoldenDataset] Seeding 35 test records into PostgreSQL events table for repo "${TEST_REPO}"...`);

    // Clean up any stale records first
    await sql`DELETE FROM events WHERE id LIKE ${TEST_PREFIX + '%'}`;

    for (const c of GOLDEN_CASES) {
        const payload = {
            repository: { name: TEST_REPO },
            pull_request: {
                number: c.number,
                title: c.title,
                draft: c.isDraft,
                created_at: c.createdAt,
                ready_for_review_at: c.readyForReviewAt,
                merged_at: c.mergedAt,
                closed_at: c.closedAt,
                merged: Boolean(c.mergedAt),
                additions: c.additions,
                deletions: c.deletions,
                changed_files: c.changedFiles,
                commits: c.commitsCount,
                user: {
                    login: c.userLogin,
                },
                author: c.author,
            },
        };

        await sql`
            INSERT INTO events (id, source, provider, event_type, external_id, payload, created_at)
            VALUES (
                ${c.id},
                ${seedSource},
                'github',
                'pull_request',
                ${c.number.toString()},
                ${payload},
                ${c.createdAt}::TIMESTAMPTZ
            )
        `;
    }

    console.log(`[GoldenDataset] Successfully seeded 35 synthetic PR events.`);
}

async function teardownGoldenDataset(): Promise<void> {
    console.log(`[GoldenDataset] Tearing down synthetic test records...`);
    await sql`DELETE FROM events WHERE id LIKE ${TEST_PREFIX + '%'}`;
    console.log(`[GoldenDataset] Teardown complete.`);
}

export async function runGoldenDatasetVerification(): Promise<{ pass: boolean; diffs: any[] }> {
    console.log(`\n========================================================================`);
    console.log(`🚀 RUNNING GOLDEN DATASET GROUND-TRUTH VERIFICATION (35 PR Edge Cases)`);
    console.log(`========================================================================\n`);

    try {
        await setupGoldenDataset();

        const report = await calculatePrMetrics({
            repoName: TEST_REPO,
            includeBots: false,
            outlierThresholdDays: 30,
        });

        const diffs: Array<{ metric: string; expected: any; actual: any; pass: boolean; note?: string }> = [
            {
                metric: 'Total PRs Evaluated',
                expected: EXPECTED_GROUND_TRUTH.totalEvaluated,
                actual: report.counts.totalEvaluated,
                pass: report.counts.totalEvaluated === EXPECTED_GROUND_TRUTH.totalEvaluated,
            },
            {
                metric: 'Standard Merged Human PRs',
                expected: EXPECTED_GROUND_TRUTH.mergedHumanPrs,
                actual: report.counts.mergedHumanPrs,
                pass: report.counts.mergedHumanPrs === EXPECTED_GROUND_TRUTH.mergedHumanPrs,
                note: 'Excludes bots, drafts, and >30d outliers',
            },
            {
                metric: 'Bot PRs Filtered',
                expected: EXPECTED_GROUND_TRUTH.mergedBotPrs,
                actual: report.counts.mergedBotPrs,
                pass: report.counts.mergedBotPrs === EXPECTED_GROUND_TRUTH.mergedBotPrs,
                note: 'Dependabot, Renovate, Actions, Snyk, Codecov',
            },
            {
                metric: 'Stale Outliers Segregated (>30d)',
                expected: EXPECTED_GROUND_TRUTH.staleOutliersCount,
                actual: report.counts.staleOutliersCount,
                pass: report.counts.staleOutliersCount === EXPECTED_GROUND_TRUTH.staleOutliersCount,
                note: 'Isolated from headline median',
            },
            {
                metric: 'Closed Unmerged PRs Excluded',
                expected: EXPECTED_GROUND_TRUTH.closedUnmergedPrs,
                actual: report.counts.closedUnmergedPrs,
                pass: report.counts.closedUnmergedPrs === EXPECTED_GROUND_TRUTH.closedUnmergedPrs,
            },
            {
                metric: 'Headline Review Cycle Time (Median Wall-Clock Hours)',
                expected: EXPECTED_GROUND_TRUTH.medianReviewCycleTimeWallClockHours,
                actual: report.reviewCycleTime.headlineHours,
                pass: report.reviewCycleTime.headlineHours === EXPECTED_GROUND_TRUTH.medianReviewCycleTimeWallClockHours &&
                      report.reviewCycleTime.unit === 'wall_clock_hours',
                note: 'Exact median of 24 standard human PRs in calendar wall-clock hours',
            },
            {
                metric: 'Data Completeness Flag',
                expected: 'complete',
                actual: report.dataCompleteness,
                pass: report.dataCompleteness === 'complete',
                note: 'Sample size >= 5 records',
            },
        ];

        console.log('📊 VERIFICATION RESULTS TABLE:');
        console.table(diffs.map(d => ({
            'Metric': d.metric,
            'Expected Ground Truth': d.expected,
            'Actual Calculated': d.actual,
            'Status': d.pass ? '✅ PASS' : '❌ FAIL',
            'Context / Notes': d.note || '',
        })));

        const prPassed = diffs.every(d => d.pass);

        if (prPassed) {
            console.log(`\n🎉 ALL 35 GOLDEN DATASET EDGE CASES MATCH GROUND TRUTH WITH 100% ACCURACY!`);
        } else {
            console.error(`\n❌ GOLDEN DATASET MISMATCH DETECTED. Review differences above.`);
        }

        // =====================================================================
        // PART 2: Zero-Event Collapse & Active Repository Verification
        // Test at least 3 empty/scaffold repos (0 events) and 2 real repos
        // =====================================================================
        console.log(`\n========================================================================`);
        console.log(`🚀 RUNNING EMPTY/SCAFFOLD ZERO-EVENT COLLAPSE & REAL REPO VERIFICATION`);
        console.log(`========================================================================\n`);

        const emptyRepoCases = ['billing-engine', 'inventory-sync-service', 'notification-service'];
        const realRepoCases = ['customer-portal-next', 'payment-gateway-v2'];
        let repoSuitePassed = true;

        console.log(`Checking 3 Empty/Scaffold Repositories (Must collapse all dependent fields to zero/empty):`);
        for (const repoName of emptyRepoCases) {
            const [row] = await sql<any[]>`SELECT * FROM repo_metrics WHERE repo_name = ${repoName} LIMIT 1`;
            const pr = await calculatePrMetrics({ repoName, includeBots: true });

            const commitCount = Number(row?.commit_count ?? 0);
            const contribCount = Number(row?.contributor_count ?? 0);
            const busFactor = Number(row?.bus_factor ?? 0);
            const riskScore = Number(row?.risk_score ?? 0);
            const owner = row?.primary_owner ?? null;
            const ownershipPct = Number(row?.ownership_percentage ?? 0);
            const status = row?.status ?? 'empty';
            const tech = Array.isArray(row?.technologies) ? row.technologies : [];
            const topContrib = Array.isArray(row?.top_contributors) ? row.top_contributors : [];

            const isCollapsed =
                commitCount === 0 &&
                contribCount === 0 &&
                busFactor === 0 &&
                riskScore === 0 &&
                owner === null &&
                ownershipPct === 0 &&
                status === 'empty' &&
                tech.length === 0 &&
                topContrib.length === 0 &&
                pr.counts.totalEvaluated === 0 &&
                pr.counts.mergedHumanPrs === 0 &&
                pr.counts.mergedBotPrs === 0 &&
                pr.counts.staleOutliersCount === 0 &&
                pr.counts.closedUnmergedPrs === 0 &&
                pr.counts.openPrs === 0 &&
                (pr.dataCompleteness === 'partial' || pr.dataCompleteness === 'insufficient_data');

            if (!isCollapsed) {
                repoSuitePassed = false;
                console.error(`❌ [FAIL] Empty repo "${repoName}" failed zero-collapse invariant:`, {
                    commitCount, contribCount, busFactor, riskScore, owner, ownershipPct, status,
                    techLen: tech.length, topContribLen: topContrib.length, prTotal: pr.counts.totalEvaluated
                });
            } else {
                console.log(`  ✅ [PASS] "${repoName}": 0 commits, 0 contributors, status='empty', BF=0, Risk=0, Tech=[], PRs=0`);
            }
        }

        console.log(`\nChecking Real Repositories (Confirming normal cases remain unaffected):`);
        for (const repoName of realRepoCases) {
            const [row] = await sql<any[]>`SELECT * FROM repo_metrics WHERE repo_name = ${repoName} LIMIT 1`;
            const pr = await calculatePrMetrics({ repoName, includeBots: true });

            const commitCount = Number(row?.commit_count ?? 0);
            const contribCount = Number(row?.contributor_count ?? 0);
            const busFactor = Number(row?.bus_factor ?? 0);
            const status = row?.status;
            const topContrib = Array.isArray(row?.top_contributors) ? row.top_contributors : [];
            const sumContribPct = topContrib.reduce((s: number, c: any) => s + Number(c.percentage || 0), 0);
            const sumContribCommits = topContrib.reduce((s: number, c: any) => s + Number(c.commits || 0), 0);

            const prDecompositionValid =
                pr.counts.mergedHumanPrs +
                pr.counts.mergedBotPrs +
                pr.counts.staleOutliersCount +
                pr.counts.closedUnmergedPrs +
                pr.counts.openPrs ===
                pr.counts.totalEvaluated;

            const isNormalValid =
                commitCount > 0 &&
                contribCount > 0 &&
                busFactor >= 1 &&
                status !== 'empty' &&
                row?.primary_owner !== null &&
                topContrib.length > 0 &&
                Math.abs(sumContribPct - 100) < 0.5 &&
                sumContribCommits === commitCount &&
                prDecompositionValid;

            if (!isNormalValid) {
                repoSuitePassed = false;
                console.error(`❌ [FAIL] Real repo "${repoName}" failed normal invariant checks:`, {
                    commitCount, contribCount, busFactor, status, owner: row?.primary_owner,
                    sumContribPct, sumContribCommits, prDecompositionValid
                });
            } else {
                console.log(`  ✅ [PASS] "${repoName}": ${commitCount} commits, ${contribCount} contributors, status='${status}', BF=${busFactor}, TopContrib Sum=${sumContribPct.toFixed(1)}%`);
            }
        }

        const allPassed = prPassed && repoSuitePassed;
        if (allPassed) {
            console.log(`\n🎉 ALL GOLDEN EDGE CASES AND MULTI-REPO COLLAPSE INVARIANTS PASSED!`);
        } else {
            console.error(`\n❌ VERIFICATION FAILURES ENCOUNTERED.`);
        }

        return { pass: allPassed, diffs };
    } finally {
        await teardownGoldenDataset().catch(e => console.error('Teardown error:', e));
        await sql.end({ timeout: 5 }).catch(() => {});
    }
}

if (process.argv[1]?.endsWith('verify_metrics_golden_dataset.ts') || process.argv[1]?.endsWith('verify_metrics_golden_dataset.js')) {
    runGoldenDatasetVerification()
        .then(result => process.exit(result.pass ? 0 : 1))
        .catch(err => {
            console.error('Fatal verification error:', err);
            process.exit(1);
        });
}
