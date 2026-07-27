import { AgentStateType } from "../state.js";
import { groq } from "../../../llm/providers/groq.js";
import { buildAnswerPrompt } from "../../../llm/prompts/answer.prompt.js";

export async function answerNode(state: AgentStateType): Promise<Partial<AgentStateType>> {
    try {
        const prompt = buildAnswerPrompt(state.query , state.evidence)
        const response = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_completion_tokens:1024
        });

        const answer = response.choices[0]?.message?.content ?? "No answer generated.";
        console.log(`Last Answer ${answer}`)
        return { answer };
    }
    catch (error: any) {
        console.log(`Error While Generating Answer in AnswerNode ${error?.message}`)
        return {answer:"No answer generated"}
    }
}