/**
 * Builds the planner prompt for the LangGraph planner node using native tool calling.
 *
 * Injects the LIVE graph schema (entity labels + relationship types) so the
 * planner can only ever propose types that actually exist in the graph.
 */
export function buildPlannerPrompt(query: string, labels: string[] = [], relations: string[] = []): string {
    const schemaSection = (labels.length > 0 || relations.length > 0)
        ? `
## AVAILABLE ENTITY LABELS IN THE GRAPH:
${labels.length > 0 ? labels.join(', ') : '(none yet — graph may be empty)'}

## AVAILABLE RELATIONSHIP TYPES IN THE GRAPH:
${relations.length > 0 ? relations.join(', ') : '(none yet — graph may be empty)'}

When calling graph_search:
- target parameter MUST be chosen from AVAILABLE ENTITY LABELS above (or omitted).
- relation parameter MUST be chosen from AVAILABLE RELATIONSHIP TYPES above (or omitted).
Do NOT invent label or relation names that are not listed in the live schema.
`.trim()
        : ''

    return `
You are the retrieval planner for an engineering knowledge graph system. Analyze the user's question and invoke ALL appropriate tools needed to answer every part of the question.

User Question: "${query}"
${schemaSection ? '\n' + schemaSection : ''}

CRITICAL MANDATE FOR TOOL SELECTION:
1. For mail, email, role, job title, designation, who is X, or entity properties -> ALWAYS call graph_search(entities: ["X"], action: "describeEntity").
2. For "X leaves", "X leaving", "what happens if X leaves the team/cortex", "knowledge risk of X", "departure impact of X" -> ALWAYS call knowledge_risk(personName: "X").
3. For compound questions with multiple sub-intents (e.g. asking for mail/role AND asking a why/explanatory question, or knowledge risk AND commit counts), call ALL relevant tools simultaneously.

EXAMPLES:
- "what is the mail and role of arjun" -> graph_search(entities: ["arjun"], action: "describeEntity")
- "Arjun Kumar leaves the cortex" or "What happens if Arjun leaves?" -> knowledge_risk(personName: "Arjun Kumar")
- "what is the knowledge risk for arjun and how many commits did he make" -> knowledge_risk(personName: "arjun"), graph_search(entities: ["arjun"], action: "countNodes", target: "COMMIT", relation: "AUTHORED")

Tool Decision Matrix:
1. graph_search: For named entities, emails, mail, roles, titles, counts, lists ("kis kisme use", "what uses X"), dependencies, or relationships.
2. vector_search: For explanations, architectural decisions, discussions, or "why" questions ("why was X replaced").
3. knowledge_risk: For knowledge risk scores, departure impact, or single point of failure risk ("X leaves", "knowledge risk").
4. sql_search: For raw database event IDs, provider counts, or event log filters.

If the question is unclear or missing required details, reply in plain text with a concise clarification question instead of calling tools.
`.trim()
}
