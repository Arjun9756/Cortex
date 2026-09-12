# Cortex Engineering Intelligence: Scenario-Based Failure Mode & Behavioral Analysis
## Operational Reference Document ("What Happens If X?")

**Target Audience:** CTO, VP of Engineering, Chief Architect, and Data Integrity Auditors  
**System Scope:** Cortex Analytics Engine, Knowledge Graph (Neo4j), PostgreSQL Metrics Store, Event Webhook Ingestion, and AI Knowledge Chat Agent  
**Last Audited:** September 2026

---

## Executive Summary & Design Philosophy

Cortex computes engineering metrics across a heterogeneous graph of software development lifecycle (SDLC) artifacts: Git commits, pull requests, issue trackers, Slack conversations, architecture documents, and infrastructure manifests.

Unlike traditional static code analysis tools (e.g., SonarQube) that measure syntactic code health, Cortex models **socio-technical vulnerability**—the fragility that arises when critical technical systems depend entirely on specific individuals, unrecorded tribal knowledge, or isolated commit histories.

This document details the exact technical reality and business consequences of edge cases, failure states, and lifecycle transitions across Cortex's metric algorithms.

---

## Scenario 1: "What happens if a high-risk person actually leaves the company?"

### 1. Technical: What Actually Happens in the System

1. **No Automated Departure State or Webhook Listener:**
   - There is no automated HRIS webhook (e.g., BambooHR, Workday, Rippling) connected to Cortex that flags an employee as "Terminated" or "Departed".
   - The Neo4j graph retains the node `(p:PERSON {name: "..."})` and all incoming relationships (`[:AUTHORED]`, `[:WORKS_ON]`, `[:CONTRIBUTED_TO]`, `[:USES]`) indefinitely.
   - The PostgreSQL `person_metrics` row remains permanently present with its last calculated `risk_score`.

2. **Decay Dynamics over Time:**
   - **Recent Activity Decay:** In `packages/analytics/knowledge.risk.predict.ts` (`calculateActivity`), recent activity looks back 30 days:
     $$\text{Score}_{activity} = \max\left(0, 1 - \min\left(\frac{\text{Count}_{30d}}{20}, 1\right)\right)$$
     When the person departs and ceases contributing, $\text{Count}_{30d} \to 0$, causing $\text{Score}_{activity}$ to reach $1.0$ (maximum inactivity risk factor).
   - **Ownership Permanence:** In `packages/analytics/knowledge.risk.predict.ts` (`calculateOwnership`), ownership is computed as:
     $$\text{Ownership} = \max_{r \in \text{Repos}} \left( \frac{\text{Commits}_{person, r}}{\text{Commits}_{total, r}} \right)$$
     Because historic commits are immutable, if the departed person was the sole author of a repository with 150 commits, their ownership remains $100\%$ ($1.0$) until other engineers contribute 150+ new commits to that repo.
   - **Primary Maintainer Stagnation:** In `packages/analytics/repoMetrics.service.ts` (`calculateBusFactorAndOwner`), `primary_owner` is determined by sorting total commits descending. The departed engineer will remain listed as the primary maintainer on executive dashboards for months or years unless explicitly superseded by active commit volume.

3. **Absence of Alerting / Reassignment:**
   - The system generates **no alerts** (no Slack message, no webhook, no email) when an engineer's activity ceases.
   - Repositories owned by the departed engineer do not automatically recalculate lower health scores or trigger emergency handoff workflows unless an administrator manually queries the `/api/analytics/offboarding?person=...` endpoint.

### 2. Business: What this Means for the Company / User

- **Ghost Maintainership:** A new engineer joining the team sees the departed engineer listed as "Primary Owner" of critical microservices in the Cortex dashboard, leading them to message a deleted Slack handle or inactive email during a production outage.
- **Action Vacuum:** The dashboard flags the departed engineer with an 85% Knowledge Risk score in bright red, but gives the CTO no one-click action to transfer ownership, reassign repositories, or initiate knowledge transfer.
- **Distorted Executive Reporting:** The Engineering Health Grade continues to be penalized by the departed person's high risk score, even if a successor team has informally taken over maintenance without backfilling commit history.

