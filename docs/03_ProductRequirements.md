# Cortex — Product Requirements Document (PRD)
### *Core Specifications for Enterprise Engineering Intelligence, Knowledge Graph, and Business Continuity*
**Document Version:** 1.0 | **Status:** Active Reference | **Target Release:** Phase 1 / Enterprise Platform

---

## 1. Product Overview & Strategic Objectives

### 1.1 Objective
Cortex is an Enterprise Engineering Intelligence Platform designed to dismantle tribal knowledge silos, eliminate Key-Person Dependency (Bus Factor = 1), and compress the onboarding ramp-up time for newly hired software engineers by at least 50%.

### 1.2 Core Value Proposition
- **Zero-Overhead Passive Ingestion:** Automatically captures and synthesizes an institutional knowledge graph from Git commits, Slack discussions, and Jira tickets without requiring engineers to write or maintain manual documentation.
- **Deterministic Mathematics, Zero Speculation:** Computes architectural risk scores, successor recommendations, and system fragility using verifiable mathematical formulas and graph topology rather than generative AI speculation.
- **Context-Aware Organizational Retrieval:** Delivers a LangGraph-powered conversational agent that provides instant, verified architectural answers backed by exact source citations (commit hashes, PR links, and Slack permalinks).

---

## 2. User Personas & Core Use Cases

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                               USER PERSONAS                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ 1. VP OF ENGINEERING / CTO (The Economic Buyer)                              │
│    - Primary Goal: Mitigate key-person departure risk; eliminate single      │
│      points of failure (SPOFs); accelerate developer onboarding velocity.    │
│    - Primary Surface: Executive Dashboard, Org Health KPIs, Daily Briefing.  │
│                                                                              │
│ 2. ENGINEERING MANAGER (The Operational Leader)                              │
│    - Primary Goal: Balance sprint ownership; facilitate cross-training;      │
│      execute frictionless offboarding and succession handovers.              │
│    - Primary Surface: Bus Factor Radar, Successor Matching, Departure Sim.   │
│                                                                              │
│ 3. SOFTWARE ENGINEER (The Daily User)                                        │
│    - Primary Goal: Understand legacy microservices; uncover historical trade-│
│      offs; resolve blocking questions without interrupting senior teammates. │
│    - Primary Surface: Cortex Conversational Agent, Interactive Knowledge Map.│
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Functional Requirements (FR)

### FR-1: Multi-Source Telemetry Ingestion (Data Ingress)
- **FR-1.1 (GitHub Ingestion):** Ingest commit events, pull requests, issue updates, and review comments via HMAC-SHA256 authenticated webhooks. Deduplicate incoming deliveries using the `x-github-delivery` header.
- **FR-1.2 (Slack Ingestion):** Ingest engineering channel messages and incident war-room threads via HMAC signature verification and timestamp freshness validation, responding with immediate sub-20ms HTTP `200 OK` acknowledgments.
- **FR-1.3 (Jira Ingestion):** Capture issue creation, sprint status transitions, and issue comments, maintaining continuous OAuth 3LO access token rotation.

### FR-2: Asynchronous Queuing & Cognitive Extraction (Pipeline Processing)
- **FR-2.1 (Decoupled Asynchronous Queue):** Acknowledge incoming webhooks in $\le 50\text{ ms}$ and offload payload processing asynchronously to Redis BullMQ worker queues.
- **FR-2.2 (LLM Entity Extraction):** Process raw payloads using Groq LPUs (`openai/gpt-oss-120b` with automated fallback cascade) to extract strongly-typed entities, relationships, and concise semantic summaries.
- **FR-2.3 (Ontology Allowlisting):** Validate extracted entity types and relationship labels against strict allowlists (`ALLOWED_ENTITY_TYPES`, `ALLOWED_RELATIONS`) to eliminate Cypher injection vulnerabilities.

### FR-3: Polyglot Graph & Dense Vector Modeling (Data Storage)
- **FR-3.1 (Neo4j Property Graph):** Maintain structural ground truth within a directed property graph modeling `PERSON`, `REPOSITORY`, `COMMIT`, `PULL_REQUEST`, `ISSUE`, `TECHNOLOGY`, and `FILE` nodes interconnected via `AUTHORED`, `USES`, `DEPENDS_ON`, and `WORKS_ON` edges.
- **FR-3.2 (Strict Identity Resolution):** Unify disparate developer handles across providers (e.g. GitHub `kishu-dev`, Slack `Kishu Patel`, Jira `kishu@company.com`) into a single canonical `PERSON` node via exact verified email matching and strong clean username resolution, strictly prohibiting fuzzy name merges.
- **FR-3.3 (Qdrant Vector Index):** Generate 384-dimensional dense vector embeddings for extracted semantic summaries using Google Gemini `embedding-2`, indexed in Qdrant with Cosine distance for conceptual search.

