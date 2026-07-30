/**
 * Builds the planner prompt for the LangGraph planner node.
 *
 * Injects the LIVE graph schema (entity labels + relationship types) so the
 * planner can only ever propose types that actually exist in the graph —
 * never hallucinated ones. This mirrors the pattern already used in
 * buildKnowledgeRiskPrompt (knowledgeRisk.prompt.ts).
 *
 * When schema arrays are empty (e.g. schema fetch failed), the constraint
 * sections are omitted and the planner falls back to its own reasoning.
 */
export function buildPlannerPrompt(query: string, labels: string[] = [], relations: string[] = []): string {
    const schemaSection = (labels.length > 0 || relations.length > 0)
        ? `
## AVAILABLE ENTITY LABELS IN THE GRAPH:
${labels.length > 0 ? labels.join(', ') : '(none yet — graph may be empty)'}

## AVAILABLE RELATIONSHIP TYPES IN THE GRAPH:
${relations.length > 0 ? relations.join(', ') : '(none yet — graph may be empty)'}

When choosing graphTarget, pick ONLY from the AVAILABLE ENTITY LABELS above (or null).
When choosing graphRelation, pick ONLY from the AVAILABLE RELATIONSHIP TYPES above (or null).
Do NOT invent label/relation names that are not listed.
`.trim()
        : ''

    return `
You plan retrieval for an engineering knowledge graph. User question: "${query}"
${schemaSection ? '\n' + schemaSection : ''}

Return ONLY one JSON object:
{"action":"retrieve","tools":["graph_search"|"vector_search"|"sql_search"],"entities":["exact names from question"],"graphAction":"describeEntity"|"countNodes"|"listNodes"|"shortestPath"|"dependencyAnalysis"|"impactAnalysis"|"expertiseAnalysis"|"repositorySummary","graphTarget":"<label from schema or null>","graphRelation":"<relation from schema or null>","vectorQuery":"focused semantic sub-question or null"}
{"action":"clarify","question":"one concise question"}

Rules:
- Named people, repositories, technologies, dependencies, ownership, expertise, counts, lists, and repository summaries are graph-first. Use graph_search directly and extract entity names. Never add vector_search just to discover an explicitly named entity.
- "Who is Arjun?" -> graph_search, entities ["Arjun"], graphAction "describeEntity".
- "How many commits did Arjun make?" -> graph_search, entities ["Arjun"], graphAction "countNodes", graphTarget "COMMIT".
- "Redis kis kisme use hua hai?" or "What uses Redis?" -> graph_search, entities ["Redis"], graphAction "listNodes", graphRelation "USES". Do NOT use dependencyAnalysis for a USES query.
- "Redis kis kisme use hua hai, count it, and why was Valkey used in place of Redis?" -> tools ["graph_search","vector_search"], entities ["Redis","Valkey"], graphAction "listNodes", graphRelation "USES", vectorQuery "Why was Valkey used in place of Redis?". Every part of a compound question must be covered.
- "What is Cortex?" -> graph_search, entities ["Cortex"], graphAction "repositorySummary" if it is a repository, otherwise "describeEntity".
- "How is A related to B?" -> graph_search, entities ["A","B"], graphAction "shortestPath".
- "What depends on X?" -> graph_search, entities ["X"], graphAction "dependencyAnalysis".
- "What breaks if X changes?" -> graph_search, entities ["X"], graphAction "impactAnalysis".
- "Who knows/worked on X?" -> graph_search, entities ["X"], graphAction "expertiseAnalysis".
- Use SQL for raw event IDs, dates, provider totals, or event-table filters.
- Use vector search for explanations/discussions: "why", "what was discussed", or semantic context. Combine with graph only when relationships add material value.
- If the entity name itself is missing, ask a clarification. Do not ask clarification for a name that can be resolved by graph search.
`.trim()
}
