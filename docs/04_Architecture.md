# Cortex — Technical Architecture Specification
### *System Architecture, Ingestion Pipelines, Graph Topology & Retrieval Engine*

---

## 1. Architectural Philosophy & Design Tenets

Cortex is architected around four non-negotiable engineering tenets:

1. **Separation of Concerns: Deterministic Calculator vs. Generative Formatter**  
   Numerical metrics (Risk Scores, Bus Factors, Successor Rankings) are **never** generated or estimated by Large Language Models. All analytical scores are computed by deterministic TypeScript algorithms executing on verified Neo4j property graph topology and PostgreSQL event stores. The LLM's role is strictly confined to semantic entity extraction during ingestion and natural language synthesis during user queries.
2. **Zero Fabrication Directive**  
   Inference pipelines operate under a strict constraint: if context evidence is missing or incomplete, the system must explicitly return *"No indexed records found."* The model is forbidden from inventing hypothetical contributors, repositories, or architectural decisions.
3. **Passive, Asynchronous Observability**  
   Cortex is an observational intelligence layer, never a synchronous runtime blocker. Inbound webhooks are cryptographically verified and acknowledged within 50ms. All heavy AST parsing, LLM entity extraction, graph insertion, and vector indexing take place in decoupled background worker queues (`BullMQ`).
4. **Data Sovereignty & BYOC (Bring Your Own Cloud)**  
   Cortex runs within the customer's virtual private cloud (VPC). Raw source code repositories and full file contents never leave the enterprise perimeter; only compact, high-level semantic summaries are transmitted to enterprise zero-retention inference endpoints.

---

## 2. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    EXTERNAL EVENT SOURCES                                   │
│            GitHub (Webhooks)        │      Slack (Events API)      │      Jira (Webhooks)   │
└────────────────────┬────────────────┴──────────────┬───────────────┴──────────────┬──────────┘
                     │ HMAC-SHA256                   │ HMAC + Timestamp             │ Secret Token
                     ▼                              ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   EXPRESS API GATEWAY                                       │
│    ├── Middleware: licenseGuard (Verifies central license validity; fail-closed 403)        │
│    ├── Middleware: CORS (Strictly isolated to env.FRONTEND_URL)                              │
│    ├── Middleware: helmet (HSTS, CSP, X-Frame-Options headers)                              │
│    ├── Ingestion Routes: /api/github/webhook, /api/slack/events, /api/jira/webhook          │
│    └── Authenticated Routes: Bearer Token AuthGuard (Timing-safe cryptographic comparison)   │
└────────────────────┬────────────────────────────────────────────────────────────────────────┘
                     │ Write raw payload (Snowflake ID, provider, external_id, payload JSONB)
                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                            POSTGRESQL RELATIONAL RAW EVENT STORE                            │
│    Table: events (UNIQUE index on (provider, external_id) guarantees delivery idempotency)  │
└────────────────────┬────────────────────────────────────────────────────────────────────────┘
                     │ BullMQ.add(jobName, { eventId, payload })
                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             REDIS-BACKED ASYNC QUEUE (BullMQ)                               │
│    Queue: processing-queue                                                                  │
│    Jobs: github-event | slack-event | jira-event                                            │
│    Worker: packages/workers/ingest.worker.ts (Concurrency: env.QUEUE_WORKERS_CONCURRENCY)    │
│    Retry Policy: 3 attempts with exponential backoff (2s → 4s → 8s)                         │
└────────────────────┬────────────────────────────────────────────────────────────────────────┘
                     │ Dequeue job → Retrieve raw payload
                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              LLM ENTITY EXTRACTION CASCADE                                  │
│    Provider: Groq LPUs (High throughput, sub-second latency)                                │
│    Primary Model: openai/gpt-oss-120b                                                       │
│    Fallback Models: openai/gpt-oss-20b → qwen/qwen3.6-27b → groq/compound-mini              │
│    Enforces: Extraction Prompts + Strict JSON Schema Output                                 │
└────────────────────┬──────────────────────────────────────┬─────────────────────────────────┘
                     │ Entities & Relations                 │ Semantic Summary String
                     ▼                                      ▼
