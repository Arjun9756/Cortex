/**
 * Builds the streamlined planner prompt for the LangGraph planner node using native tool calling.
 * Injects LIVE graph schema constraints concisely to keep token overhead low and avoid rate limits.
 */
export function buildPlannerPrompt(query: string, labels: string[] = [], relations: string[] = []): string {
    const schemaInfo = (labels.length > 0 || relations.length > 0)
        ? `Schema Labels: [${labels.join(', ')}] | Relations: [${relations.join(', ')}]`
        : '';

    return `Analyze the user query and emit tool calls for EVERY distinct ask in the question.

User Query: "${query}"
${schemaInfo ? schemaInfo + '\n' : ''}
Rules:
1. Decompose multi-part questions into individual tool calls (no limit on count).
2. For person email, role, title, or graph relations -> graph_search.
3. For person departure risk -> knowledge_risk.
4. For repo risk, bus factor, or repo comparisons -> sql_search (queryType: "repo_risk").
5. For architectural explanations ("why", "reason", "replaced") -> vector_search.
6. For external web docs/libraries -> web_search.`.trim();
}
