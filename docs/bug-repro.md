# Bug Reproduction & Root Cause Analysis

Date: 2026-09-23  
Environment: Groq API (`openai/gpt-oss-120b`, `qwen/qwen3.6-27b`), PostgreSQL, Neo4j, LangGraph Chat Agent  

---

## 1. Executive Summary

Before implementing the new generalized tool-calling architecture, we reproduced and diagnosed the two primary failures outlined in Part 0:
1. **Commit Count Inquiries:** Queries such as `"how many commits in this repo"` or `"how many commits in billing-engine"` return `"No matching commit count found"` / no answer.
2. **Successor Inquiries for Repositories:** Queries such as `"who is the best successor for this repo"` or `"who is the best successor for <repo>"` fail or execute an expensive 20-second team-wide fallback (`personName: "ALL"`) because `knowledge_risk` only accepts `personName`, and chat lacks a dedicated `get_successor_recommendation(repo)` tool matching the dashboard's SPOF section.

---

## 2. Failure 1: "How many commits in this repo" / "How many commits in billing-engine"

### A. Repro Execution & Raw Traces

#### Query: `"how many commits in this repo"`
- **Exact Prompt to Planner:**
  ```
  You are the Cortex Retrieval Planner.
  Your job is to plan the exact retrieval tool calls needed to gather verified evidence for EVERY decomposed ask.
  ...
  AVAILABLE TOOLS & RULES:
  1. "graph_count_by_label": {"label": "REPOSITORY"|"TECHNOLOGY"|"PERSON"|"COMMIT"}
  2. "sql_search": ...
  ...
  DECOMPOSED ASKS:
  subgoal_1: "How many commits are there in this repository?"
  ```
- **Raw LLM Planner Output:**
  ```json
  {
    "calls": [
      {
        "subgoalId": "subgoal_1",
        "name": "graph_count_by_label",
        "args": { "label": "COMMIT" }
      }
    ]
  }
  ```
- **Tool Invocation:** `graph_count_by_label` was invoked with `{"label": "COMMIT"}`.
- **Raw Tool Output:**
  ```json
  { "searchTerm": "*", "label": "COMMIT", "total": 0, "names": [] }
  ```
- **Raw Answer Synthesizer Response:**
  ```markdown
  ### 📊 Commit Count Inquiry

  > **Checked:** repo_metrics (PostgreSQL), Neo4j knowledge graph, events database, and vector index (Qdrant). **No matching repository** found.  

  *The request did not specify a repository name, and no commit data is available in the indexed sources.*
  ```

#### Query: `"how many commits in billing-engine"`
- **Raw LLM Planner Output:**
  ```json
  {
    "calls": [
      {
        "subgoalId": "subgoal_1",
        "name": "sql_search",
        "args": {
          "queryType": "repo_details",
          "params": { "repo": "billing-engine" }
        }
      }
    ]
  }
  ```
- **Tool Invocation:** `sql_search` invoked `repo_details`.
- **Raw Tool Output:**
  ```json
  [
    {
      "repo_name": "billing-engine",
      "bus_factor": 1,
      "risk_score": 80,
      "contributor_count": 1,
      "primary_owner": "priyasharma",
      "status": "fragile",
      "isSPOF": true
    }
  ]
  ```
- **Raw Answer Synthesizer Response:**
  ```markdown
  ### 📊 Commit Count for `billing-engine`

  > **Checked:** repo_metrics (PostgreSQL), Neo4j knowledge graph, events database, and vector index (Qdrant). **No matching commit count found** for the repository `billing-engine`.
  ```

### B. Root Cause
1. **Missing Tool:** There was NO `get_commit_count(repo?, person?, date_range?)` tool in the agent.
2. **Graph Model Drift:** Commits in Neo4j are compacted into `CONTRIBUTED_TO` edges with `commitCount` properties (`rel.commitCount`) or stored in the PostgreSQL `events` table (`provider='github'`, `event_type='push'`). However, the planner's only commit-related tool was `graph_count_by_label("COMMIT")`, which searches for uncompacted `(:COMMIT)` nodes, returning `0`.
3. **Incomplete SQL DTO:** `sql_search(queryType: "repo_details")` only selects `bus_factor, risk_score, contributor_count, primary_owner, status` from PostgreSQL `repo_metrics`. It contains no commit count calculation.
4. **Answer Grounding Failure:** Because zero commit count evidence is retrieved, the Answer Node correctly refuses to hallucinate numbers and falls through to the "no matching commit data found" template.