┌──────────────────────────────────────────┐   ┌──────────────────────────────────────────────┐
│          NEO4J KNOWLEDGE GRAPH           │   │            QDRANT VECTOR DATABASE            │
│  - Directed Labeled Property Graph       │   │  - Collection: cortex_events                 │
│  - Nodes: PERSON, TECHNOLOGY, REPO,      │   │  - Model: Google Gemini embedding-2          │
│           COMMIT, PR, ISSUE, TEAM, FILE  │   │  - Dimensions: 384 (Cosine distance)         │
│  - Relations: AUTHORED, USES, DEPENDS_ON,│   │  - Purpose: Dense semantic retrieval for     │
│               WORKS_ON, PART_OF, etc.    │   │             unstructured architectural rationale│
│  - Injection Protection: Strict Sets     │   └──────────────────────────────────────────────┘
└────────────────────┬─────────────────────┘
                     │ Daily Cron @ 18:00 IST (+ immediate on server startup)
                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          DETERMINISTIC ANALYTICS & METRICS ENGINE                           │
│  - packages/analytics/knowledge.service.ts   → 6-factor Knowledge Risk calculation          │
│  - packages/analytics/repoMetrics.service.ts → Bus Factor & Repository Risk calculation     │
│  - packages/analytics/successor.service.ts   → 4-factor Jaccard Successor Matching          │
│  - packages/analytics/dailyReport.service.ts → Automated Executive HTML Briefing            │
│  - Output: Persisted into PostgreSQL metrics tables (person_metrics, repo_metrics, etc.)    │
└────────────────────┬────────────────────────────────────────────────────────────────────────┘
                     │ Context Retrieval via Multi-Tool Dispatch
                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          LANGGRAPH AI CHAT AGENT (packages/agent/)                          │
│  plannerNode → retrievalPlannerNode → [Tools: vector, graph, sql, knowledgeRisk, fallback]  │
│  → evidenceNode (Aggregator) → reflectionNode (Gap detection) → answerNode (Zero-Fab)       │
└────────────────────┬────────────────────────────────────────────────────────────────────────┘
                     │ Server-Sent Events (SSE) / JSON Responses
                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             REACT DASHBOARD (web/src/)                                      │
│  Vite + TypeScript + Tailwind CSS                                                           │
│  Views: Overview, People & Risk, Bus Factor Radar, Technology Graph, Interactive AI Chat   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Subsystem Deep-Dives

### 3.1 Data Ingestion Layer & Webhook Security

The ingestion layer acts as the front door for all asynchronous engineering telemetry.

- **GitHub Ingestion (`apps/api/modules/github/`):**
  - Authenticates via HMAC-SHA256 signature validation against `env.GITHUB_SECRET` using `crypto.createHmac`.
  - Leverages the unique `x-github-delivery` header as `external_id`.
  - Executes an idempotent SQL upsert:
    ```sql
    INSERT INTO events (id, provider, event_type, external_id, payload)
    VALUES ($1, 'github', $2, $3, $4)
    ON CONFLICT (provider, external_id) DO NOTHING;
    ```
  - If 0 rows are returned, duplicate delivery is detected and acknowledged with a `200 OK` without re-queuing.
- **Slack Ingestion (`apps/api/modules/slack/`):**
  - Verifies Slack signature using HMAC-SHA256 with timestamp verification ($\le 5$ minute window) to mitigate replay attacks.
  - Enqueues message text and channel metadata for architectural entity extraction.
- **Jira Ingestion (`apps/api/modules/jira/`):**
  - Captures issue lifecycle events (creation, transitions, resolution, comments).
  - Normalizes issue keys and project relationships for graph ingestion.

### 3.2 Queue & Worker Architecture (`packages/queue/` & `packages/workers/`)

- **Queue Substrate:** Backed by Redis via `BullMQ`.
- **Job Concurrency:** Governed by `env.QUEUE_WORKERS_CONCURRENCY` (default: `1`).
- **Resilience Policy:**
  - Configured with 3 automated retries using exponential backoff ($2\text{s} \to 4\text{s} \to 8\text{s}$).
  - `removeOnFail: false` retains failed jobs in the Redis dead-letter queue for operator inspection.
- **Scheduled Workers (`packages/workers/scheduler.worker.ts`):**
  - Cron schedule: `0 18 * * *` (Daily at 18:00 IST).
  - Batch executes all person metrics, repo metrics, and daily executive report generation. Also runs on cold boot to ensure database metrics are pre-warmed.

