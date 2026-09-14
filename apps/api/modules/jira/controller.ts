import { IJiraParsedEvent } from "./normalize.js";
import sql from '../../config/postgres.js'
import { snowflake } from "../../../Utils/Snowflake.js";
import { cortexQueue } from "../../../../packages/queue/bullmq.js";
import { JOBS } from "../../../../packages/queue/jobs.js";

export async function pushJiraEventToDatabase(parsedEvent:IJiraParsedEvent){
    try{
        const uniqueID = snowflake.nextID().toString()
        const raw = parsedEvent.rawbody ?? {}
        const externalId = parsedEvent.external_id 
            || (raw.issue?.id && raw.timestamp ? `${parsedEvent.event_type}_${raw.issue.id}_${raw.timestamp}` : null)
            || uniqueID

        const result = await sql`
            INSERT INTO events(id, provider, event_type, external_id, payload) 
            VALUES (${uniqueID}, ${parsedEvent.provider}, ${parsedEvent.event_type}, ${externalId}, ${sql.json(parsedEvent.rawbody)}) 
            ON CONFLICT (provider, external_id) DO NOTHING
            RETURNING id, created_at
        `

        if (result.length === 0) {
            console.log(`[Jira] Duplicate webhook delivery ${externalId} — skipping`)
            return { status: true, message: "Duplicate event skipped" }
        }

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
        console.log(`Error in Saving Jira Event on Database: ${error?.message}`)
        return {status:false , message:error?.message}
    }
}