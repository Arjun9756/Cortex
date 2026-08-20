import cron from 'node-cron'
import { calculateAllPersonMetrics } from '../analytics/personMetrics.service.js'
import { calculateAllRepoMetrics } from '../analytics/repoMetrics.service.js'
import { calculateAllTechnologyMetrics } from '../analytics/technologyMetrics.js'
import { calculateWorkspaceMetrics } from '../analytics/workspaceMetrics.service.js'
import { generateAndSaveDailyReport } from '../analytics/dailyReport.service.js'

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
    await calculateWorkspaceMetrics();

    // Automatically compile and persist the Executive Daily HTML Report
    try {
        await generateAndSaveDailyReport();
    } catch (reportErr: any) {
        console.error('[Scheduler] Daily report generation error:', reportErr?.message ?? reportErr);
    }

    const succeeded = results.filter(r => r.status === 'fulfilled').length
    console.log(`[Scheduler] Analytics job done — ${succeeded}/${results.length} succeeded`)
}

export function startMetricsScheduler() {
    cron.schedule('0 18 * * *', async () => {
        await runAnalyticsJob()
    }, {
        name: "AllMetricsScheduler",
        timezone: "Asia/Kolkata"
    })
    console.log('[Scheduler] Cron scheduled — runs daily at 18:00 IST')

    // Immediate execution on server startup so metrics tables are never empty right after deployment
    console.log('[Scheduler] Triggering immediate startup analytics calculation...')
    runAnalyticsJob().catch(err => {
        console.error('[Scheduler] Initial startup metrics calculation error:', err?.message ?? err)
    })
}

export async function runMetricsNow() {
    await runAnalyticsJob()
}