### 3.3 LLM Extraction & Inference Cascade (`packages/llm/`)

Raw webhook payloads are transformed into structured knowledge graphs via Groq LPUs.

- **Model Cascade Pipeline:**
  To guarantee uninterrupted processing despite rate limits or provider downtime, inference calls execute through a sequential fallback cascade:
  1. `openai/gpt-oss-120b` (Primary extraction model)
  2. `openai/gpt-oss-20b` (First fallback)
  3. `qwen/qwen3.6-27b` (Second fallback)
  4. `groq/compound-mini` (Emergency lightweight fallback)
- **Deterministic Extraction Parameters:**
  - `temperature: 0`
  - `response_format: { type: "json_object" }`
  - `max_completion_tokens: 4096`
- **Ontology & Cypher Injection Prevention:**
  The graph repository (`packages/database/neo4j/graph.repository.ts`) enforces runtime allowlists:
  ```typescript
  const ALLOWED_ENTITY_TYPES = new Set([
    'PERSON', 'TECHNOLOGY', 'REPOSITORY', 'ISSUE', 'PULL_REQUEST',
    'COMMIT', 'TEAM', 'FILE', 'ORGANIZATION'
  ]);

  const ALLOWED_RELATIONS = new Set([
    'USES', 'HAS_PROBLEM', 'FIXED_BY', 'REPLACED_BY', 'DEPENDS_ON',
    'WORKS_ON', 'CREATED', 'MENTIONED_IN', 'ASSIGNED_TO', 'PART_OF', 'AUTHORED'
  ]);
  ```
  Any entity or relationship type outside these sets is rejected immediately, mathematically preventing Cypher prompt injection vulnerabilities.

---

## 4. Dual-Storage Engine: Graph + Vector

### 4.1 Neo4j Knowledge Graph

Neo4j maintains the topological, structural, and relational truth of the organization.

**Graph Schema Overview:**
```
(:PERSON)-[:AUTHORED]->(:COMMIT)-[:PART_OF]->(:REPOSITORY)
(:PERSON)-[:AUTHORED]->(:PULL_REQUEST)-[:PART_OF]->(:REPOSITORY)
(:PERSON)-[:WORKS_ON]->(:REPOSITORY)
(:PERSON)-[:ASSIGNED_TO]->(:ISSUE)
(:COMMIT)-[:TOUCHED]->(:FILE)
(:COMMIT)-[:USES]->(:TECHNOLOGY)
(:REPOSITORY)-[:DEPENDS_ON]->(:REPOSITORY)
(:TECHNOLOGY)-[:REPLACED_BY]->(:TECHNOLOGY)
```

**Identity Deduplication Engine:**
Incoming contributors from disparate platforms are automatically reconciled to a single canonical `PERSON` node:
1. Exact email match (case-insensitive) $\to$ merges to existing node.
2. Cross-provider username lookup $\to$ merges if identity matches historical mapping.
3. String similarity (Jaro-Winkler $> 0.95$) $\to$ merges if verified.
4. Fallback $\to$ provisions new canonical contributor.

### 4.2 Qdrant Vector Database

While Neo4j answers structural questions (*"Who owns what?"*), Qdrant answers unstructured semantic questions (*"Why was this architectural trade-off made?"*).

- **Embedding Model:** Google Gemini `embedding-2` with `outputDimensionality: 384`.
- **Payload Indexing:** Only the LLM-synthesized 1–2 sentence semantic summary of an event is embedded (not bulk code diffs), maximizing signal-to-noise ratio and minimizing RAM footprint.
- **Metric:** Cosine distance over normalized vector space.

---

## 5. Deterministic Analytics Engine

The analytics engine (`packages/analytics/`) executes pure mathematical operations over the Neo4j graph and PostgreSQL tables.

### 5.1 The 6-Factor Knowledge Risk Formula
Measures the organizational fragility and departure risk associated with a specific engineer:

$$\text{Knowledge Risk} = \sum_{i=1}^6 w_i \cdot F_i$$

$$\begin{aligned}
\text{Total Risk} = &(0.30 \times \text{Ownership}) \\
+ &(0.20 \times \text{Dependency}) \\
+ &(0.15 \times \text{Activity}) \\
+ &(0.15 \times \text{Documentation}) \\
+ &(0.10 \times \text{Expertise}) \\
+ &(0.10 \times \text{PendingWork})
\end{aligned}$$

