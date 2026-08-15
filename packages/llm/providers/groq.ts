import { Groq } from "groq-sdk/client.js";
import env from "../../../apps/api/config/env.js";

export const groq = new Groq({
    apiKey: env.GROQ_API_KEY,
    maxRetries: 3,
})

export const PRIMARY_MODEL = 'openai/gpt-oss-120b'
export const FALLBACK_MODEL = 'qwen/qwen3.6-27b'
export const SAFETY_MODEL = 'llama-3.3-70b-versatile'

/**
 * Strips internal chain-of-thought `<think>...</think>` tags (both closed and unclosed)
 * from reasoning models.
 */
export function stripThinkingTags(text: string): string {
    if (!text) return text
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    if (cleaned.toLowerCase().includes('<think>')) {
        const closeIdx = cleaned.toLowerCase().indexOf('</think>')
        if (closeIdx !== -1) {
            const thinkIdx = cleaned.toLowerCase().indexOf('<think>')
            cleaned = (cleaned.slice(0, thinkIdx) + cleaned.slice(closeIdx + 8)).trim()
        } else {
            cleaned = cleaned.replace(/<think>[\s\S]*/gi, '').trim()
        }
    }
    if (!cleaned && text.toLowerCase().includes('<think>')) {
        const inner = text.replace(/<\/?think>/gi, '').trim()
        return inner
    }
    return cleaned
}

/**
 * Creates a chat completion with model fallback cascade:
 * GPT (`openai/gpt-oss-120b`) -> Qwen (`qwen/qwen3.6-27b`) -> Llama (`llama-3.3-70b-versatile`).
 */
export async function createGroqChatCompletion(params: Record<string, any>, modelTo?: string) {
    const modelToUse = modelTo || params.model || PRIMARY_MODEL
    const tStart = Date.now()
    const startIso = new Date().toISOString()
    console.log(`[Groq:Timing] Request to model (${modelToUse}) started at ${startIso}`)

    const requestPayload: Record<string, any> = {
        ...params,
        model: modelToUse,
    };
    if (params.tools) {
        requestPayload.tools = params.tools;
    }
    if (params.reasoning_effort) {
        requestPayload.reasoning_effort = params.reasoning_effort;
    }
    if (modelToUse.toLowerCase().includes('qwen') || modelToUse.toLowerCase().includes('deepseek')) {
        requestPayload.reasoning_format = "parsed";
    }

    try {
        const response = await groq.chat.completions.create(requestPayload as any)

        const elapsed = Date.now() - tStart
        console.log(`[Groq:Timing] Request to model (${modelToUse}) completed in ${elapsed}ms (ended at ${new Date().toISOString()})`)

        if (response?.choices?.[0]?.message?.content) {
            response.choices[0].message.content = stripThinkingTags(response.choices[0].message.content)
        }
        return response
    } catch (error: any) {
        const elapsed = Date.now() - tStart
        console.log(`[Groq:Timing] Request to model (${modelToUse}) failed after ${elapsed}ms: ${error?.message}`)

        const isRateLimit = error?.status === 429 ||
            error?.status === 413 ||
            error?.message?.includes('429') ||
            error?.message?.includes('413') ||
            error?.message?.includes('rate_limit') ||
            error?.code === 'rate_limit_exceeded'

        if (isRateLimit && modelToUse !== FALLBACK_MODEL) {
            console.warn(`[Groq] Model (${modelToUse}) rate limited/failed. Failing over to Qwen fallback model (${FALLBACK_MODEL})...`)
            const fbStart = Date.now()
            try {
                const fbPayload: Record<string, any> = {
                    ...params,
                    model: FALLBACK_MODEL,
                };
                if (FALLBACK_MODEL.toLowerCase().includes('qwen') || FALLBACK_MODEL.toLowerCase().includes('deepseek')) {
                    fbPayload.reasoning_format = "parsed";
                }
                const fallbackResponse = await groq.chat.completions.create(fbPayload as any)
                const fbElapsed = Date.now() - fbStart
                console.log(`[Groq:Timing] Fallback request (${FALLBACK_MODEL}) completed in ${fbElapsed}ms (ended at ${new Date().toISOString()})`)

                if (fallbackResponse?.choices?.[0]?.message?.content) {
                    fallbackResponse.choices[0].message.content = stripThinkingTags(fallbackResponse.choices[0].message.content)
                }
                return fallbackResponse
            } catch (fallbackError: any) {
                console.warn(`[Groq] Fallback Qwen model (${FALLBACK_MODEL}) failed. Failing over to safety model (${SAFETY_MODEL})...`)
                try {
                    const safetyPayload: Record<string, any> = { ...params, model: SAFETY_MODEL };
                    const safetyResponse = await groq.chat.completions.create(safetyPayload as any);
                    if (safetyResponse?.choices?.[0]?.message?.content) {
                        safetyResponse.choices[0].message.content = stripThinkingTags(safetyResponse.choices[0].message.content);
                    }
                    return safetyResponse;
                } catch (safetyErr: any) {
                    console.error(`[Groq] Safety model (${SAFETY_MODEL}) also failed:`, safetyErr.message);
                    throw fallbackError;
                }
            }
        }
        throw error
    }
}

export async function callLLMEntityExtract(prompt: string) {
    try {
        const response = await createGroqChatCompletion({
            messages: [
                { role: "system", content: "You are a strict JSON extraction engine. Always return valid JSON only, no markdown, no explanation." },
                { role: 'user', content: prompt }
            ],
            temperature: 0,
            max_completion_tokens: 2000,
            response_format: { type: "json_object" }
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            throw new Error("Empty response from LLM")
        }

        return JSON.parse(content)
    }
    catch (error: any) {
        console.error("LLM extraction failed:", {
            message: error?.message,
            status: error?.status,
        });

        throw new Error(`Entity extraction failed: ${error?.message ?? "unknown error"}`);
    }
}