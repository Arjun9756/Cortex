import app from './app.js'
import env from '../config/env.js'
import { cortexWorker } from '../../../packages/workers/ingest.worker.js'
import { ensureCollection } from '../../../packages/database/vector/qdrant.repository.js'
import { ensureIndexes } from '../../../packages/database/neo4j/graph.repository.js'
import { ensurePostgresTables } from '../../../packages/database/postgres/schema.js'
import { startMetricsScheduler } from '../../../packages/workers/scheduler.worker.js'

async function startServer() {
    try {
        if (cortexWorker.isRunning()) {
            console.log("Cortex Queue Works Running")
        }

        await ensurePostgresTables()
        await ensureCollection()
        await ensureIndexes()

        startMetricsScheduler()

        app.listen(parseInt(env.PORT as string), () => {
            console.log(`Cortex Server is Running on Port ${env.PORT}`)
        })
    }
    catch (error: any) {
        console.log(`Error While Server Starting`, error)
        process.exit(1)
    }
}

startServer()
