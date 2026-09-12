# CORTEX INTERNAL BIBLE
## Complete Engineering & Product Knowledge Document
**Version:** 1.0 | **Date:** September 2026 | **Generated from:** Live codebase audit
**Status:** Internal Only — Not for external sharing

> **Purpose of this file:** Ye document Cortex ke har ek system, decision, formula, bug, aur
> limitation ka complete record hai. Koi bhi meeting mein jo bhi sawaal kare — technical ya
> business — uska jawab is document mein source file reference ke saath milega.
> Isko padhne ke baad tumhe koi bhi question answerless nahi lagega.

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
22. [What Works vs What Doesnt (Honest Verdict)](#22-what-works-vs-what-doesnt)
23. [Environment Variables — Every Key Explained](#23-environment-variables)
24. [How to Deploy — BYOC Model](#24-how-to-deploy--byoc-model)
25. [How to Answer Tough Questions in Meetings](#25-how-to-answer-tough-questions-in-meetings)

---

## 1. What is Cortex

**Ek line mein:**
Cortex ek Engineering Intelligence Platform hai jo companies ke bikhre hue engineering data
(GitHub, Jira, Slack) ko ek live Knowledge Graph mein convert karta hai aur phir deterministic
mathematical formulas se batata hai ki kaun-sa engineer sabse zyada critical hai, kaun best
successor ho sakta hai, aur kaunsi codebase SPOF (Single Point of Failure) hai.

**Technical Definition:**
```
Cortex = Data Ingestion Layer (Webhooks)
       + Async Processing Queue (BullMQ + Redis)
       + AI Entity Extraction (Groq LLM — gpt-oss-120b primary)
       + Knowledge Graph (Neo4j — relationships, dependencies, ownership)
       + Vector Search (Qdrant + Gemini Embeddings — semantic search)
       + Deterministic Analytics Engine (TypeScript math — no AI in numbers)
       + LangGraph AI Chat Agent (multi-tool reasoning)
       + React Dashboard (Vite + TypeScript)
```

**Jo Cortex answer karta hai (code-verified):**

| Sawaal | Cortex ka Tool | Source File |
|---|---|---|
| "Agar [X] kal resign kare toh kitna risk?" | Knowledge Risk (6-factor score) | `packages/analytics/knowledge.service.ts` |
| "Kaun best successor ho sakta hai?" | Successor Engine (Jaccard algo) | `packages/analytics/successor.service.ts` |
| "Kaun si repos mein Bus Factor = 1?" | Repo Metrics SQL query | `packages/analytics/repoMetrics.service.ts` |
| "Kyun Redis remove kiya gaya tha?" | Vector semantic search (Qdrant) | `packages/agent/graph/nodes/vector.node.ts` |
| "Kaun expert hai [technology X] mein?" | Graph expertise query (Neo4j) | `packages/agent/graph/nodes/graph.node.ts` |
| "Agar [service Y] down ho, kya kya break hoga?" | Graph impact analysis | `packages/agent/tools/toolDefinitions.ts` |

**The core value claim (from README.md):**
> "Cortex never guesses: if data exists, it calculates; if not, it never hallucinates."
>
> Implementation: All numbers come from TypeScript math on real Neo4j/Postgres data.
> LLM only formats pre-computed evidence into readable text. Zero AI-generated numbers.

---

## 2. What Cortex is NOT

**Ye cheezein Cortex KABHI nahi karega. Reasoning ke saath:**

| Cheez jo Cortex NAHI hai | Kyun nahi karega | Agar banaya toh kya problem |
|---|---|---|
| **Employee Performance Grading** | Commits ≠ value (Goodhart's Law) | Developers rebel, fake commits badhenge, enterprise HR reject karega |
| **WFH vs WFO Tracking** | HR/HRMS ka domain hai | Product identity lost, trust destroy, no enterprise adoption |
| **Session/CyberSource Monitoring** | APM tools ka kaam (Datadog, Splunk) | Scope creep se system collapse, compete in wrong market |
| **General Workplace Search** | Glean already $7B pe yeh karta hai | Direct competition with 0% chance of winning |
| **Developer Leaderboard/Ranking** | Psychologically harmful, legally risky | Enterprise HR compliance issues |
| **Real-time Code Review Bot** | GitHub Copilot/CodeRabbit ka domain | Reinventing wheel in saturated market |

**Meeting mein agar koi yeh features maange:**
> *"Yeh Cortex ka scope nahi hai aur hum yeh kabhi nahi banayenge.
> Cortex ka focus sirf Engineering Architectural Memory aur Departure Risk Insurance hai."*

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
│  ├── /api/github/webhook  (no authGuard — uses HMAC)                        │
│  ├── /api/slack/events    (no authGuard — uses HMAC)                        │
│  ├── /api/jira/webhook    (no authGuard — uses query secret)                │
│  └── authGuard → Bearer token required for ALL other /api/* routes          │
└─────────────┬────────────────────────────────────────────────────────────────┘
              │ Postgres INSERT (idempotent — ON CONFLICT on github; ⚠️ missing on slack/jira)
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
│  Primary: openai/gpt-oss-120b (via Groq API)                                │
│  Fallback: gpt-oss-20b → qwen/qwen3.6-27b → groq/compound-mini             │
│  Prompt: extraction.prompt.github.ts (GitHub + Jira), extraction.prompt.slack.ts │
│  Output: JSON {entities, relationships, newEntities, newRelations, summary}  │
│  Temperature: 0 | max_tokens: 4096 | response_format: json_object           │
└──────────┬──────────────────────────────────────┬────────────────────────────┘
           │ upsertEntity + upsertRelation         │ generateEmbeddings(summary)
           ▼                                       ▼
┌────────────────────────────┐       ┌─────────────────────────────────────────┐
│    NEO4J KNOWLEDGE GRAPH   │       │         QDRANT VECTOR DATABASE          │
│  Nodes: PERSON, TECHNOLOGY │       │  Collection: QDRANT_COLLECTION_NAME     │
│  REPOSITORY, COMMIT, PR    │       │  Vector size: 384 (Gemini embedding-2)  │
│  ISSUE, TEAM, FILE, ORG    │       │  Distance: Cosine                       │
│  Relations: AUTHORED, USES │       │  Content: LLM event summaries           │
│  DEPENDS_ON, PART_OF, etc. │       │  Used for: semantic search queries      │
│  Allowlist enforced ✅     │       └─────────────────────────────────────────┘
└──────────┬─────────────────┘
           │ Daily Cron @ 18:00 IST (+ immediate on startup)
           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ANALYTICS ENGINE  (packages/analytics/)                   │
│  personMetrics.service.ts   → 6-factor Knowledge Risk per person            │
│  repoMetrics.service.ts     → Bus Factor + Risk Score per repo              │
│  successor.service.ts       → 4-factor Successor ranking                   │
│  technologyMetrics.ts       → Tech footprint and trends                     │
│  workspaceMetrics.service.ts → Org-level aggregated KPIs                   │
│  dailyReport.service.ts     → Executive HTML report (Groq-formatted)        │
│  offboarding.service.ts     → Departure handoff generator                   │
│  prRisk.service.ts          → PR merge risk evaluator                       │
│  All numbers stored in Postgres tables (person_metrics, repo_metrics, etc.) │
└──────────┬───────────────────────────────────────────────────────────────────┘
           │ API calls from Frontend or direct chat queries
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

### 4.1 GitHub Webhook — STATUS: ✅ WORKING CORRECTLY

**Files:** `apps/api/modules/github/router.ts`, `apps/api/modules/github/controller.ts`

**Complete flow step-by-step:**
1. GitHub sends `POST /api/github/webhook`
2. Headers checked: `x-hub-signature-256` (HMAC), `x-github-delivery` (unique ID), `x-github-event` (type)
3. `validateGithubSignature()` verifies HMAC-SHA256 with `env.GITHUB_SECRET` → 403 on fail
4. `parseGithubEvent()` converts raw payload to typed `IParsedGithubEvent`
5. Postgres INSERT:
   ```sql
   INSERT INTO events(id, provider, event_type, external_id, payload)
   VALUES (snowflake_id, 'github', event_type, deliveryID, rawBody)
   ON CONFLICT (provider, external_id) DO NOTHING
   ```
   `external_id = deliveryID` (GitHub's unique delivery header) → truly idempotent
6. If INSERT returns 0 rows → duplicate delivery, skip silently (no error)
7. BullMQ job added: `{ removeOnFail: false }` → failed jobs RETAINED for investigation
8. Worker picks up → LLM extraction → Neo4j write + Qdrant write

**Why `deliveryID` and not some internal ID?**
GitHub guarantees `x-github-delivery` is unique per webhook delivery attempt.
Using it as `external_id` means even if GitHub retries the same event, Postgres
prevents duplicate processing. This is textbook idempotency.

---

### 4.2 Slack Webhook — STATUS: ❌ PARTIALLY BROKEN

**File:** `apps/api/modules/slack/controller.ts`

**What works:**
- HMAC-SHA256 signature verification ✅
- 5-minute timestamp window check (prevents replay attacks) ✅

**Bug B-01: Duplicate delivery causes unhandled 500**
```typescript
// Current code — NO ON CONFLICT clause
await sql`INSERT INTO events(id, provider, event_type, external_id, payload)
          VALUES (${uniqueID}, 'slack', ...)`
// Problem: Slack retries if server doesn't respond in 3 seconds
// Retry → same event_id → Postgres unique constraint violation → 500 crash
```
**Fix:** Add `ON CONFLICT (provider, external_id) DO NOTHING` AND use Slack's `event.event_id`
from the payload body as `external_id` (not a random snowflake ID).

**Bug B-02: Silent data loss on processing failure**
```typescript
removeOnFail: true  // After 3 failed retries, job is permanently deleted
// If LLM times out or Neo4j is down, that Slack message is GONE FOREVER
```
**Fix:** Change to `removeOnFail: false`

---

### 4.3 Jira Webhook — STATUS: ❌ BROKEN (3 bugs)

**Files:** `apps/api/modules/jira/router.ts`, `apps/api/modules/jira/validator.ts`,
`apps/api/modules/jira/controller.ts`

**Bug B-03: Issue history completely lost after first event**
```typescript
// router.ts line 15
const externalId = payload?.issue?.id || null
// Problem: Jira issue ID is the SAME for all events on that ticket
// Created: external_id = "PROJ-123-id-12345" → INSERT succeeds
// Updated: external_id = "PROJ-123-id-12345" → ON CONFLICT → REJECTED
// Commented: external_id = "PROJ-123-id-12345" → ON CONFLICT → REJECTED
// Result: Only the creation event is stored. All updates/comments are silently dropped.
```
**Fix:** Use `payload.webhookEvent + "_" + payload.timestamp` or Atlassian's delivery UUID
(available as `X-Atlassian-Webhook-UUID` header) as `external_id`.

**Bug B-04: Secret leaks in server logs and proxy logs**
```typescript
// validator.ts line 6
const providerSecret = req.query.secret
// URL: /api/jira/webhook?secret=supersecretvalue
// This secret appears in:
//   - Express access logs
//   - Nginx/reverse proxy logs
//   - Cloudflare logs
//   - Browser history if webhook is tested manually
//   - HTTP referrer headers
```
**Fix:** Switch to `X-Atlassian-Webhook-Secret` request header.
Jira Cloud supports header-based secret validation for enhanced webhooks.

**Bug B-05: Same as Slack — silent data deletion**
```typescript
removeOnFail: true  // Same data loss problem as Slack
```
**Fix:** Change to `removeOnFail: false`

---

## 5. Queue & Worker System

**Files:** `packages/queue/bullmq.ts`, `packages/queue/jobs.ts`,
`packages/workers/ingest.worker.ts`, `packages/workers/scheduler.worker.ts`

### 5.1 Queue Config
- **Queue name:** `processing-queue`
- **Backend:** Redis (ioredis)
- **Single Worker** — one BullMQ Worker instance handles all job types
- **Concurrency:** `env.QUEUE_WORKERS_CONCURRENCY` (default: `1`)

### 5.2 Job Types
```typescript
JOBS = {
  GITHUB_EVENT:     "github-event",
  JIRA_EVENT:       "jira-event",
  SLACK_EVENT:      "slack-event",
  NOTION_EVENT:     "notion-event",      // ⚠️ Handler is EMPTY — does nothing
  CONFLUENCE_EVENT: "confluence-event"   // ⚠️ Handler is EMPTY — does nothing
}
```
Notion and Confluence are declared in the enum but their case blocks in the worker
are empty `break` statements. Declaring support for these is misleading — they are
future placeholder work.

### 5.3 Retry & Failure Config Per Provider

| Provider | Attempts | Backoff | On Fail Behavior |
|---|---|---|---|
| GitHub | 3 | Exponential (2s base) | `removeOnFail: false` → RETAINED ✅ |
| Slack | 3 | Exponential (2s base) | `removeOnFail: true` → DELETED ❌ |
| Jira | 3 | Exponential (2s base) | `removeOnFail: true` → DELETED ❌ |

### 5.4 Scalability Reality Check

**Current throughput ceiling:**
- 1 worker, concurrency 1
- Each job: ~2-8 seconds (DB fetch + LLM API call + 2-3 Neo4j sessions + Qdrant write)
- Max throughput: ~7-30 events per minute at best

**Rate limit concern:**
- Groq free tier: 30 RPM for gpt-oss-120b
- At high event volume, queue will back up and Groq rate limits will trigger failover

**What happens if Redis crashes?**
- BullMQ cannot enqueue new jobs
- Postgres INSERT still succeeds (event stored)
- Queue enqueue fails silently → event is in Postgres but NEVER processed
- No reconciliation worker exists to re-process stranded Postgres events
- This is a known gap ("no transactional outbox pattern")

### 5.5 Scheduler Worker
**File:** `packages/workers/scheduler.worker.ts`

```
cron.schedule('0 18 * * *', ...)  → runs daily at 18:00 IST
```

**What it runs:**
1. `calculateAllPersonMetrics()` — 6-factor risk for every PERSON in graph
2. `calculateAllRepoMetrics()` — Bus Factor for every REPOSITORY in graph
3. `calculateAllTechnologyMetrics()` — tech usage stats
4. `calculateWorkspaceMetrics()` — org-level aggregation
5. `generateAndSaveDailyReport()` — HTML executive report

**Also runs immediately on server startup** (so metrics tables are never empty post-deploy).

---

## 6. LLM Extraction Layer

**Files:** `packages/llm/providers/groq.ts`, `packages/llm/prompts/`,
`packages/extraction/ontology.ts`, `packages/extraction/entityResolver.ts`

### 6.1 Model Cascade Strategy
```typescript
PRIMARY_MODEL   = 'openai/gpt-oss-120b'
FALLBACK_MODELS = ['openai/gpt-oss-20b', 'qwen/qwen3.6-27b', 'groq/compound-mini']
```

**Failover triggers:** HTTP 429 (rate limit), 413 (payload too large), 404, 500, 503
**Failover mechanism:** Automatic, tries each model in sequence until one succeeds
**Max retries:** Groq SDK has `maxRetries: 3` at SDK level + model cascade at app level

### 6.2 Entity Extraction Call Parameters
```typescript
{
  model: 'openai/gpt-oss-120b',
  temperature: 0,                        // Deterministic output
  max_completion_tokens: 4096,
  response_format: { type: "json_object" }  // Forces valid JSON
}
```

### 6.3 Allowed Entities and Relations (Ontology)
**File:** `packages/extraction/ontology.ts`

**Entity Types (ALLOWED_ENTITY_TYPES Set in graph.repository.ts):**
```
PERSON, TECHNOLOGY, REPOSITORY, ISSUE, PULL_REQUEST, COMMIT, TEAM, FILE, ORGANIZATION
```

**Relation Types (ALLOWED_RELATIONS Set in graph.repository.ts):**
```
USES, HAS_PROBLEM, FIXED_BY, REPLACED_BY, DEPENDS_ON, WORKS_ON,
CREATED, MENTIONED_IN, ASSIGNED_TO, PART_OF, AUTHORED
```

**Cypher Injection Protection (FIXED as of current codebase):**
```typescript
// graph.repository.ts lines 4-12
const ALLOWED_RELATIONS = new Set([...])
const ALLOWED_ENTITY_TYPES = new Set([...])

// In upsertRelation():
if (!ALLOWED_RELATIONS.has(normalizedType)) {
  throw new Error(`Invalid relationship type: ${type}`)  // Blocks injection
}

// In upsertEntity():
if (!ALLOWED_ENTITY_TYPES.has(normalizedType)) {
  throw new Error(`Invalid entity type: ${type}`)  // Blocks injection
}
```
✅ Cypher injection is now properly blocked. Prior audit finding is RESOLVED.

### 6.4 LLM Output Format
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
  "summary": "Arjun merged PR #42 adding JWT auth to auth-service using Node.js"
}
```

`newEntities` and `newRelations` are entities/relations the LLM wants to create but
that don't match the allowed ontology. The system routes these through entity normalization
(`entityResolver.ts`) which tries to map them to known types.

### 6.5 Known Bug: Jira Uses Wrong Extraction Prompt
```typescript
// Jira processor internally calls buildGithubExtractionPrompt() — WRONG
// Jira-specific fields (priority, sprint, issue type, reporter vs assignee) are not
// optimally extracted because the prompt instructs extraction of GitHub-style events.
```
**Fix needed:** Create `extraction.prompt.jira.ts` tailored to Jira's data structure.

### 6.6 Cost Calculation
**Groq pricing (gpt-oss-120b):**
- Input tokens: $0.15 per 1,000,000 tokens
- Output tokens: $0.60 per 1,000,000 tokens

**Cost per extraction at max output:**
- 4096 output tokens × $0.60/M = $0.00246 per call (output only)
- Input cost additional (depends on payload size)

**No token accounting exists** — cost per event, per client, or per day is unknown.
This is a production gap if billing per-client or budget management is needed.

---

## 7. Knowledge Graph — Neo4j

**File:** `packages/database/neo4j/graph.repository.ts`

### 7.1 Node Labels and Key Properties

| Label | Represents | Key Properties |
|---|---|---|
| PERSON | Engineers, contributors | name, email, externalId, provider |
| TECHNOLOGY | Languages, frameworks, tools | name |
| REPOSITORY | Code repositories | name, externalId |
| COMMIT | Git commits | name (hash), createdAt, timestamp |
| PULL_REQUEST | GitHub/Jira PRs | name, externalId, status |
| ISSUE | Jira/GitHub issues | name, externalId, status |
| TEAM | Engineering teams | name |
| FILE | Source files | name |
| ORGANIZATION | Companies/orgs | name |

### 7.2 Relationship Types and Semantics

| Relationship | From → To | Semantic Meaning |
|---|---|---|
| AUTHORED | PERSON → COMMIT/PR/ISSUE | Engineer created this work item |
| WORKS_ON | PERSON → REPOSITORY | Engineer contributes to this repo |
| USES | PERSON/REPO/COMMIT → TECHNOLOGY | Uses this technology |
| PART_OF | COMMIT/PR → REPOSITORY | Work item belongs to this repo |
| DEPENDS_ON | REPO/SERVICE → REPO/SERVICE | Service dependency relationship |
| ASSIGNED_TO | ISSUE → PERSON | Issue is assigned to this person |
| MENTIONED_IN | TECHNOLOGY → COMMIT/ISSUE | Tech discussed/mentioned here |
| HAS_PROBLEM | REPO → ISSUE | Repository has this open issue |
| FIXED_BY | ISSUE → COMMIT | Issue was resolved in this commit |
| REPLACED_BY | TECHNOLOGY → TECHNOLOGY | Tech migration record (Redis → Valkey) |
| CREATED | PERSON → REPOSITORY | Person originally created this repo |

### 7.3 Neo4j Indexes (Ensured on Every Boot)
```cypher
CREATE INDEX entity_person_email    IF NOT EXISTS FOR (n:PERSON)     ON (n.email)
CREATE INDEX entity_person_externalid IF NOT EXISTS FOR (n:PERSON)   ON (n.externalId)
CREATE INDEX entity_repo_externalid IF NOT EXISTS FOR (n:REPOSITORY) ON (n.externalId)
CREATE INDEX entity_person_name     IF NOT EXISTS FOR (n:PERSON)     ON (n.name)
CREATE INDEX entity_repo_name       IF NOT EXISTS FOR (n:REPOSITORY) ON (n.name)
CREATE INDEX entity_tech_name       IF NOT EXISTS FOR (n:TECHNOLOGY) ON (n.name)
CREATE INDEX entity_commit_createdat IF NOT EXISTS FOR (n:COMMIT)    ON (n.createdAt)
```

**Important caveat:** These are INDEXES (fast lookup), NOT UNIQUENESS CONSTRAINTS.
Concurrent writes could theoretically create duplicate nodes. With concurrency=1 worker,
this is rarely a practical issue. For production multi-worker, add UNIQUE constraints:
```cypher
CREATE CONSTRAINT person_name_unique IF NOT EXISTS FOR (p:PERSON) REQUIRE p.name IS UNIQUE
```

### 7.4 Person Deduplication (Cross-Provider Merging)
When a PERSON entity arrives:
1. **If email is present:** Match existing PERSON by email → update that node
2. **If no email match:** Match by name (toLower comparison) → update that node
3. **If no match at all:** Create new PERSON node

**Purpose:** Prevents duplicate "Arjun" nodes from GitHub commits vs Slack messages
if the same person appears under different usernames.

### 7.5 Relationship Evidence Storage
```
r.createdAt = timestamp()   ← set when relationship first created
r.updatedAt = timestamp()   ← updated on every re-processing of same edge
r.evidence  = "short string from LLM (5-10 words)"
```

**Known limitation:** Evidence is OVERWRITTEN each time. No history/provenance of
how the relationship's evidence has evolved over time. This is intentional for simplicity
but means you can't query "what was the original evidence for this relationship 6 months ago."

---

## 8. Vector Search — Qdrant

**Files:** `packages/database/vector/qdrant.repository.ts`, `packages/llm/providers/gemini.ts`

### 8.1 Collection Configuration
```typescript
{
  vectors: {
    size: 384,         // Gemini embedding-2 with outputDimensionality: 384
    distance: "Cosine" // Cosine similarity for semantic search
  }
}
```

### 8.2 What Gets Embedded
**NOT the full raw webhook payload** — only the LLM-generated 1-2 sentence summary:
```
"Arjun merged PR #42 adding JWT authentication to auth-service using Node.js crypto module"
```
**Why summary only?** Full payloads can be very large (bulk commits with 200 file changes).
Embedding only the semantic summary is faster and focuses on meaning over raw text.

**Tradeoff:** Retrieval loses granular source detail (exact file names, exact code changes).
Only the summary-level meaning is searchable.

### 8.3 Embedding Model
- Model: `gemini-embedding-2` (Google GenAI SDK)
- `outputDimensionality: 384` (below Google's recommended 768/1536 for higher quality)
- Reason: "384 dimensions consume less RAM" (comment in code)
- Impact: Lower recall accuracy vs higher dimensions — acceptable for current scale

### 8.4 Known Bug: Duplicate Vectors on Retry
```typescript
// qdrant.repository.ts upsertVector call
const id = uuid()  // NEW UUID every time this function is called
// If a job fails and retries, a second vector with different UUID is inserted
// alongside the first — creating semantic duplicates for the same event
```
**Fix needed:** Use the Postgres `events.id` (Snowflake ID) as Qdrant point ID.
Qdrant upsert is idempotent when same ID is reused — auto-replaces existing vector.

### 8.5 Known Bug: Silent Failure
```typescript
catch (error: any) {
  console.log(`Error While Inserting Vector on Vector DB`)
  // No throw — worker continues and reports success even if Qdrant write failed
}
```
Events get processed into Neo4j but their semantic vectors are silently lost.
Only console log evidence. No counter, no alert, no retry of just the embedding step.

---

## 9. Analytics Engine — 6-Factor Formula

**Files:** `packages/analytics/knowledge.service.ts`, `packages/analytics/knowledge.risk.predict.ts`

### 9.1 Knowledge Risk Score Formula
```
Knowledge Risk = (0.30 × Ownership)
               + (0.20 × Dependency)
               + (0.15 × Activity)
               + (0.15 × Documentation)
               + (0.10 × Expertise)
               + (0.10 × PendingWork)

All components: 0.0 – 1.0 scale
totalRisk output: 0.0 – 1.0 scale
Stored in Postgres as: Math.round(totalRisk × 100)  → 0 to 100 integer
```

### 9.2 Component Deep Dive

**OWNERSHIP (30% weight) — "How much of the codebase belongs to only this person?"**
```
personItems = count of COMMIT/PR nodes this person AUTHORED
totalItems  = total COMMIT/PR nodes in entire graph
score = personItems / totalItems  (capped at 1.0)
```
*Why 30%?* Code ownership is the primary risk signal — if you own most commits to a
critical service and leave, nobody else knows it as deeply.

**DEPENDENCY (20% weight) — "How many other things depend on what this person built?"**
```
count = entities that DEPEND_ON or USE things this person AUTHORED
score = count / normalizer  (capped at 1.0)
```
*Why 20%?* A person's code being depended on by many other services = departure has
blast radius beyond just their own work.

**ACTIVITY (15% weight) — "Have they been doing work recently?"**
```
recentItems = COMMIT/PR nodes this person AUTHORED (all time)
score = min(recentItems / normalizer, 1.0)
```
*Why 15%?* Active contributors have more in-flight context that would be lost.
Inactive engineers matter less for current operational risk.

**DOCUMENTATION (15% weight) — "How much knowledge exists only in their head?"**
```
docFiles = FILE nodes (docs, READMEs) this person AUTHORED
score = min(docFiles / normalizer, 1.0)
```
*Why 15%?* Undocumented knowledge = maximum departure risk. If they wrote docs,
others can reference them after departure.

**EXPERTISE (10% weight) — "Are they the only one who knows this technology?"**
```
uniqueItems = distinct COMMIT/TECHNOLOGY/REPOSITORY nodes this person has touched
score = min(uniqueItems / 20, 1.0)
```
*Why 10%?* Breadth is important but secondary — someone with deep expertise in one
area is more recoverable than someone with shallow expertise across many areas.

**PENDING WORK (10% weight) — "How much work will become orphaned?"**
```
pendingIssues = ISSUE nodes currently ASSIGNED_TO this person
score = min(pendingIssues / 10, 1.0)
```
*Why 10%?* Open assigned work becomes a handoff burden but is lowest weight because
work can be reassigned — it's less irreversible than knowledge loss.

### 9.3 Parallel Execution
All 6 components run in parallel (Promise.all) to minimize latency:
```typescript
const [ownership, dependency, activity, documentation, expertise, pendingWork] =
  await Promise.all([...])  // Each opens its own Neo4j session
```

### 9.4 Relation Mapping — Graceful Degradation
Before running formulas, system fetches live Neo4j schema (node labels + relation types).
If a relation doesn't exist yet (e.g., `AUTHORED` not present in schema because no
GitHub commits ingested yet), that component returns `score: 0` without error.
This allows graceful degradation on fresh/sparse deployments.

---

## 10. Successor Engine — 4-Factor Formula

**File:** `packages/analytics/successor.service.ts`

```
Successor Score = (0.40 × SharedTechScore)
                + (0.25 × SharedRepoScore)
                + (0.20 × RecentActivityScore)
                + (0.15 × WorkloadCapacityScore)

Output: 0 – 100 integer (final score for each candidate)
```

### 10.1 Factor Breakdown with Reasoning

**SHARED TECHNOLOGIES (40%) — "Can they actually do the job?"**
```
Jaccard Similarity = |A ∩ B| / |A ∪ B|
where A = target engineer's technology set (what they know)
      B = candidate's technology set (what they know)
SharedTechScore = Jaccard × 100
```
Highest weight because tech stack overlap = candidate can hit the ground running.
A Java developer cannot immediately inherit a Rust/Erlang codebase.

**SHARED REPOSITORIES (25%) — "Do they already know the codebase?"**
```
SharedRepoScore = (repos in common / target's total repos) × 100
```
If candidate already contributes to overlapping repos, they have context and don't
need months of ramp-up to understand the architecture.

**RECENT ACTIVITY (20%) — "Are they available and engaged right now?"**
```
daysSinceLastActivity <= 30:  score = 100  (label: active_recent)
30 < days <= 60:              score = 60   (label: active_moderate)
60 < days <= 90:              score = 30   (label: dormant)
days > 90 or null:            score = 0    (label: inactive)
```
An engineer on long leave or inactive cannot reliably take over emergency ownership.

**WORKLOAD CAPACITY (15%) — "Are they already overloaded?"**
```
WorkloadCapacityScore = (1.0 - candidateKnowledgeRisk) × 100
```
If a candidate already has high departure risk themselves (bus factor 1 on their own repos),
they shouldn't absorb MORE critical ownership. This prevents concentrating risk further.

### 10.2 Disqualification Rule
```
IF sharedTechnologies == 0 AND sharedRepositories == 0:
  → Candidate is EXCLUDED entirely
```
No overlap = fundamentally wrong person to suggest. Including them would be misleading.

### 10.3 Output Format
```typescript
SuccessorCandidate {
  name: string
  score: number         // 0-100 final weighted score
  breakdown: {
    sharedTechScore: number    // 0-100
    sharedRepoScore: number    // 0-100
    recentActivityScore: number // 0-100
    workloadCapacityScore: number // 0-100
  }
  factors: {
    sharedTechnologies: string[]  // What tech they share
    techJaccard: number           // Raw Jaccard value (0-1)
    sharedRepositories: string[]  // Which repos overlap
    daysSinceLastActivity: number | null
    activityStatus: 'active_recent' | 'active_moderate' | 'dormant' | 'inactive'
    existingKnowledgeRisk: number  // Their own risk score
    spofReposCount: number         // How many SPOF repos they already own
  }
  rationale: string  // Plain English explanation
}
```

---

## 11. Bus Factor & Repo Risk Formula

**File:** `packages/analytics/repoMetrics.service.ts`

### 11.1 Bus Factor Calculation
```
Bus Factor = number of unique engineers whose combined commits exceed 50% of repo total
```

**In Neo4j Cypher:**
```cypher
MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY {name: $repoName})
WITH p, count(c) AS personCommits
ORDER BY personCommits DESC
WITH collect({person: p.name, commits: personCommits}) AS ranked,
     sum(personCommits) AS totalCommits
...  // cumulative sum until > 50% threshold is crossed
RETURN busFactor
```

### 11.2 Risk Score from Bus Factor
```
busFactor == 0:    riskScore = 80  (no commits indexed = assume fragile)
busFactor >= 1:    riskScore = max(0, 100 - busFactor × 20)
```

| Bus Factor | Risk Score | Status |
|---|---|---|
| 0 (no data) | 80 | fragile |
| 1 | 80 | fragile (SPOF) |
| 2 | 60 | concentrated |
| 3 | 40 | healthy |
| 4 | 20 | healthy |
| 5+ | 0 | healthy |

**Why busFactor × 20?** Each additional person who can own 50% of the repo reduces
risk by 20 percentage points. Linear for simplicity and easy to explain to management.

---

## 12. AI Chat Agent — LangGraph Workflow

**File:** `packages/agent/graph/workflow.ts`

### 12.1 Complete Node Execution Flow
```
START
  ↓
plannerNode
  (Decomposes query into subgoals. Uses LLM native tool calling with live schema injected.
   Emits tool calls for: knowledge_risk, sql_search, vector_search, graph_*, etc.)
  ↓
retrievalPlannerNode
  (Selects which tool to execute next based on pending subgoals)
  ↓
  ├─▶ vectorNode
  │   (Embeds query → searches Qdrant → returns relevant event summaries)
  │   (Used for: "why was X changed", "what broke in incident Y", PR rationale)
  │
  ├─▶ graphNode
  │   (Executes Neo4j Cypher → returns entity/relationship data)
  │   (Used for: dependencies, paths between nodes, expertise lookup, entity details)
  │
  ├─▶ sqlNode
  │   (Executes Postgres query → returns structured metrics)
  │   (Used for: bus factor, risk scores, person metrics, recent activity timeline)
  │
  ├─▶ knowledgeRiskNode
  │   (Runs full 6-factor knowledge risk + 4-factor successor calc for a person)
  │   (Used for: "what if X leaves", "who can replace X")
  │
  ├─▶ cypherFallbackNode
  │   (Direct Cypher generation for unusual graph queries not covered by other tools)
  │
  └─▶ clarifyNode
      (When query is too ambiguous — asks user for clarification, then END)
  ↓
evidenceNode
  (Aggregates all tool results into unified StructuredEvidence payload)
  ↓
reflectionNode
  (LLM evaluates: "Are all subgoals covered by current evidence?")
  ↓
  ├─▶ (gaps found) → retrievalPlannerNode (retry with different tools, up to recursionLimit=25)
  ├─▶ (complete) → answerNode
  └─▶ (clarification needed) → clarifyNode → END
  ↓
answerNode
  (LLM formats final answer using ONLY the StructuredEvidence. Zero-Fabrication prompt.)
  ↓
END
```

### 12.2 Tool Selection — Key Rules from Planner Prompt
Source: `packages/llm/prompts/planner.prompt.ts`

| Query type | Required tool | Why |
|---|---|---|
| "leaves/resigns/departing" | `knowledge_risk` | Only this tool computes full departure impact |
| "bus factor/SPOF/repo risk" | `sql_search (repos_by_bus_factor)` | Metrics are in Postgres |
| "why was X changed/removed" | `vector_search` | Architectural rationale in event summaries |
| "dependency chain/blast radius" | `graph_dependency_analysis` | Neo4j graph traversal |
| "connection between A and B" | `graph_shortest_path` | Neo4j path finding |
| "who is expert on X" | `graph_expertise_analysis` | Graph centrality around topic |
| Mixed questions | Multiple tools in parallel | Compound queries need compound evidence |

### 12.3 Answer Quality — Honest Assessment

**What IS enforced (by prompt):**
- "Every claim must trace to EVIDENCE" (Zero Fabrication rule)
- If person not in evidence → "No indexed records found for [Name]"
- If no successor qualifies → "No candidate with overlapping tech found"
- Must address EVERY sub-question in query (Zero Dropped Asks rule)
- Language: responds in user's requested language (Hindi/English/Hinglish)

**What is NOT technically enforced (code limitation):**
- No post-generation claim-to-source validation in code
- LLM can technically write beyond evidence if prompt instructions are ignored
- This is the gap between "Zero Hallucination" marketing claim and implementation reality
- Mitigation: Temperature=0, strict prompt, all evidence pre-computed by deterministic tools

### 12.4 Streaming Implementation
- Endpoint: `POST /api/chat/stream`
- Type: Simulated streaming (full answer computed first, then word-chunked)
- Chunk size: 4 words per SSE event, 15ms delay between chunks
- **Bug:** Hardcoded relative URL `/api/chat/stream` in frontend breaks when frontend
  and API are on different hosts → **Fix:** Use `${VITE_API_BASE_URL}/api/chat/stream`

---

## 13. Identity Resolution System

**File:** `packages/identity/canonicalPerson.service.ts`

### 13.1 Why It Exists
Same real person often appears under different identities across systems:
- GitHub: `arjun-negi-dev` (username)
- Slack: `Arjun Negi` (display name)
- Jira: `arjun.negi@company.com` (email)

Without resolution: 3 separate PERSON nodes, split knowledge risk, broken successor scoring.
With resolution: 1 canonical PERSON node, unified metrics.

### 13.2 Resolution Priority Chain
```
Priority 1: EXACT EMAIL MATCH (Confidence: 1.0)
  → Look up person_identity WHERE email = incoming email (case-insensitive)

Priority 2: CROSS-PROVIDER USERNAME MATCH (Confidence: 0.98)
  → Look up person_identity WHERE username = incoming username (case-insensitive)

Priority 3: DISPLAY NAME SIMILARITY > 95% (Confidence: 0.96)
  → Compare all existing display names using Jaro-Winkler string similarity
  → Match if similarity > 0.95

Priority 4: LLM FALLBACK (only if 1-3 all fail, requires ≥ 0.95 LLM confidence)
  → LLM compares names and returns confidence score
  → Used as last resort for ambiguous cases (e.g., "Arjun K" vs "Arjun Kumar")

If all fail: CREATE NEW canonical PERSON record
```

### 13.3 Supported Providers
`github | slack | jira | email | azure_ad | google_workspace | ldap | okta`

### 13.4 Postgres Tables Used
- `person_identity` — the canonical_person_id ↔ provider identity link
- `identity_merge_log` — every merge decision is recorded with reasoning
- `potential_duplicates` — ambiguous cases (similarity 70-95%) flagged for manual review

---

## 14. PostgreSQL Schema — All 9 Tables

**File:** `packages/database/postgres/schema.ts`
All tables created idempotently on every server boot via `ensurePostgresTables()`.

### Table 1: events
```sql
id VARCHAR(255) PRIMARY KEY,           -- Snowflake ID
provider VARCHAR(50) NOT NULL,         -- 'github' | 'slack' | 'jira'
event_type VARCHAR(100),               -- 'push' | 'pull_request' | 'message' | 'jira:issue_created'
external_id VARCHAR(255),              -- Provider's delivery ID (idempotency key)
payload JSONB,                         -- Full raw webhook payload
created_at TIMESTAMPTZ DEFAULT NOW()
UNIQUE INDEX on (provider, external_id)  -- Prevents duplicate processing
```

### Table 2: person_metrics
```sql
id SERIAL PRIMARY KEY,
external_id VARCHAR(255) UNIQUE,       -- Person's canonical ID
person_name VARCHAR(255) NOT NULL,
risk_score INTEGER DEFAULT 0,          -- 0-100 (from 6-factor formula × 100)
top_technologies JSONB,                -- [{name, score}] top 5 by usage
repos JSONB,                           -- [repo_name, ...] all repos they've touched
commit_count INTEGER DEFAULT 0,
computed_at TIMESTAMPTZ DEFAULT NOW()
```

### Table 3: repo_metrics
```sql
id SERIAL PRIMARY KEY,
external_id VARCHAR(255) UNIQUE,
repo_name VARCHAR(255) NOT NULL,
bus_factor NUMERIC(4,1) DEFAULT 1.0,   -- Number of people who own >50% of commits
risk_score INTEGER DEFAULT 0,           -- 0-100 (from bus factor formula)
contributor_count INTEGER DEFAULT 0,
primary_owner VARCHAR(255),            -- Name of person with most commits
status VARCHAR(50) DEFAULT 'healthy',  -- 'healthy' | 'concentrated' | 'fragile'
computed_at TIMESTAMPTZ DEFAULT NOW()
```

### Table 4: technology_metrics
```sql
id SERIAL PRIMARY KEY,
tech_name VARCHAR(255) UNIQUE NOT NULL,
usage_percent NUMERIC(5,2) DEFAULT 0,  -- % of repos using this technology
trend_percent NUMERIC(5,2) DEFAULT 0,
repo_count INTEGER DEFAULT 0,
contributor_count INTEGER DEFAULT 0,
commit_count INTEGER DEFAULT 0,
pr_count INTEGER DEFAULT 0,
issue_count INTEGER DEFAULT 0,
top_experts JSONB,                     -- [{name, score}] engineers most expert in this tech
computed_at TIMESTAMPTZ DEFAULT NOW()
```

### Table 5: workspace_metrics
```sql
id SERIAL PRIMARY KEY,
knowledge_risk_avg INTEGER DEFAULT 0,
bus_factor_avg NUMERIC(4,2) DEFAULT 1.0,
repo_count INTEGER DEFAULT 0,
contributor_count INTEGER DEFAULT 0,
open_issues_count INTEGER DEFAULT 0,
open_prs_count INTEGER DEFAULT 0,
computed_at TIMESTAMPTZ DEFAULT NOW()
```

### Table 6: person_identity
```sql
id VARCHAR(255) PRIMARY KEY,           -- Snowflake ID
canonical_person_id VARCHAR(255) NOT NULL,
provider VARCHAR(50) NOT NULL,
external_id VARCHAR(255) NOT NULL,
username VARCHAR(255),
email VARCHAR(255),
display_name VARCHAR(255),
created_at TIMESTAMPTZ DEFAULT NOW()
UNIQUE on (provider, external_id)      -- One provider identity per canonical person
INDEXED on email (lowercase), username (lowercase), canonical_person_id
```

### Table 7: identity_merge_log
```sql
id VARCHAR(255) PRIMARY KEY,
person_a VARCHAR(255) NOT NULL,
person_b VARCHAR(255) NOT NULL,
confidence NUMERIC(4,3) NOT NULL,      -- 0.000 to 1.000
matched_by VARCHAR(100) NOT NULL,      -- EXACT_EMAIL | USERNAME_MATCH | etc.
reason TEXT,
created_at TIMESTAMPTZ DEFAULT NOW()
```

### Table 8: potential_duplicates
```sql
id VARCHAR(255) PRIMARY KEY,
person_a_id, person_a_name, person_a_provider, person_a_username,
person_b_id, person_b_name, person_b_provider, person_b_username,
similarity_score NUMERIC(4,3) NOT NULL,
status VARCHAR(30) DEFAULT 'pending',  -- 'pending' | 'resolved' | 'rejected'
resolved_at TIMESTAMPTZ,
resolved_by VARCHAR(255),
resolution_reason TEXT,
created_at TIMESTAMPTZ DEFAULT NOW()
```

### Table 9: daily_reports
```sql
id SERIAL PRIMARY KEY,
report_date DATE UNIQUE NOT NULL,      -- One report per day
html_content TEXT NOT NULL,            -- Full HTML report
summary JSONB NOT NULL,                -- Structured summary data
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## 15. API Endpoints — Complete Map

**Authentication model:**
- Webhook routes: Provider HMAC signature (no API key)
- All other `/api/*` routes: Two layers — `licenseGuard` then `authGuard (Bearer token)`

### Webhook Endpoints
| Method | Path | Auth | Status |
|---|---|---|---|
| POST | `/api/github/webhook` | HMAC-SHA256 | ✅ Working |
| POST | `/api/slack/events` | HMAC + timestamp | ⚠️ Broken on duplicate |
| POST | `/api/jira/webhook?secret=` | Query param | ❌ Secret leaks |

### Status Endpoints (No auth)
| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check — returns server status |
| GET | `/api/license/status` | License state (public, outside guard) |

### Dashboard Endpoints (Bearer token required)
| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/overview` | Organization-level KPIs |
| GET | `/api/dashboard/people` | All persons with risk scores |
| GET | `/api/dashboard/bus-factor` | Repository bus factor list |
| GET | `/api/dashboard/repos/:repoName/details` | Single repo deep dive |
| GET | `/api/dashboard/technologies` | Tech stack usage |
| GET | `/api/dashboard/timeline` | Event history timeline |
| GET | `/api/dashboard/findings` | AI-generated risk findings |
| GET | `/api/dashboard/people/:externalId/simulate-departure` | Departure simulation |

### Analytics Endpoints (Bearer token required)
| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/trends` | Commit/PR/Issue trends + graph metrics |
| POST | `/api/analytics/pr-risk` | Evaluate PR merge risk |
| POST | `/api/analytics/offboarding/:name` | Offboarding handoff report |
| POST | `/api/analytics/cypher` | Natural language → Cypher graph query |
| GET | `/api/analytics/daily-report` | Retrieve latest HTML executive report |
| POST | `/api/analytics/daily-report/generate` | Manually trigger report generation |

### Chat Endpoints (Bearer token required)
| Method | Path | Description |
|---|---|---|
| POST | `/api/chat/query` | Non-streaming AI query (full JSON response) |
| POST | `/api/chat/stream` | Streaming AI query (Server-Sent Events) |

### Graph Endpoints (Bearer token required)
| Method | Path | Description |
|---|---|---|
| GET | `/api/graph/overview` | Graph statistics (node/edge counts) |

---

## 16. Security & Access Control

**Files:** `apps/api/bootstrap/app.ts`, `apps/api/middlewares/authGuard.ts`

### 16.1 Current Security Layers

**Layer 1 — CORS Restriction:**
```typescript
cors({ origin: env.FRONTEND_URL, credentials: true })
// Allows only the configured frontend URL to make browser requests
// NOT wildcard "*" — correctly restrictive ✅
```

**Layer 2 — Helmet (HTTP security headers):**
```typescript
app.use(helmet())
// Adds: X-Content-Type-Options, X-Frame-Options, CSP, HSTS etc. ✅
```

**Layer 3 — License Guard (all /api/* routes):**
All API routes blocked if license is inactive (return 403).

**Layer 4 — Auth Guard (non-webhook /api/* routes):**
```typescript
// authGuard.ts — timing-safe Bearer token comparison
const expectedKey = env.CORTEX_API_KEY
const token = req.get('authorization')?.slice(7)  // Remove "Bearer "
crypto.timingSafeEqual(Buffer.from(expectedKey), Buffer.from(token))
// ✅ Timing-safe prevents timing oracle attacks
// ✅ Single shared API key (appropriate for single-tenant BYOC)
```

**Layer 5 — Webhook HMAC (GitHub + Slack):**
Provider-specific HMAC verification prevents unauthorized webhook injection.

### 16.2 What This Access Model Means

| Question | Answer |
|---|---|
| Can anyone on the internet access Cortex data? | No — needs Bearer API key |
| Can any frontend make cross-origin requests? | No — CORS restricted to FRONTEND_URL |
| Are individual user accounts supported? | No — single API key, all-or-nothing |
| Are team-level access controls implemented? | No — all data visible to any key holder |
| Is this acceptable? | Yes — for single-tenant BYOC where client is the key holder |

**For future enterprise RBAC roadmap:**
1. Add `users` table with `role` column (EMPLOYEE | MANAGER | CTO | HR)
2. Issue JWT per user on login
3. Add `teamId` tag on Neo4j REPOSITORY and TEAM nodes
4. Filter all graph queries: `WHERE r.teamId IN $userAllowedTeams`
5. Add role-based endpoint guards for sensitive departures/HR data

---

## 17. License System

**File:** `packages/license/license.client.ts`

### 17.1 How License Validation Works
```
Server boot → verifyLicenseOnStartup() → POST to LICENSE_SERVER_URL with CORTEX_LICENSE_KEY
                                        → If valid: isActive = true → server proceeds
                                        → If invalid: process.exit(1) — hard stop

Every 6 hours → background ping to license server
              → If valid: state updates, continues
              → If invalid: isActive = false → all /api/* return 403

licenseGuard middleware: checks in-memory isActive flag before each request
```

### 17.2 License States
- `ACTIVE` → all `/api/*` routes work normally
- `INVALID` / `NOT_FOUND` → 403 on all API routes
- `EXPIRED` / `SUSPENDED` → 403 on all API routes
- License server DOWN → last valid state for up to 6 hours, then 403 on next ping

### 17.3 Known Limitations
- **In-memory only:** License state not persisted to Redis or Postgres
- **Multi-instance disagreement:** If 2 server instances run, each validates independently
- **Stale window:** Up to 6 hours of operation after license actually expires
- **Fallback env var:** `CORTEX_LICENSE_KEY || process.env.LICENSE_KEY` (backward compat alias)

---

## 18. Daily Report System

**File:** `packages/analytics/dailyReport.service.ts`, `packages/workers/scheduler.worker.ts`

### 18.1 Trigger
- **Automatic cron:** Daily at 18:00 IST (`0 18 * * *` cron, `Asia/Kolkata` timezone)
- **On startup:** Runs immediately (so metrics are populated right after deploy)
- **Manual trigger:** `POST /api/analytics/daily-report/generate`

### 18.2 Data Sources
1. `workspace_metrics` table — org-level health score, repo/contributor counts
2. `repo_metrics` table — bus factor 1 repos (SPOF list)
3. `person_metrics` table — high risk persons (top departure risks)
4. `events` table — commit/PR/issue counts from last 24 hours
5. Neo4j graph — active contributors from last 24h

### 18.3 Report Structure
```typescript
DailyReportData {
  workspace: { healthScore, repoCount, contributorCount, avgRiskScore, avgBusFactor,
               openIssues, openPrs }
  criticalRisks: {
    busFactorOneRepos: [{name, busFactor, riskScore, contributors}]  // All SPOF repos
    highRiskPeople: [{name, riskScore, role, email}]               // Top departure risks
  }
  activitySummary: { commitsCount, prsCount, issuesCount, activeContributors }
  techStack: [{name, usagePercent, contributors}]
  aiRecommendations: string[]  // Groq LLM formats actionable recommendations from data
}
```

### 18.4 Storage
Stored in `daily_reports` Postgres table — UNIQUE on `report_date`.
Old reports are preserved (historical record). Only one report per calendar day.

---

## 19. PR Risk Engine

**File:** `packages/analytics/prRisk.service.ts`

### 19.1 Trigger
`POST /api/analytics/pr-risk`
```json
{
  "repository": "auth-service",
  "prId": "42",
  "author": "arjun-negi",
  "modifiedFiles": ["src/auth/jwt.ts", "src/auth/middleware.ts"],
  "deliveryId": "abc-123"  // Optional, for idempotency
}
```

### 19.2 Calculation Steps
1. **Idempotency check:** Redis lock on `deliveryId` — prevents duplicate processing
2. **Cache check:** Redis cache on `pr_risk:{repo}:{prId}` — returns cached result if exists
3. **Repository bus factor:** Fetched from `repo_metrics` Postgres table
4. **File contributors:** Neo4j query — who else has AUTHORED commits touching these files
5. **Author's own risk:** `calculateKnowledgeRisk(author)` — their departure impact
6. **Composite score:** Weighted combination → 0-100

### 19.3 Output
```typescript
PullRequestRiskOutput {
  riskScore: number              // 0-100
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  affectedPeople: string[]       // Who else is impacted
  affectedRepositories: string[] // Downstream repos
  criticalFiles: string[]        // High-risk files in this PR
  recommendations: string[]      // Plain English actions to reduce risk
}
```

**Severity thresholds:**
- 0-24: LOW
- 25-49: MEDIUM
- 50-74: HIGH
- 75-100: CRITICAL

---

## 20. Offboarding Handoff Generator

**File:** `packages/analytics/offboarding.service.ts`

**Trigger:** `GET /api/dashboard/people/:externalId/simulate-departure`

### 20.1 What It Computes (All deterministic — no AI for numbers)
1. **Owned repositories** — Neo4j query for repos this person AUTHORED/WORKS_ON
2. **Bus factor check** — for each owned repo, fetch from `repo_metrics`
3. **SPOF flag** — mark as SPOF if `busFactor <= 1`
4. **Owned technologies** — TECHNOLOGY nodes this person has used
5. **Open issues** — ISSUE nodes currently ASSIGNED_TO them
6. **Pending PRs** — PULL_REQUEST nodes they've authored that are still open
7. **Knowledge risk score** — full 6-factor calculation
8. **Successor candidates** — full 4-factor Jaccard calculation
9. **Missing documentation** — repos with low documentation coverage

### 20.2 Recovery Time Estimation
```typescript
estimatedRecoveryTimeWeeks = max(1, Math.ceil(knowledgeRiskScore / 20))
```
- Risk 0-20 → 1 week recovery
- Risk 21-40 → 2 weeks
- Risk 41-60 → 3 weeks
- Risk 61-80 → 4 weeks
- Risk 81-100 → 5 weeks

### 20.3 LLM Role
Only the final `summaryMarkdown` field is generated by LLM — it receives all the
pre-computed structured data and formats it into readable Markdown.
LLM never generates any number in the handoff output.

---

## 21. Known Bugs — Current Status

| ID | Component | Description | Severity | Status |
|---|---|---|---|---|
| B-01 | Slack Ingestion | No `ON CONFLICT` → duplicate causes 500 | Critical | 🔴 Open |
| B-02 | Jira Ingestion | `external_id=issue.id` → updates suppressed forever | Critical | 🔴 Open |
| B-03 | Jira Security | Secret in URL query param → leaks in logs | Critical | 🔴 Open |
| B-04 | Slack/Jira Queue | `removeOnFail:true` → data silently deleted | Critical | 🔴 Open |
| B-05 | Qdrant | Random UUID on retry → duplicate vectors | High | 🔴 Open |
| B-06 | Qdrant | Silent failure — error swallowed, no throw | High | 🔴 Open |
| B-07 | Jira LLM | Uses GitHub extraction prompt (wrong context) | Medium | 🔴 Open |
| B-08 | Chat Stream | Relative URL `/api/chat/stream` → breaks on separate host | Medium | 🔴 Open |
| B-09 | Heatmap | Historical slots use modulo math, not real data | Low | 🟡 Acknowledged |
| B-10 | Neo4j | Indexes not UNIQUE constraints → rare concurrent dupe risk | Low | 🟡 Monitored |
| B-11 | Cypher Injection | ALLOWLIST now enforced in upsertRelation + upsertEntity | Resolved | ✅ Fixed |
| B-12 | CORS | Now uses `env.FRONTEND_URL` not wildcard | Resolved | ✅ Fixed |
| B-13 | Analytics fallback | Neo4j down now returns 503, not fake 103/102 | Resolved | ✅ Fixed |
| B-14 | Auth | authGuard Bearer token middleware now applied | Resolved | ✅ Fixed |

**Fix priority order:** B-01 → B-02 → B-03 → B-04 (critical safety), then B-05 → B-06 → B-07 → B-08

---

## 22. What Works vs What Doesnt

### ✅ WORKS — Logic is correct and code-verified

- GitHub ingestion (HMAC, idempotent, retained on fail)
- Knowledge Risk 6-factor weighted formula
- Successor 4-factor Jaccard algorithm with disqualification
- Bus Factor Cypher calculation and risk score derivation
- Person deduplication (email-first 4-step identity resolution)
- LangGraph multi-tool AI agent (workflow compiles, all nodes wired)
- Answer prompt Zero-Fabrication rules (enforced via prompt constraints)
- Daily report cron at 18:00 IST + immediate startup run
- License guard (fail-closed behavior)
- Cypher injection allowlist (ALLOWED_RELATIONS + ALLOWED_ENTITY_TYPES)
- All 9 Postgres tables — idempotent creation on every boot
- PR Risk Engine (Redis-cached, deterministic, idempotent)
- Offboarding Handoff (Calculator vs Formatter architecture)
- Multi-model LLM fallback cascade (4 models in order)
- Groq SDK retry + response parsing with think-tag stripping

### ❌ BROKEN — Needs fix before any production use

- Slack ingestion: duplicate delivery causes 500 + data deleted on fail
- Jira ingestion: issue updates suppressed + secret leaks in URL + data deleted on fail
- Qdrant: duplicate vectors on retry + silent failure on error
- Jira LLM: using wrong extraction prompt
- Chat streaming: relative URL breaks on separate host deployment

### ⚠️ DEMO-READY — Works in controlled environment, not production-hardened

- Neo4j (indexes not constraints — concurrent write risk at scale)
- Vector search quality (384 dimensions, below Google's recommended minimum)
- Queue scalability (single worker, no DLQ consumer, no queue depth alerting)
- Multi-tenant (not supported — single-tenant BYOC only)
- Token cost tracking (no per-event or per-client LLM cost accounting)

---

## 23. Environment Variables

**File:** `apps/api/config/env.ts`

### Required (server will fail without these)
| Variable | Purpose | Example Value |
|---|---|---|
| `PORT` | API server port | `3000` |
| `POSTGRES_HOST` | PostgreSQL host | `db.company.com` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_USER` | PostgreSQL username | `cortex_user` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `<secure>` |
| `POSTGRES_DATABASE` | Database name | `cortex_db` |
| `NEO4J_URI` | Neo4j Bolt URI | `bolt://localhost:7687` or Aura URI |
| `NEO4J_USERNAME` | Neo4j user | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | `<secure>` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `CORTEX_API_KEY` | Bearer token for API auth | `<32+ char random string>` |
| `FRONTEND_URL` | Allowed CORS origin | `https://cortex.company.com` |
| `GROQ_API_KEY` | Groq LLM API key | `gsk_...` |
| `GEMINI_API_KEY` | Google Gemini embeddings | `AIza...` |
| `GITHUB_SECRET` | GitHub webhook HMAC secret | `<32 random bytes>` |
| `SLACK_SECRET` | Slack signing secret | `<from Slack app settings>` |
| `JIRA_SECRET` | Jira webhook secret | `<secure>` |
| `QDRANT_API_KEY` | Qdrant Cloud API key | `<from Qdrant console>` |
| `QDRANT_CLUSTER_ENDPOINT` | Qdrant cluster URL | `https://xyz.qdrant.io` |
| `QDRANT_COLLECTION_NAME` | Qdrant collection | `cortex-events` |
| `CORTEX_LICENSE_KEY` | License key | `<from Cortex license server>` |

### Optional (defaults apply)
| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | — | `production` or `development` |
| `REDIS_PASSWORD` | — | If Redis auth enabled |
| `REDIS_USERNAME` | — | If Redis ACL enabled |
| `NEO4J_DATABASE` | `neo4j` | Neo4j database name |
| `QUEUE_WORKERS_CONCURRENCY` | `1` | Parallel job processing |
| `RATE_LIMIT` | `150` | Max requests per window |
| `TAVILY_API_KEY` | — | Web search tool in agent |
| `LICENSE_SERVER_URL` | cortex-admin-two.vercel.app | License validation endpoint |
| `LICENSE_PING_INTERVAL_HOURS` | `6` | How often to re-check license |
| `CORTEX_MACHINE_ID` | `""` | Machine fingerprint for license |

---

## 24. How to Deploy — BYOC Model

### Prerequisites
1. **PostgreSQL** >= 14 (any cloud: RDS, Supabase, Neon, or self-hosted)
2. **Neo4j** >= 5.x (Neo4j Aura Free for testing, Aura Professional for production)
3. **Redis** >= 6.x (Upstash, Redis Cloud, or self-hosted) — for BullMQ queue
4. **Qdrant** (Qdrant Cloud free tier for demo, or self-hosted)
5. **Groq API key** (free tier: 30 RPM, paid for production load)
6. **Google Gemini API key** (for embeddings — has free tier)

### What Happens on Startup (Automatic — no manual steps)
```
1. verifyLicenseOnStartup()    → validates CORTEX_LICENSE_KEY with license server
2. cortexWorker check          → confirms BullMQ worker initialized
3. ensurePostgresTables()      → creates all 9 tables (IF NOT EXISTS — idempotent)
4. ensureCollection()          → creates Qdrant collection (IF NOT EXISTS — idempotent)
5. ensureIndexes()             → creates Neo4j indexes (IF NOT EXISTS — idempotent)
6. startMetricsScheduler()     → starts cron + runs analytics immediately
7. app.listen(PORT)            → server ready for traffic
```

### Webhook Configuration

**GitHub:**
- Go to: Repo/Org Settings → Webhooks → Add webhook
- Payload URL: `https://your-cortex-domain/api/github/webhook`
- Content type: `application/json`
- Secret: Same value as `GITHUB_SECRET` env var
- Events: Push, Pull requests, Issues, Issue comments, Pull request reviews

**Slack:**
- Go to: api.slack.com → Your App → Event Subscriptions
- Request URL: `https://your-cortex-domain/api/slack/events`
- Subscribe to: `message.channels`, `message.groups`, `message.im`
- Set signing secret → put in `SLACK_SECRET` env var

**Jira:**
- Go to: Jira Settings → System → WebHooks
- URL: `https://your-cortex-domain/api/jira/webhook?secret=<JIRA_SECRET>`
- Events: Issue created, Issue updated, Issue commented

---

## 25. How to Answer Tough Questions in Meetings

### Q: "Is this AI hallucinating or making up numbers?"

**Evidence-backed answer:**
> "No. Cortex operates on a strict Calculator vs Formatter architecture.
> All risk percentages, bus factors, and successor scores are computed using
> pure TypeScript mathematical formulas from your real Neo4j graph data —
> zero LLM involvement in any number.
>
> Example: Knowledge Risk = 0.30×Ownership + 0.20×Dependency + 0.15×Activity
> + 0.15×Documentation + 0.10×Expertise + 0.10×PendingWork
>
> The LLM only receives the pre-computed numbers and formats them into
> readable English. If data doesn't exist, it says 'No records found' —
> it never fabricates a person, repo, or percentage."
>
> Show: `packages/analytics/knowledge.service.ts` lines 81-87 if challenged.

---

### Q: "How is the Knowledge Risk score calculated? How do you know it's accurate?"

**Answer:**
> "Six mathematically defined factors, each with documented weights:
> 30% Code Ownership (commits authored / total commits)
> 20% Dependency Footprint (how many services depend on their code)
> 15% Recent Activity (recency of their contributions)
> 15% Documentation Coverage (files/docs they've written)
> 10% Technology Expertise Breadth (unique tech areas touched)
> 10% Pending Work (open issues assigned to them)
>
> All inputs come directly from Neo4j graph queries against your real commit
> history and ticket data. You can verify any number by running the same
> Cypher query yourself."

---

### Q: "What if an engineer does very complex work but fewer commits?"

**Honest answer — do not pretend this is solved:**
> "This is a real limitation we acknowledge openly. Cortex measures volume
> and breadth of code contributions, not subjective complexity.
>
> However, Cortex captures indirect complexity signals:
> - High bus factor risk = their code has many downstream dependencies = complex work
> - Low documentation coverage = their knowledge is implicit = hard to replace
> - Unique technology expertise = specialized skills not shared by team
>
> We explicitly designed Cortex to NOT be a performance review tool.
> It is an architectural risk map — showing which engineers are single points
> of failure for the organization, not grading their individual performance."

---

### Q: "How does BYOC work? Does our code leave our servers?"

**Answer:**
> "BYOC means your data stays entirely in your own infrastructure.
> You provision your own PostgreSQL, Neo4j, Redis, and Qdrant.
> We deploy Cortex as a container inside your VPC or on-premise.
>
> The only external network calls Cortex makes are:
> 1. Groq API — receives only the LLM-generated summary of each event
>    (1-2 sentences), not raw code or full payloads
> 2. Google Gemini API — receives the same event summaries for embeddings
> 3. Cortex license server — receives only your license key for validation
>
> Your raw source code, full commit diffs, Slack messages, and Jira tickets
> never leave your network. They stay in your PostgreSQL and Neo4j instances."

---

### Q: "What's the difference between Cortex and Glean?"

**Answer:**
> "Glean is a general-purpose enterprise search tool —
> it indexes Google Drive, Confluence, Slack, and Jira for non-technical users
> (HR, Sales, Marketing) to find documents.
>
> Cortex is an engineering-specific architectural intelligence platform.
> The differences:
>
> Glean: Flat document search. Cannot trace Commit A → Service B → Engineer C.
> Cortex: Deep graph topology. Knows code ownership, dependency chains, departure risk.
>
> Glean: Zero departure risk calculation.
> Cortex: Deterministic 6-factor Departure Risk Score.
>
> Glean: No successor engine.
> Cortex: Jaccard-based 4-factor Successor Recommendation.
>
> Glean: Multi-tenant SaaS at $15-35/user/month.
> Cortex: BYOC free deployment (client's own cloud).
>
> They solve different problems for different audiences."

---

### Q: "Can different teams see only their own data?"

**Honest current state:**
> "Currently Cortex is single-tenant — one deployment per company.
> The API key holder (typically CTO or IT admin) sees all organizational data.
>
> Team-level isolation (where Team Payments cannot see Team Fraud's code)
> is on our roadmap but not yet implemented.
>
> The current access model is intentionally designed for the CTO use case
> where organization-wide visibility is the core value — understanding which
> services across ALL teams are fragile, not just your own team's."

---

### Q: "Can Cortex grade or evaluate developer performance?"

**Firm boundary — always answer this way:**
> "No. Cortex will never be a developer performance grading tool.
>
> Using commit counts or PR counts to evaluate engineers is factually incorrect
> — a senior architect who spends 3 weeks fixing a critical race condition
> in 2 files produces more value than 50 trivial formatting commits.
>
> Cortex measures system fragility and organizational risk, not individual output.
> The risk score tells you how much the COMPANY is at risk if an engineer leaves —
> it says nothing about whether that engineer is performing well or poorly.
>
> If you need developer performance metrics, tools like LinearB, Jellyfish,
> or Swarmia are designed for that specific use case."

---

*End of document.*

---
**Maintained by:** Cortex Engineering Team
**Last updated from codebase:** September 12, 2026
**Rule:** Update this document every time a major architectural change is made.
**File location:** `docs/CORTEX_INTERNAL_BIBLE.md`
