import { AgentStateType } from "../state.js";
import { groq } from "../../../llm/providers/groq.js";
import { buildReflectionPrompt } from "../../../llm/prompts/reflectionplanner.prompt.js";

export async function reflectionNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
        if (state.executedTools.includes('graph_search') && state.graphResult.length > 0) {
            return { needMoreSearch: false, pendingTools: [], iterationCount: state.iterationCount + 1 }
        }
        if (state.iterationCount >= 2) {
            return { needMoreSearch: false, iterationCount: state.iterationCount + 1 }
        }

        const prompt = buildReflectionPrompt(state.query, state.evidence, state.executedTools)

        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
            response_format: { type: 'json_object' },
        })

        const reply = response?.choices[0]?.message?.content ?? '{}'
        const decision = JSON.parse(reply)
        if (decision?.action === 'clarify' && typeof decision.question === 'string' && decision.question.trim()) {
            return { clarificationQuestion: decision.question.trim(), iterationCount: state.iterationCount + 1 }
        }
        const allowedTools = new Set(['vector_search', 'graph_search', 'sql_search'])
        const requestedTools = Array.isArray(decision?.tools)
            ? decision.tools.filter((tool: unknown): tool is string => typeof tool === 'string' && allowedTools.has(tool))
            : []
        const pendingTools = requestedTools.filter((tool: string) => !state.executedTools.includes(tool))
        return { pendingTools, needMoreSearch: pendingTools.length > 0, iterationCount: state.iterationCount + 1 }
    }
    catch (error: any) {
        console.log(`Error in Refection Node`)
        return { needMoreSearch: false, iterationCount: state.iterationCount + 1 }
    }
}
