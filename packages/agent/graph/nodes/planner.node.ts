import { AgentStateType } from "../state.js";
import { groq } from "../../../llm/providers/groq.js";
import { buildPlannerPrompt } from "../../../llm/prompts/planner.prompt.js";

export async function plannerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    let plan: string[] = []
    try {
        const prompt = buildPlannerPrompt(state.query)
        const response = await groq.chat.completions.create({
            model:'qwen/qwen3.6-27b',
            messages:[{role:'user' , content:prompt}],
            temperature:0.6,
            response_format:{type:"json_object"},
        })

        const content = response.choices[0]?.message?.content ?? '{}'
        const parsed = JSON.parse(content)
        if (parsed?.action === 'clarify' && typeof parsed.question === 'string' && parsed.question.trim()) {
            return { clarificationQuestion: parsed.question.trim() }
        }
        const allowedTools = new Set(['vector_search', 'graph_search', 'sql_search'])
        plan = Array.isArray(parsed?.tools)
            ? parsed.tools.filter((tool: unknown): tool is string => typeof tool === 'string' && allowedTools.has(tool))
            : []
        if (plan.includes('graph_search') && !plan.includes('vector_search')) plan.unshift('vector_search')
        
    }
    catch (error: any) {
        plan = ['vector_search']
    }

    return { plan, pendingTools: plan, clarificationQuestion: '' }
}