- **Ownership ($w=0.30$):** Commits and PRs authored by person / Total graph commits.
- **Dependency ($w=0.20$):** Number of external services and modules depending on code authored by this person.
- **Activity ($w=0.15$):** Volume of contributions authored within the recent rolling window.
- **Documentation ($w=0.15$):** Ratio of documentation and specification files authored versus code.
- **Expertise ($w=0.10$):** Unique count of distinct technologies and frameworks maintained.
- **Pending Work ($w=0.10$):** Number of open, unresolved Jira issues assigned.

### 5.2 The 4-Factor Successor Engine
Calculates the optimal peer engineer to inherit systems upon an engineer's departure:

$$\text{Successor Score} = (0.40 \times \text{TechSimilarity}) + (0.25 \times \text{RepoOverlap}) + (0.20 \times \text{ActivityScore}) + (0.15 \times \text{CapacityScore})$$

- **Technical Stack Similarity (40%):** Evaluated via Jaccard similarity:
  $$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
- **Repository Overlap (25%):** Percentage of common repositories contributed to.
- **Recent Activity (20%):** Recency tier ($\le 30\text{d} = 100$, $31\text{--}60\text{d} = 60$, $61\text{--}90\text{d} = 30$, $>90\text{d} = 0$).
- **Capacity Score (15%):** Inverse of candidate's own existing risk score ($100 - \text{Risk}$), preventing risk over-concentration.
- **Disqualification Rule:** If a candidate has $0$ shared technologies and $0$ shared repositories, they are automatically excluded from recommendations.

### 5.3 Bus Factor & Repository Risk
- **Bus Factor:** The minimum number of distinct engineers who together account for $> 50\%$ of a repository's total commit volume.
- **Risk Mapping:**
  $$\text{RepoRiskScore} = \begin{cases} 80 & \text{if } \text{BusFactor} = 0 \text{ (unindexed)} \\ \max(0, 100 - (\text{BusFactor} \times 20)) & \text{if } \text{BusFactor} \ge 1 \end{cases}$$

---

## 6. LangGraph AI Chat Agent (`packages/agent/`)

The agent implements an 11-node cyclic state graph using LangGraph to resolve complex, multi-source developer queries:

```
[START]
   │
   ▼
[plannerNode] ─────────────▶ Generates subgoals & tools via live schema tool-calling
   │
   ▼
[retrievalPlannerNode] ────▶ Dispatches subgoals to specialized retrieval nodes
   │
   ├──▶ [vectorNode]         (Qdrant semantic search over summaries)
   ├──▶ [graphNode]          (Neo4j Cypher topological traversal)
   ├──▶ [sqlNode]            (PostgreSQL relational metrics lookup)
   ├──▶ [knowledgeRiskNode]  (Deterministic 6-factor & successor computation)
   ├──▶ [cypherFallbackNode] (Ad-hoc Cypher generation for unmapped patterns)
   └──▶ [clarifyNode]        (Requests user clarification on ambiguous queries)
   │
   ▼
[evidenceNode] ────────────▶ Aggregates all tool responses into StructuredEvidence
   │
   ▼
[reflectionNode] ──────────▶ Evaluates completeness against subgoals
   │
   ├── (Gaps remain) ──────▶ [retrievalPlannerNode] (Iterative loop; max recursion: 25)
   ├── (Ambiguous) ────────▶ [clarifyNode] ──▶ [END]
   └── (Complete) ─────────▶ [answerNode]
                                │
                                ▼ (Zero Fabrication Prompt Synthesis)
                              [END]
```

---

## 7. Security Architecture & Boundary Model

1. **Authentication:**
   - Webhook ingress uses cryptographic HMAC verification.
   - Core API endpoints require a Bearer token evaluated via `crypto.timingSafeEqual`, preventing timing attacks.
2. **Access Governance (licenseGuard):**
   - Active validation heartbeat checks `LICENSE_SERVER_URL` on cold boot and every 6 hours. Unlicensed environments fail closed with HTTP 403.
