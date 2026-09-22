# Cortex Metrics & Mathematical Formulas Specification
> **Ground-Truth Reference:** Complete, step-by-step explanation of every formula, calculation, score, and grade in Cortex — written in plain, direct language with concrete numerical examples. Zero obscure symbols, zero guessing.

---

## Table of Contents
1. [Executive Summary: How the System Ties Together](#1-executive-summary-how-the-system-ties-together)
2. [Repository Bus Factor & Repository Risk Score](#2-repository-bus-factor--repository-risk-score)
3. [Company & Workspace Health Grade (A, B, C, D)](#3-company--workspace-health-grade-a-b-c-d)
4. [Technology Adoption & Penetration Percentage](#4-technology-adoption--penetration-percentage)
5. [Engineer Knowledge Risk (6-Factor Model)](#5-engineer-knowledge-risk-6-factor-model)
6. [Successor Recommendation Engine (4-Factor Model)](#6-successor-recommendation-engine-4-factor-model)
7. [Master Quick-Reference Formula Cheat Sheet](#7-master-quick-reference-formula-cheat-sheet)

---

## 1. Executive Summary: How the System Ties Together

Cortex continuously monitors Git commits, Pull Requests, Jira/GitHub Issues, and Slack messages. It processes these events into **four interconnected layers of metrics**:

```
[Git / Jira / Webhooks]
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Repository Layer: Bus Factor & Single Points of Failure │
│    "How many people maintain each codebase?"                │
└──────────────────────────────┬──────────────────────────────┘
                               │
         ┌─────────────────────┴──────────────────────┐
         ▼                                            ▼
┌───────────────────────────────────┐    ┌───────────────────────────────────┐
│ 2. Engineer Layer: Knowledge Risk │    │ 3. Technology Layer: Penetration  │
│    "If this engineer leaves,      │    │    "Which technologies are        │
│     what breaks and how hard is   │    │     widely used vs single-expert  │
│     it to replace them?"          │    │     bottlenecks?"                 │
└─────────────────┬─────────────────┘    └─────────────────┬─────────────────┘
                  │                                        │
                  └────────────────────┬───────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Successor Engine: "Who can safely take over?"            │
│    Recommends qualified backups, filters out overloaded     │
│    engineers, and prevents false sense of security.         │
└─────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Executive Dashboard: Overall Engineering Health Grade    │
│    Combines all risks into a single Grade (A, B, C, D).     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Repository Bus Factor & Repository Risk Score

### 2.1 What is "Bus Factor"?
**Definition:** *The minimum number of engineers whose combined commits account for 50% or more of the repository's total commit history.*

In plain English: If these engineers were hit by a bus (or quit tomorrow), more than half of the codebase's knowledge would be lost.

### 2.2 The Algorithm
1. Take all commits in the repository.
2. **Filter out all bot and automated accounts** (e.g., `dependabot`, `renovate`, `github-actions`, accounts ending in `[bot]`, CI runners). Bots are never allowed to steal primary ownership or inflate the Bus Factor denominator.
3. **Filter out Alumni and Inactive Engineers:** Engineers marked inactive (`is_active = false` or `employment_status = 'alumni'`) retain their historical contribution edges for code provenance, but are **strictly excluded** from being designated as the **Primary Owner** or counting toward the current repository **Bus Factor**. (A departed engineer cannot respond to incidents or maintain the code today).
4. **Credit Co-authors:** Commits containing Git commit trailers (`Co-authored-by: Name <email>`) resolve both the main author and all co-authors to their canonical person records and credit `CONTRIBUTED_TO` rollups.
5. Group commits by canonical person identity (deduplicating multiple emails, GitHub logins, and Slack IDs belonging to the same human engineer).
6. Count how many commits each active human engineer authored.
7. Sort active engineers in descending order (highest contributor first), using alphabetical name as a deterministic secondary sort.
8. Start adding commits from the top active contributor until the running sum reaches **50% of the total commits**.
9. The number of active human engineers it took to reach 50% is the **Bus Factor**.
10. The #1 top active human contributor is designated the **Primary Owner**.

### 2.3 Repository Risk Score Formula
```
If Bus Factor is 0 (repository has no commits yet):
    Repo Risk Score = 80% (Presumed Fragile)

If Bus Factor is 1 or more:
    Repo Risk Score = Maximum of (0, 100 - (Bus Factor * 20))
```

### 2.4 Status Tiers
| Bus Factor | Risk Score | Status | Business Meaning |
|---|---|---|---|
| **0** | **80%** | `fragile` | Uninitialized or empty repository. |
| **1** | **80%** | `fragile` | **Single Point of Failure (SPOF)**. One person owns $\ge 50\%$ of the code. |
| **2** | **60%** | `concentrated` | Two people hold the majority of knowledge. High risk. |
| **3** | **40%** | `healthy` | Healthy distribution. Knowledge is reasonably shared. |
| **4** | **20%** | `healthy` | Strong shared ownership across 4 contributors. |
| **5+** | **0%** | `healthy` | Exceptional resilience. Distributed team ownership. |

### 2.5 Real Example with Real Numbers
Suppose a repository called `billing-engine` has **100 total commits**:
- **Priya Sharma:** 80 commits
- **Devendra Singh:** 15 commits
- **Rohan Verma:** 5 commits

**Calculation:**
- 50% threshold = 50 commits.
- Look at #1: Priya has 80 commits.
- Does 80 reach 50? **Yes.**
- How many people did it take? **1 person (Priya).**
- **Bus Factor = 1.**
- **Primary Owner = Priya Sharma (80% ownership).**
- **Repo Risk Score = 100 - (1 * 20) = 80% (Fragile / SPOF).**

---

## 3. Company & Workspace Health Grade (A, B, C, D)

### 3.1 What is it?
The headline metric shown at the top of the Cortex Executive Dashboard. It measures the overall resilience of the entire engineering organization on a **0 to 100 scale**, and converts it into a letter grade: **A, B, C, or D**.

### 3.2 The Formula
The Health Score combines three company-wide factors:
1. **Average Knowledge Risk of People (35% weight)**
2. **Percentage of Repositories that are SPOFs (Bus Factor = 1) (35% weight)**
3. **Bus Factor Penalty (30% weight)**

```
Step 1: Identify Active Repositories
Active Repositories = Repositories where status NOT IN ('empty', 'scaffold') AND bus_factor > 0.
(Crucial: Repositories with Bus Factor >= 5 have risk_score = 0, but are fully active and represent the healthiest assets in the company. They are strictly included in all health denominators.)

Step 2: Calculate Average Bus Factor
Average Bus Factor = (Sum of Bus Factors of all active repos) / (Total number of active repos)

Step 3: Calculate Average Knowledge Risk
Average Knowledge Risk = (Sum of all active human engineers' risk scores) / (Total number of active human engineers)

Step 4: Calculate SPOF Percentage
SPOF Percentage = (Number of active repos with Bus Factor <= 1) / (Total number of active repos) * 100

Step 5: Calculate Bus Factor Penalty
Bus Factor Penalty = Maximum of (0, 100 - (Average Bus Factor * 25))

Step 6: Calculate Composite Risk
Composite Risk = (0.35 * Average Knowledge Risk)
               + (0.35 * SPOF Percentage)
               + (0.30 * Bus Factor Penalty)

Step 7: Calculate Final Health Score (0 to 100)
Health Score = 100 - Composite Risk
```

### 3.3 Grade Thresholds
| Health Score | Grade | Status Text | UI Color | Action Required |
|---|---|---|---|---|
| **85 – 100** | **Grade A** | Optimal Health | Green (Emerald) | Organization is resilient. Knowledge is well-documented. |
| **70 – 84** | **Grade B** | Moderate Operational Health | Blue / Indigo | Minor bottlenecks exist, but manageable. |
| **50 – 69** | **Grade C** | Elevated Risk Concentration | Amber / Yellow | Multiple SPOFs or overloaded engineers require attention. |
| **0 – 49** | **Grade D** | Critical Action Required | Rose / Red | Severe company-wide risk. Key departures will cause outages. |

### 3.4 Real Example with Real Numbers
Suppose a company has **4 repositories** and **3 engineers**:
- Repositories:
  - `billing-engine`: Bus Factor = 1 (SPOF)
  - `auth-service`: Bus Factor = 1 (SPOF)
  - `customer-portal`: Bus Factor = 2
  - `docs-site`: Bus Factor = 3
- Engineers:
  - Priya: Risk = 80%
  - Rohan: Risk = 50%
  - Devendra: Risk = 20%

**Calculation Step-by-Step:**
1. **Average Bus Factor** = (1 + 1 + 2 + 3) / 4 = **1.75**
2. **Average Knowledge Risk** = (80 + 50 + 20) / 3 = **50%**
3. **SPOF Percentage** = 2 out of 4 repos are SPOFs = **50%**
4. **Bus Factor Penalty** = 100 - (1.75 * 25) = 100 - 43.75 = **56.25**
5. **Composite Risk**:
   - (0.35 * 50) = 17.5
   - (0.35 * 50) = 17.5
   - (0.30 * 56.25) = 16.875
   - Sum = 17.5 + 17.5 + 16.875 = **51.875** (rounds to **52**)
6. **Final Health Score** = 100 - 52 = **48**
7. **Grade: D (Critical Action Required)** because 50% of the company's codebases are single-owner bottlenecks.

---

## 4. Technology Adoption & Penetration Percentage

### 4.1 What is it?
Measures how widely each technology (e.g. Postgres, Valkey, Docker, React) is adopted across the company's repositories, and flags single-expert dependencies.

### 4.2 The Formula (Zero Fabricated Fallbacks)
```
Usage Percent = (Number of Repositories Using this Technology / Total Repositories in Workspace) * 100
```
- **Contributor Count:** Number of distinct engineers who have authored code or tickets involving this technology.
- **Single-Expert Bottleneck Warning:** If `Contributor Count == 1`, Cortex automatically triggers a `warning` alert on the dashboard:
  *"Only 1 documented expert maintains [Technology] across the codebase."*

### 4.3 Real Example with Real Numbers
If a company has **10 total repositories**:
- **PostgreSQL** is connected to 6 repositories:
  `Usage Percent = (6 / 10) * 100 = 60%`
- **Valkey** is connected to 3 repositories:
  `Usage Percent = (3 / 10) * 100 = 30%`
- **Redis** is connected to 1 repository, maintained only by Alice:
  `Usage Percent = (1 / 10) * 100 = 10%`
  `Contributor Count = 1` $\implies$ **Trigger Warning: Single Expert Dependency (Alice).**

---

## 5. Engineer Knowledge Risk (6-Factor Model)

### 5.1 The Core Formula
Knowledge Risk answers: *"If this engineer leaves tomorrow, how severe is the operational disruption?"*

It is calculated using **six weighted factors**, each scored on a **0.0 to 1.0 scale**:
```
Total Knowledge Risk = (0.30 * Ownership)
                     + (0.20 * Dependency)
                     + (0.15 * Activity)
                     + (0.15 * Documentation)
                     + (0.10 * Expertise)
                     + (0.10 * Pending Work)

Final Stored Score = Math.round(Total Knowledge Risk * 100)  --> [0% to 100%]
```

### 5.2 Unified Risk Tiers
Every dashboard page, API alert, and AI query uses these exact shared tiers:
- **CRITICAL ($\ge 60\%$):** Severe departure vulnerability. Requires immediate handoff/pairing.
- **HIGH ($\ge 40\%$):** Elevated vulnerability. High ownership concentration.
- **MODERATE ($\ge 25\%$):** Normal active contributor.
- **LOW ($< 25\%$):** Distributed knowledge or onboarding engineer.

---

### 5.3 Detailed Breakdown of the 6 Factors

#### Factor 1: Code Ownership with Moving Time-Decay Buckets (30% Weight)
- **What it measures:** The engineer's maximum ownership share in any single repository they have contributed to, evaluated with moving temporal decay to prevent history distortion.
- **Why Naive Decay Fails:** In a naive scalar decay system (`weight = e^(-λ * daysSinceLastCommit)`), a developer with 1,000 commits from 3 years ago who pushes a single 1-line typo fix today has their `lastCommitAt` reset to day 0, artificially refreshing all 1,000 dormant commits at 100% weight.
- **Bucketed Decay Formula:**
  To prevent distortion, Cortex buckets all commits on each `CONTRIBUTED_TO` relationship across 4 age horizons:
  ```
  commits30d:   Commits authored within the last 30 days   (weight = 1.0)
  commits90d:   Commits authored between 31 and 90 days     (weight = 0.7)
  commits180d:  Commits authored between 91 and 180 days    (weight = 0.4)
  commitsOlder: Commits authored over 180 days ago          (weight = 0.15)

  rel.weightedScore = (commits30d * 1.0) + (commits90d * 0.7) + (commits180d * 0.4) + (commitsOlder * 0.15)
  ```
- **Ownership Share Calculation:**
  ```
  For each repository the person contributed to:
      Person's Share = (Person's weightedScore on this repo) / (Sum of all active contributors' weightedScores on this repo)

  Ownership Score = Maximum of all Person's Shares across all repos
  ```
- **Why max across repos instead of average?**
  If an engineer has an average ownership of 20% across 5 small tools, but owns **95% of the core payment engine**, their departure will cripple payments. The maximum ownership share captures this catastrophic vulnerability.

#### Factor 2: Downstream Dependency (20% Weight)
- **What it measures:** How many other services, components, or entities depend on code authored by this person.
- **Formula:**
  ```
  Dependency Score = Minimum of (Dependent Entities Count / 10, 1.0)
  ```
- **Example:** If 7 microservices import or call libraries authored by this engineer:
  `Score = 7 / 10 = 0.70`.

#### Factor 3: Recent Activity (Inactivity Penalty) (15% Weight)
- **What it measures:** Whether the engineer is currently active or dormant based on recent activity timestamps (`lastCommitAt`, `rel.updatedAt`, `rel.createdAt`).
- **Formula:**
  ```
  Count events (commits, PRs) by this person in the last 30 days.
  (Crucial: Evaluated using the developer's actual commit timestamp `rel.lastCommitAt`,
   NEVER the repository creation date `e.createdAt`. An active developer committing today
   to a 2-year-old repository is correctly credited as active.)

  Activity Score = Maximum of (0, 1.0 - (Recent Events / 20))
  ```
- **Why is lower activity a HIGHER risk?**
  Knowledge Risk is *departure / loss risk*. If an engineer who built core systems has 0 commits in the last 30 days, their knowledge is already decaying, or they are disengaged, creating high transition vulnerability.
- If an engineer has 20+ recent events: `Score = 1.0 - (20/20) = 0.0` (zero inactivity penalty).
- If an engineer has 0 recent events: `Score = 1.0 - 0 = 1.0` (full inactivity penalty).

#### Factor 4: Documentation Gaps (15% Weight)
- **What it measures:** How many files or components authored by this person lack documentation, descriptions, or README files.
- **Formula:**
  ```
  Documentation Gap Score = Minimum of (Undocumented Items Count / 20, 1.0)
  ```
- **Example:** If an engineer wrote 14 files/endpoints without any description or markdown documentation:
  `Score = 14 / 20 = 0.70`.

#### Factor 5: Unique Expertise Breadth (10% Weight)
- **What it measures:** How many components or technologies this engineer is the **sole contributor** to.
- **Formula:**
  ```
  Expertise Score = Minimum of (Sole-Contributed Items Count / 20, 1.0)
  ```
- **Example:** If an engineer is the only person who knows how to configure 4 internal microservices:
  `Score = 4 / 20 = 0.20`.

#### Factor 6: Pending Work (10% Weight)
- **What it measures:** The number of currently open, unresolved tasks or issues assigned to this engineer.
- **Formula:**
  ```
  Count only issues where status is NOT ('closed', 'done', 'resolved', 'completed')
  AND issue is currently assigned to this person (excluding stale reassigned edges).

  Pending Work Score = Minimum of (Open Issues Count / 10, 1.0)
  ```
- **Example:** If an engineer has 6 open tickets waiting on them:
  `Score = 6 / 10 = 0.60`.

---

### 5.4 Complete Real Example with Real Numbers
Let's calculate the exact Knowledge Risk for **Priya Sharma**:
1. **Ownership (30% weight):**
   Priya authored 80 out of 100 commits on `billing-engine`.
   `Ownership Score = 80 / 100 = 0.80`.
   Weighted = $0.30 \times 0.80 = \mathbf{0.240}$

2. **Dependency (20% weight):**
   6 internal services make API calls to Priya's billing engine.
   `Dependency Score = 6 / 10 = 0.60`.
   Weighted = $0.20 \times 0.60 = \mathbf{0.120}$

3. **Activity (15% weight):**
   Priya has 16 commits in the last 30 days.
   `Activity Score = 1.0 - (16 / 20) = 1.0 - 0.80 = 0.20`.
   Weighted = $0.15 \times 0.20 = \mathbf{0.030}$

4. **Documentation (15% weight):**
   Priya has 10 undocumented files in `billing-engine`.
   `Documentation Score = 10 / 20 = 0.50`.
   Weighted = $0.15 \times 0.50 = \mathbf{0.075}$

5. **Expertise (10% weight):**
   Priya is the sole contributor to 8 modules.
   `Expertise Score = 8 / 20 = 0.40`.
   Weighted = $0.10 \times 0.40 = \mathbf{0.040}$

6. **Pending Work (10% weight):**
   Priya has 5 open tickets assigned.
   `Pending Work Score = 5 / 10 = 0.50`.
   Weighted = $0.10 \times 0.50 = \mathbf{0.050}$

**Total Knowledge Risk:**
$$0.240 + 0.120 + 0.030 + 0.075 + 0.040 + 0.050 = \mathbf{0.555}$$
- **Final Displayed Risk Score:** `Math.round(0.555 * 100)` = **56% Knowledge Risk (High Risk Tier)**.

---

## 6. Successor Recommendation Engine (4-Factor Model)

### 6.1 Purpose & Business Goal
Answers: *"If Engineer A leaves, who is best equipped to take over their responsibilities?"*

To protect engineering managers from a false sense of security, Cortex enforces **four hard rules**:
1. **Bot & Service Account Exclusion:** Automated tools (`dependabot`, `renovate`, `github-actions`, etc.) are strictly excluded from successor consideration. A bot will never be recommended as a human backup.
2. **Alumni & Inactive Engineer Exclusion:** Departed or inactive engineers (`is_active = false` or `employment_status = 'alumni'`) are strictly excluded from candidate pools. A departed engineer cannot take over future engineering responsibilities.
3. **Direct Repository Rule:** A candidate who has never worked in the departing person's repository (0% repo overlap) is strictly capped at a **maximum match score of 25%** and labeled a `"Cross-Training Candidate"` (not a ready successor).
4. **SPOF Overload Rule:** A candidate who is already the sole owner of **3 or more critical repositories** is penalized in capacity and labeled `"Not Recommended — Already Maintains 3+ Critical Repositories"`.

---

### 6.2 The 4-Factor Scoring Formula
```
Composite Raw Score = (0.40 * Shared Tech Score)
                    + (0.25 * Shared Repos Score)
                    + (0.20 * Recent Activity Score)
                    + (0.15 * Workload Capacity Score)
```

#### Factor 1: Shared Technologies (40% Weight)
Uses the **Jaccard Similarity Index** between the target's technologies and the candidate's technologies:
```
Shared Tech Score = (Number of Common Technologies) / (Total Unique Technologies of Both) * 100
```
*Example:* If Target knows `[Node, Valkey, Docker]` (3) and Candidate knows `[Node, Valkey, Go, Python]` (4):
- Common technologies = `[Node, Valkey]` = 2
- Total unique combined = `[Node, Valkey, Docker, Go, Python]` = 5
- Jaccard Similarity = $2 / 5 = 0.40$
- `Shared Tech Score = 0.40 * 100 = 40%`.

#### Factor 2: Shared Repositories (25% Weight)
```
Shared Repos Score = (Number of Target's Repos Candidate has Contributed To) / (Total Repos Owned by Target) * 100
```
*Example:* If Target owns 2 repositories (`billing-engine`, `invoice-worker`) and Candidate has contributed to `invoice-worker`:
- Overlap = $1 / 2 = 0.50$
- `Shared Repos Score = 0.50 * 100 = 50%`.

#### Factor 3: Recent Activity (20% Weight)
Measures days since candidate's last recorded commit or pull request:
- **$\le 30$ days:** Score = **100%** (`active_recent`)
- **$31 – 60$ days:** Linear decay from **100% down to 50%**
- **$61 – 90$ days:** Linear decay from **50% down to 20%**
- **$> 90$ days:** Score = **10%** (`inactive`)

#### Factor 4: Workload Capacity with SPOF Overload Penalty (15% Weight)
```
SPOF Penalty = (Candidate's Number of SPOF Repositories) * 0.15

Capacity Factor = Maximum of (0, 1.0 - Candidate's Knowledge Risk - SPOF Penalty)

Workload Capacity Score = Capacity Factor * 100
```
*Why this matters:* If a candidate is already the sole maintainer of 3 SPOF repositories, their `SPOF Penalty` is $3 \times 0.15 = 0.45$. This subtracts 45% from their capacity score, ensuring Cortex does not overload an already-critical engineer.

---

### 6.3 Hard Business Rules & Visual Tiers
```
IF Candidate has Shared Repositories > 0:
    Category = "Recommended Successor"
    UI Badge = Emerald / Green ("Recommended Successor — Direct Repository Experience")

ELSE (Candidate has 0 Shared Repositories):
    Category = "Cross-Training Candidate"
    Score = Capped at Maximum of 25%
    UI Badge = Amber / Yellow ("Cross-Training Candidate — No Direct Repository Experience")

IF Candidate has SPOF Repositories >= 3:
    Warning Label = "Not Recommended — Already Maintains 3+ Critical Repositories"
    UI Banner = Red / Rose Alert Box
    Sorting Priority = Demoted to bottom of candidate list
```

---

### 6.4 Real Comparison Example
Evaluating successors for **Priya Sharma** (owner of `billing-engine`):

#### Candidate 1: Devendra Singh
- Shared Tech: Valkey (Jaccard = 0.091) $\implies 0.40 \times 0.091 = 0.036$
- Shared Repos: None (0 shared repos) $\implies 0.25 \times 0.0 = 0.000$
- Activity: Active 13 days ago $\implies 0.20 \times 1.0 = 0.200$
- Workload: Risk = 48%, SPOF Repos = 1 $\implies$ Penalty = 0.15 $\implies$ Capacity = $1.0 - 0.48 - 0.15 = 0.37$ $\implies 0.15 \times 0.37 = 0.055$
- Raw Score = $0.036 + 0.000 + 0.200 + 0.055 = 0.291$ (29%)
- **Rule Applied:** 0 shared repos $\implies$ **Score capped at 25%**.
- **Category:** `cross_training_candidate` (Amber Badge).
- **Result:** Top Cross-Training Candidate (Needs training on `billing-engine`).

#### Candidate 2: Rohan Verma
- Shared Tech: Valkey (Jaccard = 0.167) $\implies 0.40 \times 0.167 = 0.067$
- Shared Repos: None (0 shared repos) $\implies 0.25 \times 0.0 = 0.000$
- Activity: Active 13 days ago $\implies 0.20 \times 1.0 = 0.200$
- Workload: Risk = 50%, **SPOF Repos = 3** $\implies$ Penalty = $3 \times 0.15 = \mathbf{0.45}$ $\implies$ Capacity = $1.0 - 0.50 - 0.45 = \mathbf{0.05}$ $\implies 0.15 \times 0.05 = 0.007$
- Raw Score = $0.067 + 0.000 + 0.200 + 0.007 = 0.274$ (27%)
- **Rule Applied:** 0 shared repos $\implies$ Score capped at 25%.
- **SPOF Rule Applied:** Maintains 3 SPOFs $\implies$ Flagged with Red Warning:  
  **`⚠️ Not Recommended — Already Maintains 3+ Critical Repositories`**.
- **Result:** Demoted below Devendra. Manager is explicitly warned not to assign billing-engine to Rohan.

---

## 7. Master Quick-Reference Formula Cheat Sheet

| Metric | Simple Formula | Range | Good vs Bad |
|---|---|---|---|
| **Bus Factor** | Count of people needed to cover $\ge 50\%$ of repo's commits | $0 \to \infty$ | $\ge 3$ is Healthy; $\le 1$ is a Critical SPOF |
| **Repo Risk Score** | $100 - (\text{Bus Factor} \times 20)$ (Floor 0, Default 80 if 0 commits) | $0\% \to 80\%$ | $\le 40\%$ is Safe; $80\%$ is Fragile |
| **Workspace Health Score** | $100 - (0.35 \times \text{AvgRisk} + 0.35 \times \text{SPOF\%} + 0.30 \times \text{BFPenalty})$ | $0 \to 100$ | $\ge 85$ is Grade A; $< 50$ is Grade D |
| **Technology Usage %** | $(\text{Repos Using Tech} / \text{Total Repos}) \times 100$ | $0\% \to 100\%$ | High = Standard Stack; 1 Contributor = Risk |
| **Engineer Knowledge Risk** | $0.30\,\text{Own} + 0.20\,\text{Dep} + 0.15\,\text{Act} + 0.15\,\text{Doc} + 0.10\,\text{Exp} + 0.10\,\text{Work}$ | $0\% \to 100\%$ | $< 25\%$ is Low Risk; $\ge 60\%$ is Critical |
| **Successor Match Score** | $0.40\,\text{Tech} + 0.25\,\text{Repo} + 0.20\,\text{Act} + 0.15\,\text{Capacity}$ | $0\% \to 100\%$ | $\ge 60\%$ = Successor; Capped at 25% if 0 Repos |
