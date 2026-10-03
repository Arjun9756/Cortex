import { cortexWorker } from './ingest.worker.js';
import { startMetricsScheduler } from './scheduler.worker.js';
import { verifyLicenseOnStartup } from '../license/index.js';
import { ensureDatabaseExists } from '../../apps/api/config/postgres.js';
import { ensurePostgresTables } from '../database/postgres/schema.js';
import { ensureIndexes } from '../database/neo4j/graph.repository.js';
import { ensureCollection } from '../database/vector/qdrant.repository.js';

async function startStandaloneWorker() {
    console.log('[Worker:Standalone] Initializing Cortex Background Worker Process...');
    try {
        await verifyLicenseOnStartup();
        await ensureDatabaseExists();
        await ensurePostgresTables();
        try {
            await ensureIndexes();
        } catch (e: any) {
            console.warn('[Worker:Standalone] Graph indexes check warning:', e?.message);
        }
        await ensureCollection();

        if (cortexWorker.isRunning()) {
            console.log('[Worker:Standalone] ✅ BullMQ Ingestion Worker is active and listening for jobs.');
        }

        // Run scheduler in worker process
        startMetricsScheduler();
        console.log('[Worker:Standalone] ✅ Metrics scheduler and reconciliation jobs active.');

        process.on('SIGTERM', async () => {
            console.log('[Worker:Standalone] Received SIGTERM, gracefully closing worker...');
            await cortexWorker.close();
            process.exit(0);
        });
    } catch (err: any) {
        console.error('[Worker:Standalone] ❌ Fatal error in standalone worker process:', err);
        process.exit(1);
    }
}

startStandaloneWorker();
