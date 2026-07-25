import app from './app.js'
import env from '../config/env.js'
import { cortexWorker } from '../../../packages/workers/ingest.worker.js'
import { ensureCollection } from '../../../packages/database/vector/qdrant.repository.js'

async function startServer(){
    try{
        if(cortexWorker.isRunning()){
            console.log("Cortex Queue Works Running")
        }

        await ensureCollection()
        app.listen(parseInt(env.PORT as string) , ()=>{
            console.log(`Cortex Server is Running on Port ${env.PORT}`)
        })
    }
    catch(error:any){
        console.log(`Error While Server Starting` , error)
        process.exit(1)
    }
}

startServer()