import { IParsedGithubEvent } from "./normalize.js";
import sql from '../../config/postgres.js'
import { snowflake } from "../../../Utils/Snowflake.js";
import { cortexQueue } from "../../../../packages/queue/bullmq.js";
import { JOBS } from "../../../../packages/queue/jobs.js";

export async function pushGithubEventToDatabase(payload:IParsedGithubEvent){
    try{
        const uniqueID = snowflake.nextID().toString()
        const [result] = await sql `INSERT INTO events(id , provider , event_type , external_id , payload) VALUES (${uniqueID} , ${'github'} , ${payload.event_type} , ${payload.deliveryID} , ${sql.json(payload.rawBody)}) RETURNING id , created_at`
        
        await cortexQueue.add(JOBS.GITHUB_EVENT , {id:uniqueID} , {
            attempts:3,
            removeOnComplete:true,
            removeOnFail:true,
            backoff:{
                type:"exponential",
                delay:2000
            }
        }) // Only eventID To Be Push Fetch Data From DataBase 

        // Future Database Migration PostgreSQL -> MongoDB
        return {status:true , message:"Data Inserted in Database"}
    }
    catch(error:any){
        throw error
    }
}