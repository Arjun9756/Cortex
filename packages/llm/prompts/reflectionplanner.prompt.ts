// packages/llm/prompts/reflection.prompt.ts
export function buildReflectionPrompt(query: string, evidence: string, executedTools: string[]): string {
    return `
Question: "${query}"

Evidence collected so far:
${evidence}

Tools already used: ${executedTools.length ? executedTools.join(', ') : 'none'}

Decide whether the evidence is sufficient. Return ONLY one JSON object:
{"action":"answer","tools":[]}
{"action":"retrieve","tools":["vector_search"|"graph_search"|"sql_search"]}
{"action":"clarify","question":"one concise question for the user"}

Select another tool only if it can fill a concrete evidence gap. Never request a tool listed under "Tools already used", and choose clarify when the missing information must come from the user.
`.trim();
}
