export interface IJiraParsedEvent{
    provider:'jira',
    event_type:string,
    external_id:string,
    rawbody:any
}

export function parsedJiraEvent(eventType:string , externalId:string , payload:any):IJiraParsedEvent{
    return {
        provider:'jira',
        event_type:eventType,
        rawbody:payload,
        external_id:externalId
    }
}