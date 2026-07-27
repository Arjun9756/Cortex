import { AgentStateType } from "../state.js";

export function evidenceNode(state: AgentStateType): Partial<AgentStateType> {
    try {
        const vectorText = state.vectorResult.map((item) => {
            return `[${item?.provider}] [${item?.summary}]`
        }).join('\n')

        const graphText = state.graphResult.map((item) => {
            return `[${item?.name}] --[${item?.relation}]->[${item?.connectedTo}]`
        }).join('\n')

        const sqlText = state.sqlResult.map((item: any) => {
            return `[Event ID: ${item?.id}] [${item?.provider}] ${JSON.stringify(item?.payload)} (created: ${item?.created_at})`
        }).join('\n')

        const evidence = `
#RELEVANT EVENTS
${vectorText}

#RELEVANT RELATION
${graphText}

#RELEVANT SQL
${sqlText}
        `.trim()

        console.log("=== FINAL EVIDENCE STRING PASSED TO LLM ===");
        console.log(evidence);

        return { evidence }
    }
    catch (error: any) {
        console.log("Error in evidenceNode:", error?.message)
        return { evidence: "Error in Cortex Server" }
    }
}