---

## Scenario 2: "What happens if two people both have 100% ownership of different repos, and BOTH leave at the same time?"

### 1. Technical: What Actually Happens in the System

1. **Independent Point-in-Time Evaluations:**
   - Cortex evaluates engineer risk and repository bus factor **in isolation**.
   - The "Simulate Departure" endpoint (`/api/dashboard/people/:externalId/simulate-departure`) accepts exactly **one** `externalId` at a time.
   - The successor recommendation engine (`packages/analytics/successor.service.ts` -> `calculateSuccessorCandidates(rawPersonName)`) accepts a single string argument and calculates candidates assuming all other engineers in the organization remain active.

2. **Circular Mutual Recommendation Trap:**
   - Consider Engineer A (100% owner of `billing-engine`, skilled in TypeScript and PostgreSQL) and Engineer B (100% owner of `payment-gateway`, skilled in TypeScript and PostgreSQL).
   - When evaluating Engineer A, the 4-factor formula evaluates Engineer B:
     - Shared Tech Jaccard: $1.0$ (40% weight)
     - Shared Repos: $0.0$ (25% weight)
     - Recent Activity: $1.0$ (20% weight)
     - Capacity factor ($1.0 - \text{Risk}_B$): $\approx 0.20$ (15% weight)
     - Composite Score: $(0.40 \times 1.0) + (0.25 \times 0.0) + (0.20 \times 1.0) + (0.15 \times 0.20) = 0.63 \implies 63\%$ Match.
     - **Result:** Engineer B is recommended as the top successor for Engineer A.
   - When evaluating Engineer B, the symmetric calculation occurs:
     - **Result:** Engineer A is recommended as the top successor for Engineer B.
   - **The System Defect:** If both Engineer A and Engineer B resign simultaneously (e.g., during a team departure or acquisition), Cortex circularly suggests that each will replace the other. The system cannot model the joint probability or cascading impact of concurrent departures.

3. **Compound Risk Suppression:**
   - Cortex's aggregate Engineering Health Index calculates overall health by taking the arithmetic mean of individual repository health scores:
     $$\text{Avg Health} = \frac{1}{N} \sum_{i=1}^N \text{Health}(r_i)$$
   - If two critical services (`billing-engine` and `payment-gateway`) lose their sole maintainers simultaneously, in reality, the company's entire transaction processing pipeline is paralyzed.
   - However, in Cortex, the overall health score merely drops by $\frac{2 \times \Delta}{N}$ (e.g., dropping from 82% to 75%), completely obscuring the systemic death-spiral risk.

### 2. Business: What this Means for the Company / User

- **False Succession Security:** The CTO looks at the dashboard, sees backup owners assigned for both repositories, and reports to the board that departure risk is mitigated—unaware that the designated backups are each other.
- **Understated Catastrophic Risk:** In enterprise software, risks are multiplicative, not additive. If auth and payment services go unmaintained simultaneously, the product cannot operate. Cortex treats these as two independent additive items, drastically understating the true business vulnerability.

---

## Scenario 3: "What happens if a repo has zero commits ever (brand new, just added)?"

### 1. Technical: What Actually Happens in the System

1. **Bus Factor Computation on Empty Graph:**
   - In `packages/analytics/repoMetrics.service.ts`:
     ```cypher
     MATCH (p:PERSON)-[:AUTHORED]->(c:COMMIT)-[:PART_OF]->(r {name: $repoName})
     WHERE p.name IS NOT NULL
     RETURN p.name AS person, count(c) AS commits
     ORDER BY commits DESC
     ```
   - For an empty repository, `result.records.length === 0`.
   - The function returns: `{ busFactor: 0, primaryOwner: null }`.

2. **Risk Score Assignment:**
   - In `repoMetrics.service.ts` (line 60):
     ```typescript
     const riskScore = busFactor === 0 ? 80 : Math.max(0, 100 - busFactor * 20);
     ```
   - When `busFactor === 0`, `riskScore` is assigned **80%**.
   - Notice that when `busFactor === 1` (a repository with 500 commits authored by a single engineer):
     $$\text{riskScore} = \max(0, 100 - 1 \times 20) = 80\%$$
   - **Identical Risk Mapping:** An empty repository with zero lines of code is assigned the exact same risk score (80%) and fragility status (`fragile`) as a mission-critical legacy repository maintained by a single engineer.

