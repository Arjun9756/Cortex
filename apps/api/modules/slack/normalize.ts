export interface ISlackParsedEvent{
    event_type:string,
    external_id:string,
    rawBody:any
}

export function parseSlackEvent(eventType:string , payload:any , external_id:string):ISlackParsedEvent | null{
    try{
        const response:ISlackParsedEvent = {
            event_type:eventType,
            rawBody:payload,
            external_id:external_id
        }

        return response
    }
    catch(error:any){
        console.log('Error While Parsing The Slack Event')
        return null
    }
}