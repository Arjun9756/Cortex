export function buildPlannerPrompt(query: string): string {
    return `
            Given this user question about an engineering knowledge graph: "${query}"

            Decide what retrieval steps are needed. Respond with a JSON array containing one or more of: "vector_search", "graph_search", "sql_search".

            - Use "vector_search" to find relevant past events/discussions by meaning (e.g. "why did we migrate X", "what was discussed about Y").
            - Use "graph_search" to find structural relationships between known entities (e.g. "who works on X", "what depends on Y").
            - Use "sql_search" for structured/aggregate/factual queries — counts, recent activity, time-based filtering, or events by a specific person (e.g. "how many commits this week", "who was most active last month", "list recent PRs", "what did Arjun do yesterday").

            Most conceptual/explanatory ("why", "how") questions need "vector_search" and "graph_search". Counting/listing/aggregate/person-activity questions need "sql_search". Some questions may need all three.

            Return ONLY the JSON array, e.g. ["vector_search", "graph_search" , 'sql-search']
        `.trim();
}