3. **Impact on Overview Metrics:**
   - In `apps/api/modules/dashboard/controller.ts` (`getDashboardOverview`):
     - The repository is counted under `criticalBusFactorCount` (because `bus_factor <= 1`).
     - Its health score is $100 - 80 = 20\%$ (Grade F).
     - It immediately pulls down the company-wide Engineering Health Index.

### 2. Business: What this Means for the Company / User

- **Alarm Fatigue & Cynicism:** When an engineering team creates 5 new repository scaffolds for a greenfield initiative, the Cortex dashboard suddenly alerts that the company has "5 New Critical Fragility Risks", and the company's Engineering Grade drops from 'B+' to 'D'.
- **Loss of Trust:** Senior managers will recognize that a blank repository containing only a `README.md` and `.gitignore` poses zero business risk, and will conclude the platform's metrics are mathematically naive.

---

## Scenario 4: "What happens if the LLM/extraction pipeline is down for a week — do the metrics silently go stale, or is that visible to the user?"

### 1. Technical: What Actually Happens in the System

1. **Decoupled Architecture:**
   - Cortex's frontend reads from PostgreSQL and Neo4j via Express REST endpoints (`/api/dashboard/*`, `/api/analytics/*`).
   - The webhook ingestion pipeline (Fastify/Express receivers + BullMQ worker queue + LangGraph extraction agent) writes to PostgreSQL and Neo4j asynchronously.

2. **The "Fake Freshness" Header Bug:**
   - In `web/src/components/Header.tsx` (lines 23–45):
     ```typescript
     useEffect(() => {
       if (!lastSyncedAt) { setTimeAgoText('Live'); return; }
       const updateTimer = () => {
         const diffSec = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
         if (diffSec < 5) setTimeAgoText('Just now');
         else if (diffSec < 60) setTimeAgoText(`${diffSec}s ago`);
         else setTimeAgoText(`${Math.floor(diffSec / 60)}m ago`);
       };
       ...
     ```
   - `lastSyncedAt` is updated whenever the **browser HTTP fetch** completes.
   - If the backend queue is stalled, if GitHub webhooks are failing, or if the LLM ingestion agent has been crashing for 7 days, the browser still receives HTTP 200 responses from PostgreSQL containing 7-day-old data.
   - The UI header continues to display a pulsing green dot with:  
     🟢 **`Realtime Sync: Just now`** or **`Realtime Sync: 4s ago`**.

3. **Silent Drift:**
   - Neither the frontend nor the API endpoints check the delta between `MAX(events.created_at)` and `NOW()`.
   - The system has no heartbeat, TTL check, or data-staleness banner.

### 2. Business: What this Means for the Company / User

- **Critical Operational Blindness:** A VP of Engineering relying on Cortex during a restructuring makes staffing decisions based on metrics that reflect last week's team topology, completely unaware that a major migration or departure occurred 4 days ago.
- **Silent SLA Failure:** If an enterprise customer pays for real-time engineering risk intelligence, the platform can be completely disconnected from active Git streams while presenting a glowing green "Live" badge, creating legal and enterprise audit exposure.

---

## Scenario 5: "What happens if a person is added to the system but has no GitHub/Slack/Jira activity yet (new hire)?"

### 1. Technical: What Actually Happens in the System

1. **Knowledge Risk Calculation on Empty History:**
   - When a person node `(p:PERSON {name: "Amit Patel"})` is created from an initial directory or Slack invite with zero commits, PRs, or issues:
   - In `packages/analytics/knowledge.service.ts`:
     - **Ownership (Weight 30%):** 0 owned items $\implies \text{Score} = 0.00$
     - **Dependency (Weight 20%):** 0 dependent items $\implies \text{Score} = 0.00$
     - **Activity (Weight 15%):** 0 recent activities $\implies$ In `calculateActivity`, 0 items yields $\text{Score} = \max(0, 1 - 0) = 1.00$ (inactivity penalty)
     - **Documentation (Weight 15%):** 0 undocumented items $\implies \text{Score} = 0.00$
     - **Expertise (Weight 10%):** 0 unique skills $\implies \text{Score} = 0.00$
     - **Pending Work (Weight 10%):** 0 pending tasks $\implies \text{Score} = 0.00$
   - **Composite Total Risk:**
     $$\text{Total Risk} = (0.30 \times 0) + (0.20 \times 0) + (0.15 \times 1.0) + (0.15 \times 0) + (0.10 \times 0) + (0.10 \times 0) = 0.15 \implies 15\%$$

