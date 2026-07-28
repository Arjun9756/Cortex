import sql from '../../../apps/api/config/postgres.js'

export async function processJiraEvent(eventID:string){
    try{
        
    }
    catch(error:any){
        throw new Error(error?.message || "Error While Processing Jira Event")
    }
}