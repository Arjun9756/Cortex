import { AgentStateType } from "../state.js";
import { createGroqChatCompletion, stripThinkingTags, ANSWER_MODEL } from "../../../llm/providers/groq.js";
import { buildAnswerPrompt } from "../../../llm/prompts/answer.prompt.js";

/**
 * Prints a formal structured console.table displaying the full retrieval history,
 * tool calls, entities found, query explanation, and telemetry metrics.
 */
function printExecutionHistoryTable(state: AgentStateType) {
    console.log("\n================================================================================");
    console.log("📊 CORTEX AGENTIC RETRIEVAL & TOOL EXECUTION HISTORY");
    console.log("================================================================================\n");

    const historyRows = state.structuredEvidence.map((ev, index) => ({
        "Step": index + 1,
        "Tool / Source": ev.sourceType.toUpperCase(),
        "Confidence": `${Math.round(ev.confidence * 100)}%`,
        "Entities Found": ev.entitiesFound.join(", ") || "(none)",
        "Query / Action Explanation": ev.queryExplanation.length > 70 ? ev.queryExplanation.slice(0, 67) + "..." : ev.queryExplanation,
        "Summary": ev.summary.length > 60 ? ev.summary.slice(0, 57) + "..." : ev.summary,
    }));

    if (historyRows.length > 0) {
        console.table(historyRows);
    } else {
        console.table([{
            "Step": 1,
            "Tool / Source": state.executedTools.join(", ").toUpperCase() || "LLM ONLY",
            "Confidence": "85%",
            "Entities Found": state.entities.join(", ") || "(none)",
            "Query / Action Explanation": state.query,
            "Summary": "Retrieved evidence passed to answer node.",
        }]);
    }

    const performanceMetrics = [
        {
            "User Query": state.query.length > 45 ? state.query.slice(0, 42) + "..." : state.query,
            "Decomposed Subgoals": state.subgoals.length || state.executedTools.length,
            "Covered Goals": state.coveredGoals.length || state.executedTools.length,
            "Executed Tools": state.executedTools.join(", ") || "none",
            "Retrieval Passes": state.iterationCount,
            "Evidence Confidence": `${Math.round((state.evidenceConfidence || 0.85) * 100)}%`,
        }
    ];

    console.log("\n📈 RETRIEVAL PERFORMANCE METRICS:");
    console.table(performanceMetrics);
    console.log("================================================================================\n");
}

export async function answerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    const tStart = Date.now();
    const startIso = new Date().toISOString();
    console.log(`[Timing] [answerNode] Started at ${startIso} | Passes: ${state.iterationCount}`);

    try {
        const decomposedAsks = state.subgoals.map(g => g.description);
        const prompt = buildAnswerPrompt(state.query, state.evidence, decomposedAsks);

        const maxTokens = 4096;

        const response = await createGroqChatCompletion({
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_completion_tokens: maxTokens,
            model: ANSWER_MODEL,
        });

        const finishReason = response.choices[0]?.finish_reason;
        const rawContent = response.choices[0]?.message?.content ?? '';

        if (finishReason === 'length') {
            console.warn(`[Answer Node] WARNING: finish_reason=length — answer may be truncated (max_tokens=${maxTokens})`);
        }

        const answer = rawContent && rawContent.trim().length > 0
            ? stripThinkingTags(rawContent)
            : 'No answer generated.';

        console.log(`[Answer Node] finish_reason=${finishReason}, tokens_used=~${(rawContent.length / 4) | 0}`);
        console.log(`\nLast Answer:\n${answer}\n`);

        printExecutionHistoryTable(state);

        return { answer };
    }
    catch (error: any) {
        console.error(`Error While Generating Answer in AnswerNode: ${error?.message}`);
        return { answer: "Unable to generate answer due to an internal error." };
    } finally {
        const elapsed = Date.now() - tStart;
        console.log(`[Timing] [answerNode] Finished in ${elapsed}ms (ended at ${new Date().toISOString()})`);
    }
}
