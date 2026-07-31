import { AgentStateType } from "../state.js";
import { createGroqChatCompletion, stripThinkingTags } from "../../../llm/providers/groq.js";
import { buildAnswerPrompt } from "../../../llm/prompts/answer.prompt.js";

export async function answerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
        const prompt = buildAnswerPrompt(state.query, state.evidence);

        // Use a larger token budget when evidence is dense (knowledge risk + evidence arrays)
        // max_completion_tokens does NOT cost more unless tokens are actually used.
        const hasLargeEvidence = Boolean(state.knowledgeRiskResult) ||
            state.vectorResult.length > 3 ||
            state.graphResult.length > 3;
        const maxTokens = hasLargeEvidence ? 3072 : 2048;

        const response = await createGroqChatCompletion({
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_completion_tokens: maxTokens,
            reasoning_format:'parsed'
        }, 'qwen/qwen3.6-27b');

        const finishReason = response.choices[0]?.finish_reason;
        const rawContent = response.choices[0]?.message?.content ?? '';

        if (finishReason === 'length') {
            console.warn(`[Answer Node] WARNING: finish_reason=length — answer may be truncated (max_tokens=${maxTokens})`);
        }

        const answer = rawContent && rawContent.trim().length > 0
            ? stripThinkingTags(rawContent)
            : 'No answer generated.';

        console.log(`[Answer Node] finish_reason=${finishReason}, tokens_used=~${rawContent.length / 4 | 0}`);
        console.log(`Last Answer: ${answer}`);
        return { answer };
    }
    catch (error: any) {
        console.log(`Error While Generating Answer in AnswerNode: ${error?.message}`);
        return { answer: "No answer generated." };
    }
}