---

## 3. Failure 2: "Who is the best successor for this repo" / "Who is the best successor for billing-engine"

### A. Repro Execution & Raw Traces

#### Query: `"who is the best successor for this repo"`
- **Exact Prompt to Planner:**
  ```
  DECOMPOSED ASKS:
  subgoal_1: "Who is the best successor for this repo?"
  ```
- **Raw LLM Planner Output:**
  ```json
  {
    "calls": [
      {
        "subgoalId": "subgoal_1",
        "name": "graph_repository_summary",
        "args": { "repositoryName": "<repo>" }
      },
      {
        "subgoalId": "subgoal_1",
        "name": "knowledge_risk",
        "args": { "personName": "ALL" }
      }
    ]
  }
  ```
- **Tool Invocations:**
  - `graph_repository_summary` with hallucinated placeholder argument `<repo>`
  - `knowledge_risk` with `personName: "ALL"` (triggering expensive calculation for all 20 persons)
- **Raw Answer Synthesizer Response:**
  Dumped a 9-row table of all fragile repositories across the organization rather than resolving a specific repository.
- **Latency:** ~21,000ms.

#### Query: `"who is the best successor for billing-engine"`
- **Underlying Failure Mode:**
  - `knowledge_risk` only has the schema:
    ```typescript
    parameters: {
      type: 'object',
      properties: {
        personName: { type: 'string', description: 'Name of the engineer/person to analyze' }
      },
      required: ['personName']
    }
    ```
  - When the LLM planner previously passed `personName: "billing-engine"`, `knowledgeRiskNode` tried to look up "billing-engine" in `person_metrics` and `:PERSON` nodes, failed, and output:
    `No indexed records, person node, or contributions found in the knowledge graph for "billing-engine". Entity does not exist.`
  - The model only succeeded when it fell back to querying `personName: "ALL"`, loading the entire company's risk profiles, and filtering in the LLM answer synthesizer.

### B. Root Cause: Disconnect from Dashboard Successor Implementation
1. **Tool Schema Defect:** `knowledge_risk` does NOT accept a `repository` parameter.
2. **Dual Implementation / Divergence:**
   - In the dashboard (`apps/api/modules/dashboard/controller.ts` lines 718–730), repository modal / SPOF backup owners are computed by:
     ```typescript
     const succRes = await calculateSuccessorCandidates(primaryOwner.name, repoName);
     ```
     or `calculateSuccessorsByRepo(primaryOwner.name)`.
   - The chat agent had NO tool to call this pipeline directly with a repository name.
   - When asked about a repository's successor, the agent lacked a `get_successor_recommendation(repo)` tool that looks up the repository's primary owner from `repo_metrics` and immediately invokes `calculateSuccessorsByRepo(primaryOwner)` / `calculateSuccessorCandidates(primaryOwner, repo)`.

---

## 4. Key Architectural Takeaways for Rebuild

1. **Native Tool Calling:** Stop using stringified JSON parsing inside the prompt for tools. Use native function calling with strict Zod/JSON schemas and tool docstrings.
2. **Unified Data Source:** Every tool must use the exact same analytical pipelines:
   - Successors: `calculateSuccessorCandidates` & `calculateSuccessorsByRepo` from `packages/analytics/successor.service.ts`.
   - Commit counts: Neo4j `CONTRIBUTED_TO` edge rollups + PostgreSQL `events` + `person_metrics.commit_count`.
   - Bus factor & risk: `repo_metrics` table & `calculateAllRepoMetrics`.
3. **Agentic Re-Planning Loop:** When a tool returns data, the LLM must evaluate if additional information is needed (e.g. repo -> primary owner -> successor -> tech stack) and chain tool calls autonomously.
4. **Mandatory Function Calling for Data:** Any data-related prompt on Groq must enforce function calling, validate schemas with Zod, and retry on plain-text replies.
