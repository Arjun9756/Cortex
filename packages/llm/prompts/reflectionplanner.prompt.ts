// packages/llm/prompts/reflection.prompt.ts
export function buildReflectionPrompt(query: string, evidence: string): string {
    return `
Question: "${query}"

Evidence collected so far:
${evidence}

Is this evidence sufficient to answer the question? Reply with ONLY "yes" or "no".
`.trim();
}