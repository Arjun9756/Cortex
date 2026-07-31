export function buildReflectionPrompt(query: string, evidence: string, executedTools: string[]): string {
    return `
Question: "${query}"

Evidence collected so far:
${evidence}

Tools already used: ${executedTools.length ? executedTools.join(', ') : 'none'}

Decide whether the evidence is sufficient to answer the user's question. Return ONLY one JSON object:
{"action":"answer","tools":[]}
{"action":"retrieve","tools":["vector_search"|"graph_search"|"sql_search"|"knowledge_risk"]}
{"action":"clarify","question":"one concise question for the user"}

Rules:
- If evidence contains #KNOWLEDGE RISK DATA or #RELEVANT RELATION with entity properties, the evidence IS SUFFICIENT to answer. Always select {"action":"answer","tools":[]}.
- NEVER select "clarify" if evidence has already been retrieved from executed tools. Clarification is ONLY for when the user prompt itself is ambiguous and lacks an entity name.
- Select another tool only if it can fill a concrete missing gap. Never request a tool listed under "Tools already used".
`.trim();
}
