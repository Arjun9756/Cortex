import { AgentStateType } from "./state.js";

export function shouldContinue(state: AgentStateType): "vector" | "answer" {
    if (state.needMoreSearch && state.iterationCount < 2) {
        return "vector";
    }
    return "answer";
}

export function routeNextTool(state: AgentStateType): 'vectorNode' | 'graphNode' | 'sqlNode' | 'knowledgeRiskNode' | 'evidenceNode' | 'clarifyNode' {
    if (state.clarificationQuestion) {
        // FIX 3: If other tools already produced evidence, skip clarifyNode and proceed
        // to evidenceNode so partial results reach the user alongside the clarification
        const hasPartialEvidence =
            (state.vectorResult && state.vectorResult.length > 0) ||
            (state.sqlResult && state.sqlResult.length > 0) ||
            state.knowledgeRiskResult;
        if (!hasPartialEvidence) return 'clarifyNode';
        // Fall through — clarification will be included in evidence by evidenceNode
    }
    if (state.pendingTools.length === 0) return 'evidenceNode';
    const first = state.pendingTools[0];
    const nextTool = typeof first === 'string' ? first : first?.name;
    if (nextTool === 'vector_search') return 'vectorNode';
    if (nextTool === 'graph_search') return 'graphNode';
    if (nextTool === 'sql_search') return 'sqlNode';
    if (nextTool === 'knowledge_risk') return 'knowledgeRiskNode';
    return 'evidenceNode';
}
