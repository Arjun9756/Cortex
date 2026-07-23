import { cortexQueue } from '../../../../packages/queue/bullmq.js';
import { JOBS } from '../../../../packages/queue/jobs.js';
import { snowflake } from '../../../Utils/Snowflake.js';
import sql from '../../config/postgres.js'
import { ISlackParsedEvent } from './normalize.js';

export async function pushSlackEventToDatabase(parsedEvent:ISlackParsedEvent){
    try{
        const uniqueID = snowflake.nextID().toString()
        const [result] = await sql `INSERT INTO events(id , provider , event_type , external_id , payload) VALUES (${uniqueID} , ${'slack'} , ${parsedEvent.event_type} , ${parsedEvent.external_id} , ${sql.json(parsedEvent.rawBody)}) RETURNING id`
        
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