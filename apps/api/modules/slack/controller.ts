import { cortexQueue } from '../../../../packages/queue/bullmq.js';
import { JOBS } from '../../../../packages/queue/jobs.js';
import { snowflake } from '../../../Utils/Snowflake.js';
import sql from '../../config/postgres.js'
import { ISlackParsedEvent } from './normalize.js';

export async function pushSlackEventToDatabase(parsedEvent:ISlackParsedEvent){
    try{
        const uniqueID = snowflake.nextID().toString()
        const raw = parsedEvent.rawBody ?? {}
        const externalId = parsedEvent.external_id 
            || raw.client_msg_id 
            || (raw.channel && raw.ts ? `${raw.channel}_${raw.ts}` : null) 
            || uniqueID

        const result = await sql`
            INSERT INTO events(id, provider, event_type, external_id, payload) 
            VALUES (${uniqueID}, ${'slack'}, ${parsedEvent.event_type}, ${externalId}, ${sql.json(parsedEvent.rawBody)}) 
            ON CONFLICT (provider, external_id) DO NOTHING
            RETURNING id, created_at
        `

        if (result.length === 0) {
            console.log(`[Slack] Duplicate webhook delivery ${externalId} — skipping`)
            return { status: true, message: "Duplicate event skipped" }
        }
        
        await cortexQueue.add(JOBS.SLACK_EVENT , {id:uniqueID} , {
            attempts:3,
            backoff:{
                type:'exponential',
                delay:2000
            },
            removeOnComplete:true,
            removeOnFail:true,
        })

        return {status:true , message:"Data Inserted in Database"}
    }
    catch(error:any){
        throw new Error(error?.message || "Cortex Database Issue")
    }
}