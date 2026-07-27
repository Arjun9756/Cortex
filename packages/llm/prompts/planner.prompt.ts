export function buildPlannerPrompt(query: string): string {
    return `
Given this user question about an engineering knowledge graph: "${query}"

Decide the next action. Return ONLY a JSON object in exactly one of these forms:
{"action":"retrieve","tools":["vector_search","graph_search","sql_search"]}
{"action":"clarify","question":"a concise question for the user"}
{"action":"answer","tools":[]}

- Use "vector_search" to find relevant past events/discussions by MEANING (e.g. "why did we migrate X", "what was discussed about Y").
- Use "graph_search" to find structural relationships between known entities (e.g. "who works on X", "what depends on Y"). Graph search needs an entity, so include "vector_search" too when graph search is selected.
- Use "sql_search" for structured/factual lookups — counts, recent activity, or looking up a SPECIFIC identifier/ID mentioned in the question.

IMPORTANT: A question can have MULTIPLE parts that need DIFFERENT search types. Read the ENTIRE question carefully and identify every distinct thing being asked, not just the first part. For example, a question asking about a specific event AND asking "why" something happened needs BOTH "sql_search" (for the specific lookup) AND "vector_search"/"graph_search" (for the explanatory part).

Choose "clarify" only if a required entity, time range, metric, or identifier is genuinely ambiguous and no useful answer can be retrieved without it. Ask one direct question. Do not clarify merely because retrieval could be broad.

Never select a database just because it exists. Select only tools that can materially help answer the question.
`.trim();
}
