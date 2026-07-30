import cron from 'node-cron'
import { calculateAllPersonMetrics } from '../analytics/personMetrics.service.js'
import { calculateAllRepoMetrics } from '../analytics/repoMetrics.service.js'
import { calculateAllTechnologyMetrics } from '../analytics/technologyMetrics.js'

/**
 * Runs all analytics jobs in parallel and reports each result individually.
 * Bug #7 fix: uses Promise.allSettled instead of Promise.all so a failure in
 * one metric type (e.g. personMetrics) does not silently skip the others.
 */
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

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    console.log(`[Scheduler] Analytics job done — ${succeeded}/${results.length} succeeded`)
}

/**
 * Starts the cron schedule (daily at 18:00 IST).
 * runAnalyticsJob is exported separately so it can be triggered on-demand
 * for testing without waiting for the schedule.
 */
export function startMetricsScheduler() {
    cron.schedule('0 18 * * *', async () => {
        await runAnalyticsJob()
    }, {
        name: "AllMetricsScheduler",
        timezone: "Asia/Kolkata"
    })
    console.log('[Scheduler] Started — runs daily at 18:00 IST')
}

/**
 * On-demand trigger for testing — equivalent to what the cron runs.
 * @deprecated Use runAnalyticsJob() directly; this alias will be removed.
 */
export async function runMetricsNow() {
    return runAnalyticsJob()
}