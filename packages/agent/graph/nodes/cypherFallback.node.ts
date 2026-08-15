import { AgentStateType, StructuredEvidence } from "../state.js";
import { executeTextToCypher } from "../../../graph/cypher/textToCypher.service.js";

export async function cypherFallbackNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now();
    console.log(`[Timing] [cypherFallbackNode] Started at ${new Date().toISOString()}`);

    const remainingPendingTools = state.pendingTools.filter((tool) => (typeof tool === 'string' ? tool : tool.name) !== 'cypher_fallback');
    const executedTools = [...new Set([...state.executedTools, 'cypher_fallback'])];

    try {
        console.log(`[cypherFallbackNode] Executing safe text-to-cypher fallback for: "${state.query}"`);
        const result = await executeTextToCypher(state.query);

        const newEvidence: StructuredEvidence[] = [];
        if (result.isValid && result.data && result.data.length > 0) {
            newEvidence.push({
                id: `cypher_${Date.now()}`,
                sourceType: 'cypher',
                confidence: 0.85,
                summary: `Cypher fallback query returned ${result.data.length} record(s).`,
                rawPayload: result.data,
                entitiesFound: state.entities,
                queryExplanation: `Executed AST-validated read-only Cypher: ${result.cypher}`,
            });
        }

        const elapsed = Date.now() - tStart;
        return {
            graphResult: [...state.graphResult, ...result.data],
            structuredEvidence: [...state.structuredEvidence, ...newEvidence],
            pendingTools: remainingPendingTools,
            executedTools,
            metrics: {
                ...state.metrics,
                toolLatencies: { ...state.metrics?.toolLatencies, cypherFallbackNode: elapsed },
                toolOrder: [...(state.metrics?.toolOrder || []), 'cypherFallbackNode'],
            }
        };
    } catch (error: any) {
        console.error(`[cypherFallbackNode] Error during text-to-cypher fallback: ${error?.message}`);
        return {
            pendingTools: remainingPendingTools,
            executedTools
        };
    }
}
