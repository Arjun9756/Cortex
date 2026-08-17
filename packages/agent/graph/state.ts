import { Annotation } from "@langchain/langgraph";

export interface ToolCall {
    id?: string;
    name: string;
    args?: Record<string, any>;
    /** The decomposed user ask this call is intended to answer. */
    subgoalId?: string;
    /** Number of targeted recovery attempts already made for this ask. */
    attempt?: number;
}

export interface SubGoal {
    id: string;
    description: string;
    type: 'entity_lookup' | 'semantic_explanation' | 'metric_count' | 'risk_analysis' | 'dependency_traversal';
    targetSourcePreference: ('graph' | 'vector' | 'sql' | 'analytics')[];
    status: 'pending' | 'in_progress' | 'fulfilled' | 'unreachable';
    requiredEntities?: string[];
    retries?: number;
}

export interface StructuredEvidence {
    id: string;
    subgoalId?: string;
    sourceType: 'graph' | 'vector' | 'sql' | 'analytics' | 'cypher';
    confidence: number;
    summary: string;
    rawPayload: any;
    entitiesFound: string[];
    queryExplanation: string;
    /** Links evidence to the exact decomposed ask rather than merely a tool category. */
    toolCallId?: string;
}

export interface ObservabilityMetrics {
    totalLatencyMs: number;
    plannerLatencyMs: number;
    toolLatencies: Record<string, number>;
    toolOrder: string[];
    parallelBatches: number;
    iterationCount: number;
    evidenceConfidence: number;
    llmTokensUsed: number;
}

export const AgentState = Annotation.Root({
    // User Query State
    query: Annotation<string>({
        default: () => "",
        reducer: (prev, next) => next
    }),

    // Adaptive Plan & Goal Decomposition
    subgoals: Annotation<SubGoal[]>({
        default: () => [],
        reducer: (_, next) => next
    }),

    coveredGoals: Annotation<string[]>({
        default: () => [],
        reducer: (prev, next) => [...new Set([...prev, ...next])]
    }),

    missingGoals: Annotation<string[]>({
        default: () => [],
        reducer: (_, next) => next
    }),

    // Structured Evidence Array
    structuredEvidence: Annotation<StructuredEvidence[]>({
        default: () => [],
        reducer: (prev, next) => [...prev, ...next]
    }),

    evidenceConfidence: Annotation<number>({
        default: () => 0.0,
        reducer: (_, next) => next
    }),

    // Tool Queue & History
    plan: Annotation<(ToolCall | string)[]>({
        default: () => [],
        reducer: (prev, next) => next
    }),

    pendingTools: Annotation<(ToolCall | string)[]>({
        default: () => [],
        reducer: (_, next) => next,
    }),

    pendingToolBatches: Annotation<ToolCall[][]>({
        default: () => [],
        reducer: (_, next) => next,
    }),

    executedTools: Annotation<string[]>({
        default: () => [],
        reducer: (prev, next) => [...new Set([...prev, ...next])],
    }),

    clarificationQuestion: Annotation<string>({
        default: () => "",
        reducer: (_, next) => next,
    }),

    entities: Annotation<string[]>({
        default: () => [],
        reducer: (_, next) => next,
    }),

    resolvedEntities: Annotation<Record<string, { resolvedName: string; type: string; confidence: number }>>({
        default: () => ({}),
        reducer: (prev, next) => ({ ...prev, ...next }),
    }),

    vectorQuery: Annotation<string>({
        default: () => '',
        reducer: (_, next) => next,
    }),

    // Query Results
    vectorResult: Annotation<any[]>({
        default: () => [],
        reducer: (prev, next) => next
    }),

    graphResult: Annotation<any[]>({
        default: () => [],
        reducer: (prev, next) => next
    }),

    sqlResult: Annotation<any[]>({
        default: () => [],
        reducer: (_, next) => next
    }),

    webQuery: Annotation<string>({
        default: () => '',
        reducer: (_, next) => next
    }),

    WebQueryResult: Annotation<any[]>({
        default: () => [],
        reducer: (_, next) => next
    }),

    knowledgeRiskResult: Annotation<any>({
        default: () => null,
        reducer: (_, next) => next
    }),

    evidence: Annotation<string>({
        default: () => "",
        reducer: (prev, next) => next
    }),

    needMoreSearch: Annotation<boolean>({
        default: () => false,
        reducer: (prev, next) => next
    }),

    iterationCount: Annotation<number>({
        default: () => 0,
        reducer: (current, next) => next ?? current,
    }),

    // Telemetry & Metrics
    metrics: Annotation<ObservabilityMetrics>({
        default: () => ({
            totalLatencyMs: 0,
            plannerLatencyMs: 0,
            toolLatencies: {},
            toolOrder: [],
            parallelBatches: 0,
            iterationCount: 0,
            evidenceConfidence: 0,
            llmTokensUsed: 0,
        }),
        reducer: (prev, next) => ({ ...prev, ...next }),
    }),

    // Final Answer
    answer: Annotation<string>({
        default: () => "",
        reducer: (_, next) => next,
    }),
});

export type AgentStateType = typeof AgentState.State;

