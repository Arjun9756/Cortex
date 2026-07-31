import { AgentStateType } from "../state.js";
import { createGroqChatCompletion } from "../../../llm/providers/groq.js";
import { buildReflectionPrompt } from "../../../llm/prompts/reflectionplanner.prompt.js";

export async function reflectionNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
        // If there are still pending tools queued up from the planner, continue executing them
        if (state.pendingTools.length > 0) {
            return { needMoreSearch: true, pendingTools: state.pendingTools, iterationCount: state.iterationCount + 1 };
        }

        if (state.iterationCount >= 2) {
            return { needMoreSearch: false, iterationCount: state.iterationCount + 1 };
        }

        // Safety Net 1: If query has a "why"/explanation clause and vector_search hasn't run, schedule vector_search
        const hasWhyIntent = /\b(why|reason|replaced|removed|kyu|kyun|kyon)\b/i.test(state.query);
        if (hasWhyIntent && !state.executedTools.includes('vector_search')) {
            console.log('[Reflection] Query has explanation/why intent but vector_search was not executed. Scheduling vector_search.');
            return {
                pendingTools: ['vector_search'],
                needMoreSearch: true,
                vectorQuery: state.vectorQuery || state.query,
                iterationCount: state.iterationCount + 1,
            };
        }

        // Safety Net 2: If query asks for event ID / raw payload / event details and sql_search hasn't run, schedule sql_search
        const wantsSqlData = /\b(payload|raw|event id|message id|count by provider|recent events)\b/i.test(state.query);
        if (wantsSqlData && !state.executedTools.includes('sql_search')) {
            console.log('[Reflection] Query asks for raw payload/event ID. Scheduling sql_search...');
            return {
                pendingTools: ['sql_search'],
                needMoreSearch: true,
                iterationCount: state.iterationCount + 1,
            };
        }

        const prompt = buildReflectionPrompt(state.query, state.evidence, state.executedTools);

        const response = await createGroqChatCompletion({
            messages: [{ role: "user", content: prompt }],
            temperature: 0,
            response_format: { type: 'json_object' },
        });

        const reply = response?.choices[0]?.message?.content ?? '{}';
        let decision: any = {};
        try {
            decision = JSON.parse(reply);
        } catch (e) {
            console.warn('[Reflection] JSON parse failed, defaulting to answer');
        }

        if (decision?.action === 'clarify' && typeof decision.question === 'string' && decision.question.trim()) {
            // Guard: if evidence was already collected by tools, override clarify and proceed to answer
            const hasSubstantialEvidence = Boolean(
                state.knowledgeRiskResult ||
                (state.graphResult && state.graphResult.length > 0) ||
                (state.vectorResult && state.vectorResult.length > 0) ||
                (state.sqlResult && state.sqlResult.length > 0)
            );
            if (hasSubstantialEvidence) {
                console.log('[Reflection] Evidence is present — overriding LLM clarify decision and proceeding to answerNode');
                return { pendingTools: [], needMoreSearch: false, iterationCount: state.iterationCount + 1 };
            }
            return { clarificationQuestion: decision.question.trim(), iterationCount: state.iterationCount + 1 };
        }

        const allowedTools = new Set(['vector_search', 'graph_search', 'sql_search', 'knowledge_risk']);
        const requestedTools = Array.isArray(decision?.tools)
            ? decision.tools.filter((tool: unknown): tool is string => typeof tool === 'string' && allowedTools.has(tool))
            : [];
        const pendingTools = requestedTools.filter((tool: string) => !state.executedTools.includes(tool));
        return { pendingTools, needMoreSearch: pendingTools.length > 0, iterationCount: state.iterationCount + 1 };
    }
    catch (error: any) {
        console.log(`Error in Reflection Node: ${error?.message}`);
        return { needMoreSearch: false, iterationCount: state.iterationCount + 1 };
    }
}