### FR-4: Deterministic Analytics & Continuity Metrics (Mathematical Engine)
- **FR-4.1 (Knowledge Departure Risk Score):** Calculate the departure impact for each engineer using a verifiable 6-factor weighted algorithm:
  $$\text{KnowledgeRisk} = (0.30 \times \text{Ownership}) + (0.20 \times \text{Dependency}) + (0.15 \times \text{Activity}) + (0.15 \times \text{Docs}) + (0.10 \times \text{Expertise}) + (0.10 \times \text{Work})$$
- **FR-4.2 (Successor Recommendation Engine):** Identify the optimal internal successor using a 4-factor formula (Jaccard technology overlap, repository overlap, 30-day activity decay, and workload capacity). Disqualify candidates with zero skill overlap.
- **FR-4.3 (Bus Factor Evaluation):** Flag repositories where a single contributor accounts for $\ge 50\%$ of weighted historical commits as Bus Factor = 1 (`fragile` Single Point of Failure).
- **FR-4.4 (PR Merge Blast-Radius Analysis):** Evaluate pending pull requests in real time to calculate downstream microservice dependencies and notify relevant domain owners.

### FR-5: Conversational Intelligence Agent (LangGraph State Machine)
- **FR-5.1 (Multi-Tool Query Orchestration):** Employ an 11-node cyclic state graph to decompose user queries into discrete subgoals, dispatching to specialized tools (Vector Search, Neo4j Graph, SQL Metrics, Knowledge Risk).
- **FR-5.2 (Zero-Fabrication Directive):** Strictly enforce source grounding: every factual statement must be accompanied by an exact source citation (PR number, commit hash, Slack permalink). If relevant data is absent, the agent must return "No records found" rather than fabricating answers.
- **FR-5.3 (Streaming Synthesis):** Deliver progressive token streaming to clients via Server-Sent Events (SSE).

### FR-6: Executive Reporting & Departure Simulation
- **FR-6.1 (Automated Executive Briefing):** Execute scheduled daily crons to generate executive HTML intelligence briefings detailing top organizational SPOFs and critical departure risks.
- **FR-6.2 (Automated Offboarding Handover):** Generate instantaneous departure simulations detailing orphaned repositories, pending assigned issues, and ranked successor handover paths with a single click.

---

## 4. Non-Functional Requirements (NFR)

### NFR-1: Performance & Latency
- **Webhook Ingestion:** Ingress endpoints must acknowledge incoming payloads in $\le 50\text{ ms}$ (sub-20ms for Slack).
- **Agent Query Streaming:** The conversational agent must begin streaming initial response tokens in $\le 3.0\text{ seconds}$ for complex multi-hop queries.
- **Batch Metrics Execution:** Nightly batch analytics runs across 100 repositories must complete in $\le 5.0\text{ minutes}$.

### NFR-2: Security, Privacy & Data Governance
- **Zero Raw Code Storage:** Raw source code is never stored in external cloud vector stores.
- **Bring Your Own Cloud (BYOC):** Fully deployable inside customer-managed VPC environments (AWS, GCP, Azure, on-premise Kubernetes).
- **API Authentication:** All internal endpoints must be guarded with timing-safe Bearer token authentication (`crypto.timingSafeEqual`).
- **CORS & Security Headers:** Restrict cross-origin access strictly to authorized `FRONTEND_URL` domains with full Helmet security headers active.

### NFR-3: Reliability & System Resilience
- **Decoupled Architecture:** Failures in the Cortex analytics layer must have zero impact on customer Git commits, PR merges, or CI/CD pipelines.
- **Graceful Degradation:** In the event of backend database disruption, APIs must return explicit HTTP 503 status codes rather than fabricating fallback numbers.
- **Inference Redundancy:** Automatic multi-tier fallback cascade across alternative Groq models (`gpt-oss-120b` $\to$ `gpt-oss-20b` $\to$ `qwen` $\to$ `compound-mini`) in the event of provider rate limiting.

---

## 5. Success Metrics & Target OKRs

| Metric | Industry Baseline (Without Cortex) | Target Performance (With Cortex) | Verification Mechanism |
|---|---|---|---|
| **New Hire Time-to-Productivity** | 8 weeks (2 months) | $\le 4\text{ weeks}$ (50% reduction) | HR start dates correlated with initial 10 merged PRs |
| **Bus Factor Visibility** | 0% continuous tracking | 100% real-time tracking | Daily workspace metrics audit log |
| **Senior Peer Interruption Overhead** | 15%–20% weekly developer time | $\le 5\%$ weekly developer time | Internal developer pulse surveys and Slack mention volume |
| **Offboarding Handover Time** | 2 weeks of manual shadowing | Instantaneous (1-click automated report) | Generated handoff report generation timestamp |

---

*End of Product Requirements Document.*