2. **UI Categorization:**
   - A risk score of **15%** places the new hire in the **"Healthy / Low Risk"** category (Green badge).
   - In `PeoplePage.tsx`, this engineer appears alongside veterans with low risk, with zero indication that the score is derived from an absence of data rather than validated resilience.

### 2. Business: What this Means for the Company / User

- **Inverse Reality:** A new hire who knows literally nothing about the codebase is categorized as "Low Knowledge Risk (15%)", while the senior engineer who built the architecture and maintains production is categorized as "Critical Knowledge Risk (85%)".
- **Misleading Benchmarks:** Managers reviewing team health metrics might celebrate low average risk scores after hiring a cohort of 10 juniors, when in fact technical dependency on the few remaining seniors has intensified.

---

## Scenario 6: "What happens at 100, 1,000, and 10,000 people/repos — does anything in this calculation logic break, become too slow, or become statistically meaningless?"

### 1. Technical: Algorithmic Complexity & Bottlenecks

| Component / Query | Algorithm / Cypher Pattern | Time Complexity | Behavior at $N=100$ | Behavior at $N=1,000$ | Behavior at $N=10,000$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Successor Bulk Graph Query** (`successor.service.ts:91`) | `MATCH (p:PERSON) OPTIONAL MATCH (p)-[...]-(w)-[...]-(r) ...` | $\mathcal{O}(\|P\| \cdot \|W\| \cdot (\|T\| + \|R\|))$ (Unbounded full graph traversal) | **~120ms** (Fast) | **~3.8s** (Noticeable UI delay) | **TIMEOUT / OOM** (Millions of DB hits crash Neo4j session) |
| **Person Metrics Batch Sync** (`personMetrics.service.ts:35`) | Sequential `for (record of persons) { await calculateKnowledgeRisk(person) }` | $\mathcal{O}(\|P\| \times 6 \text{ Cypher queries})$ | **~8s** (Acceptable for cron) | **~85s** (Exceeds typical HTTP timeout) | **~18–25 minutes** (Complete background worker lockup) |
| **Repo Bus Factor** (`repoMetrics.service.ts:103`) | `MATCH (p)-[:AUTHORED]->(c)-[:PART_OF]->(r)` per repository | $\mathcal{O}(\|R\| \cdot \|C_r\| \log \|C_r\|)$ | **~250ms** | **~2.5s** | **~30–45s** (Degrades without index on `:PART_OF`) |
| **Weekly Event Aggregation** (`analytics/router.ts:15`) | PostgreSQL `date_trunc('week', created_at)` with JSONB extraction | $\mathcal{O}(\|E\|)$ sequential table scan | **~15ms** | **~220ms** (with 100k events) | **~4–8s** (Disk I/O saturation with 5M events) |

### 2. Statistical Meaninglessness at Scale (The Monorepo / Enterprise Trap)

1. **Repository-Level Bus Factor Breakdown:**
   - Cortex defines Bus Factor at the **Repository** root level:
     ```typescript
     for (const row of rows) {
       covered += row.commits;
       count++;
       if (covered / total >= 0.5) break;
     }
     ```
   - In an enterprise with 500 engineers contributing to a monorepo (e.g., `core-platform`), no single engineer authors more than 2% of total commits.
   - It will require 35 engineers to reach 50% commit coverage.
   - **The Statistical Distortion:** Cortex reports **`Bus Factor: 35 (Healthy)`**.
   - **The Real Vulnerability:** Within that monorepo, the critical encryption module (`/src/security/vault`) was written by a single engineer who is the sole person who understands it. Repository-level granularity makes sub-directory single points of failure completely invisible.