3. **Transport & Network Isolation:**
   - Strict CORS configuration (`env.FRONTEND_URL`).
   - Hardened HTTP response headers via Helmet.
   - Deployment Model: Private VPC containerization. Data never leaves the client's private infrastructure perimeter.

---

## 8. Relational Schema Specification (PostgreSQL)

The relational layer persists event audits and calculated metrics across 9 tables:

```sql
-- 1. Ingested Events (Raw Audit Log)
CREATE TABLE events (
  id VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100),
  external_id VARCHAR(255),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_events_provider_external UNIQUE (provider, external_id)
);

-- 2. Person Analytics Metrics
CREATE TABLE person_metrics (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE,
  person_name VARCHAR(255) NOT NULL,
  risk_score INTEGER DEFAULT 0,
  top_technologies JSONB,
  repos JSONB,
  commit_count INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Repository Bus Factor Metrics
CREATE TABLE repo_metrics (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE,
  repo_name VARCHAR(255) NOT NULL,
  bus_factor NUMERIC(4,1) DEFAULT 1.0,
  risk_score INTEGER DEFAULT 0,
  contributor_count INTEGER DEFAULT 0,
  primary_owner VARCHAR(255),
  status VARCHAR(50) DEFAULT 'healthy',
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Technology Footprint Metrics
CREATE TABLE technology_metrics (
  id SERIAL PRIMARY KEY,
  tech_name VARCHAR(255) UNIQUE NOT NULL,
  usage_percent NUMERIC(5,2) DEFAULT 0,
  trend_percent NUMERIC(5,2) DEFAULT 0,
  repo_count INTEGER DEFAULT 0,
  contributor_count INTEGER DEFAULT 0,
  commit_count INTEGER DEFAULT 0,
  pr_count INTEGER DEFAULT 0,
  issue_count INTEGER DEFAULT 0,
  top_experts JSONB,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Org-Level Continuity Health Metrics
CREATE TABLE workspace_metrics (
  id SERIAL PRIMARY KEY,
  knowledge_risk_avg INTEGER DEFAULT 0,
  bus_factor_avg NUMERIC(4,2) DEFAULT 1.0,
  repo_count INTEGER DEFAULT 0,
  contributor_count INTEGER DEFAULT 0,
  open_issues_count INTEGER DEFAULT 0,
  open_prs_count INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Canonical Identity Map
CREATE TABLE person_identity (
  id VARCHAR(255) PRIMARY KEY,
  canonical_person_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  username VARCHAR(255),
  email VARCHAR(255),
  display_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_person_identity UNIQUE (provider, external_id)
);

-- 7. Identity Merge Audit Log
CREATE TABLE identity_merge_log (
  id VARCHAR(255) PRIMARY KEY,
  person_a VARCHAR(255) NOT NULL,
  person_b VARCHAR(255) NOT NULL,
  confidence NUMERIC(4,3) NOT NULL,
  matched_by VARCHAR(100) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Duplicate Identity Review Queue
CREATE TABLE potential_duplicates (
  id VARCHAR(255) PRIMARY KEY,
  person_a_id VARCHAR(255), person_a_name VARCHAR(255), person_a_provider VARCHAR(50), person_a_username VARCHAR(255),
  person_b_id VARCHAR(255), person_b_name VARCHAR(255), person_b_provider VARCHAR(50), person_b_username VARCHAR(255),
  similarity_score NUMERIC(4,3) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(255),
  resolution_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Daily Executive Reports
CREATE TABLE daily_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE UNIQUE NOT NULL,
  html_content TEXT NOT NULL,
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. Non-Functional Attributes & Failure Modes

| Dimension | Target Metric | Architectural Enforcement Mechanism |
|---|---|---|
| **Webhook Ingestion Latency** | $< 50\text{ ms}$ | Immediate signature check and asynchronous queuing via BullMQ. |
| **Extraction Latency** | $2\text{--}6\text{ seconds}$ | Groq LPU acceleration with fallback cascade. |
| **Agent Response Latency** | $< 3\text{ seconds}$ | Simulated SSE word streaming; parallel tool execution. |
| **Database Failure Mode** | Graceful Degradation | Neo4j unavailability returns clean HTTP 503 instead of fabricating fallback data. |
| **Worker Scalability** | Horizontal Scalability | Stateless worker processes decoupled via Redis BullMQ queue. |
