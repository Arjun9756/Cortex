# Cortex — Product Requirements Document (PRD)
### *Engineering Intelligence, Knowledge Graph aur Continuity Platform Ki Core Requirements*
**Document Version:** 1.0 | **Status:** Active Reference | **Target Release:** Phase 1 / Enterprise Alpha

---

## 1. Product Overview & Strategic Objectives

### 1.1 Objective
Cortex ek Engineering Intelligence Platform hai jiska main maqsad tribal knowledge silos ko todna, Key-Person Dependency (Bus Factor = 1) ko eliminate karna, aur naye developers ke onboarding ramp-up time ko 50% compress karna hai.

### 1.2 Core Value Proposition
- **Zero-Overhead Capture:** Git commits, Slack discussions aur Jira tickets se automatically institutional knowledge graph banata hai bina developers ko manual docs likhne ke liye kahe.
- **Deterministic Math, Not Speculation:** Risk scores, successor rankings aur system fragility verifiable mathematical formulas se nikalta hai, generative AI ke andaze se nahi.
- **Context-Aware Retrieval:** Engineers aur Managers ko ek LangGraph AI agent provide karta hai jo architecture sawalon ka verified source-cited answer deta hai.

---

## 2. User Personas & Core Use Cases

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                               USER PERSONAS                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ 1. VP OF ENGINEERING / CTO (The Economic Buyer)                              │
│    - Goal: Key-person departure risk mitigate karna; architectural SPOF      │
│            khatam karna; developer onboarding fast karna.                    │
│    - Key Interface: Executive Dashboard, Org Health KPIs, Daily HTML Report. │
│                                                                              │
│ 2. ENGINEERING MANAGER (The Operational Leader)                              │
│    - Goal: Sprint planning aur ownership distribute karna; cross-training    │
│            karwana; seamless offboarding handover execute karna.             │
│    - Key Interface: Bus Factor Radar, Successor Matching, Departure Simulator│
│                                                                              │
│ 3. SOFTWARE ENGINEER (The Daily User)                                        │
│    - Goal: Legacy microservices samajhna; purane architectural trade-offs    │
│            janiye; senior developers ko bina disturb kiye unblock hona.      │
│    - Key Interface: Cortex Interactive Chat Agent, Knowledge Graph Explorer. │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Functional Requirements (FR)

### FR-1: Multi-Source Telemetry Ingestion (Data Andar Kaise Aayega?)
- **FR-1.1 (GitHub Ingestion):** Commit events, pull requests, issue updates aur review comments ko HMAC-SHA256 authenticated webhooks ke through ingest karna. Duplicate webhook deliveries ko `x-github-delivery` header se deduplicate karna.
- **FR-1.2 (Slack Ingestion):** Engineering channels aur incident war rooms se messages aur threads ko HMAC signature aur timestamp validation ke through ingest karna.
- **FR-1.3 (Jira Ingestion):** Issue creation, status transitions (sprint movements) aur comment threads ko capture karna.

### FR-2: Asynchronous Queuing & Extraction (Background Processing)
- **FR-2.1 (Decoupled Queue):** Webhook receive hote hi instant 50ms mein `200 OK` dena aur sara heavy processing Redis-backed BullMQ queue mein daal dena.
- **FR-2.2 (LLM Entity Extraction):** Raw payload ko Groq LPUs (`openai/gpt-oss-120b` with fallback cascade) par process karwa kar typed entities, relationships aur 1-2 sentence semantic summary extract karna.
- **FR-2.3 (Ontology Allowlisting):** Extract kiye gaye labels aur relations ko strict allowlist (`ALLOWED_ENTITY_TYPES`, `ALLOWED_RELATIONS`) ke against check karna taaki Cypher injection ka koi khatra na rahe.

### FR-3: Dual-Storage Graph & Vector Modeling (Data Kahan Store Hoga?)
- **FR-3.1 (Neo4j Property Graph):** Structural truth ke liye directed property graph maintain karna jisme `PERSON`, `REPOSITORY`, `COMMIT`, `PULL_REQUEST`, `ISSUE`, `TECHNOLOGY`, aur `FILE` nodes aapas mein `AUTHORED`, `USES`, `DEPENDS_ON`, `WORKS_ON` relationships se jude honge.
- **FR-3.2 (Identity Resolution):** Ek hi bande ke multiple platform accounts (e.g. GitHub `arjun-dev`, Slack `Arjun Negi`, Jira `arjun@company.com`) ko email match aur username similarity se ek single canonical `PERSON` node mein merge karna.
- **FR-3.3 (Qdrant Vector Index):** Har event ki semantic summary ko Google Gemini `embedding-2` (384 dimensions, Cosine distance) se embed karke Qdrant vector database mein save karna taaki conceptual search chal sake.