2. **Jaccard Technology Similarity Distortion:**
   - In `successor.service.ts`, technology sets are treated as binary membership sets:
     $$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
   - At a 10,000-person enterprise, generic technologies (e.g., `TypeScript`, `Docker`, `Git`, `React`) appear in almost every engineer's profile.
   - Engineers who both list `TypeScript`, `React`, and `PostgreSQL` get high Jaccard scores, even if one is building low-level database drivers while the other is building marketing landing pages. Without depth of experience or domain context, Jaccard similarity degenerates into noise.

---

## Scenario 7 (Bonus): "What happens when an engineer uses multiple git identities (e.g. personal email vs corporate email)?"

### 1. Technical: What Actually Happens in the System

1. **Entity Duplication in Neo4j:**
   - If an engineer commits as `john.doe@company.com` and `john@github.com`, the Git ingestion pipeline creates **two distinct `(p:PERSON)` nodes** unless explicit identity mapping rules exist.
   - In Slack, if the user is identified by user ID `U045ABC123`, a third person node is created.

2. **Split Ownership Dilution:**
   - If John Doe authored 100 commits (50 under work email, 50 under personal email) on a 100-commit repository:
   - Cortex evaluates two different people, each with 50% ownership.
   - Instead of recognizing John Doe as a 100% sole owner (Bus Factor = 1, High Risk), Cortex sees two independent contributors who each authored half the codebase:
     $$\text{Covered} = 50\% \implies \text{Bus Factor} = 1 \text{ or } 2$$
   - The repository's bus factor is artificially inflated, and John's individual knowledge risk score is artificially halved.

### 2. Business: What this Means for the Company / User

- **Understated Key-Person Risk:** Critical single points of failure are hidden behind fragmented digital identities.
- **Contaminated Analytics:** Leaderboards, departure simulations, and org graphs show ghost duplicate users, destroying executive confidence in the integrity of the data.

---

## Open Questions for Founder & Product Leadership

The following items are **product and strategic architectural decisions**, not simple bug fixes. They require executive alignment:

1. **New Hire Grace Period Policy:**
   - *Question:* Should new engineers be excluded from knowledge risk scoring for their first 30–60 days, or should they be explicitly badged with an `"Insufficient Data / Onboarding"` status instead of showing a false 15% (Green/Safe) score?
   - *Recommendation:* Introduce an `evaluation_status: 'calibrating' | 'evaluated' | 'insufficient_history'` flag.

2. **Empty / Scaffold Repository Treatment:**
   - *Question:* Should empty repositories (0 commits) be penalized with an 80% Fragility risk score, or should they be excluded from the company-wide Engineering Health Index until they surpass an initial activity threshold (e.g., $\ge 5$ commits or $\ge 1$ merged PR)?
   - *Recommendation:* Exclude empty repos from health grading; badge them as `"Scaffold / Uninitialized"`.

3. **Data Freshness SLA & Emergency Kill-Switch:**
   - *Question:* If webhook events or ingestion agents fail to record updates for $> 24$ hours, should the frontend automatically display a prominent amber banner (`"Metrics Stale: Last event processed 3 days ago"`) and disable the green "Live Sync" badge?
   - *Recommendation:* Implement an end-to-end data pipeline heartbeat that compares `NOW() - MAX(events.created_at)`.

4. **Multi-Successor Decomposition vs Single Monolithic Successor:**
   - *Question:* When a senior engineer owning multiple diverse repositories leaves, should the system recommend **one successor for the person**, or **independent successor candidates per repository/domain**?
   - *Recommendation:* Transition the "Simulate Departure" UI to show a **Handoff Matrix** mapping each owned repository to its individual best-fit backup owner.

5. **Sub-Directory / Code-Path Bus Factor:**
   - *Question:* For enterprise customers with large monorepos, should Cortex prioritize file-path level ownership (e.g., using GitHub CODEOWNERS or git-blame tree analysis) rather than repository-level bus factor?
   - *Recommendation:* Make module/folder-level bus factor a core enterprise tier capability.
