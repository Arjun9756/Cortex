import { AgentStateType } from "./state.js";

export function shouldContinue(state: AgentStateType): "vector" | "answer" {
    if (state.needMoreSearch && state.iterationCount < 3) {
        return "vector";
    }
    return "answer";
}

export function routeNextTool(state: AgentStateType): 'vectorNode' | 'graphNode' | 'sqlNode' | 'knowledgeRiskNode' | 'cypherFallbackNode' | 'evidenceNode' | 'clarifyNode' {
    if (state.clarificationQuestion) {
        const hasPartialEvidence =
            (state.vectorResult && state.vectorResult.length > 0) ||
            (state.sqlResult && state.sqlResult.length > 0) ||
            (state.graphResult && state.graphResult.length > 0) ||
            state.knowledgeRiskResult;
        if (!hasPartialEvidence) return 'clarifyNode';
    }

    if (state.pendingTools.length === 0) return 'evidenceNode';
    
    const first = state.pendingTools[0];
    const nextTool = typeof first === 'string' ? first : first?.name;

    // Route ALL graph_* tools to graphNode
    if (nextTool?.startsWith('graph_')) return 'graphNode';

    if (nextTool === 'vector_search') return 'vectorNode';
    if (nextTool === 'sql_search') return 'sqlNode';
    if (nextTool === 'knowledge_risk') return 'knowledgeRiskNode';
    if (nextTool === 'cypher_fallback') return 'cypherFallbackNode';

    return 'evidenceNode';
}

export function routeAfterReflection(state: AgentStateType): 'retrievalPlannerNode' | 'answerNode' | 'clarifyNode' {
    if (state.clarificationQuestion && state.executedTools.length === 0) {
        return 'clarifyNode';
    }
    if (state.pendingTools.length > 0 && state.iterationCount < 3) {
        return 'retrievalPlannerNode';
    }
    return 'answerNode';
}
