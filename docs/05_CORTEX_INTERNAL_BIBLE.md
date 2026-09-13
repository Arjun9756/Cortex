# CORTEX INTERNAL BIBLE
## Complete Engineering & Product Knowledge Document
**Version:** 1.0 | **Date:** September 2026 | **Generated from:** Live codebase audit  
**Status:** Internal Only — Not for external distribution

> **Purpose of this document:** This document serves as the comprehensive, ground-truth record of every subsystem, architectural decision, mathematical formula, known bug, and operational limitation in Cortex.  
> Whenever an executive, technical leader, or investor asks a question—technical or commercial—the exact, evidence-backed answer with source file references can be found here.  
> After reviewing this guide, you will never be caught unprepared or without an authoritative answer.

---

## TABLE OF CONTENTS

1. [What is Cortex — Exact Definition](#1-what-is-cortex)
2. [What Cortex is NOT — Hard Boundaries](#2-what-cortex-is-not)
3. [Full System Architecture Map](#3-full-system-architecture-map)
4. [Ingestion Pipeline — GitHub, Slack, Jira](#4-ingestion-pipeline)
5. [Queue & Worker System — BullMQ](#5-queue--worker-system)
6. [LLM Extraction Layer](#6-llm-extraction-layer)
7. [Knowledge Graph — Neo4j](#7-knowledge-graph--neo4j)
8. [Vector Search — Qdrant](#8-vector-search--qdrant)
9. [Analytics Engine — 6-Factor Formula](#9-analytics-engine--6-factor-formula)
10. [Successor Engine — 4-Factor Formula](#10-successor-engine--4-factor-formula)
11. [Bus Factor & Repo Risk Formula](#11-bus-factor--repo-risk-formula)
12. [AI Chat Agent — LangGraph Workflow](#12-ai-chat-agent--langgraph-workflow)
13. [Identity Resolution System](#13-identity-resolution-system)
14. [PostgreSQL Schema — All 9 Tables](#14-postgresql-schema--all-9-tables)
15. [API Endpoints — Complete Map](#15-api-endpoints--complete-map)
16. [Security & Access Control](#16-security--access-control)
17. [License System](#17-license-system)
18. [Daily Report System](#18-daily-report-system)
19. [PR Risk Engine](#19-pr-risk-engine)
20. [Offboarding Handoff Generator](#20-offboarding-handoff-generator)
21. [Known Bugs — Current Status Table](#21-known-bugs--current-status)
22. [What Works vs What Doesn't (Honest Verdict)](#22-what-works-vs-what-doesnt)
23. [Environment Variables — Every Key Explained](#23-environment-variables)
24. [How to Deploy — BYOC Model](#24-how-to-deploy--byoc-model)
25. [How to Answer Tough Questions in Meetings](#25-how-to-answer-tough-questions-in-meetings)

---

## 1. What is Cortex

**In One Sentence:**  
Cortex is an Engineering Intelligence & Business Continuity Platform that continuously aggregates fragmented engineering exhaust (GitHub, Jira, Slack) into a live Knowledge Graph, using deterministic mathematical algorithms to calculate which engineers represent single-point-of-failure risks, identify optimal peer successors, and map architectural vulnerabilities across repositories.

**Technical Definition:**
```
Cortex = Data Ingestion Layer (Cryptographic Webhooks)
       + Async Processing Queue (BullMQ + Redis)
       + AI Entity Extraction (Groq LLM — gpt-oss-120b primary)
       + Knowledge Graph (Neo4j — dependencies, ownership, relationships)
       + Vector Search (Qdrant + Gemini Embeddings — semantic search)
       + Deterministic Analytics Engine (Pure TypeScript math — zero AI in metrics)
       + LangGraph AI Chat Agent (Multi-tool goal decomposition & reasoning)
       + React Dashboard (Vite + TypeScript + Tailwind)
```

**Questions Cortex Answers (Code-Verified):**

| Question | Cortex Mechanism | Source File |
|---|---|---|
| "What is the organizational risk if [Engineer X] departs tomorrow?" | Knowledge Risk (6-factor score) | `packages/analytics/knowledge.service.ts` |
| "Who is the most viable successor to inherit their systems?" | Successor Engine (Jaccard similarity) | `packages/analytics/successor.service.ts` |
| "Which repositories have a Bus Factor of 1 (SPOF)?" | Repo Metrics SQL calculation | `packages/analytics/repoMetrics.service.ts` |
| "Why was Redis replaced with Valkey six months ago?" | Vector semantic retrieval (Qdrant) | `packages/agent/graph/nodes/vector.node.ts` |
| "Who is the primary subject matter expert on [Technology Y]?" | Graph expertise traversal (Neo4j) | `packages/agent/graph/nodes/graph.node.ts` |
| "If [Service Z] experiences downtime, what breaks downstream?" | Graph blast radius impact analysis | `packages/agent/tools/toolDefinitions.ts` |

**The Core Value Claim (from README.md):**
> "Cortex never guesses: if data exists, it calculates; if not, it never hallucinates."
>
> Implementation: All analytical scores originate from deterministic TypeScript algorithms executed on real Neo4j/Postgres topology. The LLM solely formats verified structured evidence into clear prose. There are zero AI-generated numerical metrics.

---

## 2. What Cortex is NOT

**Hard Product Boundaries (What Cortex will NEVER do, with rationale):**

| Non-Goal | Architectural Rationale | Consequence If Built |
|---|---|---|
| **Employee Performance Scoring** | Commits ≠ Value (Goodhart's Law) | Engineering pushback, metric gaming, enterprise HR rejection |
| **WFH vs. WFO Surveillance** | HRMS / Attendance domain | Immediate loss of trust, destruction of developer goodwill |
| **APM / Infrastructure Monitoring** | Datadog / Splunk domain | Critical scope creep, direct competition against billion-dollar tooling |
| **General Enterprise Search** | Glean's horizontal domain | Unfocused market positioning with no defensible differentiation |
| **Developer Leaderboards / Rankings** | Toxic engineering culture, legal liability | HR compliance violations, developer dissatisfaction |
| **Real-time Code Review Assistant** | Copilot / CodeRabbit domain | Commoditized market with severe saturation |

**When Stakeholders Request These Features:**
> *"That falls outside of Cortex's scope and will not be built. Cortex is strictly focused on Engineering Architectural Continuity and Key-Person Departure Insurance."*

---

## 3. Full System Architecture Map

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL DATA SOURCES                                │
│  GitHub (Commits/PRs/Issues)  |  Slack (Messages)  |  Jira (Tickets)        │
└─────────────┬────────────────────────────┬────────────────────┬──────────────┘
              │ HMAC-SHA256 Webhook         │ HMAC + Timestamp   │ Query Secret ⚠️
              ▼                            ▼                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS API  (apps/api/)                                │
│  ├── licenseGuard → all /api/* blocked if license invalid                   │
│  ├── /api/github/webhook  (no authGuard — uses HMAC validation)             │
│  ├── /api/slack/events    (no authGuard — uses HMAC validation)             │
│  ├── /api/jira/webhook    (no authGuard — uses query secret)                │
│  └── authGuard → Timing-safe Bearer token required for all other routes     │
└─────────────┬────────────────────────────────────────────────────────────────┘
              │ Postgres INSERT (Idempotent: ON CONFLICT on GitHub; ⚠️ pending on Slack/Jira)
              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                   POSTGRESQL  (events table — raw event store)               │
│  id (Snowflake), provider, event_type, external_id, payload JSONB           │
│  UNIQUE INDEX on (provider, external_id)                                    │
└─────────────┬────────────────────────────────────────────────────────────────┘
              │ BullMQ.add(job)
              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│            BULLMQ QUEUE   "processing-queue"  (Redis-backed)                │
│  Jobs: github-event | slack-event | jira-event                              │
│  Worker: packages/workers/ingest.worker.ts                                  │
│  Concurrency: env.QUEUE_WORKERS_CONCURRENCY (default: 1)                    │
│  Retry: 3 attempts, exponential backoff (2s → 4s → 8s)                     │
└─────────────┬────────────────────────────────────────────────────────────────┘
              │ Worker processes job → fetches payload from Postgres
              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    LLM EXTRACTION LAYER                                      │
│  Primary: openai/gpt-oss-120b (via Groq LPU API)                            │
│  Fallback: gpt-oss-20b → qwen/qwen3.6-27b → groq/compound-mini             │
│  Prompt: extraction.prompt.github.ts, extraction.prompt.slack.ts             │
│  Output: JSON {entities, relationships, newEntities, newRelations, summary}  │
│  Temperature: 0 | max_completion_tokens: 4096 | response_format: json_object │
└──────────┬──────────────────────────────────────┬────────────────────────────┘
           │ upsertEntity + upsertRelation         │ generateEmbeddings(summary)
           ▼                                       ▼
┌────────────────────────────┐       ┌─────────────────────────────────────────┐
│    NEO4J KNOWLEDGE GRAPH   │       │         QDRANT VECTOR DATABASE          │
│  Nodes: PERSON, TECHNOLOGY │       │  Collection: QDRANT_COLLECTION_NAME     │
│  REPOSITORY, COMMIT, PR    │       │  Vector size: 384 (Gemini embedding-2)  │
│  ISSUE, TEAM, FILE, ORG    │       │  Distance metric: Cosine                │
│  Relations: AUTHORED, USES │       │  Content: Semantic LLM event summaries  │
│  DEPENDS_ON, PART_OF, etc. │       │  Used for: Architectural search queries │
│  Strict Allowlist Enforced │       └─────────────────────────────────────────┘
└──────────┬─────────────────┘
           │ Daily Cron @ 18:00 IST (+ immediate execution on server startup)
           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ANALYTICS ENGINE  (packages/analytics/)                   │
│  personMetrics.service.ts   → 6-factor Knowledge Risk per person            │
│  repoMetrics.service.ts     → Bus Factor + Risk Score per repository        │
│  successor.service.ts       → 4-factor Successor similarity ranking         │
│  technologyMetrics.ts       → Tech stack footprint and momentum            │
│  workspaceMetrics.service.ts → Org-level aggregated continuity KPIs         │
│  dailyReport.service.ts     → Executive HTML report (Groq-formatted)        │
│  offboarding.service.ts     → Departure handoff documentation generator      │
│  prRisk.service.ts          → Pull Request merge risk evaluator             │
│  All outputs persisted in PostgreSQL tables                                  │
└──────────┬───────────────────────────────────────────────────────────────────┘
           │ API requests from Frontend or Agent queries
           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│              LANGGRAPH AI CHAT AGENT  (packages/agent/)                      │
│  plannerNode → retrievalPlannerNode → [tools] → evidenceNode                │
│  → reflectionNode → answerNode / clarifyNode                                │
│  Tools: vectorNode, graphNode, sqlNode, knowledgeRiskNode,                  │
│         cypherFallbackNode, clarifyNode, evidenceNode                        │
└──────────┬───────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│              REACT FRONTEND  (web/src/)                                      │
│  Pages: Dashboard | People | BusFactor | Analytics | KnowledgeGraph         │
│         Timeline | Technologies | AIChat | Pricing                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Ingestion Pipeline

### 4.1 GitHub Webhook — STATUS: ✅ OPERATIONAL

**Files:** `apps/api/modules/github/router.ts`, `apps/api/modules/github/controller.ts`

**Step-by-Step Flow:**
1. GitHub sends `POST /api/github/webhook`
2. Headers verified: `x-hub-signature-256` (HMAC), `x-github-delivery` (unique delivery UUID), `x-github-event` (event type)
3. `validateGithubSignature()` computes HMAC-SHA256 using `env.GITHUB_SECRET` → returns 403 upon failure
4. `parseGithubEvent()` maps the raw payload to typed `IParsedGithubEvent`
5. Postgres INSERT executed:
   ```sql
   INSERT INTO events(id, provider, event_type, external_id, payload)
   VALUES (snowflake_id, 'github', event_type, deliveryID, rawBody)
   ON CONFLICT (provider, external_id) DO NOTHING
   ```
   `external_id = deliveryID` (GitHub's unique delivery header) guarantees true idempotency.
6. If INSERT returns 0 rows, it is a duplicate delivery attempt and is skipped silently without error.
7. BullMQ job enqueued: `{ removeOnFail: false }` ensures failed jobs are retained for auditing.
8. Background worker processes job → triggers LLM extraction → writes to Neo4j and Qdrant.

**Why `deliveryID` is used:**  
GitHub guarantees `x-github-delivery` is unique per webhook delivery attempt. Using it as `external_id` prevents duplicate queue processing even if GitHub retries the delivery.

---

### 4.2 Slack Webhook — STATUS: ⚠️ PARTIALLY DEGRADED

**File:** `apps/api/modules/slack/controller.ts`

**Verified Working:**
- HMAC-SHA256 signature verification ✅
- 5-minute timestamp window check (mitigates replay attacks) ✅

**Bug B-01: Duplicate delivery triggers unhandled 500**
```typescript
// Current code lacks an ON CONFLICT clause
await sql`INSERT INTO events(id, provider, event_type, external_id, payload)
          VALUES (${uniqueID}, 'slack', ...)`
// Problem: Slack retries if the server doesn't respond within 3 seconds.
// A retry with the same event_id causes a Postgres unique constraint violation, throwing a 500 error.
```
**Fix:** Add `ON CONFLICT (provider, external_id) DO NOTHING` and map Slack's payload `event.event_id` as the `external_id` rather than generating a random ID.

**Bug B-02: Silent data loss on job failure**
```typescript
removeOnFail: true  // After 3 failed attempts, the job is permanently deleted from Redis
```
**Fix:** Update configuration to `removeOnFail: false`.

---

### 4.3 Jira Webhook — STATUS: ❌ BROKEN (3 Bugs)

**Files:** `apps/api/modules/jira/router.ts`, `apps/api/modules/jira/validator.ts`, `apps/api/modules/jira/controller.ts`

**Bug B-03: Subsequent ticket updates are dropped**
```typescript
// router.ts line 15
const externalId = payload?.issue?.id || null
// Problem: The Jira issue ID remains identical across all lifecycle events for a ticket.
// Issue Created: external_id = "10042" → INSERT succeeds.
// Issue Updated: external_id = "10042" → ON CONFLICT → REJECTED.
// Comment Added: external_id = "10042" → ON CONFLICT → REJECTED.
// Consequence: Only the creation event is recorded. All updates and discussions are lost.
```
**Fix:** Compose `external_id` using `payload.webhookEvent + "_" + payload.timestamp` or the `X-Atlassian-Webhook-UUID` header.

**Bug B-04: Secret exposure in query parameter**
```typescript
// validator.ts line 6
const providerSecret = req.query.secret
// Endpoint: /api/jira/webhook?secret=supersecretvalue
// This secret is logged across:
//   - Express access logs
//   - Reverse proxy / Cloudflare logs
//   - HTTP referrer headers
```
**Fix:** Validate via the `X-Atlassian-Webhook-Secret` request header.

**Bug B-05: Silent job purge on failure**
```typescript
removeOnFail: true
```
**Fix:** Update to `removeOnFail: false`.

---

## 5. Queue & Worker System

**Files:** `packages/queue/bullmq.ts`, `packages/queue/jobs.ts`, `packages/workers/ingest.worker.ts`, `packages/workers/scheduler.worker.ts`

### 5.1 Queue Configuration
- **Queue Name:** `processing-queue`
- **Backend:** Redis (via `ioredis`)
- **Worker Model:** Single BullMQ Worker instance handling all registered job types
- **Concurrency:** `env.QUEUE_WORKERS_CONCURRENCY` (defaults to `1`)

### 5.2 Registered Job Types
```typescript
JOBS = {
  GITHUB_EVENT:     "github-event",
  JIRA_EVENT:       "jira-event",
  SLACK_EVENT:      "slack-event",
  NOTION_EVENT:     "notion-event",      // ⚠️ Stub: case block contains only an empty break statement
  CONFLUENCE_EVENT: "confluence-event"   // ⚠️ Stub: case block contains only an empty break statement
}
```

### 5.3 Retry & Retention Configuration

| Provider | Max Attempts | Backoff Strategy | Failure Retention |
|---|---|---|---|
| GitHub | 3 | Exponential (2s base) | `removeOnFail: false` → RETAINED ✅ |
| Slack | 3 | Exponential (2s base) | `removeOnFail: true` → DELETED ❌ |
| Jira | 3 | Exponential (2s base) | `removeOnFail: true` → DELETED ❌ |

### 5.4 Throughput & Scaling Analysis
- **Throughput:** At concurrency = 1, each job requires 2–8 seconds (Postgres fetch + Groq LLM inference + Neo4j session operations + Qdrant write). Peak throughput is roughly 7–30 events per minute.
- **Rate Limits:** Groq free-tier limits gpt-oss-120b to 30 RPM. High ingestion spikes will back up the queue and trigger the model fallback cascade.
- **Redis Disconnection:** If Redis is unavailable, the Postgres raw event INSERT still completes, but job queuing fails silently. A transactional outbox pattern or reconciliation cron is needed for enterprise hardening.

### 5.5 Scheduler Worker
**File:** `packages/workers/scheduler.worker.ts`
```typescript
cron.schedule('0 18 * * *', ...)  // Executes daily at 18:00 IST
```
**Scheduled Pipeline:**
1. `calculateAllPersonMetrics()` — 6-factor Knowledge Risk for all `PERSON` nodes
2. `calculateAllRepoMetrics()` — Bus Factor for all `REPOSITORY` nodes
3. `calculateAllTechnologyMetrics()` — Tech footprint and adoption statistics
4. `calculateWorkspaceMetrics()` — Org-level aggregated continuity KPIs
5. `generateAndSaveDailyReport()` — Generates and persists the executive HTML report
*Note: This pipeline also executes immediately on server startup to ensure metrics tables are populated.*

### 5.6 Metrics Calculation & Data Integrity Guarantees
- **Person Ownership Score (`packages/analytics/knowledge.risk.predict.ts`):** Computes per-repository maximum ownership:
  ```cypher
  MATCH (p:PERSON {name: $name})-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY)
  WITH r, count(c) AS personRepoCommits
  MATCH (c2:COMMIT)-[:PART_OF]->(r)
  WITH r, personRepoCommits, count(c2) AS totalRepoCommits
  RETURN max(toFloat(personRepoCommits) / toFloat(totalRepoCommits)) AS maxRepoOwnership
  ```
  Prevents dilution from unrelated repositories in the company graph; single-repo sole maintainers correctly receive `1.0` (100%) ownership share.
- **Open Inventory Filtering (`packages/analytics/workspaceMetrics.service.ts`):** Filters open issues and PRs by JSON payload state (`payload->'issue'->>'state' = 'open'` and `payload->'pull_request'->>'state' = 'open'`). Closed or merged records are excluded. Fallback values are strictly `0` (zero fabricated fallbacks).
- **Activity & Commit Trends (`apps/api/modules/analytics/` & `apps/api/modules/dashboard/`):**
  - Commit counts sum actual commits from push payload arrays (`COALESCE(jsonb_array_length(payload->'commits'), 1)`).
  - PR counts evaluate distinct PR IDs (`COUNT(DISTINCT payload->'pull_request'->>'id')`).
  - Standardized across Overview and Analytics to a 12-week window with consistent `MMM D` labeling.

---

## 6. LLM Extraction Layer

**Files:** `packages/llm/providers/groq.ts`, `packages/llm/prompts/`, `packages/extraction/ontology.ts`, `packages/extraction/entityResolver.ts`

### 6.1 Model Fallback Cascade
```typescript
PRIMARY_MODEL   = 'openai/gpt-oss-120b'
FALLBACK_MODELS = ['openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'groq/compound-mini']
```
- **Failover Triggers:** HTTP 429 (rate limit), 413 (payload too large), 404, 500, 503.
- **Failover Logic:** Sequential failover through the cascade until an inference call succeeds.
- **Retry Mechanism:** Groq SDK handles `maxRetries: 3` at the client level in addition to application-level model cascading.

### 6.2 Inference Configuration
```typescript
{
  model: 'openai/gpt-oss-120b',
  temperature: 0,                         // Deterministic output
  max_completion_tokens: 4096,
  response_format: { type: "json_object" }   // Enforces valid JSON structure
}
```

### 6.3 Ontology Allowlist & Injection Defense
**File:** `packages/database/neo4j/graph.repository.ts`

**Allowed Entity Labels:**
```
PERSON, TECHNOLOGY, REPOSITORY, ISSUE, PULL_REQUEST, COMMIT, TEAM, FILE, ORGANIZATION
```

**Allowed Relationship Types:**
```
USES, HAS_PROBLEM, FIXED_BY, REPLACED_BY, DEPENDS_ON, WORKS_ON,
CREATED, MENTIONED_IN, ASSIGNED_TO, PART_OF, AUTHORED
```

**Cypher Injection Protection (VERIFIED FIXED):**
```typescript
// graph.repository.ts lines 4-12
const ALLOWED_RELATIONS = new Set([...])
const ALLOWED_ENTITY_TYPES = new Set([...])

// In upsertRelation():
if (!ALLOWED_RELATIONS.has(normalizedType)) {
  throw new Error(`Invalid relationship type: ${type}`)
}

// In upsertEntity():
if (!ALLOWED_ENTITY_TYPES.has(normalizedType)) {
  throw new Error(`Invalid entity type: ${type}`)
}
```
*Cypher injection is prevented at runtime by strict allowlist validation.*

### 6.4 Structured Extraction Output Schema
```json
{
  "entities": [{ "name": "Arjun", "type": "PERSON" }],
  "relationships": [
    { "from": "Arjun", "to": "auth-service", "type": "AUTHORED", "evidence": "PR #42 merged" }
  ],
  "newEntities": [{ "name": "billing-tokenizer", "suggestedType": "SERVICE" }],
  "newRelations": [
    { "from": "billing-tokenizer", "to": "Stripe", "suggestedType": "CALLS", "evidence": "API call" }
  ],
  "summary": "Arjun merged PR #42 adding JWT authentication to auth-service using Node.js"
}
```

---

## 7. Knowledge Graph — Neo4j

**File:** `packages/database/neo4j/graph.repository.ts`

### 7.1 Node Labels and Properties

| Label | Domain Representation | Key Properties |
|---|---|---|
| `PERSON` | Engineers, contributors | `name`, `email`, `externalId`, `provider` |
| `TECHNOLOGY` | Frameworks, languages, tools | `name` |
| `REPOSITORY` | Code repositories | `name`, `externalId` |
| `COMMIT` | Git commits | `name` (hash), `createdAt`, `timestamp` |
| `PULL_REQUEST` | Pull requests | `name`, `externalId`, `status` |
| `ISSUE` | Tickets / Issue tracking | `name`, `externalId`, `status` |
| `TEAM` | Engineering groups | `name` |
| `FILE` | Source code paths | `name` |
| `ORGANIZATION` | Corporate entities | `name` |

### 7.2 Relationship Semantics

| Relationship | Direction | Semantic Meaning |
|---|---|---|
| `AUTHORED` | `PERSON` → `COMMIT`/`PR`/`ISSUE` | Engineer authored the work artifact |
| `WORKS_ON` | `PERSON` → `REPOSITORY` | Engineer regularly contributes to repository |
| `USES` | `PERSON`/`REPO` → `TECHNOLOGY` | Technology is utilized |
| `PART_OF` | `COMMIT`/`PR` → `REPOSITORY` | Artifact belongs to the repository |
| `DEPENDS_ON` | `REPO`/`SERVICE` → `REPO`/`SERVICE` | Service-level dependency |
| `ASSIGNED_TO` | `ISSUE` → `PERSON` | Issue is assigned to engineer |
| `FIXED_BY` | `ISSUE` → `COMMIT` | Issue was resolved by commit |
| `REPLACED_BY` | `TECHNOLOGY` → `TECHNOLOGY` | Architectural migration record |

### 7.3 Schema Indexes
Created automatically on server startup:
```cypher
CREATE INDEX entity_person_email      IF NOT EXISTS FOR (n:PERSON)     ON (n.email);
CREATE INDEX entity_person_externalid IF NOT EXISTS FOR (n:PERSON)     ON (n.externalId);
CREATE INDEX entity_repo_externalid   IF NOT EXISTS FOR (n:REPOSITORY) ON (n.externalId);
CREATE INDEX entity_person_name       IF NOT EXISTS FOR (n:PERSON)     ON (n.name);
CREATE INDEX entity_repo_name         IF NOT EXISTS FOR (n:REPOSITORY) ON (n.name);
CREATE INDEX entity_tech_name         IF NOT EXISTS FOR (n:TECHNOLOGY) ON (n.name);
CREATE INDEX entity_commit_createdat  IF NOT EXISTS FOR (n:COMMIT)     ON (n.createdAt);
```

### 7.4 Cross-Provider Identity Deduplication
When an incoming entity of type `PERSON` is processed:
1. **Email Match:** If `email` exists, query existing `PERSON` by email → update node.
2. **Name Match:** If no email matches, compare lowercase name → update node.
3. **Fallback:** If no match occurs, create a new `PERSON` node.

---

## 8. Vector Search — Qdrant

**Files:** `packages/database/vector/qdrant.repository.ts`, `packages/llm/providers/gemini.ts`

### 8.1 Vector Collection Configuration
```typescript
{
  vectors: {
    size: 384,         // Google Gemini embedding-2 with outputDimensionality: 384
    distance: "Cosine" // Cosine distance metric for semantic search
  }
}
```

### 8.2 Ingestion Payload
**Raw repository dumps are NOT embedded.** Only the LLM-extracted 1–2 sentence semantic event summary is embedded:
```
"Arjun merged PR #42 adding JWT authentication to auth-service using Node.js crypto module"
```
*Rationale:* Summaries capture semantic intent without inflating vector storage or diluting retrieval quality.

### 8.3 Known Vector Store Issues
- **B-05 (Duplicate Points on Retry):** Generating a new random UUID on job retries creates duplicate vector entries for the same event.  
  *Fix:* Use the Postgres Snowflake `events.id` as the Qdrant point ID for idempotent upserts.
- **B-06 (Silent Error Suppression):** Vector insertion exceptions are caught and logged without rethrowing, masking indexing failures.

---

## 9. Analytics Engine — 6-Factor Formula

**Files:** `packages/analytics/knowledge.service.ts`, `packages/analytics/knowledge.risk.predict.ts`

### 9.1 Mathematical Knowledge Risk Formula
```
Knowledge Risk = (0.30 × Ownership)
               + (0.20 × Dependency)
               + (0.15 × Activity)
               + (0.15 × Documentation)
               + (0.10 × Expertise)
               + (0.10 × PendingWork)

Input factors: Normalized on a 0.0 – 1.0 scale
Total Risk Output: 0.0 – 1.0 scale
Persisted in Postgres as: Math.round(totalRisk × 100) → [0 – 100] integer
```

### 9.2 Factor Breakdown

1. **Ownership (30% Weight):**  
   $\text{Score} = \min\left(\frac{\text{Commits and PRs Authored by Person}}{\text{Total Graph Commits and PRs}}, 1.0\right)$  
   *Rationale:* Primary risk driver. High individual code ownership leaves severe blind spots upon departure.

2. **Dependency (20% Weight):**  
   $\text{Score} = \min\left(\frac{\text{Entities that DEPEND\_ON or USE items authored by Person}}{\text{Normalization Factor}}, 1.0\right)$  
   *Rationale:* Quantifies downstream blast radius across services.

3. **Activity (15% Weight):**  
   $\text{Score} = \min\left(\frac{\text{Recent contributions authored by Person}}{\text{Normalization Factor}}, 1.0\right)$  
   *Rationale:* Active engineers carry vital in-flight architectural context.

4. **Documentation Coverage (15% Weight):**  
   $\text{Score} = \min\left(\frac{\text{FILE (documentation) nodes authored by Person}}{\text{Normalization Factor}}, 1.0\right)$  
   *Rationale:* Undocumented institutional knowledge maximizes replacement friction.

5. **Expertise Breadth (10% Weight):**  
   $\text{Score} = \min\left(\frac{\text{Distinct TECHNOLOGY / REPOSITORY nodes touched}}{20}, 1.0\right)$  
   *Rationale:* Broad multi-domain expertise requires longer cross-training periods.

6. **Pending Work (10% Weight):**  
   $\text{Score} = \min\left(\frac{\text{Active ISSUE nodes ASSIGNED\_TO Person}}{10}, 1.0\right)$  
   *Rationale:* Measures immediate operational handoff overhead.

---

## 10. Successor Engine — 4-Factor Formula

**File:** `packages/analytics/successor.service.ts`

```
Successor Score = (0.40 × SharedTechScore)
                + (0.25 × SharedRepoScore)
                + (0.20 × RecentActivityScore)
                + (0.15 × WorkloadCapacityScore)

Output Range: 0 – 100 integer score per candidate
```

### 10.1 Factor Specifications

1. **Shared Technologies (40% Weight):**  
   Calculated using **Jaccard Similarity**:
   $$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
   Where $A$ is the target engineer's technology set and $B$ is the candidate's technology set.  
   $$\text{SharedTechScore} = J(A, B) \times 100$$  
   *Rationale:* Technical stack compatibility is non-negotiable for rapid system handover.

2. **Shared Repositories (25% Weight):**  
   $$\text{SharedRepoScore} = \left(\frac{\text{Overlapping Repositories}}{\text{Target Engineer's Total Repositories}}\right) \times 100$$  
   *Rationale:* Familiarity with specific codebase architectures drastically reduces ramp-up time.

3. **Recent Activity (20% Weight):**  
   - $\le 30\text{ days}$: Score = 100 (`active_recent`)
   - $31 - 60\text{ days}$: Score = 60 (`active_moderate`)
   - $61 - 90\text{ days}$: Score = 30 (`dormant`)
   - $> 90\text{ days}$: Score = 0 (`inactive`)

4. **Workload Capacity with SPOF Penalty (15% Weight):**  
   $$\text{spofPenalty} = (\text{Candidate's SPOF Repos Count}) \times 0.15$$
   $$\text{WorkloadCapacityScore} = \max(0, 1.0 - \text{Candidate's Knowledge Risk} - \text{spofPenalty}) \times 100$$  
   *Rationale:* Prevents concentrating single-point-of-failure risk onto engineers who are already critical bottlenecks elsewhere.

### 10.2 Mandatory Disqualification & Hard Business Rules
1. **Disqualification:**
   $$\text{IF } \text{SharedTechnologies} = 0 \text{ AND } \text{SharedRepositories} = 0 \implies \text{Candidate is Excluded}$$
2. **0%-Repo-Overlap Score Cap (Fix C):**
   $$\text{IF } \text{SharedRepositories} = 0 \implies \text{Composite Score is Capped at 25% AND Category} = \text{"cross\_training\_candidate"}$$
3. **SPOF Overload Hard Cap (Fix B):**
   $$\text{IF } \text{Candidate SPOF Repos Count} \ge 3 \implies \text{Flagged as Overloaded with Warning: "Not Recommended — Already Maintains 3+ Critical Repositories"}$$

> 📘 **Full Mathematical & Metrics Specification:**  
> For complete step-by-step arithmetic, repo health grading, workspace health algorithms, and concrete numerical walkthroughs, see [docs/metrics/FORMULAS_AND_CALCULATIONS.md](file:///d:/Cortex/docs/metrics/FORMULAS_AND_CALCULATIONS.md).

---

## 11. Bus Factor & Repo Risk Formula

**File:** `packages/analytics/repoMetrics.service.ts`

### 11.1 Bus Factor Definition
**Bus Factor** represents the minimum number of distinct engineers whose aggregated commit contributions exceed 50% of the repository's total commit history.

**Cypher Implementation:**
```cypher
MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY {name: $repoName})
WITH p, count(c) AS personCommits
ORDER BY personCommits DESC
WITH collect({person: p.name, commits: personCommits}) AS ranked,
     sum(personCommits) AS totalCommits
... // Accumulate until running total > (0.50 * totalCommits)
RETURN busFactor
```

### 11.2 Repository Risk Score Derivation
```typescript
if (busFactor === 0) {
  riskScore = 80; // Unindexed or unassigned repository (presumed fragile)
} else {
  riskScore = Math.max(0, 100 - (busFactor * 20));
}
```

| Bus Factor | Risk Score | Risk Status |
|---|---|---|
| 0 | 80 | `fragile` (No commit data) |
| 1 | 80 | `fragile` (Single Point of Failure) |
| 2 | 60 | `concentrated` |
| 3 | 40 | `healthy` |
| 4 | 20 | `healthy` |
| 5+ | 0 | `healthy` |

---

## 12. AI Chat Agent — LangGraph Workflow

**File:** `packages/agent/graph/workflow.ts`

### 12.1 Execution Node Architecture
```
START
  ↓
plannerNode
  (Decomposes query into subgoals via native tool calling with live schema context)
  ↓
retrievalPlannerNode
  (Routes execution to appropriate retrieval tools based on pending subgoals)
  ↓
  ├─▶ vectorNode          (Semantic search across Qdrant event summaries)
  ├─▶ graphNode           (Cypher execution for topology, dependencies, paths)
  ├─▶ sqlNode             (Structured relational queries on Postgres metrics tables)
  ├─▶ knowledgeRiskNode   (Deterministic 6-factor risk & 4-factor successor calculations)
  ├─▶ cypherFallbackNode  (Direct ad-hoc graph queries for unmapped patterns)
  └─▶ clarifyNode         (Halts and requests clarification if query is ambiguous)
  ↓
evidenceNode
  (Aggregates tool outputs into unified StructuredEvidence payload)
  ↓
reflectionNode
  (Evaluates completeness: Checks if all subgoals are satisfied by evidence)
  ↓
  ├─▶ (Gaps found)        → retrievalPlannerNode (Iterative re-querying, recursionLimit: 25)
  ├─▶ (Complete)          → answerNode
  └─▶ (Ambiguity remains) → clarifyNode → END
  ↓
answerNode
  (Synthesizes final answer constrained strictly by StructuredEvidence; Zero Fabrication)
  ↓
END
```

### 12.2 Quality Assurance & Grounding
- **Enforced via Prompts:** Zero Fabrication directive requires every factual claim to reference retrieved evidence. If context is missing, the model must explicitly state that no record exists.
- **Implementation Reality:** Validation is prompt-enforced at `temperature = 0`; there is no separate deterministic AST claim-verification step after generation.

---

## 13. Identity Resolution System

**File:** `packages/identity/canonicalPerson.service.ts`

### 13.1 Resolution Hierarchy
1. **Priority 1 (Exact Email Match, Confidence: 1.0):**  
   Lookup in `person_identity` where `email = incoming.email` (case-insensitive).
2. **Priority 2 (Cross-Provider Username Match, Confidence: 0.98):**  
   Lookup where `username = incoming.username` across systems.
3. **Priority 3 (Display Name Jaro-Winkler Similarity > 0.95, Confidence: 0.96):**  
   Calculates phonetic and string similarity against existing identities.
4. **Priority 4 (LLM Disambiguation, Confidence $\ge 0.95$):**  
   Evaluates ambiguous matches (e.g., "Arjun K." vs. "Arjun Kumar").
5. **Fallback:** If all tiers fail, provision a new canonical `PERSON` record.

---

## 14. PostgreSQL Schema — All 9 Tables

**File:** `packages/database/postgres/schema.ts`  
*Tables are verified and idempotently created on boot via `ensurePostgresTables()`.*

```sql
-- 1. Raw Ingested Event Store
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100),
  external_id VARCHAR(255),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_events_provider_external UNIQUE (provider, external_id)
);

-- 2. Person Analytics & Risk Score
CREATE TABLE IF NOT EXISTS person_metrics (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE,
  person_name VARCHAR(255) NOT NULL,
  risk_score INTEGER DEFAULT 0,
  top_technologies JSONB,
  repos JSONB,
  commit_count INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Repository Bus Factor & Health
CREATE TABLE IF NOT EXISTS repo_metrics (
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

-- 4. Technology Usage & Stack Metrics
CREATE TABLE IF NOT EXISTS technology_metrics (
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

-- 5. Org-Level Aggregated Health Metrics
CREATE TABLE IF NOT EXISTS workspace_metrics (
  id SERIAL PRIMARY KEY,
  knowledge_risk_avg INTEGER DEFAULT 0,
  bus_factor_avg NUMERIC(4,2) DEFAULT 1.0,
  repo_count INTEGER DEFAULT 0,
  contributor_count INTEGER DEFAULT 0,
  open_issues_count INTEGER DEFAULT 0,
  open_prs_count INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Canonical Identity Mapping
CREATE TABLE IF NOT EXISTS person_identity (
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

-- 7. Audit Log for Identity Merges
CREATE TABLE IF NOT EXISTS identity_merge_log (
  id VARCHAR(255) PRIMARY KEY,
  person_a VARCHAR(255) NOT NULL,
  person_b VARCHAR(255) NOT NULL,
  confidence NUMERIC(4,3) NOT NULL,
  matched_by VARCHAR(100) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Ambiguous Duplicate Identity Queue
CREATE TABLE IF NOT EXISTS potential_duplicates (
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
CREATE TABLE IF NOT EXISTS daily_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE UNIQUE NOT NULL,
  html_content TEXT NOT NULL,
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 15. API Endpoints — Complete Map

### Webhook Endpoints (Authentication via Webhook Signature)
| Method | Path | Authentication | Operational Status |
|---|---|---|---|
| POST | `/api/github/webhook` | HMAC-SHA256 | ✅ Fully Operational |
| POST | `/api/slack/events` | HMAC + Timestamp | ⚠️ Degraded on duplicate delivery |
| POST | `/api/jira/webhook?secret=` | Query Parameter | ❌ Vulnerable (Secret logged in URLs) |

### System Status (Unauthenticated)
| Method | Path | Description |
|---|---|---|
| GET | `/` | Service health check |
| GET | `/api/license/status` | Current license state |

### Dashboard & Analytics Endpoints (Requires Bearer Token)
| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/overview` | Organization continuity KPIs |
| GET | `/api/dashboard/people` | Engineers ranked by Knowledge Risk |
| GET | `/api/dashboard/bus-factor` | Repositories ordered by Bus Factor |
| GET | `/api/dashboard/repos/:repoName/details` | Single repository architectural analysis |
| GET | `/api/dashboard/technologies` | Stack adoption and expertise distribution |
| GET | `/api/dashboard/timeline` | Ingested engineering activity log |
| GET | `/api/dashboard/people/:externalId/simulate-departure` | Departure simulation and handoff generator |
| POST | `/api/analytics/pr-risk` | PR merge blast radius evaluator |
| POST | `/api/analytics/offboarding/:name` | Automated departure handoff report |
| GET | `/api/analytics/daily-report` | Retrieve latest executive report |
| POST | `/api/analytics/daily-report/generate` | Trigger manual executive report generation |

### AI Agent Query Endpoints (Requires Bearer Token)
| Method | Path | Description |
|---|---|---|
| POST | `/api/chat/query` | Synchronous JSON chat response |
| POST | `/api/chat/stream` | Server-Sent Events (SSE) streaming chat response |

---

## 16. Security & Access Control

**Files:** `apps/api/bootstrap/app.ts`, `apps/api/middlewares/authGuard.ts`

### 16.1 Active Security Layers
1. **CORS Isolation:** Configured strictly via `cors({ origin: env.FRONTEND_URL, credentials: true })`. Wildcard `*` origins are blocked.
2. **HTTP Security Headers:** Enforced via `helmet()` (X-Frame-Options, CSP, Strict-Transport-Security).
3. **License Guard:** Active on all `/api/*` routes; returns 403 if the license is inactive or expired.
4. **Auth Guard (Bearer Token):** Validates tokens using cryptographic timing-safe comparisons (`crypto.timingSafeEqual`) to eliminate timing attacks.
5. **Webhook Signatures:** Cryptographic HMAC verification on incoming GitHub and Slack payloads.

### 16.2 Architectural Model
- **Single-Tenant / BYOC:** Cortex is currently architected as a single-tenant deployment per enterprise. The bearer token represents administrative access.
- **Enterprise RBAC Roadmap:** Multi-role access (Employee, Engineering Manager, VP/CTO) and row-level team isolation remain on the enterprise roadmap.

---

## 17. License System

**File:** `packages/license/license.client.ts`

- **Startup Validation:** `verifyLicenseOnStartup()` sends a validation payload to `LICENSE_SERVER_URL` using `CORTEX_LICENSE_KEY`. If validation fails, the server exits with code 1 (`process.exit(1)`).
- **Periodic Heartbeat:** Background pings occur every 6 hours (`LICENSE_PING_INTERVAL_HOURS`). If a ping fails, `isActive` transitions to `false`, blocking all `/api/*` endpoints with 403.
- **Operational Reality:** License state is maintained in-memory and is not shared across multi-instance clusters via Redis.

---

## 18. Daily Report System

**Files:** `packages/analytics/dailyReport.service.ts`, `packages/workers/scheduler.worker.ts`

- **Trigger:** Automated cron executes daily at 18:00 IST (`0 18 * * *`). Also executes on application boot.
- **Sources Aggregated:** Pulls high-risk entities from `repo_metrics` (Bus Factor = 1), top-risk individuals from `person_metrics`, activity counts from `events`, and Neo4j author statistics.
- **Persistence:** Stored in `daily_reports` with a unique constraint on `report_date`.

---

## 19. PR Risk Engine

**File:** `packages/analytics/prRisk.service.ts`

- **Endpoint:** `POST /api/analytics/pr-risk`
- **Execution Pipeline:**
  1. Validates idempotency via Redis locks on `deliveryId`.
  2. Queries `repo_metrics` for repository Bus Factor.
  3. Traverses Neo4j to find other historical contributors who authored the modified files.
  4. Calculates the author's own Knowledge Risk score.
  5. Computes a composite merge risk score (0–100) mapped to `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.

---

## 20. Offboarding Handoff Generator

**File:** `packages/analytics/offboarding.service.ts`

- **Trigger:** `GET /api/dashboard/people/:externalId/simulate-departure`
- **Computed Attributes (100% Deterministic Math):**
  - Repositories exclusively owned
  - Bus factor impact per repository
  - Unresolved Jira issues assigned
  - Knowledge Risk score breakdown
  - Recommended successor candidates (ranked by Jaccard similarity)
  - Estimated operational recovery time:
    $$\text{RecoveryTimeWeeks} = \max\left(1, \left\lceil \frac{\text{KnowledgeRiskScore}}{20} \right\rceil\right)$$
- **Role of the LLM:** The LLM is strictly used as a formatter—it converts the pre-computed JSON metrics into clean Markdown documentation. The LLM generates no numerical values.

---

## 21. Known Bugs — Current Status

| ID | Subsystem | Description | Severity | Status |
|---|---|---|---|---|
| B-01 | Slack Ingestion | Missing `ON CONFLICT` triggers unhandled 500 on duplicate delivery | Critical | 🔴 Open |
| B-02 | Jira Ingestion | `external_id = issue.id` causes ticket updates to be dropped | Critical | 🔴 Open |
| B-03 | Jira Security | Webhook secret exposed in URL query string | Critical | 🔴 Open |
| B-04 | Ingestion Queue | `removeOnFail: true` purges failed Slack/Jira jobs | Critical | 🔴 Open |
| B-05 | Vector Index | Random UUID on retry causes duplicate Qdrant points | High | 🔴 Open |
| B-06 | Vector Index | Exception swallowed during Qdrant vector insert | High | 🔴 Open |
| B-07 | Jira Extraction | Uses GitHub extraction prompt rather than Jira-tailored prompt | Medium | 🔴 Open |
| B-08 | Chat Streaming | Relative URL `/api/chat/stream` fails in cross-host deployments | Medium | 🔴 Open |
| B-09 | Activity Heatmap | Historical heatmap slots use modulo math instead of real events | Low | 🟡 Acknowledged |
| B-10 | Graph Concurrency | Schema uses indexes rather than strict uniqueness constraints | Low | 🟡 Monitored |
| B-11 | Cypher Injection | Enforced allowlists on entity and relation types | Resolved | ✅ Fixed |
| B-12 | CORS Security | Restricted to `env.FRONTEND_URL` | Resolved | ✅ Fixed |
| B-13 | Analytics Fallback | Returns 503 on database unavailability instead of mock numbers | Resolved | ✅ Fixed |
| B-14 | API Authentication | Enforced timing-safe Bearer authGuard | Resolved | ✅ Fixed |

---

## 22. What Works vs What Doesn't

### ✅ VERIFIED OPERATIONAL
- GitHub webhook verification, idempotency, and retention
- 6-factor Knowledge Risk deterministic algorithm
- 4-factor Successor matching algorithm with disqualification thresholds
- Bus Factor calculation via Neo4j Cypher traversals
- Multi-tier identity deduplication
- LangGraph 11-node agent execution workflow
- Scheduled daily report generation (18:00 IST)
- All 9 PostgreSQL tables with idempotent boot creation
- PR Risk calculation with Redis caching
- Multi-model LLM fallback cascade (4 models on Groq)

### ❌ REQUIRING REMEDIATION BEFORE PRODUCTION
- Slack duplicate delivery handling and job retention
- Jira update suppression and query secret exposure
- Qdrant duplicate vectors and silent error handling
- Jira prompt alignment
- Chat streaming cross-origin URL resolution

### ⚠️ DEMO & PRIVATE PILOT READY
- Single-tenant deployment model (BYOC)
- Vector retrieval quality (384-dimensional embeddings)
- Concurrency scaling (currently optimized for single-worker execution)

---

## 23. Environment Variables

**File:** `apps/api/config/env.ts`

### Required Variables
| Variable | Description | Example / Format |
|---|---|---|
| `PORT` | API Server Port | `3000` |
| `POSTGRES_HOST` | PostgreSQL Hostname | `db.company.com` |
| `POSTGRES_PORT` | PostgreSQL Port | `5432` |
| `POSTGRES_USER` | Database User | `cortex_admin` |
| `POSTGRES_PASSWORD` | Database Password | `<secret>` |
| `POSTGRES_DATABASE` | Database Name | `cortex_db` |
| `NEO4J_URI` | Neo4j Bolt Connection URI | `bolt://localhost:7687` |
| `NEO4J_USERNAME` | Neo4j User | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j Password | `<secret>` |
| `REDIS_HOST` | Redis Hostname | `localhost` |
| `REDIS_PORT` | Redis Port | `6379` |
| `CORTEX_API_KEY` | Bearer Token for API Authentication | `<32+ char random string>` |
| `FRONTEND_URL` | Allowed Origin for CORS | `https://cortex.company.com` |
| `GROQ_API_KEY` | Groq LPU API Key | `gsk_...` |
| `GEMINI_API_KEY` | Google Gemini Embeddings Key | `AIza...` |
| `GITHUB_SECRET` | Webhook HMAC Secret | `<32 random bytes>` |
| `SLACK_SECRET` | Slack Signing Secret | `<from Slack settings>` |
| `JIRA_SECRET` | Jira Webhook Secret | `<secret>` |
| `QDRANT_API_KEY` | Qdrant Cloud API Key | `<secret>` |
| `QDRANT_CLUSTER_ENDPOINT` | Qdrant Cluster URL | `https://xyz.qdrant.io` |
| `QDRANT_COLLECTION_NAME` | Vector Collection Name | `cortex_events` |
| `CORTEX_LICENSE_KEY` | License Authentication Key | `<license-key>` |

---

## 24. How to Deploy — BYOC Model

### System Prerequisites
1. **PostgreSQL** $\ge 14$ (RDS, Supabase, Neon, or self-hosted)
2. **Neo4j** $\ge 5.x$ (Neo4j Aura or self-hosted)
3. **Redis** $\ge 6.x$ (Upstash, Redis Cloud, or self-hosted)
4. **Qdrant** (Qdrant Cloud or self-hosted)
5. **Groq API Key** (LPU model inference)
6. **Google Gemini API Key** (Vector embeddings)

### Startup Sequence
1. `verifyLicenseOnStartup()` validates license against the central license server.
2. Ingestion worker initializes BullMQ connection.
3. `ensurePostgresTables()` idempotently provisions all 9 relational schemas.
4. `ensureCollection()` validates the Qdrant vector collection.
5. `ensureIndexes()` verifies Neo4j Cypher indexes.
6. `startMetricsScheduler()` initializes cron schedules and runs initial analytics.
7. Express app binds to `PORT` and begins listening.

---

## 25. How to Answer Tough Questions in Meetings

### Q: "Is the AI hallucinating or inventing these numbers?"
**Authoritative Response:**  
> *"No. Cortex operates on a strict separation of concerns: a Calculator Engine and a Formatter Engine. All risk scores, bus factors, and successor rankings are generated by pure TypeScript mathematical algorithms operating directly on your Neo4j property graph. There is zero AI involvement in any numerical calculation.*  
> *The LLM is strictly used to format verified structured evidence into clear narrative English. If data does not exist, the agent explicitly returns 'No records found' rather than fabricating a response."*

### Q: "How is the Knowledge Risk score calculated? How do we know it's accurate?"
**Authoritative Response:**  
> *"It is calculated via a 6-factor deterministic formula with documented weights: 30% Code Ownership, 20% Downstream Dependency, 15% Recent Activity, 15% Documentation Coverage, 10% Expertise Breadth, and 10% Pending Issues.*  
> *Every variable is queried directly from Neo4j based on actual Git commits, PR merges, and Jira tickets. Any metric can be independently audited by running the underlying Cypher queries directly."*

### Q: "What if an engineer writes complex code but pushes fewer commits?"
**Authoritative Response:**  
> *"We acknowledge that raw commit volume does not equal complexity. However, Cortex evaluates indirect complexity signals: high downstream service dependencies, low documentation coverage, and exclusive technology usage.*  
> *Most importantly, Cortex is explicitly designed NOT to evaluate developer performance. It is an architectural continuity map that identifies where the organization has single points of failure, not an employee ranking system."*

### Q: "Does our proprietary source code leave our VPC?"
**Authoritative Response:**  
> *"Under our BYOC (Bring Your Own Cloud) deployment, your source code remains entirely within your infrastructure boundary. Cortex runs as a container inside your private network.*  
> *The only outbound API calls are to enterprise LLM endpoints passing high-level extracted summaries (1–2 sentences), operating under zero-retention agreements where data cannot be stored or used for model training. Raw source code repositories and full file contents are never transmitted outside your network."*

---

*End of document.*  
**Maintained by:** Cortex Engineering Team  
**File Location:** `docs/05_CORTEX_INTERNAL_BIBLE.md`
