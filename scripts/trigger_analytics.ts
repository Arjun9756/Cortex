import { runAnalyticsJob } from '../packages/workers/scheduler.worker.js';

async function main() {
    console.log('Triggering runAnalyticsJob...');
    await runAnalyticsJob();
    console.log('Analytics job completed successfully!');
    process.exit(0);
}

main().catch((err) => {
    console.error('Analytics job failed:', err);
    process.exit(1);
});
