import sql from '../../../apps/api/config/postgres.js'
import { CleanSlackEvent, normalizeSlackEvent } from './normalize.js'
import { extractFromEvent } from '../../extraction/extractor.js'
import { saveExtractionToGraph } from '../../extraction/processExtraction.js'

export async function processSlackEvent(eventID:string){
    try{
        // 1. Get Payload From Database
        const [event] = await sql`SELECT *FROM events WHERE id=${eventID}`
        if(!event){
            console.log(`Event With Event ID For Slack ${eventID} Not Found in Database`)
            return null
        }

        // 2. Normalize The Payload
        const normalizedPayload:CleanSlackEvent | null = normalizeSlackEvent(event.payload , event.event_type)
        if(normalizedPayload == null)
            return
        
        // 3. Convert Into Text
        const cleanEventText = JSON.stringify(normalizedPayload)

        // 4. Extract Enities and Relationships
        const {entities , newEntities , relationships , newRelations , summary} = await extractFromEvent(cleanEventText)
        
        await saveExtractionToGraph(entities , newEntities , relationships , newRelations)
        
        // 6.Process The Summary To Create Vector Embeddings For Semantic Search
        console.log(`Event ${eventID} processed. Summary: ${summary}`)
    }
    catch(error:any){
        console.log(`Error While Processing Slack Event`)
        throw error
    }
}