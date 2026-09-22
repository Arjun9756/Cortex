import { invalidateGraphCache } from '../../apps/api/modules/graph/graphCache.js';
import cron from 'node-cron'
import sql from '../../apps/api/config/postgres.js'
import { calculateAllPersonMetrics } from '../analytics/personMetrics.service.js'
import { calculateAllRepoMetrics } from '../analytics/repoMetrics.service.js'
import { calculateAllTechnologyMetrics } from '../analytics/technologyMetrics.js'
import { calculateWorkspaceMetrics } from '../analytics/workspaceMetrics.service.js'
import { generateAndSaveDailyReport } from '../analytics/dailyReport.service.js'
import { startDebouncedMetricsPoller } from '../analytics/metricsInvalidator.service.js'

/**
 * P0-3: Events Table Retention Policy
 * Purges raw event payloads older than EVENTS_RETENTION_DAYS (default 90 days).
 * Keeps recent events to protect idempotency keys (provider, external_id) on retries.
 */
export async function cleanupOldEvents(): Promise<number> {
    const retentionDays = parseInt(process.env.EVENTS_RETENTION_DAYS || '90', 10);
    try {
        const result = await sql`
            DELETE FROM events
            WHERE created_at < NOW() - (${retentionDays + ' days'})::interval
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

export async function runAnalyticsJob(): Promise<void> {
    console.log('[Scheduler] Running analytics job...')
    const results = await Promise.allSettled([
        calculateAllPersonMetrics(),
        calculateAllRepoMetrics(),
        calculateAllTechnologyMetrics(),
    ])

    const [personResult, repoResult, techResult] = results
    if (personResult.status === 'rejected') {
        console.error('[Scheduler] Person metrics failed:', personResult.reason?.message ?? personResult.reason)
    }
    if (repoResult.status === 'rejected') {
        console.error('[Scheduler] Repo metrics failed:', repoResult.reason?.message ?? repoResult.reason)
    }
    if (techResult.status === 'rejected') {
        console.error('[Scheduler] Technology metrics failed:', techResult.reason?.message ?? techResult.reason)
    }

    // Calculate workspace summary metrics from the updated tables
    try {
        await calculateWorkspaceMetrics();
    } catch (wsErr: any) {
        console.error('[Scheduler] Workspace metrics error:', wsErr?.message ?? wsErr);
    }

    // Automatically compile and persist the Executive Daily HTML Report
    try {
        await generateAndSaveDailyReport();
    } catch (reportErr: any) {
        console.error('[Scheduler] Daily report generation error:', reportErr?.message ?? reportErr);
    }

    // P0-3: Perform events table retention cleanup
    try {
        await cleanupOldEvents();
    } catch (retentionErr: any) {
        console.error('[Scheduler] Retention cleanup error:', retentionErr?.message ?? retentionErr);
    }

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    console.log(`[Scheduler] Analytics job done — ${succeeded}/${results.length} succeeded`)
    await invalidateGraphCache('Analytics job completed');
}

export function startMetricsScheduler() {
    // 1. Daily Cron (18:00 IST) — preserves existing scheduled reporting
    cron.schedule('0 18 * * *', async () => {
        await runAnalyticsJob()
    }, {
        name: "AllMetricsScheduler",
        timezone: "Asia/Kolkata"
    })
    console.log('[Scheduler] Cron scheduled — runs daily at 18:00 IST')

    // 2. Debounced Event-Driven Poller — recalculates metrics when new events arrive
    startDebouncedMetricsPoller(runAnalyticsJob)

    // 3. Immediate execution on server startup so metrics tables are never empty right after deployment
    console.log('[Scheduler] Triggering immediate startup analytics calculation...')
    runAnalyticsJob().catch(err => {
        console.error('[Scheduler] Initial startup metrics calculation error:', err?.message ?? err)
    })
}

export async function runMetricsNow() {
    await runAnalyticsJob()
}