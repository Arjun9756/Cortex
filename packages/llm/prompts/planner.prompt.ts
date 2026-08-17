/**
 * Builds the planner prompt for the LangGraph planner node using native tool calling.
 * Injects LIVE graph schema constraints and few-shot examples for diverse tool selection.
 * 
 * NO regex intent classification — the LLM reasons from the query text + live schema
 * to select the optimal tool(s) and parameters.
 */
export function buildPlannerPrompt(query: string, labels: string[] = [], relations: string[] = []): string {
    const schemaBlock = (labels.length > 0 || relations.length > 0)
        ? `\nLIVE GRAPH SCHEMA (ONLY use these labels and relations in graph tool calls):
  Node Labels: [${labels.join(', ')}]
  Relationship Types: [${relations.join(', ')}]\n`
        : '';

    return `Analyze the user query and emit the most appropriate tool call(s).

User Query: "${query}"
${schemaBlock}
TOOL SELECTION DISAMBIGUATION RULES:

1. COMPOUND ASKS: If the query asks for both structured metrics (e.g. Bus Factor, dependencies, departure risk) and contextual information (e.g. open issues, breaking changes, architectural rationale), EMIT BOTH TOOL CALLS in parallel. Do not pick only one.

2. DEPARTURE / SINGLE POINT OF FAILURE / LEAVING:
   - ANY question about an engineer leaving, resigning, departing, backup maintainers, or unowned architecture components MUST invoke:
     knowledge_risk(personName: "<engineer_name>") or knowledge_risk(personName: "ALL")
   - Do NOT use vector_search alone for departure risk.

3. BUS FACTOR / CODEBASE HEALTH / SPOF METRICS:
   - ANY question about Bus Factor, repository risk rankings, or contributor counts MUST invoke:
     sql_search(queryType: "repos_by_bus_factor", params: { threshold: 1 }) or sql_search(queryType: "repo_risk")

4. DEPENDENCIES / BLAST RADIUS / PATHS:
   - Upstream/downstream service dependencies → graph_dependency_analysis(entity: "...")
   - Blast radius / failure impact → graph_impact_analysis(entity: "...")
   - Connection between two services/people → graph_shortest_path(from: "...", to: "...")
   - Custom depth / multi-hop exploration → graph_traverse(startEntities: ["..."], relations: [...], depth: { min: 1, max: 4 })

5. SEMANTIC SEARCH (vector_search):
   - Use vector_search for architectural rationale ("why"), incident root causes, Slack discussions, PR descriptions, or searching for specific text/issues/breaking changes.
   - For compound queries with issues/breaking changes, combine with sql_search or graph tools.

6. SPECIALIZED GRAPH LOOKUPS:
   - "What is X's email/role?" → graph_describe_entity(entity: "X")
   - "How many repos/people/technologies exist?" → graph_count_by_label(label: "REPOSITORY" | "PERSON" | "TECHNOLOGY", searchTerm: "")
   - "What repos does X work on?" → graph_list_nodes(entity: "X", targetLabel: "REPOSITORY")
   - "What tech does X use?" → graph_list_nodes(entity: "X", relation: "USES", targetLabel: "TECHNOLOGY")
   - "Show repos with contributors" → graph_repository_summary(repositoryName: "ALL")
   - "Who knows about X / Who is the expert on X?" → graph_expertise_analysis(entity: "X")

FEW-SHOT EXAMPLES:

Query: "If Priya Sharma leaves tomorrow, which repositories have no backup maintainer, and what critical architecture components become unowned?"
→ knowledge_risk(personName: "Priya Sharma")

Query: "Which repositories with Bus Factor = 1 also have open high-priority issues or recent breaking changes?"
→ sql_search(queryType: "repos_by_bus_factor", params: { threshold: 1 })
→ vector_search(query: "high priority issues breaking changes")

Query: "Find the full dependency chain starting from checkout-service to all underlying databases and third-party services."
→ graph_dependency_analysis(entity: "checkout-service")

Query: "How are billing-service and notification-service connected through shared dependencies or common authors?"
→ graph_shortest_path(from: "billing-service", to: "notification-service")

Query: "If auth-gateway goes down or is rewritten, which downstream services, repositories, and upstream technologies are indirectly impacted?"
→ graph_impact_analysis(entity: "auth-gateway")

Query: "What happens if Vikram leaves?"
→ knowledge_risk(personName: "Vikram")

Query: "Which repos have bus factor 1?"
→ sql_search(queryType: "repos_by_bus_factor", params: { threshold: 1 })

Query: "Why was Redis replaced with Valkey?"
→ vector_search(query: "why Redis replaced with Valkey")

Query: "Trace all downstream effects from Priya's commits, going 5 levels deep"
→ graph_traverse(startEntities: ["Priya"], relations: ["AUTHORED", "DEPENDS_ON"], depth: { min: 1, max: 5 }, direction: "outgoing")

Query: "Compare checkout-service and auth-gateway in terms of repository risk score and active contributors"
→ sql_search(queryType: "repo_risk")
→ graph_repository_summary(repositoryName: "checkout-service")
→ graph_repository_summary(repositoryName: "auth-gateway")

Query: "Who knows the most about Kafka and what repos use it?"
→ graph_expertise_analysis(entity: "Kafka")
→ graph_list_nodes(entity: "Kafka", targetLabel: "REPOSITORY", relation: "USES")`.trim();
}
