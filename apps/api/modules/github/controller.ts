import { IParsedGithubEvent } from "./parser.js";
import sql from '../../config/postgres.js'
import { snowflake } from "../../../Utils/Snowflake.js";

export async function pushGithubEventToDatabase(payload:IParsedGithubEvent){
    try{
        const uniqueID = snowflake.nextID().toString()
        const [result] = await sql `INSERT INTO events(id , provider , event_type , external_id , payload) VALUES (${uniqueID} , ${'github'} , ${payload.event_type} , ${payload.deliveryID} , ${sql.json(payload.rawBody)}) RETURNING id , created_at`
        
        return {status:true , message:"Data Inserted in Database"}
    }
    catch(error:any){
        throw error
    }
}