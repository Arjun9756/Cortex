import { AgentStateType, ToolCall } from "../state.js";
import { createGroqChatCompletion } from "../../../llm/providers/groq.js";
import { buildPlannerPrompt } from "../../../llm/prompts/planner.prompt.js";
import { GRAPH_ACTIONS } from '../../../graph/graph.service.js';
import { getGraphSchema } from '../../../database/neo4j/schemaCache.js';
import { TOOL_DEFINITIONS } from '../../tools/toolDefinitions.js';
import { routeQueryIntent } from '../../router/intentRouter.js';

export function deduplicateToolCalls(calls: ToolCall[]): ToolCall[] {
    const seen = new Set<string>();
    const result: ToolCall[] = [];
    for (const call of calls) {
        const key = `${call.name}:${JSON.stringify(call.args || {})}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(call);
        }
    }
    return result;
}

export async function plannerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now()
    const startIso = new Date().toISOString()
    console.log(`[Timing] [plannerNode] Started at ${startIso}`)

    let pendingToolCalls: ToolCall[] = [];
    const entitiesSet = new Set<string>();
    let graphAction: string = 'describeEntity';
    let graphTarget: string = '';
    let graphRelation: string = '';
    let vectorQuery: string = '';

    try {
        // Fast Intent Router Check (0 LLM cost) — only for simple, single-intent queries.
        // Compound queries (multi-question, ownership, negation) are bypassed by the router itself.
        const matchedIntent = routeQueryIntent(state.query);
        if (matchedIntent) {
            console.log(`[Planner] Intent Router matched intent: ${matchedIntent.intentId} in ~2ms`);
            if (matchedIntent.tool === 'graph_search') {
                if (matchedIntent.action) graphAction = matchedIntent.action;
                if (matchedIntent.target) graphTarget = matchedIntent.target;
                if (matchedIntent.entities && matchedIntent.entities.length > 0) {
                    matchedIntent.entities.forEach(e => entitiesSet.add(e));
                }
                const singleCall: ToolCall = {
                    name: 'graph_search',
                    args: {
                        action: graphAction,
                        target: graphTarget,
                        entities: Array.from(entitiesSet)
                    }
                };
                return {
                    plan: [singleCall],
                    pendingTools: [singleCall],
                    executedTools: [],
                    entities: Array.from(entitiesSet),
                    graphAction,
                    graphTarget,
                    graphRelation,
                    vectorQuery: '',
                };
            } else if (matchedIntent.tool === 'knowledge_risk') {
                const singleCall: ToolCall = {
                    name: 'knowledge_risk',
                    args: { personName: matchedIntent.personName }
                };
                return {
                    plan: [singleCall],
                    pendingTools: [singleCall],
                    executedTools: [],
                    entities: matchedIntent.personName ? [matchedIntent.personName] : [],
                    graphAction: '',
                    graphTarget: '',
                    graphRelation: '',
                    vectorQuery: '',
                };
            }
        }

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
                    content: `You are an agentic retrieval planner. Your MOST IMPORTANT job is compound query decomposition.

BEFORE selecting any tools, mentally enumerate every distinct ask/question in the user message.
Then for EACH ask, independently decide which tool answers it and emit a tool call.

Rules:
- If the query has 1 ask, emit 1 tool call.
- If the query has 2 asks, emit 2 tool calls.
- If the query has 3+ asks, emit 3+ tool calls. There is NO LIMIT.
- NEVER collapse multiple distinct asks into a single tool call.
- NEVER stop after 1-2 tool calls if there are remaining asks.
- Each tool call should target ONE specific ask from the query.`
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0,
            tools: TOOL_DEFINITIONS as any,
            tool_choice: 'auto',
            parallel_tool_calls: true,
            max_completion_tokens: 8192,
        });

        const message = response.choices[0]?.message;
        const toolCalls = message?.tool_calls ?? [];

        console.log(`[Planner] LLM returned ${toolCalls.length} tool call(s)`);

        if (toolCalls.length === 0) {
            const textContent = message?.content?.trim() ?? '';
            // Clarification detection: plain text response containing a question
            if (textContent.includes('?') && textContent.length < 200) {
                return { clarificationQuestion: textContent };
            }
            // Check for global count/list intent before falling back to vector search
            const hasGlobalCountOrListIntent = /\b(how many|total (number|count)|list (all|the)|name (all|them)|who are (all|the)|show all)\b/i.test(state.query);
            if (hasGlobalCountOrListIntent) {
                graphAction = 'countByLabel';
                pendingToolCalls.push({ name: 'graph_search', args: { action: 'countByLabel' } });
            } else {
                vectorQuery = state.query;
                pendingToolCalls.push({ name: 'vector_search', args: { query: vectorQuery } });
            }
        } else {
            // Track whether LLM explicitly set graphAction, to avoid safety net overriding it
            let llmSetGraphAction = false;

            for (const call of toolCalls) {
                const toolName = call.function.name;
                let args: any = {};
                try {
                    args = JSON.parse(call.function.arguments || '{}');
                } catch (e) {
                    console.warn(`[Planner] Failed to parse arguments for tool ${toolName}:`, e);
                }

                console.log(`[Planner] Tool call: ${toolName}(${JSON.stringify(args)})`);
                pendingToolCalls.push({ name: toolName, args });

                if (toolName === 'graph_search') {
                    if (Array.isArray(args.entities)) {
                        for (const e of args.entities) {
                            if (typeof e === 'string' && e.trim().length > 0) {
                                entitiesSet.add(e.trim());
                            }
                        }
                    }
                    if (args.action && GRAPH_ACTIONS.includes(args.action)) {
                        graphAction = args.action;
                        llmSetGraphAction = true;
                    }
                    if (typeof args.target === 'string' && args.target.trim()) {
                        graphTarget = args.target.trim().toUpperCase();
                    }
                    if (typeof args.relation === 'string' && args.relation.trim()) {
                        graphRelation = args.relation.trim().toUpperCase();
                    }
                } else if (toolName === 'vector_search') {
                    if (typeof args.query === 'string' && args.query.trim()) {
                        vectorQuery = args.query.trim();
                    }
                } else if (toolName === 'knowledge_risk') {
                    if (typeof args.personName === 'string' && args.personName.trim()) {
                        entitiesSet.add(args.personName.trim());
                    }
                }
            }

            // Safety Net 4 guard: don't override LLM's explicit graphAction for compound queries
            if (!llmSetGraphAction) {
                // Safety Net 4: Force countByLabel only when LLM didn't set an explicit action
                const hasGlobalCountOrListIntent = /\b(how many|total (number|count)|list (all|the)|name (all|them)|who are (all|the)|show all)\b/i.test(state.query);
                if (hasGlobalCountOrListIntent) {
                    const hasCountCall = pendingToolCalls.some(c => c.name === 'graph_search' && c.args?.action === 'countByLabel');
                    if (!hasCountCall) {
                        graphAction = 'countByLabel';
                        // Infer graphTarget if not set by LLM
                        if (!graphTarget) {
                            if (/\b(developer|developers|person|people|contributor|contributors|member|members|engineer|engineers|user|users)\b/i.test(state.query)) {
                                graphTarget = 'PERSON';
                            } else if (/\b(repository|repositories|repo|repos|codebase)\b/i.test(state.query)) {
                                graphTarget = 'REPOSITORY';
                            } else if (/\b(issue|issues|bug|bugs|ticket|tickets)\b/i.test(state.query)) {
                                graphTarget = 'ISSUE';
                            } else if (/\b(pull request|pull requests|pr|prs)\b/i.test(state.query)) {
                                graphTarget = 'PULL_REQUEST';
                            } else if (/\b(commit|commits)\b/i.test(state.query)) {
                                graphTarget = 'COMMIT';
                            }
                        }
                        pendingToolCalls.push({ name: 'graph_search', args: { action: 'countByLabel', target: graphTarget } });
                        console.log(`[Planner] Safety net: forced countByLabel (target: ${graphTarget || 'ANY'}) for global count/list query`);
                    }
                }
            }
        }

        const entities = Array.from(entitiesSet);

        // Safety Net 1: Ensure vector_search is included for "why"/"explanation" clauses
        const hasWhyIntent = /\b(why|reason|replaced|removed|kyu|kyun|kyon)\b/i.test(state.query);
        if (hasWhyIntent && !pendingToolCalls.some(c => c.name === 'vector_search')) {
            pendingToolCalls.push({ name: 'vector_search', args: { query: vectorQuery || state.query } });
            console.log('[Planner] Safety net: added vector_search for why/explanation intent');
        }

        // Safety Net 2: Ensure graph_search is included when query explicitly asks for entity properties
        const hasPropertyIntent = /\b(email|mail|role|title|designation|who is|who are|contact details|kya h|kya hai)\b/i.test(state.query);
        if (hasPropertyIntent && !pendingToolCalls.some(c => c.name === 'graph_search')) {
            pendingToolCalls.push({ name: 'graph_search', args: { action: 'describeEntity', entities } });
            console.log('[Planner] Safety net: added graph_search for entity property intent');
        }

        // Safety Net 3: Ensure knowledge_risk is included when query explicitly asks risk
        const hasRiskIntent = /\b(knowledge.?risk|departure risk|knowledge loss|bus factor|leaves? the|what.?if.+leaves?)\b/i.test(state.query);
        if (hasRiskIntent && !pendingToolCalls.some(c => c.name === 'knowledge_risk')) {
            pendingToolCalls.push({ name: 'knowledge_risk', args: { personName: entities[0] || '' } });
            console.log('[Planner] Safety net: added knowledge_risk for risk intent');
        }

        // Safety Net 5: Ensure vector_search for ownership/domain knowledge
        const hasOwnershipOrDomainKnowledgeIntent = /\b(who (knows|knwos|owns|worked?|working|built|created|maintains|migrated|uses)|owner|maintainer|author|creator)\b/i.test(state.query);
        if (hasOwnershipOrDomainKnowledgeIntent && !pendingToolCalls.some(c => c.name === 'vector_search')) {
            pendingToolCalls.push({ name: 'vector_search', args: { query: vectorQuery || state.query } });
            console.log('[Planner] Safety net: added vector_search for ownership/domain-knowledge intent');
        }

        // Safety Net 6: Ensure graph_search listNodes for technology usage queries
        const hasTechnologyIntent = /\b(technolog(y|ies)|tech stack|tools|frameworks)\b/i.test(state.query);
        if (hasTechnologyIntent && entities.length > 0 && !pendingToolCalls.some(c => c.name === 'graph_search' && c.args?.action === 'listNodes')) {
            pendingToolCalls.push({ name: 'graph_search', args: { action: 'listNodes', entities: [entities[0]], relation: 'USES', target: 'TECHNOLOGY' } });
            console.log('[Planner] Safety net: added graph_search listNodes for technology intent');
        }

        // Deduplicate true duplicates (same tool + same arguments)
        pendingToolCalls = deduplicateToolCalls(pendingToolCalls);

        // Ensure vectorQuery is set if any vector_search call exists
        const vectorCall = pendingToolCalls.find(c => c.name === 'vector_search');
        if (vectorCall && !vectorQuery) {
            vectorQuery = vectorCall.args?.query || state.query;
        }

        console.log(`[Planner] Final plan (${pendingToolCalls.length} call(s)): ${JSON.stringify(pendingToolCalls)}, Entities: ${JSON.stringify(entities)}`);

        return {
            plan: pendingToolCalls,
            pendingTools: pendingToolCalls,
            clarificationQuestion: '',
            entities,
            graphAction,
            graphTarget,
            graphRelation,
            vectorQuery,
        };
    } catch (error: any) {
        console.error(`[Planner] Error in plannerNode: ${error?.message}`);
        const fallbackCall: ToolCall = { name: 'vector_search', args: { query: state.query } };
        return {
            plan: [fallbackCall],
            pendingTools: [fallbackCall],
            clarificationQuestion: '',
            entities: [],
            graphAction: 'describeEntity',
            graphTarget: '',
            graphRelation: '',
            vectorQuery: state.query,
        };
    } finally {
        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [plannerNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`);
    }
}