### FR-4: Deterministic Analytics & Continuity Metrics (Math Engine)
- **FR-4.1 (Knowledge Risk Score):** Har engineer ka departure risk calculate karna using 6-factor weighted formula:
  $$\text{KnowledgeRisk} = (0.30 \times \text{Ownership}) + (0.20 \times \text{Dependency}) + (0.15 \times \text{Activity}) + (0.15 \times \text{Docs}) + (0.10 \times \text{Expertise}) + (0.10 \times \text{Work})$$
- **FR-4.2 (Successor Recommendation Engine):** Agar koi dev chhodta hai, toh 4-factor formula (Jaccard technology overlap, repository overlap, 30-day activity, workload capacity) se best successor rank karna. Agar candidate ka zero overlap hai, use disqualify karna.
- **FR-4.3 (Bus Factor Radar):** Check karna ki kis repo mein $>50\%$ commits sirf 1 bande ne kiye hain. Aise repos ko Bus Factor = 1 (`fragile` SPOF) flag karna.
- **FR-4.4 (PR Merge Blast Radius):** Pull request khulne par real-time check karna ki is change ka downstream impact kis-kis service aur kis-kis developer par padega.

### FR-5: Conversational Intelligence Agent (LangGraph)
- **FR-5.1 (Multi-Tool Query Agent):** LangGraph ka 11-node cyclic state graph use karna jo user query ko subgoals mein todta hai aur relevant tool (Vector search, Neo4j graph, SQL metrics, ya Knowledge risk) ko dispatch karta hai.
- **FR-5.2 (Zero Fabrication Directive):** Model ko strict instructions hain: har fact ke aage retrieved source (PR #, commit hash, Slack link) cite karega. Agar data nahi mila, toh 'No records found' bolega — hallucinate nahi karega.
- **FR-5.3 (Streaming Synthesis):** Server-Sent Events (SSE) ke through word-by-word streaming response deliver karna.

### FR-6: Executive Reporting & Departure Simulation
- **FR-6.1 (Daily Executive Briefing):** Har roz shaam ko 18:00 IST par automated cron chala kar executive HTML report generate karna jo company ke top SPOFs aur critical departure risks highlight kare.
- **FR-6.2 (Automated Offboarding Handover):** 1-click par kisi bhi engineer ka departure simulation generate karna — kaunse repos orphan honge, kaunse tickets pending hain, aur handover kisko assign hona chahiye.

---

## 4. Non-Functional Requirements (NFR)

### NFR-1: Performance & Latency (Speed)
- **Webhook Ingestion:** $\le 50\text{ ms}$ mein incoming webhook acknowledge hona chahiye.
- **Agent Query Streaming:** Complex graph query ka first-word stream $\le 3\text{ seconds}$ mein start hona chahiye.
- **Batch Metrics Run:** 100 repositories ka nightly metrics run $\le 5\text{ minutes}$ mein complete hona chahiye.

### NFR-2: Security, Privacy & Data Governance (Suraksha)
- **Zero Raw Code Cloud Storage:** Customer ka raw source code kabhi external cloud vector database mein dump nahi hoga.
- **BYOC Deployment:** Customer ke apne VPC (AWS, GCP, Azure, on-prem) mein deploy hone ki full capability honi chahiye.
- **API Authentication:** Saare internal API endpoints timing-safe Bearer token (`crypto.timingSafeEqual`) se guarded hone chahiye.
- **CORS & Headers:** Sirf allowed `FRONTEND_URL` se browser requests accept honge aur Helmet security headers active rahenge.

### NFR-3: Reliability & System Resilience (Bharosa)
- **Decoupled Architecture:** Agar Cortex ya Neo4j temporarily down bhi ho, customer ke Git commits, PR merges aur deployment pipelines par 0.0% impact padna chahiye.
- **Graceful Degradation:** Database down hone par fake dummy data dikhane ke bajaye clean 503 response aana chahiye.
- **Inference Redundancy:** Groq API rate limit hone par automatically fallback models (`gpt-oss-20b`, `qwen`, `compound-mini`) pe switch hona chahiye.

---

## 5. Success Metrics & Target OKRs

| Metric | Baseline (Bina Cortex Ke) | Target (Cortex Ke Saath) | Verification Kaise Hogi? |
|---|---|---|---|
| **Naye Hire Ka Ramp-Up Time** | 8 hafte (2 mahine) | $\le 4\text{ hafte}$ (50% cut) | HR onboarding dates aur pehle 10 PRs ka cycle time |
| **Bus Factor Ki Visibility** | 0% tracking (Emergency mein pata chalta hai) | 100% real-time tracking | Daily workspace metrics dashboard audit log |
| **Senior Devs Ka Unblock Overhead** | 15–20% weekly time waste | $\le 5\%$ weekly time waste | Engineering survey aur Slack query interruptions |
| **Offboarding Handover Time** | 2 hafte ka manual shadowing | Instantaneous (1-click automated report) | Generated handoff report ka timestamp |

---

*End of Product Requirements Document.*
