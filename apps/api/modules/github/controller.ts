import { IParsedGithubEvent } from "./normalize.js";
import sql from '../../config/postgres.js'
import { snowflake } from "../../../Utils/Snowflake.js";
import { cortexQueue } from "../../../../packages/queue/bullmq.js";
import { JOBS } from "../../../../packages/queue/jobs.js";

export async function pushGithubEventToDatabase(payload:IParsedGithubEvent){
    try{
        const uniqueID = snowflake.nextID().toString()
        console.log("unique id" , uniqueID)

        // Idempotency guard: skip duplicate webhook deliveries (same provider + delivery ID)
        const result = await sql `
            INSERT INTO events(id , provider , event_type , external_id , payload) 
            VALUES (${uniqueID} , ${'github'} , ${payload.event_type} , ${payload.deliveryID} , ${sql.json(payload.rawBody)}) 
            ON CONFLICT (provider, external_id) DO NOTHING
            RETURNING id , created_at
        `

        if (result.length === 0) {
            console.log(`[GitHub] Duplicate webhook delivery ${payload.deliveryID} — skipping`)
            return {status:true , message:"Duplicate event skipped"}
        }
        
        await cortexQueue.add(JOBS.GITHUB_EVENT , {id:uniqueID} , {
            attempts:5,
            removeOnComplete:true,
            removeOnFail:false, // Keep failed jobs for investigation instead of silent discard
            backoff:{
                type:"exponential",
                delay:3000
            }
        }) // Only eventID To Be Push Fetch Data From DataBase 

        // Future Database Migration PostgreSQL -> MongoDB
        return {status:true , message:"Data Inserted in Database"}
    }
    catch(error:any){
        throw error
    }
}