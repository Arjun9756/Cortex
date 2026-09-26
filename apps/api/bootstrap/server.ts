import app from './app.js'
import env from '../config/env.js'
import { cortexWorker } from '../../../packages/workers/ingest.worker.js'
import { ensureCollection } from '../../../packages/database/vector/qdrant.repository.js'
import { ensureIndexes } from '../../../packages/database/neo4j/graph.repository.js'
import { ensurePostgresTables } from '../../../packages/database/postgres/schema.js'
import { startMetricsScheduler } from '../../../packages/workers/scheduler.worker.js'
import { verifyLicenseOnStartup } from '../../../packages/license/index.js'
import { verifyNeo4jConnectivity } from '../config/neo4j.js'
import { warnIfPostgresRlsIsBypassed } from '../config/postgres.js'

async function startServer() {
    try {
        // Enforce license verification before initializing any subsystem
        await verifyLicenseOnStartup()

        if (cortexWorker.isRunning()) {
            console.log("Cortex Queue Works Running")
        }

        await ensurePostgresTables()
        await warnIfPostgresRlsIsBypassed()
        // Graph enrichment is optional for API reads. Surface the real infrastructure
        // failure at startup, but do not make Postgres-backed metrics unavailable.
        try {
            await verifyNeo4jConnectivity()
            await ensureIndexes()
        } catch (error: any) {
            console.error(`[Neo4j] Starting in degraded mode; graph enrichment is unavailable: ${error?.message}`)
        }
        await ensureCollection()

        const port = parseInt((process.env.PORT || env.PORT || '3000') as string, 10)
        app.listen(port, '0.0.0.0', () => {
            console.log(`Cortex Server is Running on Port ${port}`)
        })

        startMetricsScheduler()
    }
    catch (error: any) {
        console.log(`Error While Server Starting`, error)
        process.exit(1)
    }
}

startServer()
