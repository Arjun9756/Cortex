import { IJiraParsedEvent } from "./normalize.js";
import sql from '../../config/postgres.js'
import { snowflake } from "../../../Utils/Snowflake.js";
import { cortexQueue } from "../../../../packages/queue/bullmq.js";
import { JOBS } from "../../../../packages/queue/jobs.js";

export async function pushJiraEventToDatabase(parsedEvent:IJiraParsedEvent){
    try{
        const uniqueID = snowflake.nextID().toString()
        const query = await sql `INSERT INTO events(id , provider , event_type , external_id , payload) VALUES (${uniqueID}) , ${parsedEvent.provider} , ${parsedEvent.event_type} , ${parsedEvent.external_id} , ${sql.json(parsedEvent.rawbody)} RETURNING id , created_at`


        await cortexQueue.add(JOBS.JIRA_EVENT , {id:uniqueID} , {
            attempts:3,
            backoff:{
                type:'exponential',
                delay:2000
            },
            removeOnComplete:true,
            removeOnFail:true,
        })

        return {status:true , message:"Data Saved to Database"}
    }
    catch(error:any){
        console.log(`Error in Saving Jira Event on Database`)
        return {status:false , message:error?.message}
    }
}