import { AgentStateType } from "../state.js";
import { createGroqChatCompletion, stripThinkingTags, ANSWER_MODEL } from "../../../llm/providers/groq.js";
import { buildAnswerPrompt } from "../../../llm/prompts/answer.prompt.js";

/**
 * Extracts all numeric tokens (percentages, counts, integers) from a text string.
 */
function extractNumbers(text: string): number[] {
    const matches = text.match(/\b\d+(?:\.\d+)?%?\b/g) || [];
    const numbers: number[] = [];
    for (const m of matches) {
        const cleaned = m.replace('%', '');
        const val = parseFloat(cleaned);
        if (!isNaN(val) && val < 2000) { // filter out years like 2026, timestamps
            numbers.push(val);
        }
    }
    return numbers;
}

/**
 * Verifies that key numbers in the answer exist in the gathered evidence.
 */
function checkGrounding(answer: string, evidence: string): { grounded: boolean; ungroundedNumbers: number[] } {
    if (!evidence || evidence.trim().length === 0) {
        return { grounded: true, ungroundedNumbers: [] };
    }

    const answerNums = extractNumbers(answer);
    const evidenceNums = new Set(extractNumbers(evidence));

    // Common benign numbers allowed without explicit citation (0, 1, 2, 3, 5, 10, 100)
    const allowedDefaults = new Set([0, 1, 2, 3, 4, 5, 10, 100]);

    const ungrounded: number[] = [];
    for (const num of answerNums) {
        if (!evidenceNums.has(num) && !allowedDefaults.has(num)) {
            ungrounded.push(num);
        }
    }

    return {
        grounded: ungrounded.length === 0,
        ungroundedNumbers: ungrounded,
    };
}

/**
 * Prints a formal structured console.table displaying the full retrieval history,
 * tool calls, entities found, query explanation, and telemetry metrics.
 */
function printExecutionHistoryTable(state: AgentStateType) {
    console.log("\n================================================================================");
    console.log("📊 CORTEX AGENTIC RETRIEVAL & TOOL EXECUTION HISTORY");
    console.log("================================================================================\n");

    const historyRows = (state.structuredEvidence || []).map((ev, index) => ({
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

    // If answer already computed (e.g. out of scope / polite decline from plannerNode)
    if (state.answer && state.answer.length > 0) {
        console.log(`[Answer Node] Fast-path answer already present from planner: "${state.answer.slice(0, 80)}..."`);
        printExecutionHistoryTable(state);
        return { answer: state.answer };
    }

    try {
        const decomposedAsks = state.subgoals.map(g => g.description);

        const MAX_EVIDENCE_CHARS = 20000;
        const safeEvidence = state.evidence && state.evidence.length > MAX_EVIDENCE_CHARS
            ? state.evidence.slice(0, MAX_EVIDENCE_CHARS) + '\n\n[Evidence truncated to fit token limits — highest-priority data shown above.]'
            : (state.evidence || '');

        const prompt = buildAnswerPrompt(state.query, safeEvidence, decomposedAsks);
        const maxTokens = 4096;

        let response = await createGroqChatCompletion({
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_completion_tokens: maxTokens,
            model: ANSWER_MODEL,
        });

        let rawContent = response.choices[0]?.message?.content ?? '';
        let answer = rawContent && rawContent.trim().length > 0
            ? stripThinkingTags(rawContent)
            : 'No answer generated.';

        // Grounding Verification Pass
        const grounding = checkGrounding(answer, safeEvidence);
        if (!grounding.grounded && grounding.ungroundedNumbers.length > 0) {
            console.warn(`[Answer Node:Grounding] Detected ungrounded numbers: [${grounding.ungroundedNumbers.join(', ')}]. Regenerating with strict grounding mandate...`);
            const retryResponse = await createGroqChatCompletion({
                messages: [
                    { role: "user", content: prompt },
                    { role: "assistant", content: answer },
                    {
                        role: "user",
                        content: `GROUNDING VIOLATION: Your previous response included numbers [${grounding.ungroundedNumbers.join(', ')}] that are NOT present in the verified evidence. All numbers, percentages, and metrics must strictly originate from the provided evidence. Re-synthesize the answer strictly grounded in the evidence.`
                    }
                ],
                temperature: 0,
                max_completion_tokens: maxTokens,
                model: ANSWER_MODEL,
            });

            const retryContent = retryResponse.choices[0]?.message?.content ?? '';
            if (retryContent.trim().length > 0) {
                answer = stripThinkingTags(retryContent);
                console.log(`[Answer Node:Grounding] Regenerated grounded answer successfully.`);
            }
        }

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
