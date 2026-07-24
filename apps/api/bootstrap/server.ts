import app from './app.js'
import env from '../config/env.js'
import { cortexWorker } from '../../../packages/workers/ingest.worker.js'
import { ensureCollection } from '../../../packages/database/vector/qdrant.repository.js'

async function startServer(){
    try{
        await cortexWorker.run()
        await ensureCollection()
        app.listen(env.PORT , (error)=>{
            if(error)
                throw error
            console.log(`Cortex is Running on Port ${env.PORT}`)
        })
    }
    catch(error:any){
        console.log(`Error While Server Starting`)
        process.exit(1)
    }
}

startServer()