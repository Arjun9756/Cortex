export interface IParsedGithubEvent{
    deliveryID:string,
    event_type:string,
    rawBody:any
}

/**
 * @param eventType string
 * @param deliveryID string
 * @payload any
 * @returns {ParsedGithubEvent}
 */
export function parseGithubEvent(eventType:string , deliveryID:string , payload:any):IParsedGithubEvent | null{
    try{
        const response:IParsedGithubEvent = {
            deliveryID,
            event_type:eventType,
            rawBody:payload
        }

        return response
    }
    catch(error:any){
        console.log(`Error while Parsing Github Payload ${error?.message}`)
        return null
    }
}