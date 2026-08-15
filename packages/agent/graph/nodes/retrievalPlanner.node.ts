import { AgentStateType, ToolCall } from "../state.js";

/**
 * Retrieval Planner Node:
 * Groups pending tools into parallel execution batches or sequential batches based on tool dependency.
 * Independent tools (e.g. graph_search and vector_search targeting different subgoals) are batched together.
 */
export async function retrievalPlannerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now();
    console.log(`[Timing] [retrievalPlannerNode] Started at ${new Date().toISOString()}`);

    if (state.pendingTools.length === 0) {
        return { pendingToolBatches: [] };
    }

    const toolCalls: ToolCall[] = state.pendingTools.map(t => typeof t === 'string' ? { name: t } : t);

    // Grouping logic for parallel execution:
    // If query has distinct independent tool requests (e.g., 1 graph + 1 vector call), batch them together for parallel execution!
    const batches: ToolCall[][] = [];
    const seenNames = new Set<string>();
    let currentBatch: ToolCall[] = [];

    for (const call of toolCalls) {
        if (!seenNames.has(call.name)) {
            seenNames.add(call.name);
            currentBatch.push(call);
        } else {
            // Duplicate tool type in pending list -> push current batch and start new batch for sequential execution
            if (currentBatch.length > 0) {
                batches.push(currentBatch);
            }
            currentBatch = [call];
            seenNames.clear();
            seenNames.add(call.name);
        }
    }

    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }

    console.log(`[retrievalPlannerNode] Scheduled ${batches.length} tool batch(es). First batch has ${batches[0]?.length || 0} parallel tool(s):`, batches[0]?.map(b => b.name));

    const elapsed = Date.now() - tStart;
    return {
        pendingToolBatches: batches,
        metrics: {
            ...state.metrics,
            parallelBatches: ((state.metrics?.parallelBatches) || 0) + ((batches[0]?.length ?? 0) > 1 ? 1 : 0),
        }
    };
}
