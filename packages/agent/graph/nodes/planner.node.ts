import { AgentStateType } from "../state.js";
import { groq } from "../../../llm/providers/groq.js";
import { buildPlannerPrompt } from "../../../llm/prompts/planner.prompt.js";

export async function plannerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    let plan:string[] = []
    try {
        const prompt = buildPlannerPrompt(state.query)
        const response = await groq.chat.completions.create({
            model:"openai/gpt-oss-120b",
            messages:[{role:'user' , content:prompt}],
            temperature:0,
            response_format:{type:"json_object"}
        })

        const content = response.choices[0]?.message?.content ?? `['vector-search' , 'graph-search' , 'sql-search']`

        const parsed = JSON.parse(content)
        plan = Array.isArray(parsed) ? parsed : ['vector-search' , 'graph-search' , 'sql-search']
        
    }
    catch (error: any) {
        plan = ['vector-search' , 'graph-search' , 'sql-search']
    }
    return {plan}
}