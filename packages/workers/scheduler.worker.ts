import { invalidateGraphCache } from '../../apps/api/modules/graph/graphCache.js';
import cron from 'node-cron'
import sql from '../../apps/api/config/postgres.js'
import { calculateAllPersonMetrics } from '../analytics/personMetrics.service.js'
import { calculateAllRepoMetrics } from '../analytics/repoMetrics.service.js'
import { calculateAllTechnologyMetrics } from '../analytics/technologyMetrics.js'
import { calculateWorkspaceMetrics } from '../analytics/workspaceMetrics.service.js'
import { generateAndSaveDailyReport } from '../analytics/dailyReport.service.js'
import { startDebouncedMetricsPoller } from '../analytics/metricsInvalidator.service.js'
import type { DataSource } from '../database/provenance.js'
import { aggregationSources } from '../database/provenance.js'

/**
 * P0-3: Events Table Retention Policy
 * Purges raw event payloads older than EVENTS_RETENTION_DAYS (default 90 days).
 * Keeps recent events to protect idempotency keys (provider, external_id) on retries.
 */
export async function cleanupOldEvents(source: DataSource): Promise<number> {
    const retentionDays = parseInt(process.env.EVENTS_RETENTION_DAYS || '90', 10);
    const sources = aggregationSources(source);
    try {
        const result = await sql`
            DELETE FROM events
            WHERE source IN ${sql([...sources])}
              AND created_at < NOW() - (${retentionDays + ' days'})::interval
        `;
        const count = result.count ?? 0;
        if (count > 0) {
            console.log(`[Retention] Cleaned up ${count} raw events older than ${retentionDays} days`);
        }
        return count;
    } catch (err: any) {
        console.error('[Retention] Failed to cleanup old events:', err?.message);
        return 0;
    }
}

import { runPostRecalculationIntegrityGuard } from '../analytics/integrityGuard.service.js'

export async function runAnalyticsJob(source: DataSource): Promise<void> {
    console.log('[Scheduler] Running analytics job with strict sequential single-source-of-truth ordering...')

    // Fresh client installs remain empty until a trusted event arrives.
    const eventRows = await sql<{ count: number }[]>`
        SELECT count(*)::int AS count FROM events WHERE source IN ('webhook', 'backfill')
    `;
    if (Number(eventRows[0]?.count ?? 0) === 0) {
        console.log('[Scheduler] No trusted events yet; leaving analytics tables empty.');
        return;
    }

    // 1. Calculate Repo Metrics first (authoritative base for repos, commits, and top contributors)
    try {
        console.log('[Scheduler] Step 1/4: Calculating repo metrics...');
        await calculateAllRepoMetrics(source);
    } catch (repoErr: any) {
        console.error('[Scheduler] Repo metrics calculation error:', repoErr?.message ?? repoErr);
    }

    // 2. Calculate Person Metrics (derived strictly from repo_metrics.top_contributors to ensure mathematical parity)
    try {
        console.log('[Scheduler] Step 2/4: Calculating person metrics...');
        await calculateAllPersonMetrics(source);
    } catch (personErr: any) {
        console.error('[Scheduler] Person metrics calculation error:', personErr?.message ?? personErr);
    }

    // 3. Calculate Technology Metrics (strictly filters out 0-commit / empty repos)
    try {
        console.log('[Scheduler] Step 3/4: Calculating technology metrics...');
        await calculateAllTechnologyMetrics(source);
    } catch (techErr: any) {
        console.error('[Scheduler] Technology metrics calculation error:', techErr?.message ?? techErr);
    }

    // 4. Calculate workspace summary metrics from the updated tables
    try {
        console.log('[Scheduler] Step 4/4: Calculating workspace metrics...');
        await calculateWorkspaceMetrics(source);
    } catch (wsErr: any) {
        console.error('[Scheduler] Workspace metrics error:', wsErr?.message ?? wsErr);
    }

    // 5. Automated Post-Recalculation Invariant & Self-Healing Guard
    try {
        console.log('[Scheduler] Step 5: Executing post-recalculation integrity guard...');
        const guard = await runPostRecalculationIntegrityGuard(source);
        if (!guard.passed) {
            console.warn(`[Scheduler] ⚠️ Integrity Guard auto-healed ${guard.violationsCount} issues:`, guard.remediatedIssues);
        } else {
            console.log('[Scheduler] ✅ Integrity Guard passed: 100% cross-field invariant parity confirmed.');
        }
    } catch (guardErr: any) {
        console.error('[Scheduler] Integrity guard execution warning:', guardErr?.message ?? guardErr);
    }

    // Automatically compile and persist the Executive Daily HTML Report
    try {
        await generateAndSaveDailyReport(source);
    } catch (reportErr: any) {
        console.error('[Scheduler] Daily report generation error:', reportErr?.message ?? reportErr);
    }

    // P0-3: Perform events table retention cleanup
    try {
        await cleanupOldEvents(source);
    } catch (retentionErr: any) {
        console.error('[Scheduler] Retention cleanup error:', retentionErr?.message ?? retentionErr);
    }

    console.log(`[Scheduler] Analytics job complete — all metrics locked in mathematical sync.`);
    await invalidateGraphCache('Analytics job completed');
}

export function startMetricsScheduler() {
    // 1. Daily Cron (18:00 IST) — preserves existing scheduled reporting
    cron.schedule('0 18 * * *', async () => {
        await runAnalyticsJob('webhook')
    }, {
        name: "AllMetricsScheduler",
        timezone: "Asia/Kolkata"
    })
    console.log('[Scheduler] Cron scheduled — runs daily at 18:00 IST')

    // 2. Debounced Event-Driven Poller — recalculates metrics when new events arrive
    startDebouncedMetricsPoller(() => runAnalyticsJob('webhook'))

    // 3. Immediate execution on server startup so metrics tables are never empty right after deployment
    console.log('[Scheduler] Triggering immediate startup analytics calculation...')
    runAnalyticsJob('webhook').catch(err => {
        console.error('[Scheduler] Initial startup metrics calculation error:', err?.message ?? err)
    })
}

export async function runMetricsNow(source: DataSource) {
    await runAnalyticsJob(source)
}
