export type CleanSlackEvent = {
    provider:'slack',
    eventType:string,
    channel:string,
    timestamp:string,
    author:string,
    text?:string,
    threadParentTs?:string | null
}

export function normalizeMessage(payload:any): CleanSlackEvent{
    const isThreadReply = !!payload.thread_ts && payload.thread_ts !== payload.ts;

    return {
        provider: "slack",
        eventType: isThreadReply ? "thread_reply" : "message", // apna internal label yahi ban raha hai
        channel: payload.channel,
        author: payload.user,
        timestamp: payload.ts,
        text: payload.text,
        threadParentTs: isThreadReply ? payload.thread_ts : null,
    };
}

export function normalizeSlackEvent(rawPayload:any , eventType:string):CleanSlackEvent | null{
    switch(eventType){
        case 'message':
            return normalizeMessage(rawPayload)
        default:
            console.warn(`Unhandled Slack event type: ${eventType}`);
            return null;
    }
}