import { Groq } from "groq-sdk/client.js";
import env from "../../../apps/api/config/env.js";

export const groq = new Groq({
    apiKey: env.GROQ_API_KEY,
    maxRetries: 3,
})

export const PRIMARY_MODEL = 'openai/gpt-oss-120b'
export const FALLBACK_MODELS = ['openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'groq/compound-mini']
export const SAFETY_MODEL = 'openai/gpt-oss-120b'
export const ANSWER_MODEL = 'openai/gpt-oss-120b'
export const DECOMPOSE_MODEL = 'openai/gpt-oss-120b'
export const PLANNER_MODEL = 'openai/gpt-oss-120b'
export const VERIFY_MODEL = 'openai/gpt-oss-120b'

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
 * Creates a chat completion with multi-model fallback cascade:
 * Primary (`openai/gpt-oss-120b`) -> Fallbacks (`openai/gpt-oss-20b`, `qwen/qwen3.6-27b`, `groq/compound-mini`).
 */
export async function createGroqChatCompletion(params: Record<string, any>, modelTo?: string) {
    const requestedModel = modelTo || params.model || PRIMARY_MODEL
    const modelsToTry = [requestedModel, ...FALLBACK_MODELS.filter(m => m !== requestedModel)]

    let lastError: any = null

    for (const modelToUse of modelsToTry) {
        const tStart = Date.now()
        const startIso = new Date().toISOString()
        console.log(`[Groq:Timing] Request to model (${modelToUse}) started at ${startIso}`)

        const requestPayload: Record<string, any> = {
            max_completion_tokens: params.max_completion_tokens || 2048,
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
            lastError = error

            if (error?.status === 400 && (error?.message?.includes('json_validate_failed') || error?.code === 'json_validate_failed') && params.response_format) {
                console.warn(`[Groq] JSON validation failed on ${modelToUse}. Retrying without strict json_object constraint...`);
                const retryPayload: Record<string, any> = { ...params, model: modelToUse };
                delete retryPayload.response_format;
                try {
                    const retryResponse = await groq.chat.completions.create(retryPayload as any);
                    if (retryResponse?.choices?.[0]?.message?.content) {
                        retryResponse.choices[0].message.content = stripThinkingTags(retryResponse.choices[0].message.content);
                    }
                    return retryResponse;
                } catch (rErr: any) {
                    console.error(`[Groq] Retry without json_format failed on ${modelToUse}: ${rErr?.message}`);
                }
            }

            const shouldFailover = error?.status === 429 ||
                error?.status === 413 ||
                error?.status === 404 ||
                error?.status === 500 ||
                error?.status === 503 ||
                error?.message?.includes('429') ||
                error?.message?.includes('413') ||
                error?.message?.includes('404') ||
                error?.message?.includes('rate_limit') ||
                error?.code === 'rate_limit_exceeded'

            if (shouldFailover) {
                console.warn(`[Groq] Model (${modelToUse}) rate limited/unavailable. Attempting next fallback model in cascade...`);
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

function parseJsonSafely(raw: string) {
    let text = raw.trim();
    if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
        text = text.substring(start, end + 1);
    }
    return JSON.parse(text);
}

export async function callLLMEntityExtract(prompt: string) {
    try {
        const response = await createGroqChatCompletion({
            messages: [
                { role: "system", content: "You are a strict JSON extraction engine. Always return valid JSON only, no markdown, no explanation." },
                { role: 'user', content: prompt }
            ],
            temperature: 0,
            max_completion_tokens: 4096,
            response_format: { type: "json_object" }
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            throw new Error("Empty response from LLM")
        }

        return parseJsonSafely(content)
    }
    catch (error: any) {
        console.error("LLM extraction failed:", {
            message: error?.message,
            status: error?.status,
        });

        throw new Error(`Entity extraction failed: ${error?.message ?? "unknown error"}`);
    }
}