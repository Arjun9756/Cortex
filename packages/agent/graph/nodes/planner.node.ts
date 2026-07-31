import { AgentStateType } from "../state.js";
import { createGroqChatCompletion } from "../../../llm/providers/groq.js";
import { buildPlannerPrompt } from "../../../llm/prompts/planner.prompt.js";
import { GRAPH_ACTIONS } from '../../../graph/graph.service.js';
import { getGraphSchema } from '../../../database/neo4j/schemaCache.js';
import { TOOL_DEFINITIONS } from '../../tools/toolDefinitions.js';

export async function plannerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    let plan: string[] = [];
    const entitiesSet = new Set<string>();
    let graphAction: string = 'describeEntity';
    let graphTarget: string = '';
    let graphRelation: string = '';
    let vectorQuery: string = '';

    try {
        // Fetch live schema so the planner prompt reflects current graph labels/relations
        let labels: string[] = [];
        let relations: string[] = [];
        try {
            const schema = await getGraphSchema();
            labels = schema.nodeLabels;
            relations = schema.relationshipTypes;
            console.log(`[Planner] Schema injected: ${labels.length} labels, ${relations.length} relations`);
        } catch (schemaError: any) {
            console.warn(`[Planner] Schema fetch failed, proceeding without constraints: ${schemaError?.message}`);
        }

        const prompt = buildPlannerPrompt(state.query, labels, relations);
        const response = await createGroqChatCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are an agentic retrieval planner. Analyze the user question carefully. If the question contains compound intents or multiple sub-questions (e.g. asking for entity/count/email/role facts AND an explanation/why question, or asking for knowledge risk AND commit counts), you MUST issue multiple parallel tool calls in a single response. Never collapse two distinct information needs into a single tool call.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0,
            tools: TOOL_DEFINITIONS as any,
            tool_choice: 'auto',
            parallel_tool_calls: true,
            max_completion_tokens: 4096,
        }, 'qwen/qwen3.6-27b');

        const message = response.choices[0]?.message;
        const toolCalls = message?.tool_calls ?? [];

        if (toolCalls.length === 0) {
            const textContent = message?.content?.trim() ?? '';
            // Clarification detection: plain text response containing a question
            if (textContent.includes('?') && textContent.length < 200) {
                return { clarificationQuestion: textContent };
            }
            // Fallback: default to vector search if no tool call was generated
            plan = ['vector_search'];
            vectorQuery = state.query;
            return {
                plan,
                pendingTools: plan,
                clarificationQuestion: '',
                entities: [],
                graphAction,
                graphTarget,
                graphRelation,
                vectorQuery,
            };
        }

        for (const call of toolCalls) {
            const toolName = call.function.name;
            let args: any = {};
            try {
                args = JSON.parse(call.function.arguments || '{}');
            } catch (e) {
                console.warn(`[Planner] Failed to parse arguments for tool ${toolName}:`, e);
            }

            if (toolName === 'graph_search') {
                if (!plan.includes('graph_search')) plan.push('graph_search');
                if (Array.isArray(args.entities)) {
                    for (const e of args.entities) {
                        if (typeof e === 'string' && e.trim().length > 0) {
                            entitiesSet.add(e.trim());
                        }
                    }
                }
                if (args.action && GRAPH_ACTIONS.includes(args.action)) {
                    graphAction = args.action;
                }
                if (typeof args.target === 'string' && args.target.trim()) {
                    graphTarget = args.target.trim().toUpperCase();
                }
                if (typeof args.relation === 'string' && args.relation.trim()) {
                    graphRelation = args.relation.trim().toUpperCase();
                }
            } else if (toolName === 'vector_search') {
                if (!plan.includes('vector_search')) plan.push('vector_search');
                if (typeof args.query === 'string' && args.query.trim()) {
                    vectorQuery = args.query.trim();
                }
            } else if (toolName === 'sql_search') {
                if (!plan.includes('sql_search')) plan.push('sql_search');
            } else if (toolName === 'knowledge_risk') {
                if (!plan.includes('knowledge_risk')) plan.push('knowledge_risk');
                if (typeof args.personName === 'string' && args.personName.trim()) {
                    entitiesSet.add(args.personName.trim());
                }
            }
        }

        const entities = Array.from(entitiesSet);

        // Safety Net 1: Ensure vector_search is included for "why"/"explanation" clauses
        const hasWhyIntent = /\b(why|reason|replaced|removed|kyu|kyun|kyon)\b/i.test(state.query);
        if (hasWhyIntent && !plan.includes('vector_search')) {
            plan.push('vector_search');
        }

        // Safety Net 2: Ensure graph_search is included when query explicitly asks for
        // entity properties (email, role, title, who is) alongside another tool
        const hasPropertyIntent = /\b(email|mail|role|title|designation|who is|who are|kya h|kya hai)\b/i.test(state.query);
        if (hasPropertyIntent && !plan.includes('graph_search')) {
            plan.push('graph_search');
            console.log('[Planner] Safety net: added graph_search for entity property intent');
        }

        // Safety Net 3: Ensure knowledge_risk is included when query explicitly asks
        // knowledge risk/departure risk alongside other intents
        const hasRiskIntent = /\b(knowledge.?risk|departure risk|knowledge loss|leaves? the|what.?if.+leaves?)\b/i.test(state.query);
        if (hasRiskIntent && !plan.includes('knowledge_risk')) {
            plan.push('knowledge_risk');
            console.log('[Planner] Safety net: added knowledge_risk for risk intent');
        }

        // Ensure vectorQuery is populated if vector_search is in plan
        if (plan.includes('vector_search') && !vectorQuery) {
            vectorQuery = state.query;
        }

        console.log(`[Planner] Native tool calls merged. Plan: ${JSON.stringify(plan)}, Entities: ${JSON.stringify(entities)}`);


        return {
            plan,
            pendingTools: plan,
            clarificationQuestion: '',
            entities,
            graphAction,
            graphTarget,
            graphRelation,
            vectorQuery,
        };
    } catch (error: any) {
        console.error(`[Planner] Error in plannerNode: ${error?.message}`);
        plan = ['vector_search'];
        return {
            plan,
            pendingTools: plan,
            clarificationQuestion: '',
            entities: [],
            graphAction: 'describeEntity',
            graphTarget: '',
            graphRelation: '',
            vectorQuery: state.query,
        };
    }
}
