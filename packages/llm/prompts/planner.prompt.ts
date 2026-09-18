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

2. PRIMARY OWNER / SINGLE REPOSITORY METRICS:
   - ANY question asking "Who is the primary owner of <repo>?", "What is the bus factor of <repo>?", "Risk score of <repo>":
     MUST invoke: sql_search(queryType: "repo_details", params: { repo: "<repo_name>" })
     NEVER rely on graph alone for primary owner or bus factor — Postgres repo_metrics is the single source of truth.

3. REPOSITORY RISK / SPOF / BUS FACTOR LISTS:
   - "Which repositories are SPOF / at risk?", "bus factor 1 repos":
     MUST invoke: sql_search(queryType: "repos_by_bus_factor", params: { threshold: 1 })
   - "Show healthy vs fragile repositories", "compare healthy and fragile":
     MUST invoke: sql_search(queryType: "healthy_vs_fragile")
   - Full repo risk ranking: sql_search(queryType: "repo_risk")

4. DEPARTURE / SUCCESSORS / TAKEOVER / RESIGNATION:
   - "What happens if X leaves?", "Who can take over X's repositories if he resigns?", "Successors for X", "Who will replace X":
     BOTH departure impact and takeover questions MUST invoke:
     knowledge_risk(personName: "<engineer_name>")
     This ensures identical, verified successor recommendations and affected repos from the unified engine.

5. WHO WORKS ON REPOSITORIES (PERSON REPOS):
   - "Which repos does X work in?", "What repositories does X contribute to?":
     MUST invoke BOTH:
     sql_search(queryType: "person_repos", params: { person: "<name>" })
     graph_list_nodes(entity: "<name>", targetLabel: "REPOSITORY")

6. JIRA HIGH-PRIORITY TICKETS & ASSIGNEES:
   - "Show all high priority Jira tickets and who is working on them", "urgent issues":
     MUST invoke BOTH:
     sql_search(queryType: "jira_tickets", params: { priority: "high" })
     vector_search(query: "high priority Jira issues tickets assignees")

7. SLACK INCIDENT DISCUSSIONS & THREADS:
   - "Which Slack discussions are related to <topic / incident e.g. AWS KMS key rotation>?":
     MUST invoke BOTH:
     sql_search(queryType: "slack_search", params: { searchTerm: "<keywords>" })
     vector_search(query: "<incident topic>")

8. PERSON PROFILE & TECHNOLOGIES:
   - "Who is X and what technologies does he use?":
     MUST invoke:
     sql_search(queryType: "person_profile", params: { person: "<name>" })
     graph_describe_entity(entity: "<name>")
     graph_list_nodes(entity: "<name>", relation: "USES", targetLabel: "TECHNOLOGY")

9. DEPENDENCIES / BLAST RADIUS / PATHS:
   - Upstream/downstream service dependencies → graph_dependency_analysis(entity: "...")
   - Blast radius / failure impact → graph_impact_analysis(entity: "...")
   - Connection between two services/people → graph_shortest_path(from: "...", to: "...")
   - Custom depth / multi-hop exploration → graph_traverse(startEntities: ["..."], relations: [...], depth: { min: 1, max: 4 })

10. SEMANTIC SEARCH (vector_search):
   - Use vector_search for architectural rationale ("why"), incident root causes, PR descriptions, or architectural decisions.

FEW-SHOT EXAMPLES:

Query: "Who is the primary owner of payment-gateway-v2?"
→ sql_search(queryType: "repo_details", params: { repo: "payment-gateway-v2" })

Query: "What is the bus factor of auth-token-vault?"
→ sql_search(queryType: "repo_details", params: { repo: "auth-token-vault" })

Query: "Which repositories are SPOF / at risk?"
→ sql_search(queryType: "repos_by_bus_factor", params: { threshold: 1 })

Query: "Show healthy vs fragile repositories"
→ sql_search(queryType: "healthy_vs_fragile")

Query: "What happens if Vikram Patel leaves?"
→ knowledge_risk(personName: "Vikram Patel")

Query: "Who can take over Vikram Patel's repositories if he resigns?"
→ knowledge_risk(personName: "Vikram Patel")

Query: "Which repos does Vikram Patel work in?"
→ sql_search(queryType: "person_repos", params: { person: "Vikram Patel" })
→ graph_list_nodes(entity: "Vikram Patel", targetLabel: "REPOSITORY")

Query: "Who is Vikram Patel and what technologies does he use?"
→ sql_search(queryType: "person_profile", params: { person: "Vikram Patel" })
→ graph_describe_entity(entity: "Vikram Patel")
→ graph_list_nodes(entity: "Vikram Patel", relation: "USES", targetLabel: "TECHNOLOGY")

Query: "Show all high priority Jira tickets and who is working on them"
→ sql_search(queryType: "jira_tickets", params: { priority: "high" })
→ vector_search(query: "high priority Jira issues and assignees")

Query: "Which Slack discussions are related to the AWS KMS key rotation incident?"
→ sql_search(queryType: "slack_search", params: { searchTerm: "KMS" })
→ vector_search(query: "AWS KMS key rotation incident Slack discussion")

Query: "Why was Redis replaced with Valkey?"
→ vector_search(query: "why Redis replaced with Valkey")`.trim();
}
