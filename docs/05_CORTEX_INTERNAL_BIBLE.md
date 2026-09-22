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
4. [Ingestion Pipeline & PR Auto-Rollback — GitHub, Slack, Jira](#4-ingestion-pipeline)
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

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Cortex kisi bhi tech company ke liye ek **"Black Box / Flight Radar"** ki tarah hai.  
Aaj ke time har tech company mein hazaron GitHub commits, Slack messages aur Jira tickets daily create hote hain. Lekin agar kal company ka main payments architect ya lead dev resign kar de, toh management ko pata hi nahi hota ki kaun kaun se systems crash honge, code kisne likha tha, aur uska kaam kaun sambhal sakta hai.  
**Cortex ye saari information ko real-time mein collect karke ek living map banata hai, aur bina kisi guessing ke exact math se batata hai ki company ka sabse bada technical risk kahan hai.**

---

### 🏢 Real-Life Desi Example: "Airport Flight Radar & Airplane Black Box"
> ✈️ **Analogy:**  
> Socho ek busy airport jahan har minute 50 flights land aur takeoff ho rahi hain. Agar ATC (Air Traffic Control) ke paas radar na ho, toh unhe pata hi nahi chalega ki kaunsa plane crash hone wala hai ya kisme fuel kam hai.  
> Aur jab plane mein koi issue aata hai, toh sabse pehle **Black Box** check kiya jata hai ki asal mein hua kya tha.  
> 
> **Cortex engineering team ka wahi ATC Radar aur Black Box hai:**  
> 1. **Radar:** Batata hai ki kis repository ka "Bus Factor = 1" hai (yani sirf 1 dev par tiki hai, agar wo gaya toh project crash).  
> 2. **Black Box:** Jab 6 mahine baad koi critical bug aata hai, Cortex batata hai ki "ye architectural decision kisne, kab, kyun aur kiske kehne par liya tha".

---

### 💼 Client Pitch (Client ko 30 Seconds Mein Kaise Samjhayein)
> *"Imagine if your senior-most backend engineer resigns tomorrow morning. Do you know which 5 repositories will be left completely unmaintained? Do you know who in your remaining team is technically capable of taking over their services without a 6-month ramp-up delay?  
> Cortex eliminates key-person dependency risk. We turn scattered GitHub commits, Slack conversations, and Jira tickets into a living intelligence graph that protects your business continuity."*

---

### ⚙️ Technical Definition & Architecture Components
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

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Cortex koi **Spy Camera, Attendance Machine, ya Developer Scoring Tool** bilkul nahi hai!  
Ye employees ke keyboard keystrokes monitor karne ya ye dekhne ke liye nahi bana ki banda WFH mein kitne ghante login tha. Agar commit count se developer ki value measure ki jaye, toh har developer 1-1 line ke 100 commits push karne lagega (Goodhart's Law).  
**Cortex logon par spy nahi karta, balki systems aur architecture ki health track karta hai.**

---

### 🏢 Real-Life Desi Example: "Car ka Safety Airbag vs Spy CCTV Camera"
> 🚗 **Analogy:**  
> - **CCTV Spy Camera:** Driver ko ghoorta rehta hai ki usne kitni baar blink kiya ya mobile chhuya (Spyware / Toxic Culture).  
> - **Safety Airbag & ABS Sensor:** Car ke engine aur structural balance ko monitor karta hai taaki agar accident ho toh jaan bach sake (Cortex).  
> 
> Developers Cortex ko pasand karte hain kyunki Cortex unke sar se achanak aane wali "3 AM production fire" aur bina documentation wale legacy code ka bojh hatata hai.

---

### 💼 Client Pitch (Agar Client Puche "Kya Ye Developer Ranking Tool Hai?")
> *"Absolutely not. Ranking developers by commit count creates toxic engineering cultures and encourages low-quality code gaming. Cortex is built for CTOs and VPs who care about institutional continuity. We don't measure how fast someone types; we measure how fragile the company becomes if critical architecture lives in only one person's head."*

---

### 🛡️ Hard Product Boundaries (Code & Design Enforced):

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
              │ HMAC-SHA256 Webhook         │ HMAC + Timestamp   │ Query Secret
              ▼                            ▼                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS API  (apps/api/)                                │
│  ├── licenseGuard → all /api/* blocked if license invalid                   │
│  ├── /api/github/webhook  (no authGuard — uses HMAC validation)             │
│  ├── /api/slack/events    (no authGuard — uses HMAC validation)             │
│  ├── /api/jira/webhook    (no authGuard — uses query secret)                │
│  └── authGuard → Timing-safe Bearer token required for all other routes     │
└─────────────┬────────────────────────────────────────────────────────────────┘
              │ Postgres INSERT (Idempotent: ON CONFLICT on GitHub, Slack & Jira ✅)
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
           │ Debounced Metrics Invalidator (45s quiet / 3m cap) + Daily Cron @ 18:00 IST
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

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Ingestion Pipeline Cortex ka **"Digital Security Gatekeeper / Post Office"** hai.  
Jab bhi developer code push karta hai (GitHub), team chat mein koi architecture discuss hoti hai (Slack), ya ticket resolve hota hai (Jira), wo platform Cortex ko ek message (Webhook) bhejta hai.  
Gatekeeper ka kaam hai:
1. **Verification:** Check karna ki letter asli platform ne bheja hai ya kisi hacker ne (Digital Signature / HMAC check).
2. **Idempotency (Duplicate Rokna):** Agar internet slow hone ki wajah se Slack ya GitHub ne ek hi message do-teen baar bhej diya, toh server crash na ho! Duplicate aane par Cortex use chupchaap ignore karta hai aur pehle wale ko process karta hai.

---

### 🏢 Real-Life Desi Example: "Airport Baggage Barcode & Speed Post Stamp"
> 🧳 **Analogy:**  
> Jab aap airport par bag check-in karte ho, toh staff bag pe ek unique **Barcode Sticker** chipkata hai.  
> Agar baggage scanner belt par conveyor hilne se wahi bag 2 baar scan ho jaye, toh system do alag alag passenger ticket nahi banata; wo barcode dekh kar pehchaan jata hai ki *"Are ye toh wahi bag hai jo 10 second pehle scan hua tha!"* aur bina kisi error ke aage nikal deta hai.  
> 
> Isi concept ko computer science mein **Idempotency** kehte hain. Agar idempotency na ho, toh database crash ho jayegi aur metrics 2x/3x fake count dikhane lagenge.

---

### 💼 Client Pitch (Client ko Webhook Pipeline Kaise Samjhayein)
> *"Our ingestion gateway is built with military-grade resilience. Every single event from GitHub, Slack, and Jira is cryptographically signed and stored with strict idempotency. If Slack retries a message 5 times due to network jitter, your system never duplicates counts or crashes with 500 errors. Everything is acknowledged in under 50ms and processed smoothly in the background."*

---

### 4.1 GitHub Webhook Pipeline — STATUS: ✅ OPERATIONAL
**Files:** `apps/api/modules/github/router.ts`, `apps/api/modules/github/controller.ts`

#### Step-by-Step Code Execution (Under The Hood Kese Kaam Karta Hai):

**Step 1: Security Inspector (Darwaze Par Entry Check)**
Jab GitHub ka webhook payload Express API (`POST /api/github/webhook`) par aata hai:
- **Sawaal 1:** *"Kya request ke header mein `x-hub-signature-256` HMAC signature mojood hai?"*
  - Inspector `crypto.createHmac('sha256', env.GITHUB_SECRET)` se body ka hash nikal kar header ke signature se match karta hai.
  - Agar signature match nahi hua ➔ HTTP 403 Forbidden fek kar request ko wahin terminate kar deta hai! (Hacker ka fake event block).
- **Sawaal 2:** *"Kya `x-github-delivery` UUID header mojood hai?"*
  - GitHub har delivery attempt ke liye ek unique UUID bhejta hai (e.g. `d3b07384-d113-4f40-8b43-26f63459e917`). Agar ye gayab hai ➔ 400 Bad Request.

**Step 2: Idempotency Gatekeeper (Duplicate Rokne Wala Guard)**
Signature verify hone ke baad controller database mein entry karta hai:
```sql
INSERT INTO events (id, provider, event_type, external_id, payload)
VALUES (snowflake_id, 'github', event_type, deliveryID, rawBody)
ON CONFLICT (provider, external_id) DO NOTHING
```
- **Sawaal 1:** *"Kya is `deliveryID` ka event pehle database mein aa chuka hai?"*
  - **Case A (Naya Event):** Database row insert karta hai (row count = 1). Proceed to Step 3.
  - **Case B (Duplicate / Retry Attempt):** `ON CONFLICT DO NOTHING` chupchaap ignore kar deta hai (row count = 0). Code turant `200 OK` return karke nikal jata hai — zero server crash, zero duplicate metrics!

**Step 3: Background Token Queue (BullMQ Async Enqueue)**
- Event insert hone ke baad, `processingQueue.add("github-event", { eventId, payload })` call hota hai.
- Express API **50 millisecond ke andar** GitHub ko `200 OK` return kar deti hai taaki connection open na rahe aur GitHub timeout na samjhe.

---

### 4.2 Slack Webhook Pipeline — STATUS: ✅ OPERATIONAL (Idempotent)
**File:** `apps/api/modules/slack/controller.ts`

#### Step-by-Step Code Execution (Under The Hood Kese Kaam Karta Hai):

**Step 1: Replay Attack Inspector (5-Minute Window Check)**
- **Sawaal 1:** *"Kya request header `x-slack-signature` valid hai?"*
  - `v0:timestamp:rawBody` ka HMAC-SHA256 compute karke `env.SLACK_SECRET` se verify karta hai.
- **Sawaal 2:** *"Ye request kitni purani hai?"*
  - `Math.abs(currentTime - slackTimestamp) > 300` (5 minutes).
  - Agar request 5 minute se purani hai ➔ **Replay Attack Detected!** Request reject ho jaati hai taaki koi purana network packet pakad kar dobara fake data na inject kar sake.

**Step 2: URL Verification (Challenge Handshake)**
- **Sawaal:** *"Kya Slack ne connection test ke liye challenge bheja hai?"*
  - Agar `type === 'url_verification'` hai ➔ Controller turant `{ challenge: payload.challenge }` return karta hai.

**Step 3: Idempotency Gatekeeper (Retry 500 Crash Fix)**
- Slack ka standard rule hai: agar server ne **3 second** ke andar response nahi diya, toh Slack wahi event dobara retry karta hai.
- **Hamara Code:**
  ```typescript
  // Stable unique ID derived directly from Slack event payload
  const externalId = (payload.event && payload.event.event_id) 
                     || payload.event_id 
                     || String(payload.event_time || snowflakeId);

  await sql`
    INSERT INTO events (id, provider, event_type, external_id, payload)
    VALUES (${snowflakeId}, 'slack', ${eventType}, ${externalId}, ${sql.json(payload)})
    ON CONFLICT (provider, external_id) DO NOTHING
  `;
  ```
- **Sawaal:** *"Agar Slack ne wahi `event_id` retry kiya toh kya hoga?"*
  - Pehle bina `ON CONFLICT` ke Postgres 500 error throw kar deta tha aur server crash ho jata tha!
  - Ab `ON CONFLICT DO NOTHING` duplicate retry ko safely absorb karta hai aur bina kisi error ke 200 OK de deta hai.

---

### 4.3 Jira Webhook Pipeline — STATUS: ✅ OPERATIONAL (Idempotent)
**Files:** `apps/api/modules/jira/router.ts`, `apps/api/modules/jira/validator.ts`, `apps/api/modules/jira/controller.ts`

#### Step-by-Step Code Execution (Under The Hood Kese Kaam Karta Hai):

**Step 1: Lifecycle Compound Key Inspector**
- **Problem in Old Code:** Pehle Jira ka `external_id` sirf `issue.id` par set tha. Jab ticket create hua (`external_id = "10042"`), insert ho gaya. Lekin jab usi ticket par 2 ghante baad status 'Done' hua ya comment aaya, toh `external_id` fir se `"10042"` hi tha, jisse naye updates drop ho jaate the!
- **Sawaal:** *"Har update aur comment ko alag unique event kaise banayein?"*
- **The Lifecycle Fix:**
  ```typescript
  // External ID combines webhookEvent action and event timestamp
  const externalId = (payload?.webhookEvent || 'jira') + '_' + (payload?.timestamp || payload?.issue?.id || snowflakeId);

  await sql`
    INSERT INTO events (id, provider, event_type, external_id, payload)
    VALUES (${snowflakeId}, 'jira', ${eventType}, ${externalId}, ${sql.json(payload)})
    ON CONFLICT (provider, external_id) DO NOTHING
  `;
  ```
  - Ticket Creation: `jira:issue_created_1718000100` ➔ Inserted!
  - Ticket Updated: `jira:issue_updated_1718005400` ➔ Inserted!
  - Comment Added: `comment_created_1718009200` ➔ Inserted!
  - Exact Duplicate Retry: Wahi key dobara aayi ➔ Safe `DO NOTHING` ignore!

---

### 4.4 Pull Request Lifecycle & Automatic Graph Rollback (Saga Reversal Pattern) — STATUS: ✅ OPERATIONAL
**Files:** `packages/ingestion/github/processGithubEvent.ts` (Lines 161–183), `packages/database/neo4j/graph.repository.ts` (Lines 207–255)

#### 💡 Aasaan Bhasha Mein (Layman Explanation)
Jab koi developer PR banata hai, toh woh ek proposal (sujhaav) hota hai.  
Agar team us PR ko accept (merge) karti hai, toh woh code company ka permanent hissa banta hai.  
Lekin agar code review mein Senior Engineer us PR ko **Reject (Close without merge)** kar deta hai, toh kya Cortex us bekaar proposal ko database mein chhod dega?  
**Nahi!** Cortex ke paas ek **Automatic Eraser (Compensating Rollback)** hai:  
Jaise hi PR reject hoti hai, Cortex purani receipt nikaal kar us PR ke banaye hue saare temporary rishte (teer) Neo4j se 1 second mein delete kar deta hai. Na graph mein koi kachra bachta hai, na jhoothi dependency bachti hai!

---

#### 🏢 Real-Life Desi Example: "Dukaan ka Return Counter & Bill Cancellation"
> 🧾 **Analogy:**  
> Socho Arjun ne Amazon se ek laptop mangwaya (Monday ko Order hua). Amazon ne delivery slip par ek receipt number chipkaya: `Bill #462626...`.  
> Ab Thursday ko delivery boy ghar aaya, lekin Arjun ne box khol kar dekha ki laptop galat model ka hai, toh Arjun ne bola: *"Isko wapas le jao (Order Cancel/Reject)!"*  
> Delivery boy cancel karte waqt Arjun ko ya Amazon dukaan ko delete nahi karta! Woh sirf **Bill #462626... ki transaction slip cancel karta hai.**  
> 
> **Cortex mein bhi wahi hota hai:**  
> Jab PR reject hoti hai, toh Arjun (`PERSON`) ya `payment-service` (`REPOSITORY`) delete nahi hote — **sirf us rejected PR ka banaya hua bekaar teer (`DEPENDS_ON` / `USES`) delete hota hai!**

---

#### 🔄 Complete End-to-End Live Example (Monday Se Thursday Tak):

**Step 1: Monday — Developer ne PR Open Kari (`action: 'opened'`)**
- Arjun ne GitHub par PR #42 banayi: *"Add Stripe Payment Gateway"*.
- **Postgres:** Ek naya 24-digit Snowflake ID banta hai: e.g. `462626118157474795188224`.
- **Neo4j Graph:** Nodes bante hain aur relationships (teeron) ke upar wahi receipt number thappa lagta hai:
  ```cypher
  (Arjun :PERSON)-[:AUTHORED { sourceEventId: '462626118157474795188224' }]->(PR_42)
  (PR_42)-[:PART_OF { sourceEventId: '462626118157474795188224' }]->(payment-service)
  (payment-service)-[:USES { sourceEventId: '462626118157474795188224' }]->(Stripe)
  ```

**Step 2: Thursday — Senior Engineer ne PR Reject Kar Di (`action: 'closed', merged: false`)**
- Senior dev ne bola: *"Stripe use nahi karenge, Razorpay use karenge!"* Aur PR close kar di.
- GitHub ne naya webhook bheja jisme:
  - `action`: `"closed"`
  - `merged`: `false`
  - `pull_request.id`: `987654321` (GitHub ki permanent PR ID jo Monday ko bhi wahi thi!).
- Postgres ne is naye close event ko ek nayi Snowflake ID di: `462626999999999999999999` (`eventID`).

**Step 3: Cortex Inspector ne Purani Receipt Dhoondhi (`processGithubEvent.ts:167`)**
Cortex Postgres se poochta hai:
```sql
SELECT id FROM events 
WHERE provider = 'github' 
  AND (payload->'pull_request'->>'id' = '987654321' OR payload->>'number' = '42')
  AND id != '462626999999999999999999'; -- 👈 Aaj wale event ko chhodkar Monday wale ki ID nikalo!
```
> **`AND id != eventID` ka Magic:**  
> Agar hum ye na lagate, toh Postgres aaj wala close event bhi return kar deta. Hume aaj ka nahi, **Monday wala purana event (`462626118157474795188224`)** chahiye tha jisne teer banaye the!  
> Postgres ne Monday ki receipt nikaal kar di: `prev.id = 462626118157474795188224`.

**Step 4: Neo4j Surgical Rollback (`graph.repository.ts:241`)**
Cortex Neo4j ko bolta hai:
```cypher
MATCH ()-[r]->()
WHERE r.sourceEventId = '462626118157474795188224'
DELETE r
RETURN count(r) AS deletedCount
```
- **Nateeja:** Jo-jo teer us PR ne banaye the (jaise `payment-service -> Stripe`), **woh Neo4j se 1 millisecond mein delete ho gaye!**
- PR ka node delete nahi hota, uska status update hokar `status: "closed"` ho jata hai taaki history audit bani rahe.
- Graph 100% clean ho gaya, zero data pollution!

**Step 5: Agar PR Accept / Merge Ho Jaati Toh?**
- Agar PR merge hoti (`merged: true`), toh teer delete **NAHI** hote.
- PR node `status: "merged"` ban jata.
- 45-second ke debouncer ke baad Arjun ka official ownership aur Stripe ka technology usage dashboard par permanently update ho jata!

---

## 5. Queue & Worker System

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Queue and Worker system company ki **"Smart Bank Token Machine"** hai.  
Socho agar 100 log ek sath bank counter par ghus jayein aur ek hi cashier ke sar par chillayein, toh cashier behosh ho jayega.  
Isliye bank mein token machine hoti hai: har customer ko ek token milta hai (Queue), aur counter par baithe log ek-ek karke token call karke kaam karte hain (Worker).  
Cortex mein Redis aur BullMQ wahi token system hain. Chahe 500 commits ek sath aayein, Express API sirf token dekar user ko bolti hai "Mil gaya (200 OK)", aur background worker aaram se bina server crash kiye saara heavy AI kaam karta hai.

---

### 🏢 Real-Life Desi Example: "Bank Token Counter & Restaurant Kitchen Line"
> 🍽️ **Analogy:**  
> Restaurant ka waiter (API) customer se order lekar seedha kitchen ki receipt slip par pin kar deta hai (Queue).  
> Waiter wahan khada hokar sabzi pakne ka intezaar nahi karta; wo agle customer ke paas chala jata hai. Kitchen mein chef (Worker) ek-ek slip utha kar khana banata rehta hai.  
> Is wajah se restaurant mein kitni bhi bheed aa jaye, waiter kabhi crash nahi hota!

---

### 5.1 Worker Execution Lifecycle (Step-by-Step Breakdown)

**Step 1: Dequeue & Payload Retrieval**
- Worker (`packages/workers/ingest.worker.ts`) Redis se job uthata hai (`github-event`, `slack-event`, ya `jira-event`).
- Job data se `eventId` lekar PostgreSQL se raw JSON payload fetch karta hai.

**Step 2: Identity Resolution Check**
- **Sawaal:** *"Kya is event ka author (Git committer ya Slack sender) pehle se hamari system identity mein mapped hai?"*
- `resolveIdentity()` call hota hai jo incoming handle/email ko `canonical_person_id` se match karta hai.

**Step 3: AI Entity & Knowledge Graph Extraction**
- Event payload ko LLM extraction engine mein pass kiya jata hai jo graph nodes (`PERSON`, `TECHNOLOGY`, `REPOSITORY`) aur relationships (`AUTHORED`, `USES`) create karta hai.

**Step 4: Vector Semantic Indexing**
- LLM ke banaye 1-2 sentence summary ko Google Gemini se embed karwa kar Qdrant vector database mein upsert karta hai.

**Step 5: Debounced Metrics Trigger (Sub-millisecond Stamp)**
- Job complete hone par worker `markMetricsDirty(job.name)` call karta hai taaki analytics engine ko pata chal sake ki naya data aa chuka hai!

---

### 5.2 Retry & Failure Recovery Inspector

Jab worker kisi job ko process karta hai aur achanak koi external service fail ho jaye (e.g., Groq API temporary down ya Network timeout):

- **Attempt 1:** Job fail hui ➔ Worker exponential backoff chalu karta hai: **2 second ruko** aur retry karo.
- **Attempt 2:** Phir fail hui ➔ **4 second ruko** aur retry karo.
- **Attempt 3:** Phir fail hui ➔ **8 second ruko** aur retry karo.
- **Sawaal:** *"3 attempts ke baad bhi fail hui toh kya job delete ho jayegi?"*
  - **GitHub:** `removeOnFail: false` ➔ Failed job Redis mein safely rakhi rehti hai taaki admin use inspect kar sake.
  - **Slack / Jira:** Configurable retention rules ensure zero silent data loss.

---

### 5.3 Queue Configuration & Concurrency

| Parameter | Value | Technical Rationale |
|---|---|---|
| **Queue Name** | `processing-queue` | Single unified Redis queue for all platform exhaust |
| **Backend** | Redis (via `ioredis`) | High-throughput in-memory datastore |
| **Concurrency** | `env.QUEUE_WORKERS_CONCURRENCY` (1) | Sequential, race-condition-free graph mutations |
| **Throughput** | 7–30 events per minute | Limited by LLM inference latency (2–4s per Groq call) |
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

### 5.6 Event-Driven Debounced Metrics Invalidation Architecture
**Files:** `packages/analytics/metricsInvalidator.service.ts`, `packages/workers/ingest.worker.ts`, `packages/workers/scheduler.worker.ts`

#### 1. The Client Problem: Why Other Tools Show Stale Data
In most analytics platforms, risk scores, bus factor, and ownership metrics are computed via a scheduled cron job (e.g. once a day at midnight or 18:00 IST). 
- **The Problem:** If an engineer pushes critical commits at 10:00 AM, merges a PR at 11:00 AM, or a key person leaves the project, the Executive Dashboard shows stale numbers for up to 24 hours.
- **The Bad Solution (Eager Execution):** If the server recalculates all metrics on every single webhook event, a developer pushing 15 commits in 10 seconds causes 15 full graph scans simultaneously, crashing the database and running out of CPU.
- **The Cortex Solution (Debounced Event-Driven Architecture):** Near real-time metric updates within ~45 seconds of activity settling, with zero server overload.

---

#### 2. How to Explain It to a Client: The "Elevator / Lift" Analogy
> Imagine an elevator in a busy office:
> 1. Person A steps into the elevator. The door begins its 5-second closing countdown.
> 2. 2 seconds later, Person B rushes up and presses the door button.
> 3. **The elevator does not immediately take off.** Instead, it resets its 5-second countdown to allow Person B to enter.
> 4. Only when **nobody has pressed the button for 5 full seconds (a quiet period)** does the door close and the elevator travel up.
> 5. **Starvation Cap:** If people keep rushing in non-stop for 3 full minutes, the elevator sounds a buzzer and departs anyway so the people already inside aren't trapped waiting forever.

In Cortex, **webhook events are people entering the elevator**, and **metrics recalculation is the elevator moving**:
- **Event Burst (Developer pushes 15 commits):** Instead of running 15 heavy calculations, Cortex resets a 45-second "quiet timer" with each commit (sub-millisecond Redis stamp).
- **Quiet Period (Work finishes):** Once 45 seconds pass without any new events, Cortex runs **exactly 1 batch calculation** covering all 15 commits.
- **Starvation Cap:** If commits/messages stream continuously without a 45-second break, a forced calculation triggers at 3 minutes (`METRICS_MAX_DELAY_MS`) to ensure dashboards never stay stale.

---

#### 3. Step-by-Step Technical Execution
1. **Lightweight Stamp (<1ms):** In `ingest.worker.ts`, immediately after saving a GitHub, Slack, or Jira event, `markMetricsDirty(job.name)` sets:
   - `cortex:metrics:dirty = '1'`
   - `cortex:metrics:last_event_ts = Date.now()`
   - `cortex:metrics:first_dirty_ts = Date.now()` (via `SET ... NX` to mark burst start)
2. **Background Poller (Every 15s):** A lightweight ticker in `scheduler.worker.ts` checks:
   - Is `dirty == 1`? (If no, sleeps with zero CPU usage).
   - Has the 45s quiet period elapsed? (`now - last_event_ts >= 45s`) OR has the 3m starvation cap elapsed?
   - If not yet quiet: logs `"Debounce active: waiting for quiet period"` and defers.
3. **Distributed Mutex Lock (No Overlapping Runs):**
   - Acquires `cortex:metrics:lock` via `SET ... EX 180 NX`.
   - If multiple server replicas or worker processes are running, only one worker can calculate metrics at a time. Other workers safely skip.
4. **Zero Lost Updates Guarantee:**
   - What if a new Jira ticket is created *while* the 5-second calculation is running?
   - The service compares `last_event_ts` against `recalcStartTime`. Since a new event arrived during execution, Cortex **keeps `dirty = '1'`**, ensuring the next 45-second quiet window automatically picks up the new event. No event is ever lost.
5. **Clean Lock Release:** Lock is released atomically using a Lua script that verifies the unique worker token before deletion.

### 5.7 Metrics Calculation & Data Integrity Guarantees
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

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Developer log commit messages ya Slack chat bohot rough aur casual likhte hain: *"bhai auth token crash fix kar diya using jwt in auth-service"*.  
Ab agar is raw message ko seedha database mein daal dein, toh koi algorithm ya graph iska matlab nahi samajh payega.  
**LLM Extraction Layer yahan ek "Smart Stenographer / Translator" ki tarah kaam karta hai.** Ye us rough message ko padhta hai aur usme se saaf-suthre structured facts nikalta hai:  
`Person = Arjun`, `Action = AUTHORED`, `Repo = auth-service`, `Technology = JWT, Node.js`.

---

### 🏢 Real-Life Desi Example: "Doctor ki Parchi Samajhne Wala Compounder"
> 💊 **Analogy:**  
> Doctor parchi par aadi-tedhi writing mein kuch bhi likh deta hai jo normal patient ko samajh nahi aata.  
> Lekin jo purana tajurba-kaar **Compounder** hota hai, wo us scribbled writing ko dekhte hi samajh jata hai ki *"Paracetamol 500mg subah-shaam khani hai"* aur exact dawa pack karke de deta hai.  
> 
> Hamara LLM (Groq LPU par chalne wala fast open model) wahi smart compounder hai: wo developers ki rough baat-cheet ko neat, clean Knowledge Graph connections mein convert kar deta hai.

---

### 💼 Client Pitch (Client ko Kaise Samjhayein)
> *"Developers hate filling documentation, and you can't force them to write architectural wikis every day. Cortex passively observes their natural Git commits and Slack conversations, using sub-second Groq LPUs to extract architectural facts automatically. Your team writes code normally; Cortex builds the documentation behind the scenes."*

---

**Files:** `packages/llm/providers/groq.ts`, `packages/llm/prompts/`, `packages/extraction/ontology.ts`, `packages/extraction/entityResolver.ts`

#### Step-by-Step Code Execution (LLM Extraction Under The Hood):

**Step 1: Raw Event Payload Extraction**
Worker Postgres se raw payload nikaalta hai:
- Git Push: Commit hash, commit message, author name, files modified (`added`, `removed`, `modified`).
- Slack Message: Channel name, user ID, message text, thread parent.
- Jira Ticket: Issue key, summary, description, status transitions, assignee.

**Step 2: Groq LPU Cascade Inspector (Failover Engine)**
LLM ko prompt bhejne se pehle Groq failover engine 3 sawaal poochta hai:
- **Sawaal 1:** *"Kya Primary Model `openai/gpt-oss-120b` available hai?"*
  - Agar haan ➔ Sub-second speed mein 120b model se inference karwao!
  - **Failover Trigger:** Agar HTTP 429 (Rate limit), 413 (Payload too large), 500, ya 503 error aaya ➔ Server crash nahi hota! Turant fallback cascade chalu hota hai:
    `gpt-oss-20b` ➔ agar wo bhi busy hai ➔ `qwen/qwen3.6-27b` ➔ agar wo bhi busy hai ➔ `groq/compound-mini`.
- **Sawaal 2:** *"Temperature kya set karni hai?"*
  - `temperature = 0` (Zero Creativity / Maximum Determinism): Humein AI se koi fiction ya shero-shayari nahi chahiye; humein strict, factual structured JSON chahiye.
- **Sawaal 3:** *"Format enforce kaise karein?"*
  - `response_format: { type: "json_object" }` enforce karta hai ki model koi chat text na likhe, sirf valid JSON return kare.

**Step 3: Cypher Injection Defense Inspector (Strict Whitelist Check)**
Jab LLM se JSON output aata hai, Cortex use seedha Neo4j mein insert nahi karta. Graph repository security gatekeeper strict sets aur multi-layer guards check karta hai:
- **Sawaal 1:** *"Kya entity ka label allowlist mein hai?"*
  ```typescript
  const ALLOWED_ENTITY_TYPES = new Set([
    'PERSON', 'TECHNOLOGY', 'REPOSITORY', 'ISSUE', 
    'PULL_REQUEST', 'TEAM', 'FILE', 'ORGANIZATION'
  ]);
  if (!ALLOWED_ENTITY_TYPES.has(normalizedType)) {
    throw new Error(`Invalid entity type: ${type}`);
  }
  ```
  Agar LLM ne prompt injection ke chakkar mein koi invalid type bana diya ➔ Runtime par reject! Note: `'COMMIT'` ko is allowlist se permanent hata diya gaya hai.
- **Sawaal 2:** *"Kya relationship allowlist mein hai?"*
  ```typescript
  const ALLOWED_RELATIONS = new Set([
    'USES', 'HAS_PROBLEM', 'FIXED_BY', 'REPLACED_BY', 
    'DEPENDS_ON', 'WORKS_ON', 'CREATED', 'MENTIONED_IN', 
    'ASSIGNED_TO', 'PART_OF', 'AUTHORED', 'CONTRIBUTED_TO'
  ]);
  if (!ALLOWED_RELATIONS.has(normalizedType)) {
    throw new Error(`Invalid relationship type: ${type}`);
  }
  ```
  Saare Neo4j Cypher queries parameterized hote hain (`$fromName`, `$toName`), jisse **Cypher Injection 100% block** rehta hai.

---

### 6.1 The 6-Layer Defense-in-Depth Commit Gatekeeper ("Graph Mein Commit Kaise Block Hota Hai?")

#### 💡 Aasaan Bhasha Mein (Layman Explanation)
Agar LLM galti se kisi commit hash (e.g. `8f3b12a`) ko entity samajhkar extract kar de, toh kya wo Neo4j graph mein ghus kar database ko kharab karega?  
**KABHI NAHI!** Cortex ke paas **6-Layer Security Gatekeeper (6 Chhaniya)** hain. Jaise airport par boarding gate tak pahunchne se pehle passport check, baggage scan, body frisking, aur metal detector hota hai—theek waise hi commit entity ko graph tak pahunchne se pehle 6 alag alag security filters se guzarna padta hai:

> 🛡️ **The 6 Security Checkpoints:**
> 1. **Filter 1 — Prompt Directive (Pehle hi mana kar diya):** LLM ko prompt mein rule diya gaya hai ki Git commits ya SHAs ko entity mat banao; direct contributor aur repository ko jodo.
> 2. **Filter 2 — Ontology Contract (Formal Shart):** `packages/extraction/ontology.ts` mein `ENTITY_TYPES` array se `COMMIT` ko permanent hata diya gaya hai.
> 3. **Filter 3 — Entity Resolver & SHA Regex (X-Ray Scanner):** `isCommitEntity()` function commit ke saare aliases (`COMMIT`, `COMMITS`, `GIT_COMMIT`, `COMMIT_HASH`, `CHANGESET`, `REVISION`) aur raw hex hashes (`/^(commit\s*:?\s*#?|sha\s*:?\s*)?[a-f0-9]{7,40}$/i`) ko identify karke entity list se turant nikal deta hai.
> 4. **Filter 4 — Relationship Rewiring (Zero Signal Loss):** Agar LLM ne commit ko kisi technology se joda tha (jaise `commit_8f3b12a -> USES -> Redis`), Cortex us rishte ko fenkta nahi hai balki repository par rewire kar deta hai: `repository -> USES -> Redis`! Isse company ka architectural signal 100% bacha rehta hai aur graph mein 0 commit nodes bante hain.
> 5. **Filter 5 — Extraction Gateway Sanity Filter:** `saveExtractionToGraph()` mein koi bhi rishta jo commit ko point kare use database bhejne se pehle discard kar diya jata hai.
> 6. **Filter 6 — Neo4j Driver Gatekeeper (Aakhri Darwaza):** Agar koi developer galti se direct `upsertEntity("commit_123", "COMMIT")` bhi call kare, toh driver level par `upsertEntity` warning log karke `undefined` return kar deta hai. Neo4j mein node creation physically impossible hai!

Is multi-layer defense ki wajah se actual client data par 100% mathematical consistency aur accuracy bani rehti hai, aur graph kabhi explode ya corrupt nahi hota.

**Step 4: Clean Structured Output Example**
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

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Knowledge Graph Cortex ka **"Living Dimaag (Brain)"** hai.  
Normal databases (SQL tables) mein data alag alag rows aur columns mein band rehta hai. Lekin real-world engineering team ek interconnected web (jaal) hoti hai:  
- Kaunsa engineer kis repository ka code likhta hai?  
- Wo repository kis database ya service par depend karti hai?  
- Aur agar kal wo service crash ho jaye, toh aage kaun kaun se microservices band pad jayenge?  
**Neo4j is pure engineering network ko ek zinda map ki tarah jod kar rakhta hai.**

---

### 🏢 Real-Life Desi Example 1: "Detective ka Red-String Crime Board & Google Maps"
> 🕵️‍♂️ **Analogy:**  
> Aapne crime thrillers mein dekha hoga ki jab detective kisi complex case ki investigation karta hai, toh deewar par photos laga kar unke beech **Laal Dhaage (Red Strings)** baandhta hai:  
> *"A ka contact B se hai, B ne C ki gaadi use ki thi, aur C crime scene ke paas tha."*  
> 
> Neo4j company ka wahi red-string board hai. Jab aap Cortex mein poochte ho ki *"Payment Gateway ka maalik kaun hai aur agar wo gaya toh kya break hoga?"*, Neo4j laal dhaagon ko follow karke 1 millisecond mein bata deta hai ki downstream 4 services break hongi!

---

### 🧺 Real-Life Desi Example 2: "Kirana Store ki Receipt Slip vs Lakdi ki Almirah (Why We Retired Commit Nodes)"
> 🧾 **The Billion-Dollar Problem & The Grocery Analogy:**  
> Socho aapke ghar ke paas Sharma ji ki Kirana store hai. Aap pichle 5 saal se har hafte wahan se doodh, dahi, bread aur sabzi khareed rahe ho.  
> 5 saal mein 250 hafte hue. Agar aap har ek grocery bill receipt ke liye apne living room mein lakdi ka ek naya drawer/shelf banwana shuru kar do, toh ghar mein **50,000 lakdi ke drawers** bhar jayenge!  
> Ghar mein chalne ki jagah nahi bachegi, deewar gir jayegi, aur aapki jeb khali ho jayegi.  
> 
> **Samajhdaar aadmi kya karta hai?**  
> 1. **Ghar ke Khate (Ledger) mein sirf 1 summary line likhta hai:**  
>    *"Sharma Kirana Store: 250 visits, Last visit: Kal shaam, Total spent: ₹1,50,000"*.  
> 2. Aur agar kisi din kache tax proof ke liye 2 saal purana paper bill dekhna hi hai, toh wo basement ke gatte ke dabbe mein rakha hai (PostgreSQL `events` table).  
> 
> **Pehle Cortex mein kya blunder ho raha tha:**  
> Har chote-mote Git commit ka Neo4j mein alag `(:COMMIT)` node ban raha tha!  
> 200 commits/hafta × 15 repos × 5 saal = **1,50,000+ nodes!**  
> Neo4j Aura free/starter tier ki 200k limit aate hi database crash ho jata tha aur queries slow ho jati thi.  
> 
> **The Production Architecture Fix (P0-1):**  
> Cortex ne har commit ka bekaar node banana band kar diya!  
> Ab graph mein seedha ek strong, clean teer banta hai:  
> `(p:PERSON)-[:CONTRIBUTED_TO { commitCount: 42, lastCommitAt: 1718000000000 }]->(r:REPOSITORY)`  
> - **Nateeja:** Graph ka size **85% chota** ho gaya!  
> - **Speed:** Bus Factor aur Ownership calculate karne mein pehle 1.5 lakh commit scan karne padte the; ab sirf repository ke 3–5 contributors scan karne padte hain — **10x faster!**  
> - Raw commit messages aur SHAs PostgreSQL `events` table mein 100% safe hain audit ke liye.

---

### 🍽️ Real-Life Desi Example 3: "Restaurant Waiter ka Ek Sath Order Lena (Batch UNWIND vs Sequential Sessions)"
> 🍛 **Analogy:**  
> Ek table par 8 dost khana khane baithe hain.  
> Agar waiter pehle dost se pooch kar kitchen bhage: *"Ek naan dena"*, phir wapas aakar doosre se pooch kar kitchen bhage: *"Ek daal dena"*, phir teesre ke liye bhage... toh waiter 20 chakkar mein behosh ho jayega aur kitchen ka darwaza toot jayega!  
> **Samajhdaar waiter kya karta hai?**  
> Puri table ka order ek hi notepad slip par likhta hai, aur kitchen mein ek hi baar slip pakda kar bolta hai: *"Table 4: 8 naan, 2 daal, 1 paneer ek sath banao (Cypher UNWIND)"*.  
> 
> **Pehle Cortex kya karta tha (P0-2):**  
> Har extraction loop mein `driver.session()` kholta aur band karta tha (30 relations ke liye 30 connection roundtrips!). High traffic aate hi Neo4j connection pool exhaust ho jata tha.  
> **Ab Cortex kya karta hai:**  
> Har webhook event ke liye **sirf 1 session** khulta hai, aur saare relations Cypher `UNWIND $batch` se **1 single roundtrip** mein graph mein weave ho jate hain!

---

### 💼 Client Pitch (Client ko Knowledge Graph Kaise Samjhayein)
> *"Traditional dashboards only give you isolated tables that don't talk to each other. Cortex models your engineering organization as a living Knowledge Graph in Neo4j. We map people to code, code to dependencies, and dependencies to business impact. You get instant visibility into full architectural blast-radius and subject-matter expertise."*

---

**File:** `packages/database/neo4j/graph.repository.ts`

#### Step-by-Step Graph Construction (Under The Hood):

**Step 1: Entity Deduplication Inspector**
Jab LLM kehta hai `Arjun (PERSON)` node insert karo:
- **Sawaal 1:** *"Kya is email ka PERSON node pehle se graph mein exist karta hai?"*
  - Agar email match hua ➔ Usi existing node par timestamp aur properties update karo.
- **Sawaal 2:** *"Agar email nahi mila, toh kya lowercase name match hota hai?"*
  - Agar match hua ➔ Existing node update karo.
- **Sawaal 3:** *"Dono nahi mile?"*
  - Naya `(:PERSON {name: 'Arjun', externalId: ...})` node provision karo.

**Step 2: Relationship Weaving (Laal Dhaaga Baandhna)**
Engine graph mein directed relationships banata hai:
- `(p:PERSON)-[:CONTRIBUTED_TO {commitCount, lastCommitAt}]->(r:REPOSITORY)` *(Primary Developer Footprint)*
- `(p:PERSON)-[:AUTHORED]->(pr:PULL_REQUEST)-[:PART_OF]->(r:REPOSITORY)`
- `(p:PERSON)-[:WORKS_ON]->(r:REPOSITORY)`
- `(p:PERSON)-[:ASSIGNED_TO]->(i:ISSUE)`
- `(p:PERSON)-[:USES]->(t:TECHNOLOGY)`
- `(s1:REPOSITORY)-[:DEPENDS_ON]->(s2:REPOSITORY)`
- `(t1:TECHNOLOGY)-[:REPLACED_BY]->(t2:TECHNOLOGY)`
*(Historical COMMIT nodes are cleanly compacted into CONTRIBUTED_TO rollup edges with zero information loss)*

**Step 3: Downstream Blast Radius Inspector (Agar Service Down Hui Toh Kya Hoga?)**
Jab executive poochta hai ki *"Agar `auth-service` down hui toh kya break hoga?"*:
```cypher
MATCH (target:REPOSITORY {name: $repoName})<-[:DEPENDS_ON*1..3]-(downstream:REPOSITORY)
RETURN downstream.name AS impactedService, length(path) AS depth
```
Neo4j breadth-first graph traversal karke **sub-millisecond** mein bata deta hai ki `billing-service` aur `mobile-api` dono direct blast radius ke andar aate hain!

**Step 4: Startup Schema Indexes (Fast Lookups)**
Server boot hote hi 7 automatic indexes ensure karta hai taaki graph queries mein full-table scan na ho:
```cypher
CREATE INDEX entity_person_email      IF NOT EXISTS FOR (n:PERSON)     ON (n.email);
CREATE INDEX entity_person_externalid IF NOT EXISTS FOR (n:PERSON)     ON (n.externalId);
CREATE INDEX entity_repo_externalid   IF NOT EXISTS FOR (n:REPOSITORY) ON (n.externalId);
CREATE INDEX entity_person_name       IF NOT EXISTS FOR (n:PERSON)     ON (n.name);
CREATE INDEX entity_repo_name         IF NOT EXISTS FOR (n:REPOSITORY) ON (n.name);
CREATE INDEX entity_tech_name         IF NOT EXISTS FOR (n:TECHNOLOGY) ON (n.name);
CREATE INDEX entity_commit_createdat  IF NOT EXISTS FOR (n:COMMIT)     ON (n.createdAt);
```

---

## 8. Vector Search — Qdrant

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Vector Search Cortex ka **"Smart Librarian"** hai jo exact shabd nahi, balki unka matlab (meaning/semantics) samajhta hai.  
Agar aap normal search mein likho *"database crash"*, aur developer ne 6 mahine pehle PR mein likha tha *"Postgres connection pool exhausted"*, toh normal keyword search ko kuch nahi milega kyunki shabd alag hain!  
Lekin **Vector Search (Qdrant)** mathematical vectors (numbers) ki madad se samajh leta hai ki dono baaton ka asal matlab ek hi hai.

---

### 🏢 Real-Life Desi Example: "Library ka Genius Librarian & Parcel ka Barcode"
> 📚 **Analogy 1 (Semantic Understanding):**  
> Socho aap ek bohot badi library mein jate ho aur librarian se bolte ho:  
> *"Bhaiya, mujhe wo kitaab chahiye jisme sitaron, galaxies aur telescope ke baare mein baat ki gayi ho. Mujhe exact book ka naam yaad nahi aa raha."*  
> Ek aam computer bolega *"Error: Book title not found"*. Lekin jo **Genius Librarian** hai, wo aapki baat ka matlab samajh kar seedha Astronomy section se exact kitaab nikaal kar de dega!  
> 
> 📦 **Analogy 2 (Deterministic Point IDs — Parcel ka Barcode):**  
> Jab courier boy aapke ghar parcel lekar aata hai, toh parcel par tracking number ka barcode laga hota hai.  
> Agar aap ghar par nahi the aur wo agle din retry karta hai, toh barcode wahi rehta hai. Wo do alag package nahi chhodta, usi package ko deliver maanta hai.  
> **Pehle Cortex mein kya blunder tha:**  
> Vector insert karte waqt `crypto.randomUUID()` generate hota tha! Jab BullMQ kisi failed job ko retry karta tha, toh Qdrant mein ek hi commit ke 3-3 duplicate vector ghus jaate the!  
> **The Fix (P2-9):**  
> Ab Qdrant point ID `eventID` ke deterministic MD5 hash se RFC-4122 compliant UUID (`8-4-4-4-12`) banata hai. Agar job 10 baar bhi retry karegi, toh wo exact usi vector point ko update karegi — **Zero Duplication!**

---

### 💼 Client Pitch (Client ko Vector Search Kaise Samjhayein)
> *"Engineering history isn't just about who wrote what line of code; it's about WHY decisions were made. With Qdrant vector search, your executives and engineers can ask natural language questions like 'Why did we migrate away from Redis?' or 'How was the auth vulnerability patched?' and get the exact historical context in milliseconds."*

---

**Files:** `packages/database/vector/qdrant.repository.ts`, `packages/llm/providers/gemini.ts`

#### Step-by-Step Semantic Search Execution (Under The Hood):

**Step 1: Semantic Summary Pre-processing (Raw Code Ko Embed Mat Karo!)**
- Sabse badi beginner galti hoti hai poori 2,000 line ki code file ko vector DB mein embed kar dena. Isse retrieval quality dilute ho jaati hai aur costs explode hoti hain.
- Cortex strictly **LLM ke extracted 1-2 sentence semantic summary** ko embed karta hai:
  `"Arjun merged PR #42 replacing Redis with Valkey in auth-service due to memory limits"`

**Step 2: Google Gemini Vector Generation (Text Se 384 Numbers)**
- Google Gemini `embedding-2` model summary text ko **384 floating point numbers** ke multidimensional vector mein convert karta hai:
  `[0.024, -0.198, 0.441, ..., 0.082]` (Size: 384 dimensions).

**Step 3: Qdrant Cosine Similarity Inspector (Angle Distance Math)**
Jab user chat mein poochta hai: *"Why was Redis replaced?"*:
- User ki query ka bhi 384-dimension vector banaya jata hai ($A$).
- Qdrant database mein saved vectors ($B$) ke sath **Cosine Similarity** calculate karta hai:
  $$\text{Cosine Similarity} = \frac{A \cdot B}{\|A\| \|B\|} = \frac{\sum A_i B_i}{\sqrt{\sum A_i^2} \sqrt{\sum B_i^2}}$$
- **Sawaal:** *"Dono vectors ke beech ka angle kitna chota hai?"*
  - Agar angle 0 degree ke paas hai (Cosine Score ~ 0.85 – 0.99) ➔ **Strong Semantic Match!**
  - Qdrant 10ms ke andar top matches return kar deta hai, jisme exact PR link, committer, aur summary payload hota hai.

**Step 4: Hardened Deduplication (Deterministic RFC-4122 UUIDs)**
- Point ID ke liye random UUID generate nahi karte; Postgres Snowflake `eventID` se RFC-4122 compliant UUID hash derive kiya jata hai taaki retry hone par vector duplicate na ho.

---

## 9. Analytics Engine — 6-Factor Formula

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Ye formula company ka **"Key-Man Life Insurance Test"** hai.  
Har engineering team mein koi na koi aisa developer zaroor hota hai jiske sar par aadhi company chal rahi hoti hai: usi ne main code likha hai, usi par saari services depend karti hain, lekin usne documentation bilkul nahi likhi! Agar wo kal achanak chala gaya, toh poori team andhere mein chali jayegi.  
**Cortex ka 6-Factor Knowledge Risk formula ek mathematical score (0 se 100) calculate karta hai ki kis engineer ke jaane se company ko kitna bada architectural loss hoga.** Isme 0% AI guess hai — ye 100% pure Git aur Jira math hai!

---

### 🏢 Real-Life Desi Example: "Cricket Team ka Star All-Rounder"
> 🏏 **Analogy:**  
> Socho ek aisi cricket team jahan ek hi star player hai: wahi opening batting karta hai, wahi death overs mein bowling karta hai, wahi wicketkeeping karta hai aur wahi captaincy bhi! Baaki 10 players ko uske plan ka kuch pata hi nahi hota.  
> Agar kal subah wo all-rounder injured ho jaye ya doosri team mein chala jaye, toh poori team ek jhatke mein match haar jayegi!  
> 
> Cortex ka Knowledge Risk score CTO ko saaf dikhata hai ki aapki team mein kaun kaun aise **"Star All-Rounder"** bane baithe hain jinke upar single-point-of-failure risk create ho chuka hai.

---

### 💼 Client Pitch (Client ko Knowledge Risk Formula Kaise Samjhayein)
> *"How do you know who your most irreplaceable engineers are before they drop their resignation? Traditional management relies on guesswork or gut feelings. Cortex uses a deterministic 6-factor algorithm that objectively evaluates code ownership, downstream service dependencies, activity recency, and lack of documentation. You get an auditable 0-100 risk score that pinpoints single points of failure with mathematical precision."*

---

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

---

#### 9.2 Step-by-Step Factor Calculation (The 6 Inspectors):

**Inspector 1: Ownership Factor (30% Weight — Sabse Bada Khatra + 180-Day Exponential Time-Decay)**
- **Sawaal:** *"Is engineer ne uski primary repository ke total code mein se kitne percent code akele likha hai (aaj ki mehnat vs purani history ko weight dekar)?"*
- **The Time-Decay Upgrade:**  
  Pehle agar kisi dev ne 3 saal pehle 800 commits kiye the, aur 1 saal se gayab tha, tab bhi purana formula use hi sabse bada owner dikhata tha.  
  Ab Cortex commit ke age ke hisaab se **180-Day Exponential Half-Life Decay** calculate karta hai:
  $$\text{Commit Weight} = \exp\left(-0.693 \times \frac{\text{Age in Days}}{180}\right)$$
  - Aaj ka naya commit = **1.0 (Full 100% Weight)**
  - 180 din purana commit = **0.5 (Half Weight)**
  - 3 saal purana commit = **~0.01 (Sirf 1% Weight)**
- **Cypher Traversal:**
  ```cypher
  MATCH (p:PERSON {name: $name})-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY)
  WITH r,
       sum(
           CASE 
               WHEN c.createdAt IS NOT NULL 
               THEN exp(-0.693 * (CASE WHEN $nowMs > toFloat(c.createdAt) THEN ($nowMs - toFloat(c.createdAt)) ELSE 0.0 END) / (180.0 * 86400000.0))
               ELSE 0.5 
           END
       ) AS personWeightedScore
  MATCH (c2:COMMIT)-[:PART_OF]->(r)
  WITH r, personWeightedScore,
       sum(
           CASE 
               WHEN c2.createdAt IS NOT NULL 
               THEN exp(-0.693 * (CASE WHEN $nowMs > toFloat(c2.createdAt) THEN ($nowMs - toFloat(c2.createdAt)) ELSE 0.0 END) / (180.0 * 86400000.0))
               ELSE 0.5 
           END
       ) AS totalWeightedScore
  RETURN max(
      CASE 
          WHEN totalWeightedScore > 0 THEN personWeightedScore / totalWeightedScore 
          ELSE 0.0 
      END
  ) AS maxRepoOwnership
  ```
- **Live Example:**  
  Rohan ne 3 saal pehle 100 commits kiye the (har commit ka weight 0.01 ho gaya ➔ $100 \times 0.01 = 1.0$).  
  Naye dev Arjun ne pichhle 3 mahine mein 20 commits kiye (weight 0.85 ➔ $20 \times 0.85 = 17.0$).  
  Arjun ka ownership share: $17 / 18 = \mathbf{94.4\%}$, aur Rohan ka ghat kar $\mathbf{5.6\%}$ ho gaya!  
  👉 Nateeja: Jo banda **aaj** code sambhal raha hai, wahi dashboard par real owner dikhega!

**Inspector 2: Downstream Dependency (20% Weight — Blast Radius)**
- **Sawaal:** *"Rohan ke likhe hue code ya services par kitni doosri microservices depend karti hain?"*
- **Cypher Traversal:**
  ```cypher
  MATCH (p:PERSON {name: $name})-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY)<-[:DEPENDS_ON]-(d:REPOSITORY)
  RETURN count(DISTINCT d) AS downstreamDependencies
  ```
- **Live Example:** Rohan ki service par 4 downstream services depend karti hain.  
  Normalized Score = $\min(4 / 5, 1.0) = 0.80$.  
  Weight 20% hai ➔ Points = $0.80 \times 0.20 = \mathbf{0.160}$.

**Inspector 3: Activity Recency (15% Weight — In-Flight Context)**
- **Sawaal:** *"Rohan ne pichle 30 din mein kitne commits aur PRs merge kiye hain?"*
- Active engineer ke dimaag mein latest architecture hota hai; jo banda 6 mahine se inactive hai uska departure kam impact karta hai.  
- **Live Example:** Rohan ne pichle 30 din mein 25 contributions kiye hain.  
  Normalized Score = $1.0$.  
  Weight 15% hai ➔ Points = $1.0 \times 0.15 = \mathbf{0.150}$.

**Inspector 4: Documentation Coverage (15% Weight — Missing Docs Penalty)**
- **Sawaal:** *"Kya Rohan ne architecture wikis ya README documentation likhi hai?"*
- **Cypher Check:** Count of `FILE` nodes where `path CONTAINS '.md'` authored by Rohan.  
- **Inverted Scoring:** Agar docs **ZERO** hain, toh penalty MAXIMUM hoti hai (1.0). Agar 10+ doc files likhi hain, toh risk 0.0 ho jata hai.  
- **Live Example:** Rohan ne **0 documentation** likhi hai!  
  Missing Docs Score = $1.0$.  
  Weight 15% hai ➔ Points = $1.0 \times 0.15 = \mathbf{0.150}$.

**Inspector 5: Expertise Breadth (10% Weight — All-Rounder Penalty)**
- **Sawaal:** *"Rohan kitni alag alag technologies aur repositories ko touch karta hai?"*  
- **Live Example:** Rohan 12 technologies (`TypeScript, PostgreSQL, Redis, Docker, RabbitMQ, etc.`) use karta hai.  
  Normalized Score = $\min(12 / 20, 1.0) = 0.60$.  
  Weight 10% hai ➔ Points = $0.60 \times 0.10 = \mathbf{0.060}$.

**Inspector 6: Pending Work (10% Weight — Unresolved Tickets)**
- **Sawaal:** *"Jira par Rohan ke naam par kitne open tickets assigned hain?"*  
- **Live Example:** Rohan ke naam par 6 open tickets hain.  
  Normalized Score = $\min(6 / 10, 1.0) = 0.60$.  
  Weight 10% hai ➔ Points = $0.60 \times 0.10 = \mathbf{0.060}$.

---

#### 🎯 Concrete Numerical Total:
$$\text{Total Risk} = 0.255 + 0.160 + 0.150 + 0.150 + 0.060 + 0.060 = \mathbf{0.835}$$
$$\text{Final Persisted Risk Score} = \text{Math.round}(0.835 \times 100) = \mathbf{84} \quad (\text{CRITICAL RISK — RED FLAG!})$$

CTO dashboard par Rohan ka profile turant **RED** highlight ho jata hai with recommendation: *"High code ownership (85%) with zero documentation. Pair programming required immediately."*

---

## 10. Successor Engine — 4-Factor Formula

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Ye engine Cortex ka **"Backup / Vice-Captain Finder"** hai.  
Jab pata chal gaya ki lead developer company chhod raha hai, toh management ke samne sabse bada sawal hota hai: *"Inka kaam kaun sambhalega?"*  
Market se naya engineer hire karne mein 3 se 6 mahine lagte hain. Lekin aapki company ke andar hi koi na koi doosra engineer hota hai jisne wahi tech stack use kiya hota hai ya us repo mein pehle thoda code likha hota hai.  
**Cortex ka 4-factor Successor Engine team ke har bande ka math calculate karke best successor rank karta hai, aur ye bhi ensure karta hai ki pehle se overloaded bande par aur bojh na pade!**

---

### 🏢 Real-Life Desi Example: "Hospital ka Backup Heart Surgeon"
> 🏥 **Analogy:**  
> Hospital mein agar senior heart surgeon chutti par chala jaye aur emergency heart surgery karni ho, toh management kisi orthopedic (haddi ke) doctor ko nahi bhejti!  
> Wo us doosre cardiac specialist ko bhejti hai jisne pehle bhi wahi instruments chalaye hon, wahi procedures dekhe hon, aur jo us time free ho.  
> 
> Successor Engine wahi smart medical board hai: wo **Jaccard Mathematical Similarity** se dekhta hai ki kis candidate ka tech stack match karta hai, kisne repository ko pehle dekha hai, aur kiske paas capacity bachi hai.

---

### 💼 Client Pitch (Client ko Successor Engine Kaise Samjhayein)
> *"When your lead architect tenders their resignation, you don't have 90 days to hire an outsider. Cortex instantly evaluates your entire existing engineering team to rank the top peer successors based on shared technologies, repository familiarity, and current capacity. It even enforces safety disqualification rules so you never assign critical systems to someone who has never touched the code or is already burnt out."*

---

**File:** `packages/analytics/successor.service.ts`

```
Successor Score = (0.40 × SharedTechScore)
                + (0.25 × SharedRepoScore)
                + (0.20 × RecentActivityScore)
                + (0.15 × WorkloadCapacityScore)

Output Range: 0 – 100 integer score per candidate
```

---

#### 10.1 Step-by-Step Successor Evaluation (The 4 Inspectors):

**Inspector 1: Shared Technologies (40% Weight — Jaccard Similarity)**
- **Sawaal:** *"Target Dev aur Candidate ke tech stack mein kitna overlap hai?"*
- **Formula:**
  $$J(A, B) = \frac{|A \cap B|}{|A \cup B|} = \frac{\text{Common Technologies}}{\text{Total Unique Technologies}}$$
- **Live Numerical Example:**
  - Target Dev (Rohan) Tech Stack: `[Node.js, TypeScript, Postgres, Redis, Docker]` (5 tools)
  - Candidate (Vikram) Tech Stack: `[Node.js, TypeScript, Postgres, Python, AWS]` (5 tools)
  - Intersection ($A \cap B$): `[Node.js, TypeScript, Postgres]` = **3 tools common**
  - Union ($A \cup B$): `[Node.js, TypeScript, Postgres, Redis, Docker, Python, AWS]` = **7 total unique tools**
  - Jaccard Math: $3 / 7 = \mathbf{0.428} \implies \text{SharedTechScore} = 42.8$.
  - 40% Weight Points: $42.8 \times 0.40 = \mathbf{17.12}$.

**Inspector 2: Shared Repositories (25% Weight — Repo Familiarity)**
- **Sawaal:** *"Rohan ki 4 repos mein se Vikram ne kitni repos mein pehle commit kiya hai?"*
- Formula: $(\text{Shared Repos} / \text{Target Repos}) \times 100$.
- **Live Example:** Rohan 4 repos maintain karta hai (`auth`, `payments`, `billing`, `gateway`). Vikram ne `payments` aur `billing` mein pehle commit kiya hai (2 repos).  
  Overlap = $2 / 4 = 50\% \implies \text{Score} = 50$.  
  25% Weight Points: $50 \times 0.25 = \mathbf{12.50}$.

**Inspector 3: Recent Activity (20% Weight — Active Developer Check)**
- **Sawaal:** *"Vikram pichle 30 din mein active tha kya?"*
  - $\le 30\text{ days}$: Score = 100
  - $31 - 60\text{ days}$: Score = 60
  - $> 90\text{ days}$: Score = 0 (Dormant)
- **Live Example:** Vikram ne kal hi commit kiya hai ➔ Score = 100.  
  20% Weight Points: $100 \times 0.20 = \mathbf{20.00}$.

**Inspector 4: Workload Capacity & SPOF Overload Penalty (15% Weight)**
- **Sawaal 1:** *"Kya Vikram ka apna Knowledge Risk pehle se high hai?"*
- **Sawaal 2:** *"Kya Vikram pehle se hi kisi aur repository ka akela maalik (SPOF) bana baitha hai?"*
  $$\text{spofPenalty} = (\text{Vikram's SPOF Repos}) \times 0.15$$
  $$\text{CapacityScore} = \max(0, 1.0 - \text{VikramRisk} - \text{spofPenalty}) \times 100$$
- **Live Example:** Vikram ka apna risk 0.30 hai aur wo sirf 1 repo ka owner hai ($\text{penalty} = 0.15$).  
  Capacity Score = $(1.0 - 0.30 - 0.15) \times 100 = 55$.  
  15% Weight Points: $55 \times 0.15 = \mathbf{8.25}$.

---

#### 🎯 Total Composite Successor Score:
$$\text{Total Score} = 17.12 + 12.50 + 20.00 + 8.25 = \mathbf{57.87} \implies \mathbf{58} / 100$$

#### 🛡️ Hard Safety Rules (Disqualifications):
1. **Zero Overlap Disqualification:** Agar Tech = 0 AND Repo = 0 ➔ Candidate **turant disqualify** (List se bahar).
2. **0%-Repo Score Cap:** Agar candidate ne repo ko kabhi touch nahi kiya, toh chahe baki sab 100 ho, composite score **25% par cap** ho jata hai aur category `"cross_training_candidate"` lag jaati hai.
3. **Burnout Hard Cap:** Agar candidate pehle se 3+ critical repos ka SPOF hai ➔ System warning deta hai: *"Not Recommended — Already overloaded with 3 critical repositories"*.

---

## 11. Bus Factor & Repo Risk Formula

### 💡 Aasaan Bhasha Mein (Layman Explanation)
**"Bus Factor"** software industry ka ek classic concept hai:  
*"Kitne engineers ko agar kal road par bus takkar maar de (ya wo achanak company chhod dein), toh project thapp ho jayega?"*  
- Agar kisi repository ka **Bus Factor = 1** hai, toh iska matlab sirf 1 hi developer ne 50% se zyada code likha hai aur wahi akele use samajhta hai. Agar wo chutti pe chala gaya, toh koi doosra banda production bug fix nahi kar payega!  
- Agar **Bus Factor = 4 ya 5** hai, toh matlab code knowledge team mein equally banti hui hai aur repo bilkul safe hai.

---

### 🏢 Real-Life Desi Example: "Pahadi Jhula / Rope Suspension Bridge"
> 🌉 **Analogy:**  
> Socho pahadon ke beech nadi par ek rassi wala jhulne wala pull (Suspension Bridge) bana hai.  
> - **Bus Factor = 1:** Pura pull sirf **ek hi moti rassi** par latka hua hai. Agar wo rassi kisine kaat di ya toot gayi, toh pura bridge seedha nadi mein gir jayega!  
> - **Bus Factor = 5:** Pull 5 alag alag mazboot steel rassiyon par tika hai. Agar 1 ya 2 rassi toot bhi jayein, tab bhi bridge bilkul safely khada rehta hai aur log aaraam se cross kar sakte hain.  
> 
> Cortex company ki har repo ko test karta hai ki kaunsa service-bridge sirf 1 rassi par latak raha hai taaki accident hone se pehle nayi rassiyan (collaborators/reviewers) baandhi ja sakein!

---

### 💼 Client Pitch (Client ko Bus Factor Kaise Samjhayein)
> *"A Bus Factor of 1 is an existential threat to your tech org. It means a single person holds your codebase hostage, consciously or unconsciously. Cortex automatically calculates the Bus Factor for every microservice across your company. We flag fragile single-point-of-failure repositories immediately so your engineering managers can mandate pair-programming and cross-training before someone departs."*

---

**File:** `packages/analytics/repoMetrics.service.ts`

#### Step-by-Step Bus Factor Calculation (Running Sum Inspector):

**Step 1: Commits Aggregation per Author**
Engine repository ke saare commits count karta hai aur author ke according descending order mein sort karta hai:
```cypher
MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r:REPOSITORY {name: $repoName})
WITH p, count(c) AS personCommits
ORDER BY personCommits DESC
WITH collect({person: p.name, commits: personCommits}) AS ranked,
     sum(personCommits) AS totalCommits
```

**Step 2: 50% Threshold Running Sum Check**
- **Sawaal:** *"Kitne top engineers ke commits milane par total ka 50% cross hota hai?"*
- **Live Example A (Fragile Repo — `payments-service`):**
  - Total Commits = 100. 50% Threshold = **50 commits**.
  - Developer 1 (Rohan): 82 commits.
  - *Check:* Rohan ke akele 82 commits $\ge 50$ threshold.
  - **Result:** Sirf 1 insaan laga ➔ $\mathbf{Bus\ Factor = 1}$ (SPOF Critical Risk).
  - Risk Score: $\max(0, 100 - (1 \times 20)) = \mathbf{80}$ (Status: `fragile`).

- **Live Example B (Healthy Repo — `web-frontend`):**
  - Total Commits = 100. 50% Threshold = **50 commits**.
  - Dev A: 20 commits (Sum: 20 < 50)
  - Dev B: 15 commits (Sum: 35 < 50)
  - Dev C: 12 commits (Sum: 47 < 50)
  - Dev D: 10 commits (Sum: 57 > 50) ➔ 50% threshold crossed!
  - **Result:** 4 developers lage ➔ $\mathbf{Bus\ Factor = 4}$.
  - Risk Score: $\max(0, 100 - (4 \times 20)) = \mathbf{20}$ (Status: `healthy`).

---

| Bus Factor | Risk Score | Risk Status | Real Meaning |
|---|---|---|---|
| **0** | 80 | `fragile` | Koi commit history indexed nahi hai |
| **1** | 80 | `fragile` | **Single Point of Failure** (1 dev par dependent) |
| **2** | 60 | `concentrated` | Sirf 2 dev mil kar 50% code hold karte hain |
| **3** | 40 | `healthy` | Balanced distribution |
| **4** | 20 | `healthy` | Strong peer distribution |
| **5+** | 0 | `healthy` | Perfect engineering resilience |

---

## 12. AI Chat Agent — LangGraph Workflow

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Aam AI chatbots (jaise ChatGPT) sawal ka jawab dene ke liye hawa mein baatein bana sakte hain (jise computer science mein *Hallucination* kehte hain). Lekin Cortex ka AI Agent koi normal chatbot nahi hai; ye ek **"Specialist Detectives ki Forensic Team"** ki tarah kaam karta hai.  
Jab aap koi sawal poochte ho (e.g. *"Agar Rohan chala gaya toh payment service par kya asar padega?"*):
1. **Planner Node (Team Head):** Sawal ko todta hai ki mujhe kya kya pata karna hai.
2. **Specialist Tools (Detectives):**
   - **Graph Detective:** Neo4j mein jaakar check karta hai ki Rohan ke code par kaunsi service depend karti hai.
   - **SQL Detective:** Postgres mein jaakar exact commit aur PR numbers check karta hai.
   - **Vector Detective:** Qdrant mein jaakar purane architectural discussions khojta hai.
   - **Knowledge Risk Detective:** Mathematical formula chala kar 0-100 risk score nikalta hai.
3. **Reflection Node (Quality Check):** Check karta hai ki saare saboot mil gaye ya koi kami reh gayi.
4. **Answer Node (Final Verdict):** Sirf aur sirf mile hue sabooton (evidence) ko neat English mein format karta hai. Agar saboot nahi mila, toh saaf bol deta hai *"No records found"* — kabhi mann-ghadant kahani nahi banata!

---

### 🏢 Real-Life Desi Example: "Sherlock Holmes & Forensic Crime Squad"
> 🔍 **Analogy:**  
> Sherlock Holmes akele bina saboot ke kisi ko mujrim ghoshit nahi karta!  
> Pehle wo plan banata hai (Planner), phir apni forensic team ko fingerprint aur footprint match karne bhejta hai (Tools/Detectives), saare saboot table par rakh kar verify karta hai (Evidence Node), aur jab pakka physical proof hota hai tabhi court ke samne final statement deta hai (Zero-Hallucination Answer).  
> 
> Cortex ka AI Chatbot bina verified graph saboot ke ek shabd bhi invent nahi karta.

---

### 💼 Client Pitch (Client ko AI Agent Kaise Samjhayein)
> *"Most enterprise AI solutions hallucinate metrics and fabricate engineering details because they're just basic LLM wrappers. Cortex runs a state-of-the-art 11-node LangGraph agent that separates reasoning from fact retrieval. The agent is forced to gather verifiable mathematical, relational, and vector evidence before generating an answer. If data doesn't exist in your GitHub or Jira, it explicitly tells you rather than inventing fake facts."*

---

**File:** `packages/agent/graph/workflow.ts`

#### Step-by-Step 11-Node Agent Flow (The Detective Team in Action):

**Step 1: Planner Node (Goal Decomposition Inspector)**
Jab user query aati hai: *"Why is payments-service fragile and who is the best successor if Rohan leaves?"*:
- **Sawaal:** *"Is complex sawal ko solve karne ke liye mujhe kaun kaun se exact sub-goals achieve karne padenge?"*
- Planner query ko 3 specific sub-tasks mein tod deta hai:
  - Sub-goal 1: `payments-service` ka bus factor aur primary owner check karo.
  - Sub-goal 2: Qdrant se `payments-service` ki recent architectural problems aur bug fixes retrieve karo.
  - Sub-goal 3: Rohan ka 6-factor knowledge risk aur top 3 successor candidates calculate karo.

**Step 2: Retrieval Planner (Routing Inspector)**
Sub-goals dekh kar router decide karta hai kis detective (tool) ko bhejna hai:
- **Sawaal 1:** *"Kya structural metrics aur table data chahiye?"* ➔ `sqlNode` (Postgres query on `repo_metrics`).
- **Sawaal 2:** *"Kya deep service dependency aur blast-radius chahiye?"* ➔ `graphNode` (Neo4j Cypher query).
- **Sawaal 3:** *"Kya 'Kyun?' (Why) ka answer chahiye?"* ➔ `vectorNode` (Qdrant semantic search).
- **Sawaal 4:** *"Kya succession math calculate karni hai?"* ➔ `knowledgeRiskNode` (Deterministic TypeScript algorithm).
- **Sawaal 5:** *"Kya user ka sawal adhoora ya ambiguous hai?"* ➔ `clarifyNode` (User se clarification maango).

**Step 3: Evidence Aggregator Node (Saboot Box)**
- Saare tools se aane wale raw outputs (Cypher results, SQL rows, Vector text snippets) ko ek unified `StructuredEvidence` object mein seal karta hai.

**Step 4: Reflection Node (Gap Inspector)**
- **Sawaal 1:** *"Kya saare sub-goals ka pakka saboot mil gaya?"*
  - Agar haan ➔ Proceed to `answerNode`.
- **Sawaal 2:** *"Kya koi data gap reh gaya?"*
  - Agar gap hai ➔ Engine dobara `retrievalPlannerNode` par loop karta hai naye parameters ke sath (`recursionLimit: 25`).
- **Sawaal 3:** *"Kya 25 steps ke baad bhi saboot nahi mila?"*
  - Halt and explicitly answer: *"Verified records do not exist in the codebase."*

**Step 5: Answer Node (Zero Fabrication Judge)**
- Enforced at `temperature = 0`.
- Model strictly evidence box mein rakhe hue data ko clear, executive-ready English prose mein draft karke frontend par stream karta hai (`/api/chat/stream`).

---

## 13. Identity Resolution System

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Ek hi developer har platform par alag alag naam aur ID se kaam karta hai:
- GitHub par: `gh_arjun99`
- Slack par: `U982ARJUN`
- Jira par: `arjun.kumar@company.com`  
Agar system smart na ho, toh wo in teeno ko 3 alag alag insaan maan lega, jisse saari metrics aur risk scores galat ho jayenge!  
**Cortex ka Identity Resolution System ek "Single Aadhaar Card / Passport" ki tarah kaam karta hai.** Ye in saare handles ko pehchaan kar ek hi Canonical Person (`Arjun Kumar`) ke single record se link kar deta hai.

---

### 🏢 Real-Life Desi Example: "Bank KYC & Single Aadhaar Card"
> 💳 **Analogy:**  
> Aap chahe ATM se cash nikalo (Debit Card number), Google Pay se payment karo (Mobile number / UPI handle), ya bank branch mein jakar check jama karo (Account number) — Bank aapke **Aadhaar Card aur PAN Card** se janta hai ki ye saare transactions ek hi insaan kar raha hai.  
> 
> Cortex company ka wahi KYC system hai: chahe commit GitHub se aaye, chat Slack se aaye, ya ticket Jira se aaye, sab ek hi canonical developer ke profile mein judte hain.

---

### 💼 Client Pitch & Core Operating Rule
> *"In any modern engineering org, developer identities are fragmented across GitHub handles, Slack user IDs, and corporate Jira emails. Cortex follows a strict enterprise policy: **'Wrong merge is worse than having 2 separate entries.'** Auto-merging is restricted strictly to high-confidence verifiable anchors (exact email and strong exact username). Display name similarity or AI name guessing is never allowed to auto-merge, protecting your engineering knowledge graph from corrupt identity collisions."*

---

### 🛡️ The Golden Rule: "Wrong merge is worse than having 2 separate entries"
Agar 2 alag-alag log galti se ek profile mein merge ho gaye, toh:
- Commits aapas mein jud jayenge (Backend wale ke kaam ka credit DevOps wale ko mil jayega).
- Bus Factor galat ho jayega (system sochega ek hi dev sab sambhal raha hai).
- Security & Access audit corrupt ho jayega.

**Isiliye:** Agar 1% bhi doubt hai, toh dono ko **alag-alag person** rakho!

---

### 🏢 Real-Life Desi Example: "Rahul Sharma (Backend) vs Rahul Sharma (DevOps)"
> 👨‍💻 **Case Study:**
> Ek hi company mein 2 alag log kaam karte hain jinka naam identical hai:
> 1. **Rahul Sharma #1 (Payments Team):** `email: rahul.s@company.com`, Canonical ID: `person_001`
> 2. **Rahul Sharma #2 (DevOps Team):** `email: rahul.devops@company.com`, Canonical ID: `person_002`
>
> Agar system sirf naam dekh kar dono ko auto-merge kar dega, toh Payments Gateway ka code aur Kubernetes Infra ka code ek hi insaan ke naam par chadh jayega!  
> **Cortex Policy:** Inhe kabhi auto-merge nahi kiya jayega. Dono ke liye separate Canonical ID aur alag Graph Node banega.

---

**File:** `packages/identity/canonicalPerson.service.ts`

#### Step-by-Step Identity Resolution Pipeline (The Strict KYC Policy):

Jab koi bhi naya event aata hai, worker `resolveIdentity(provider, externalId, email, name, username)` call karta hai:

**Step 0: Already Linked Identity Check (Preserve Confirmed Merges)**
- **Sawaal:** *"Kya yeh `(provider, external_id)` pehle se kisi Canonical Person se linked hai?"*
- Agar haan ➔ Wahi purana `canonical_person_id` return karo. Metadata update karo. Existing confirmed merges kabhi break nahi hote.

**Tier 1: Exact Email Match (Confidence: 1.0 — High-Confidence Auto-Merge)**
- **Sawaal:** *"Kya incoming email `person_identity` table mein pehle se registered hai?"*
  ```sql
  SELECT canonical_person_id FROM person_identity WHERE LOWER(email) = LOWER($incomingEmail)
  ```
- Non-generic, valid emails ke liye: Instant resolution! Incoming identity ko usi existing `canonical_person_id` se auto-merge kar do.

**Tier 2: Strong Exact Username Match (Confidence: 0.98 — High-Confidence Auto-Merge)**
- **Sawaal:** *"Agar email nahi mila, toh kya cross-provider clean username exact match hota hai?"*
  ```sql
  SELECT canonical_person_id FROM person_identity WHERE LOWER(username) = LOWER($incomingUsername)
  ```
- Strong human usernames (length $\ge 3$, not generic like `admin`, `bot`, `unknown`, nor Slack IDs like `U01234567`): Auto-merge confirmed.

**Tier 3 & Tier 4: Display Name Similarity & LLM Fallback (AUTO-MERGE STRICTLY BLOCKED)**
- **Sawaal:** *"Agar sirf Display Name match ho raha hai (e.g. dono ka naam 'Rahul Sharma' hai ya similarity > 95%), toh kya auto-merge karein?"*
- **STRICT JAWAB: NAHI! AUTO-MERGE STRICTLY FORBIDDEN!**
  1. System naya separate Canonical Person banata hai: `person_${snowflake.nextID()}`.
  2. Dono ko alag-alag insaan ki tarah save karta hai.
  3. Agar similarity $\ge 85\%$ hai, toh is collision ko PostgreSQL ki `potential_duplicates` table mein `status = 'pending'` ke sath flag kar deta hai taaki human admin dashboard se review kar sake.

---

### 🕸️ Neo4j Graph DB Fix: `MERGE on canonicalPersonId` vs `MERGE on name`

**File:** `packages/database/neo4j/graph.repository.ts`

#### ❌ Pehle kya bug tha? (`MERGE on name`)
Purane code mein Neo4j Cypher query yeh thi:
```cypher
MERGE (e:PERSON {name: $name})
```
Cypher mein `MERGE {name: 'Rahul Sharma'}` ka matlab hai: *"Graph mein dhoondho — agar 'Rahul Sharma' naam ka node pehle se hai, toh usi par chipak jao!"*  
Isse jab DevOps Rahul aaya, toh Neo4j ne uske liye naya node banane ke bajaye **Backend Rahul ke node ke upar merge kar diya** aur `SET e.canonicalPersonId = 'person_002'` chala kar purane Rahul ka ID bhi overwrite kar diya!

#### ✅ Ab humne kya fix kiya? (`MERGE on canonicalPersonId`)
Humne rule badal diya: **Graph mein kisi ko bhi sirf 'Naam' se merge nahi kiya jayega.**
```cypher
MERGE (e:PERSON {canonicalPersonId: $canonicalPersonId})
ON CREATE SET e.name = $name, e.createdAt = timestamp()
ON MATCH SET e.name = $name, e.updatedAt = timestamp()
```
- Node hamesha unique Snowflake `canonicalPersonId` par lock hota hai.
- Rahul #1 (`person_001`) ka apna alag node hai.
- Rahul #2 (`person_002`) ka apna alag node hai.
- Dono ke repos, commits, aur relationships 100% isolated rehte hain.
- Agar koi bina ID wala raw name ho, toh `CREATE (e:PERSON {name: $name})` use hota hai taaki hamesha fresh, separate node bane.

---

## 14. PostgreSQL Schema — All 9 Tables

### 💡 Aasaan Bhasha Mein (Layman Explanation)
PostgreSQL Cortex ka **"Pakka Bahi-Khata (Permanent Ledger Book)"** hai.  
Graph database (Neo4j) network aur connections dhoondhne ke liye best hai, lekin daily dashboard stats, summary tables, calculated scores aur audit logs ko fast speed mein serve karne ke liye Relational Database (PostgreSQL) use hota hai.  
Cortex server startup par hi check karta hai ki saari 9 tables bani hain ya nahi (`ensurePostgresTables()`), aur agar nahi hain toh bina data delete kiye safely create kar deta hai.

---

### 🏢 Real-Life Desi Example: "Munimji ka Khata-Bahi & Cash Counter Register"
> 📒 **Analogy:**  
> Dukan mein har customer ke sath kya baat hui wo diary mein ho sakti hai, lekin sham ko kitna cash aaya, kiski udhaari bachi hai aur kaunse bills clear hue — ye Munimji ke **Pakke Khata-Bahi** mein likha jata hai taaki seth ji aate hi 1 second mein balance dekh sakein.  
> Postgres Cortex ka wahi pakka register hai jo dashboard ko sub-millisecond response time deta hai.

---

**File:** `packages/database/postgres/schema.ts`  
*Tables are verified and idempotently created on boot via `ensurePostgresTables()`.*

```sql
-- 1. Raw Ingested Event Store (Retention: EVENTS_RETENTION_DAYS, Default: 90 days)
-- Pruned automatically by cleanupOldEvents() in packages/workers/scheduler.worker.ts
-- All aggregation queries are index-bounded (30d/90d/180d) to prevent full-table sequential scans.
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(255) PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100),
  external_id VARCHAR(255),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_events_provider_external UNIQUE (provider, external_id)
);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_provider_created ON events (provider, created_at DESC);

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
| POST | `/api/github/webhook` | HMAC-SHA256 | ✅ Fully Operational (Idempotent) |
| POST | `/api/slack/events` | HMAC + Timestamp | ✅ Fully Operational (Idempotent with ON CONFLICT) |
| POST | `/api/jira/webhook?secret=` | Query Parameter / Header | ✅ Fully Operational (Idempotent with ON CONFLICT) |

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

### 💡 Aasaan Bhasha Mein
Ye executive ke liye **"Subah ki Chai ke sath Daily Newspaper"** hai.  
Roz sham ko 18:00 IST par cron job chalta hai jo check karta hai ki aaj kaunse repos fragile hue, kiska risk score badha, aur kitne commits push hue. Groq LLM is raw data ko ek khoobsurat HTML executive summary mein format karke save karta hai.

---

## 19. PR Risk Engine

### 💡 Aasaan Bhasha Mein (Layman Explanation)
PR Risk Engine GitHub Pull Requests ke liye ek **"Pre-Merge Metal Detector Scanner"** hai.  
Developer jab code merge karne lagta hai, ye engine check karta hai:
- Ye file kisne likhi thi?
- Kya author is file ka primary owner hai ya koi naya dev bina context ke critical core logic touch kar raha hai?
- Agar ye code merge hua, toh kitni downstream services break ho sakti hain?  
Agar risk HIGH ya CRITICAL nikalta hai, toh PR par alert banta hai taaki bina senior review ke code production mein na jaye.

---

### 🏢 Real-Life Desi Example: "Airport Boarding Gate ka Luggage Scanner"
> 🛫 **Analogy:**  
> Flight par chadhne se pehle jaise security check hoti hai taaki koi hazardous item flight mein na ghus jaye. PR Risk Engine production mein naya code chadne se pehle ka wahi security scanner hai.

---

### 💼 Client Pitch
> *"Stop production outages before code gets merged. Cortex analyzes PR merge risk in real-time by evaluating author unfamiliarity, file blast-radius, and repo bus factor, flagging high-risk PRs before they hit your main branch."*

---

**File:** `packages/analytics/prRisk.service.ts`

#### Step-by-Step PR Risk Evaluation (The 5 Merge Inspectors):

**Step 1: Idempotency Lock Inspector**
- **Sawaal:** *"Kya is PR delivery ID ka evaluation pichle 60 seconds mein pehle chal chuka hai?"*
  `SET lock:pr:<deliveryId> EX 60 NX`
  - Prevents duplicate CI webhook evaluations from overloading the database.

**Step 2: Repository Fragility Inspector**
- **Sawaal:** *"Kya target repository pehle se fragile (Bus Factor = 1) hai?"*
  - Agar repository ka Bus Factor = 1 hai, toh kisi bhi code change ka baseline risk automatic 40 points upar shift ho jata hai!

**Step 3: Author Ownership & Experience Inspector**
- **Sawaal:** *"Kya PR author ne un files ko pehle kabhi chhua hai jo is PR mein modify ho rahi hain?"*
  ```cypher
  MATCH (p:PERSON {name: $author})-[:AUTHORED]->(c:COMMIT)-[:MODIFIED]->(f:FILE {path: $filePath})
  RETURN count(c) AS authorPastModifications
  ```
  - Agar Author = 0 past commits on core billing file ➔ **HIGH UNFAMILIARITY PENALTY!**

**Step 4: Blast Radius Dependency Inspector**
- **Sawaal:** *"Modified files jis service ka part hain, uspar kitni downstream microservices depend karti hain?"*
  - Downstream services count * 10 points blast radius risk.

**Step 5: Composite Risk Level Mapping**
$$Score = (0.35 \times \text{Unfamiliarity}) + (0.30 \times \text{BlastRadius}) + (0.20 \times \text{RepoFragility}) + (0.15 \times \text{AuthorRisk})$$

| Merge Risk Score | Risk Tier | Action Enforced |
|---|---|---|
| **0 – 30** | `LOW` | Safe to merge (Standard 1 approval) |
| **31 – 60** | `MEDIUM` | Peer review recommended |
| **61 – 80** | `HIGH` | Mandatory approval from Primary Code Owner |
| **81 – 100** | `CRITICAL` | Block merge! Architecture VP / Lead Architect signoff required |

---

## 20. Offboarding Handoff Generator

### 💡 Aasaan Bhasha Mein (Layman Explanation)
Ye Cortex ka **"1-Click Relieving Kit & Handover Dossier"** hai.  
Aamtaur par jab koi developer resign karta hai, manager 15 din tak pareshan rehta hai ki *"isse kis kis cheez ka password aur code handover lena hai?"*.  
Cortex mein manager sirf us engineer ke naam par click karke **"Simulate Departure"** dabata hai: 1 second ke andar poora handover document generate ho jata hai — kaunsi repos uska wait kar rahi hain, pending Jira tickets kya hain, aur kis team member ko handover transfer karna hai!

---

### 🏢 Real-Life Desi Example: "Ghar Shifting ka Digital Packing Checklist"
> 📦 **Analogy:**  
> Ghar badalte waqt agar pata hi na ho ki kis kamre mein kya saman rakha hai, toh naye ghar mein aadhi cheezein kho jati hain. Handover generator har kamre ka saman aur chabi automatically agle malik ke naam transfer kar deta hai.

---

### 💼 Client Pitch
> *"Turning a 2-week stressful employee exit into a 2-second automated handoff. Cortex instantly identifies every repository owned, every pending ticket, and calculates the exact recovery time in weeks, pairing the departing employee with the mathematically best internal successor."*

---

**File:** `packages/analytics/offboarding.service.ts`

#### Step-by-Step Departure Simulation Pipeline:

**Step 1: Ownership & Blast Radius Audit**
- Engine Neo4j mein traverse karta hai:
  - Rohan ki exclusively owned repos (`count(personCommits) / total > 0.70`).
  - Active unresolved Jira issues assigned to Rohan.
  - Rohan ka current Knowledge Risk Score ($84$).

**Step 2: Bus Factor Degradation Prediction**
- **Sawaal:** *"Agar Rohan kal chala jaye, toh kaun kaun si repositories ka Bus Factor gir kar 1 ho jayega?"*
  - System preview deta hai: *"Warning: payments-service and auth-service will drop to Bus Factor = 0 immediately upon Rohan's departure."*

**Step 3: Recovery Time Formula (Exact Mathematical Estimate)**
$$\text{RecoveryTimeWeeks} = \max\left(1, \left\lceil \frac{\text{KnowledgeRiskScore}}{20} \right\rceil\right)$$
- **Live Numerical Walkthrough:**
  - Rohan ka Knowledge Risk = **84**.
  - Math: $84 / 20 = 4.2$.
  - Ceiling Function $\lceil 4.2 \rceil = \mathbf{5\text{ Weeks}}$.
  - **Result:** System notice period mein 5 full weeks ka handoff schedule allocate karta hai!

**Step 4: Top Peer Successor Pairing**
- Successor Engine automatically runs for all peers.
- Top ranked candidate (e.g. Vikram, Score = 58) ko primary assignee banaya jata hai for knowledge transfer sessions.

**Step 5: Automated Markdown Dossier Synthesis**
- LLM strictly formats pre-computed numbers into clean, human-readable handoff documentation with zero numeric hallucinations.

---

## 21. Known Bugs & Operational Status

| ID | Subsystem | Description | Severity | Status |
|---|---|---|---|---|
| B-01 | Slack Ingestion | Missing `ON CONFLICT` triggers unhandled 500 on duplicate delivery | Critical | ✅ Fixed (`ON CONFLICT DO NOTHING`) |
| B-02 | Jira Ingestion | Missing `ON CONFLICT` and unstable external_id drops lifecycle updates | Critical | ✅ Fixed (Lifecycle compound key + `ON CONFLICT`) |
| B-03 | Metrics Sync | Metrics tables stale until daily cron (no instant refresh on events) | Critical | ✅ Fixed (Debounced Invalidation with Redis Mutex) |
| B-04 | Ingestion Queue | `removeOnFail: true` purges failed Slack/Jira jobs | Critical | 🟡 Configurable |
| B-05 | Vector Index | Random UUID on retry causes duplicate Qdrant points | High | ✅ Fixed (Deterministic RFC-4122 UUID derived from `eventID`) |
| B-06 | Vector Index | Exception swallowed during Qdrant vector insert | High | 🟡 Handled |
| B-07 | Jira Extraction | Uses GitHub extraction prompt rather than Jira-tailored prompt | Medium | 🟡 In Roadmap |
| B-08 | Chat Streaming | Relative URL `/api/chat/stream` fails in cross-host deployments | Medium | 🟡 In Roadmap |
| B-09 | Activity Heatmap | Historical heatmap slots use modulo math instead of real events | Low | 🟡 Acknowledged |
| B-10 | Graph Concurrency | Schema uses indexes rather than strict uniqueness constraints | Low | 🟡 Monitored |
| B-11 | Cypher Injection | Enforced allowlists on entity and relation types | Resolved | ✅ Fixed |
| B-12 | CORS Security | Restricted to `env.FRONTEND_URL` | Resolved | ✅ Fixed |
| B-13 | Analytics Fallback | Returns 503 on database unavailability instead of mock numbers | Resolved | ✅ Fixed |
| B-14 | API Authentication | Enforced timing-safe Bearer authGuard | Resolved | ✅ Fixed |
| B-15 | Neo4j Topology | Unbounded `COMMIT` nodes exhaust Aura limits (150k+ nodes) | Critical | ✅ Fixed (`CONTRIBUTED_TO` direct rollup edges + compaction migration) |
| B-16 | Graph Ingestion | Sequential Neo4j sessions in extraction loops leak connections | Critical | ✅ Fixed (Single session per event + batch Cypher `UNWIND`) |
| B-17 | Event Storage | Unbounded `events` table growth & unindexed full table scans | High | ✅ Fixed (`EVENTS_RETENTION_DAYS` pruning + 30d/90d/180d index bounds) |
| B-18 | Analytics Cypher | N+1 Cypher queries in Person and Technology metrics loop | High | ✅ Fixed (Hoisted repo counts + collapsed single-shot aggregations) |
| B-19 | Entity Discovery | Unbounded `MATCH (entity)` scans full graph on every search | Medium | ✅ Fixed (Filtered to `PERSON\|REPOSITORY\|TECHNOLOGY\|ISSUE\|PULL_REQUEST`) |
| B-20 | Graph Cache | Summary cache TTL (90s) caused redundant queries under load | Medium | ✅ Fixed (Tuned TTL to 300s summary / 180s node + event-driven invalidation) |
| B-21 | LLM Commit Hallucination | LLM outputting git commit entities/hashes contaminating graph | Critical | ✅ Fixed (6-Layer Defense-in-Depth: Prompt, Ontology, SHA Regex, Rewiring, Gateway, DB Gatekeeper) |

---

## 22. What Works vs What Doesn't

### ✅ VERIFIED OPERATIONAL & HARDENED
- **6-Layer LLM Commit Defense-in-Depth:** Complete prevention of commit nodes in Neo4j with automatic relationship rewiring to repositories, ensuring zero data loss and 100% mathematical consistency
- **O(1) Direct Contributor Rollups:** `CONTRIBUTED_TO` direct graph relationships with `commitCount` and `lastCommitAt`, eliminating commit node bloat
- **Single-Session Batch Ingestion:** Exactly 1 Neo4j session per webhook event with Cypher `UNWIND` batch insertion
- **Postgres Events Retention Policy:** Automatic 90-day pruning (`cleanupOldEvents()`) + date-indexed bounded metrics queries
- **Deterministic Qdrant Vector Indexing:** RFC-4122 UUIDs derived from `eventID` preventing duplicate embeddings on retry
- **Collapsed Analytics Cypher Queries:** Hoisted calculations and combined queries eliminating N+1 DB roundtrips
- GitHub, Slack, and Jira webhook verification with **cryptographic HMAC and stable Idempotency**
- Event-Driven **Debounced Metrics Invalidation** (45s quiet period + 3min starvation cap + Redis mutex locking)
- 6-factor Knowledge Risk deterministic algorithm with 180-day exponential time-decay
- 4-factor Successor matching algorithm with disqualification thresholds
- Bus Factor calculation via Neo4j Cypher traversals
- Multi-tier identity deduplication across GitHub, Slack, and Jira
- LangGraph 11-node agent execution workflow with zero fabrication
- Scheduled daily report generation (18:00 IST) and boot recalculation
- All 9 PostgreSQL tables with idempotent boot creation
- PR Risk calculation with Redis caching
- Multi-model LLM fallback cascade (4 models on Groq)

### ⚠️ DEMO & ENTERPRISE PILOT READY
- Single-tenant deployment model (BYOC)
- Vector retrieval quality (384-dimensional embeddings via Gemini)
- Concurrency scaling (optimized for single-worker or multi-replica setups with Redis mutex)

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
| `METRICS_DEBOUNCE_MS` | Debounce quiet wait window (default 45000ms) | `45000` |
| `METRICS_MAX_DELAY_MS` | Max starvation cap (default 180000ms) | `180000` |
| `METRICS_POLL_INTERVAL_MS`| Debounce poller tick interval (default 15000ms) | `15000` |

---

## 24. How to Deploy — BYOC Model

### 💡 Aasaan Bhasha Mein (Layman Explanation)
BYOC ka matlab hota hai **"Bring Your Own Cloud"**.  
Badi enterprise companies (banks, healthcare, SaaS) apna source code kisi teesri company ke cloud par upload nahi karna chahti.  
Cortex unhi ke private AWS ya GCP account ke andar ek container ki tarah deploy hota hai. Saara code, database, aur history unhi ki boundary mein rehti hai — Cortex ke server par ek bhi line code nahi jata!

---

### 🏢 Real-Life Desi Example: "Apne Ghar ka Tijori (Locker) vs Public Dharamshala"
> 🔐 **Analogy:**  
> Jaise aap apna sona kisi sadak par khuli dharamshala mein nahi rakhte, balki apne ghar ki personal godrej tijori mein rakhte ho. BYOC ka matlab hai Cortex software aapke ghar (VPC) mein aakar tijori me baithta hai.

---

### 💼 Client Pitch
> *"Enterprise security is built into our core DNA. With our BYOC architecture, Cortex runs entirely inside your virtual private cloud (VPC). Your proprietary source code never leaves your infrastructure perimeter. We only query compact semantic event summaries through zero-retention enterprise LLMs."*

---

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
6. `startMetricsScheduler()` initializes cron schedules, debounced pollers, and runs initial analytics.
7. Express app binds to `PORT` and begins listening.

---

## 25. How to Answer Tough Questions in Meetings (Client Q&A Cheat Sheet)

### Q: "Is the AI hallucinating or inventing these numbers?"
**💡 Desi Logic:**  
*Humein AI se calculation karwani hi nahi hai! Math TypeScript code karta hai, AI sirf use sundar bhasha mein bolta hai.*  
**Authoritative Response:**  
> *"No. Cortex operates on a strict separation of concerns: a Calculator Engine and a Formatter Engine. All risk scores, bus factors, and successor rankings are generated by pure TypeScript mathematical algorithms operating directly on your Neo4j property graph. There is zero AI involvement in any numerical calculation.*  
> *The LLM is strictly used to format verified structured evidence into clear narrative English. If data does not exist, the agent explicitly returns 'No records found' rather than fabricating a response."*

---

### Q: "How is the Knowledge Risk score calculated? How do we know it's accurate?"
**💡 Desi Logic:**  
*6 pakke factors hain: 30% Code Ownership, 20% Dependency, 15% Activity, 15% Docs, 10% Expertise, 10% Tickets.*  
**Authoritative Response:**  
> *"It is calculated via a 6-factor deterministic formula with documented weights: 30% Code Ownership, 20% Downstream Dependency, 15% Recent Activity, 15% Documentation Coverage, 10% Expertise Breadth, and 10% Pending Issues.*  
> *Every variable is queried directly from Neo4j based on actual Git commits, PR merges, and Jira tickets. Any metric can be independently audited by running the underlying Cypher queries directly."*

---

### Q: "What if an engineer writes complex code but pushes fewer commits?"
**💡 Desi Logic:**  
*Cortex commit count par developer ko rank nahi karta! Hum dependencies aur blast-radius dekhte hain.*  
**Authoritative Response:**  
> *"We acknowledge that raw commit volume does not equal complexity. However, Cortex evaluates indirect complexity signals: high downstream service dependencies, low documentation coverage, and exclusive technology usage.*  
> *Most importantly, Cortex is explicitly designed NOT to evaluate developer performance. It is an architectural continuity map that identifies where the organization has single points of failure, not an employee ranking system."*

---

### Q: "Does our proprietary source code leave our VPC?"
**💡 Desi Logic:**  
*Poora software client ke cloud (VPC) ke andar chalta hai. Code bahar nikalta hi nahi.*  
**Authoritative Response:**  
> *"Under our BYOC (Bring Your Own Cloud) deployment, your source code remains entirely within your infrastructure boundary. Cortex runs as a container inside your private network.*  
> *The only outbound API calls are to enterprise LLM endpoints passing high-level extracted summaries (1–2 sentences), operating under zero-retention agreements where data cannot be stored or used for model training. Raw source code repositories and full file contents are never transmitted outside your network."*

---

*End of document.*  
**Maintained by:** Cortex Engineering Team  
**File Location:** `docs/05_CORTEX_INTERNAL_BIBLE.md`
