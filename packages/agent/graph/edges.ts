import { AgentStateType } from "./state.js";

export function shouldContinue(state: AgentStateType): "vector" | "answer" {
    if (state.needMoreSearch && state.iterationCount < 2) {
        return "vector";
    }
    return "answer";
}

export function routeNextTool(state: AgentStateType): 'vectorNode' | 'graphNode' | 'sqlNode' | 'knowledgeRiskNode' | 'evidenceNode' | 'clarifyNode' {
    if (state.clarificationQuestion) return 'clarifyNode';
    const nextTool = state.pendingTools[0];
    if (nextTool === 'vector_search') return 'vectorNode';
    if (nextTool === 'graph_search') return 'graphNode';
    if (nextTool === 'sql_search') return 'sqlNode';
    if (nextTool === 'knowledge_risk') return 'knowledgeRiskNode';
    return 'evidenceNode';
}
