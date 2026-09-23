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

export const SYSTEM_TOOL_MANDATE = `You are Cortex's engineering knowledge intelligence assistant.
CRITICAL MANDATE: For ANY question that could be answered from data (counts, ownership, successors, risk, history, people, technologies), you MUST call a tool. Never answer numeric or factual questions from your own knowledge or memory.
Always choose the most specific tool from the provided definitions:
- "get_commit_count": MANDATORY for ANY question asking about commit counts:
  * Specific repository commit counts ("how many commits in <repo>", "commits made on Cortex")
  * Specific engineer commit counts ("how many commits did <person> make", "how many commits done by Arjun today")
  * Organization-wide / all repository totals ("how many commits in all repo", "total commits across all repos")
  * Repository commit rankings ("which repo has highest commits", "repo with most commits")
  * Contributor commit rankings ("who has made the highest commits", "which person has made highest commit")
- "get_successor_recommendation": For who replaces an engineer or who is the best successor / backup owner for a repository.
- "get_bus_factor": For repository bus factors, SPOF status, and risk ranking.
- "get_ownership": For repository code ownership % breakdown.
- "get_repo_contributors": For listing contributors on a codebase.
- "get_person_activity": For recent commits, PRs, and actions by an engineer.
- "get_recent_changes": For changes in a repository over recent days.
- "get_person_identity": For resolving canonical names, emails, and aliases.
- "get_related_entities": For tech stack and dependency connections.
- "search_evidence": For Slack discussions, migration rationale ("why was X replaced"), or Jira tickets.`;

export function isDataQuestion(query: string): boolean {
    const q = query.toLowerCase().trim();

    const outOfScopePatterns = [
        /\bweather\b/i,
        /\bforecast\b/i,
        /\bjoke\b/i,
        /\bpoem\b/i,
        /\bfootball\b/i,
        /\bcricket\b/i,
        /\bmovie\b/i,
        /\bcapital of\b/i,
        /\bwho is the president\b/i,
        /\bwho won the\b/i,
    ];
    if (outOfScopePatterns.some(p => p.test(q)) && !/\b(repo|commit|code|cortex|engineer|bug|pr|jira|slack|successor|bus factor)\b/i.test(q)) {
        return false;
    }

    const dataIndicators = [
        'repo', 'repository', 'repositories', 'codebase', 'project',
        'commit', 'commits', 'pr', 'pull request', 'issue', 'ticket', 'jira',
        'contributor', 'contributors', 'maintainer', 'owner', 'primary owner',
        'engineer', 'developer', 'person', 'people', 'team', 'author', 'user',
        'successor', 'successors', 'replace', 'replacement', 'take over', 'backup', 'depart', 'resign', 'leave',
        'bus factor', 'spof', 'fragile', 'risk', 'score', 'health', 'metric', 'metrics',
        'technology', 'technologies', 'tech', 'stack', 'react', 'redis', 'valkey', 'kafka', 'python', 'go', 'node', 'postgres',
        'slack', 'incident', 'kms', 'rotation', 'change', 'changes', 'activity', 'recent',
        'how many', 'who', 'which', 'what', 'list', 'show', 'compare', 'find', 'count',
        'kitne', 'kaun', 'kisko', 'kisne', 'kya', 'kiska', 'batao', 'dikhao'
    ];

    return dataIndicators.some(kw => q.includes(kw));
}

export interface AgentTurnTelemetry {
    question: string;
    modelUsed: string;
    toolsCalled: Array<{ name: string; args: any }>;
    rawResponse: string;
    latencyMs: number;
    tokensUsed: number;
    retries: number;
}

/**
 * Executes a tool-calling planning turn with Groq.
 * Features:
 * 1. Strict tool calling mandate for data questions.
 * 2. Plain-text retry: if the model returns plain text for a data question, retries with an explicit nudge.
 * 3. Fallback cascade: if primary model (gpt-oss-120b) fails twice to call tools, falls back to qwen3.6-27b.
 * 4. Logs turn telemetry (question, model, tools, latency, cost).
 */
