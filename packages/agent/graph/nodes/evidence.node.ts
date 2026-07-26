import { AgentStateType } from "../state.js";
export function evidenceNode(state:AgentStateType):Partial<AgentStateType>{
    try{
        const vectorText = state.vectorResult.map((item)=>{
            return `[${item?.provider}] [${item?.summart}] [${item?.eventId}]`
        }).join('\n')

        const graphResult = state.graphResult.map((item)=>{
            return `[${item?.entity}] --[${item?.relation}]->[${item?.connectedTo}]`
        })

        const evidence = `
            #RELEVANT EVENTS
            ${vectorText}

            #RELEVANT RELATION
            ${graphResult}
        `.trim()

        return {evidence}
    }
    catch(error:any){
        return {evidence:"Error in Cortex Server"}
    }
}