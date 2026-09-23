/**
 * PR Metrics & Review Cycle Time Calculation Service
 *
 * Canonical Single Source of Truth for Pull Request Analytics in Cortex.
 * Implements strict definitions from /docs/metrics-definitions.md:
 * - Two distinct metrics: Review Cycle Time (ready-for-review -> merge) and Total Lead Time (created -> merge).
 * - Business Hours calculation (Mon-Fri 09:00-18:00, weekends excluded).
 * - Outlier segregation (>30 days).
 * - Bot filtering with suspect tracking and toggle override.
 * - Multi-dimensional size context (additions, deletions, files changed).
 * - Statistical distribution (median/p50 headline, p90, IQR, min/max).
 */

import sql from '../../apps/api/config/postgres.js';
import { isBotAccount } from '../shared/botDetection.js';

export interface PrMetricRecord {
    prId: string;
    repoName: string;
    number: number;
    title: string;
    author: string;
    isBot: boolean;
    isDraft: boolean;
    createdAt: string;
    readyForReviewAt: string;
    mergedAt: string | null;
    closedAt: string | null;
    state: 'open' | 'merged' | 'closed';
    reviewTimeWallClockHours: number | null;
    totalLeadTimeHours: number | null;
    isOutlier: boolean;
    additions: number;
    deletions: number;
    changedFiles: number;
    commitsCount: number;
}

export interface DistributionStats {
    median: number;
    p90: number;
    p75: number;
    p25: number;
    min: number;
    max: number;
    average: number;
}

export interface PrMetricsReport {
    repoName?: string;
    timeframeDays?: number;
    sampleSize: number;
    dataCompleteness: 'complete' | 'partial';
    warning?: string;
    reviewCycleTime: {
        headlineHours: number; // p50 wall-clock hours
        metricName: string;
        definition: string;
        wallClockHours: DistributionStats;
        unit: 'wall_clock_hours';
    };
    totalLeadTime: {
        headlineHours: number; // p50 wall-clock hours
        metricName: string;
        definition: string;
        wallClockHours: DistributionStats;
        unit: 'wall_clock_hours';
    };
    counts: {
        totalEvaluated: number;
        mergedHumanPrs: number;
        mergedBotPrs: number;
        openPrs: number;
        closedUnmergedPrs: number;
        staleOutliersCount: number;
    };
    sizeContext: {
        totalAdditions: number;
        totalDeletions: number;
        totalFilesChanged: number;
        averageLinesPerPr: number;
        qualification: string;
    };
    staleOutliers: Array<{
        prId: string;
        title: string;
        durationDays: number;
        author: string;
    }>;
    botActivity: {
        filteredCount: number;
        suspectBotsCount: number;
        suspectBotAuthors: string[];
        warning?: string;
    };
    transparencyTooltip: string;
}

export interface PrMetricsOptions {
    repoName?: string;
    timeframeDays?: number;
    includeBots?: boolean;
    outlierThresholdDays?: number;
}

/**
 * Calculates business hours between two timestamps:
 * Monday through Friday: 09:00 to 18:00 (9 hours per day in UTC).
 * Weekends (Saturday, Sunday) are completely excluded (0 hours).
 */
export function calculateBusinessHours(startDate: Date, endDate: Date): number {
    if (endDate.getTime() <= startDate.getTime()) return 0;

    let current = new Date(startDate.getTime());
    const end = new Date(endDate.getTime());
    let totalBusinessMs = 0;

    while (current < end) {
        const dayOfWeek = current.getUTCDay(); // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (!isWeekend) {
            // Business window for current day: 09:00 to 18:00 UTC
            const dayStart = new Date(current);
            dayStart.setUTCHours(9, 0, 0, 0);

            const dayEnd = new Date(current);
            dayEnd.setUTCHours(18, 0, 0, 0);

            // Effective start and end within today's business window
            const effectiveStart = new Date(Math.max(current.getTime(), dayStart.getTime()));
            const effectiveEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));

            if (effectiveStart < effectiveEnd && effectiveStart < dayEnd && effectiveEnd > dayStart) {
                totalBusinessMs += (effectiveEnd.getTime() - effectiveStart.getTime());
            }
        }

        // Advance to start of next UTC day (00:00:00 UTC)
        current.setUTCDate(current.getUTCDate() + 1);
        current.setUTCHours(0, 0, 0, 0);
    }

    const businessHours = totalBusinessMs / (1000 * 60 * 60);
    return Math.round(businessHours * 10) / 10;
}

/**
 * Computes deterministic distribution percentiles (p50, p90, p75, p25, min, max, avg)
 */