export async function executeAgentTurnWithToolCalling(
    query: string,
    tools: any[],
    contextMessages: Array<{ role: string; content: string }> = []
): Promise<{
    toolCalls: Array<{ id: string; name: string; args: any }>;
    content: string;
    modelUsed: string;
    telemetry: AgentTurnTelemetry;
}> {
    const tStart = Date.now();
    const needsData = isDataQuestion(query);

    const messages: any[] = [
        { role: 'system', content: SYSTEM_TOOL_MANDATE },
        ...contextMessages,
        { role: 'user', content: query }
    ];

    let currentModel = PRIMARY_MODEL;
    let retries = 0;
    let chosenToolCalls: Array<{ id: string; name: string; args: any }> = [];
    let chosenContent = '';

    const modelsToTry = [PRIMARY_MODEL, 'qwen/qwen3.6-27b'];

    for (const modelCandidate of modelsToTry) {
        currentModel = modelCandidate;

        for (let attempt = 0; attempt < 2; attempt++) {
            const payload: Record<string, any> = {
                model: currentModel,
                temperature: 0,
                max_completion_tokens: 2048,
                messages,
                tools,
                tool_choice: needsData ? 'auto' : 'auto',
            };

            try {
                const response = await createGroqChatCompletion(payload, currentModel);
                const msg = response.choices[0]?.message;
                const rawContent = msg?.content || '';
                const rawTools = msg?.tool_calls || [];

                if (rawTools && rawTools.length > 0) {
                    chosenToolCalls = rawTools.map((tc: any, idx: number) => {
                        let parsedArgs = {};
                        try {
                            parsedArgs = typeof tc.function?.arguments === 'string'
                                ? JSON.parse(tc.function.arguments)
                                : (tc.function?.arguments || {});
                        } catch (e: any) {
                            console.warn(`[GroqAgent] Failed to parse tool arguments for ${tc.function?.name}: ${e?.message}`);
                        }
                        return {
                            id: tc.id || `call_${idx + 1}`,
                            name: tc.function?.name,
                            args: parsedArgs,
                        };
                    });
                    chosenContent = rawContent;
                    break;
                }

                // If query requires data and model returned plain text with no tool call
                if (needsData) {
                    console.warn(`[GroqAgent] Model ${currentModel} returned plain text without calling tools for data query "${query}" (attempt ${attempt + 1}). Retrying with explicit nudge...`);
                    retries++;
                    messages.push({ role: 'assistant', content: rawContent });
                    messages.push({
                        role: 'user',
                        content: `CRITICAL MANDATE: Your previous response contained no tool calls. This is a factual engineering data question. You MUST call one or more tools (such as get_commit_count, get_successor_recommendation, get_bus_factor, etc.) to fetch verified data before answering.`
                    });
                    continue;
                } else {
                    // Non-data question (e.g. conversational/out-of-scope)
                    chosenContent = rawContent;
                    break;
                }
            } catch (err: any) {
                console.warn(`[GroqAgent] Execution attempt failed on ${currentModel}: ${err?.message}`);
                retries++;
            }
        }

        if (chosenToolCalls.length > 0 || !needsData) {
            break;
        }

        console.warn(`[GroqAgent] Primary model ${currentModel} failed to invoke tools. Cascading to fallback model...`);
    }

    const latencyMs = Date.now() - tStart;
    const tokensUsed = Math.round((query.length + chosenContent.length) / 4) + (chosenToolCalls.length * 50);

    const telemetry: AgentTurnTelemetry = {
        question: query,
        modelUsed: currentModel,
        toolsCalled: chosenToolCalls.map(t => ({ name: t.name, args: t.args })),
        rawResponse: chosenContent,
        latencyMs,
        tokensUsed,
        retries,
    };

    console.log(`[GroqAgent:Telemetry] Turn completed in ${latencyMs}ms using ${currentModel}. Tools called: ${chosenToolCalls.length}. Retries: ${retries}.`);

    return {
        toolCalls: chosenToolCalls,
        content: chosenContent,
        modelUsed: currentModel,
        telemetry,
    };
}