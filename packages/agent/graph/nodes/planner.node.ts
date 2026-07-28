import { AgentStateType } from "../state.js";
import { groq } from "../../../llm/providers/groq.js";
import { buildPlannerPrompt } from "../../../llm/prompts/planner.prompt.js";
import { GRAPH_ACTIONS } from '../../../graph/graph.service.js'

export async function plannerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    let plan: string[] = []
    try {
        const prompt = buildPlannerPrompt(state.query)
        const response = await groq.chat.completions.create({
            model:'qwen/qwen3.6-27b',
            messages:[{role:'user' , content:prompt}],
            temperature:0,
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
        const entities = Array.isArray(parsed?.entities)
            ? parsed.entities.filter((entity: unknown): entity is string => typeof entity === 'string' && entity.trim().length > 0).map((entity: string) => entity.trim())
            : []
        let graphAction = GRAPH_ACTIONS.includes(parsed?.graphAction) ? parsed.graphAction : 'describeEntity'
        const graphTarget = typeof parsed?.graphTarget === 'string' ? parsed.graphTarget.trim().toUpperCase() : ''
        let graphRelation = typeof parsed?.graphRelation === 'string' ? parsed.graphRelation.trim().toUpperCase() : ''
        const vectorQuery = typeof parsed?.vectorQuery === 'string' ? parsed.vectorQuery.trim() : ''
        const isUsageQuestion = /kisme\s+use|kis\s+kisme/i.test(state.query) || /\b(?:what|where|which)\b.{0,50}\b(?:use|used|uses)\b/i.test(state.query)
        const isCountQuestion = /\bcount\b|kitn|how many/i.test(state.query)
        const isWhyQuestion = /\bwhy\b|\bkyu\b|\bkyun\b|\bkyon\b/i.test(state.query)
        if (isUsageQuestion) {
            plan = ['graph_search', ...plan.filter((tool) => tool !== 'graph_search')]
            graphAction = 'listNodes'
            graphRelation = 'USES'
        }
        if (isUsageQuestion && isCountQuestion && isWhyQuestion && !plan.includes('vector_search')) {
            plan.push('vector_search')
        }
        return { plan, pendingTools: plan, clarificationQuestion: '', entities, graphAction, graphTarget, graphRelation, vectorQuery }
    }
    catch (error: any) {
        plan = ['vector_search']
    }

    return { plan, pendingTools: plan, clarificationQuestion: '', entities: [], graphAction: 'describeEntity', graphTarget: '', graphRelation: '', vectorQuery: '' }
}