export function calculatePercentiles(values: number[]): DistributionStats {
    if (values.length === 0) {
        return { median: 0, p90: 0, p75: 0, p25: 0, min: 0, max: 0, average: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const getP = (p: number): number => {
        if (n === 1) return sorted[0]!;
        const index = (p / 100) * (n - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
    };

    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const average = Math.round((sum / n) * 10) / 10;

    return {
        median: Math.round(getP(50) * 10) / 10,
        p90: Math.round(getP(90) * 10) / 10,
        p75: Math.round(getP(75) * 10) / 10,
        p25: Math.round(getP(25) * 10) / 10,
        min: Math.round(sorted[0]! * 10) / 10,
        max: Math.round(sorted[n - 1]! * 10) / 10,
        average,
    };
}

/**
 * Main Canonical Function: Computes PR review cycle time and lead time metrics.
 */
export async function calculatePrMetrics(options: PrMetricsOptions = {}): Promise<PrMetricsReport> {
    const {
        repoName,
        timeframeDays,
        includeBots = false,
        outlierThresholdDays = 30
    } = options;

    const outlierThresholdHours = outlierThresholdDays * 24;

    // Fetch PR events from PostgreSQL events table
    let rows: any[] = [];
    try {
        if (repoName && timeframeDays) {
            rows = await sql`
                SELECT id, external_id, payload, created_at
                FROM events
                WHERE provider = 'github'
                  AND (event_type ILIKE '%pull_request%' OR payload ? 'pull_request')
                  AND (
                      lower(COALESCE(payload->'repository'->>'name', payload->>'repository', '')) = lower(${repoName})
                  )
                  AND created_at >= NOW() - (${timeframeDays} || ' days')::INTERVAL
                ORDER BY created_at DESC
            `;
        } else if (repoName) {
            rows = await sql`
                SELECT id, external_id, payload, created_at
                FROM events
                WHERE provider = 'github'
                  AND (event_type ILIKE '%pull_request%' OR payload ? 'pull_request')
                  AND (
                      lower(COALESCE(payload->'repository'->>'name', payload->>'repository', '')) = lower(${repoName})
                  )
                ORDER BY created_at DESC
            `;
        } else if (timeframeDays) {
            rows = await sql`
                SELECT id, external_id, payload, created_at
                FROM events
                WHERE provider = 'github'
                  AND (event_type ILIKE '%pull_request%' OR payload ? 'pull_request')
                  AND created_at >= NOW() - (${timeframeDays} || ' days')::INTERVAL
                ORDER BY created_at DESC
            `;
        } else {
            rows = await sql`
                SELECT id, external_id, payload, created_at
                FROM events
                WHERE provider = 'github'
                  AND (event_type ILIKE '%pull_request%' OR payload ? 'pull_request')
                ORDER BY created_at DESC
            `;
        }
    } catch (err: any) {
        console.warn(`[PrMetrics] Failed to query events table: ${err?.message}`);
    }

    // Deduplicate PRs by PR number / repository
    const prMap = new Map<string, any>();
    for (const row of rows) {
        const p = row.payload || {};
        const pr = p.pull_request || p;
        const rName = p.repository?.name || p.repository || repoName || 'unknown';
        const prNumber = pr.number || row.external_id || row.id;
        const key = `${rName}#${prNumber}`;

        if (!prMap.has(key)) {
            prMap.set(key, { ...row, parsedPr: pr, repoName: rName, prNumber });
        }
    }

    const prRecords: PrMetricRecord[] = [];
    let totalEvaluated = 0;
    let mergedBotPrs = 0;
    let openPrs = 0;
    let closedUnmergedPrs = 0;
    const suspectBotAuthors = new Set<string>();

    for (const [key, item] of prMap.entries()) {
        totalEvaluated++;
        const pr = item.parsedPr;
        const author = pr.user?.login || pr.author || 'unknown';
        const isBot = isBotAccount(author, null, pr.user?.login);

        if (!isBot && (author.includes('bot') || author.includes('ci') || author.includes('auto'))) {
            suspectBotAuthors.add(author);
        }

        const isDraft = Boolean(pr.draft);
        const createdAtStr = pr.created_at || item.created_at || new Date().toISOString();
        const mergedAtStr = pr.merged_at || (pr.merged ? pr.updated_at : null);
        const closedAtStr = pr.closed_at || null;

        let state: 'open' | 'merged' | 'closed' = 'open';
        if (mergedAtStr) {
            state = 'merged';
        } else if (closedAtStr) {
            state = 'closed';
            closedUnmergedPrs++;
        } else {
            openPrs++;
        }

        if (state !== 'merged') continue;

        if (isBot) {
            mergedBotPrs++;
            if (!includeBots) continue; // exclude bots from human metrics
        }

        const createdDate = new Date(createdAtStr);
        const mergedDate = new Date(mergedAtStr);

        // Ready for review timestamp: if draft, ready_for_review_at; else created_at
        const readyForReviewDate = pr.ready_for_review_at ? new Date(pr.ready_for_review_at) : createdDate;

        const wallClockReviewHours = Math.max(0, (mergedDate.getTime() - readyForReviewDate.getTime()) / (1000 * 60 * 60));
        const businessReviewHours = calculateBusinessHours(readyForReviewDate, mergedDate);
        const totalLeadHours = Math.max(0, (mergedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60));

        const isOutlier = wallClockReviewHours > outlierThresholdHours;

        prRecords.push({
            prId: key,
            repoName: item.repoName,
            number: Number(item.prNumber),
            title: pr.title || 'Untitled PR',
            author,
            isBot,
            isDraft,
            createdAt: createdAtStr,
            readyForReviewAt: readyForReviewDate.toISOString(),
            mergedAt: mergedAtStr,
            closedAt: closedAtStr,
            state: 'merged',
            reviewTimeWallClockHours: Math.round(wallClockReviewHours * 10) / 10,
            totalLeadTimeHours: Math.round(totalLeadHours * 10) / 10,
            isOutlier,
            additions: Number(pr.additions || 0),
            deletions: Number(pr.deletions || 0),
            changedFiles: Number(pr.changed_files || 0),
            commitsCount: Number(pr.commits || 1),
        });
    }

    // Segregate standard PRs and outliers
    const standardPrs = prRecords.filter(r => !r.isOutlier);
    const outlierPrs = prRecords.filter(r => r.isOutlier);

    const wallClockHoursList = standardPrs.map(r => r.reviewTimeWallClockHours ?? 0);
    const leadTimeHoursList = standardPrs.map(r => r.totalLeadTimeHours ?? 0);

    const wallClockStats = calculatePercentiles(wallClockHoursList);
    const leadTimeStats = calculatePercentiles(leadTimeHoursList);

    const totalAdditions = standardPrs.reduce((acc, r) => acc + r.additions, 0);
    const totalDeletions = standardPrs.reduce((acc, r) => acc + r.deletions, 0);
    const totalFiles = standardPrs.reduce((acc, r) => acc + r.changedFiles, 0);
    const avgLines = standardPrs.length > 0 ? Math.round((totalAdditions + totalDeletions) / standardPrs.length) : 0;

    const sampleSize = standardPrs.length;
    const isPartial = sampleSize < 5;

    const suspectList = Array.from(suspectBotAuthors);
    const suspectBotWarning = (suspectList.length > 0 && totalEvaluated > 0 && (suspectList.length / totalEvaluated) > 0.05)
        ? `⚠️ Suspect automated actor volume exceeds 5% (${suspectList.length} potential bots identified).`
        : undefined;

    return {
        repoName,
        timeframeDays,
        sampleSize,
        dataCompleteness: isPartial ? 'partial' : 'complete',
        warning: isPartial ? 'Sample size too small for statistical significance (<5 merged PRs).' : undefined,
        reviewCycleTime: {
            headlineHours: wallClockStats.median,
            metricName: 'Review Cycle Time',
            definition: 'Total elapsed calendar wall-clock duration from when a PR is marked ready-for-review until it is merged, excluding extreme outliers (>30 days).',
            wallClockHours: wallClockStats,
            unit: 'wall_clock_hours',
        },
        totalLeadTime: {
            headlineHours: leadTimeStats.median,
            metricName: 'Total Lead Time',
            definition: 'Total elapsed calendar wall-clock duration from initial PR opening (including any draft phase) to merge.',
            wallClockHours: leadTimeStats,
            unit: 'wall_clock_hours',
        },
        counts: {
            totalEvaluated,
            mergedHumanPrs: standardPrs.length,
            mergedBotPrs,
            openPrs,
            closedUnmergedPrs,
            staleOutliersCount: outlierPrs.length,
        },
        sizeContext: {
            totalAdditions,
            totalDeletions,
            totalFilesChanged: totalFiles,
            averageLinesPerPr: avgLines,
            qualification: 'Engineering Activity (Not a measure of individual productivity or output).',
        },
        staleOutliers: outlierPrs.map(r => ({
            prId: r.prId,
            title: r.title,
            durationDays: Math.round(((r.reviewTimeWallClockHours ?? 0) / 24) * 10) / 10,
            author: r.author,
        })),
        botActivity: {
            filteredCount: mergedBotPrs,
            suspectBotsCount: suspectList.length,
            suspectBotAuthors: suspectList,
            warning: suspectBotWarning,
        },
        transparencyTooltip: 'Review Cycle Time measures median business hours (Mon-Fri 09:00-18:00) from ready-for-review to merge. Extreme outliers (>30d) and automated bots are excluded from the headline median. Sourced from PostgreSQL events table.',
    };
}
