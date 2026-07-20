import sql from '../../../apps/api/config/postgres.js'
import { normalizeGithubEvent } from './normalize.js'

export async function processGithubEvent(eventID:number){
    try{
        const [event] = await sql`SELECT *FROM events WHERE id=${eventID.toString()}`
        if(!event){
            console.log(`Event With Event ID For Github ${eventID} Not Found in Database`)
            return null
        }

        const normalizedPayload = normalizeGithubEvent(event.payload , event.event_type)
        // LLM Train
    }
    catch(error:any){
        console.log(`Error While Processing Github Events Through Queue Workers ${error?.message}`)
        throw new Error(error?.message || "Not Able To Proceed Further Github Events Through Queue Workers")
    }
}