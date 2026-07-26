import { AgentStateType } from "../state.js";
import { groq } from "../../../llm/providers/groq.js";
import { buildReflectionPrompt } from "../../../llm/prompts/reflectionplanner.prompt.js";
import { evidenceNode } from "./evidence.node.js";

export async function reflectionNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
        if (state.iterationCount >= 1) {
            return { needMoreSearch: false, iterationCount: state.iterationCount + 1 }
        }

        const evidence = evidenceNode(state).evidence
        const prompt = buildReflectionPrompt(state.query, evidence!)

        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
        })

        const reply = response?.choices[0]?.message?.content?.toLowerCase().trim() ?? "yes"
        const needMoreSearch = reply.includes("no")

        return {needMoreSearch , iterationCount:state.iterationCount+1}
    }
    catch (error: any) {
        console.log(`Error in Refection Node`)
        return {needMoreSearch:state.needMoreSearch , iterationCount:state.iterationCount}
    }
}