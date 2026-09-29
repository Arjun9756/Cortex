# Cortex Engineering Metrics Specification & Definitions
*Document Version: 2.1.0 | Status: Canonical Ground-Truth Reference & Plain-English Guide*

> **Core Philosophy:** Numbers without context create confusion. Cortex metrics are built to give engineering leaders, managers, and engineers truthful, plain-English answers to real business questions: *"If someone leaves, what will break?"*, *"Which repositories are one person away from stalling?"*, and *"How healthy is our overall software operation?"* Every score is deterministic (calculated strictly from math and real Git/Jira/Slack events), never guessed by AI.

---

## 1. Metric Catalog & Quick Reference

| Metric Identifier | What It Measures (Plain English) | Whose Metric Is This? | Headline Unit | Primary Dashboard Location |
| :--- | :--- | :--- | :--- | :--- |
| `pr_review_cycle_time` | Active time needed to review and merge a pull request | Repository / Team | Wall-Clock Hours (p50 Median) | PR Health, Speed Metrics, API |
| `pr_total_lead_time` | Total time from starting a PR to getting it into production | Repository / Team | Calendar Days / Hours (Median) | Velocity Tab, Summary Reports |
| `commit_activity_count` | Number of verified commits contributed | Engineer / Repository | Verified Count (+Additions, -Deletions)| Contributor Profile, Team Overview |
| `pr_merged_count` | Number of successfully merged pull requests | Engineer / Repository | Merged PRs Count | Contributor Profile, Pull Requests |
| `repo_bus_factor` | How many engineers hold $\ge 50\%$ of the codebase knowledge | Repository | Whole Number ($\ge 1$) | Top Stat Strip, Bus Factor Tab |
| `repo_ownership_percent`| Share of knowledge an engineer holds over a specific codebase | Engineer & Repository | Percentage ($0\% - 100\%$) | Repo Detail Modal, People Tab |
| `knowledge_departure_risk`| Blast-radius / disruption if this engineer leaves tomorrow | Individual Engineer | Percentage ($0\% - 100\%$) | Headline KPIs, People Table, Risk Radar |
| `successor_match_score` | How well another teammate can take over when someone leaves | Candidate $\to$ Owner Pair | Percentage ($0\% - 100\%$) | Successor Modal, Simulator, Handover Bot |

---

## 2. Detailed Metric Specifications (Explained Simply)

### 2.1 PR Review Cycle Time (`pr_review_cycle_time`)

#### 💡 In Plain English:
Think of this as **"The Waiting Room Time"**. When an engineer finishes writing code and clicks *"Ready for Review"*, how many hours does it take for a teammate to review it, approve it, and merge it?

- **Whose metric is this?** Repository and Engineering Team speed.
- **Why it matters:** If PRs sit for 3 days waiting for review, your team moves slowly. If they are reviewed within 4 hours, team momentum stays high.
- **Exact Start Event:** The moment the PR leaves "Draft" mode and becomes ready for human eyes (`ready_for_review_at` or `created_at` if non-draft).
- **Exact End Event:** The moment the PR is merged into the main codebase (`merged_at`).
- **Mathematical Formula:**
  $$\text{ReviewDuration} = \text{merged\_at} - \text{ready\_for\_review\_at}$$
- **Real-World Example:**
  - *Scenario:* Alice opens a PR on Tuesday at 10:00 AM as a draft while she writes tests. At 2:00 PM on Tuesday, she marks it "Ready for Review". Bob reviews and merges it on Wednesday at 10:00 AM.
  - *Calculation:* From Tuesday 2:00 PM to Wednesday 10:00 AM is exactly **20 wall-clock hours**. (Draft time from 10:00 AM to 2:00 PM is excluded so engineers are not penalized for working in drafts).
- **Included:** All human-merged pull requests (squash, rebase, or standard merge commits).
- **Excluded:**
  - Draft time (engineers shouldn't feel rushed while experimenting).
  - Unmerged or closed PRs.
  - Automated bot PRs (Dependabot, Renovate, Snyk).
  - Abandoned PRs open for $>30$ days (segregated into `stale_outliers` so they don't skew the team's typical speed).
- **Headline Aggregation:** Median (p50) wall-clock hours, rounded to 1 decimal place.

---

### 2.2 PR Total Lead Time (`pr_total_lead_time`)

#### 💡 In Plain English:
Think of this as **"The Complete Journey Time"**. From the very first moment an engineer creates a PR branch until that code is finally merged into production, how long did the entire lifecycle take?

- **Whose metric is this?** Engineering Delivery Pipeline.
- **Why it matters:** Shows if work sits idle in long-lived feature branches before getting merged.
- **Exact Start Event:** Timestamp when the pull request was originally created (`created_at`).
- **Exact End Event:** Timestamp when the pull request was merged (`merged_at`).
- **Formula:**
  $$\text{LeadTime} = \text{merged\_at} - \text{created\_at}$$
- **Real-World Example:**
  - Charlie creates a PR branch on Monday morning. He works on it for 2 days in draft, requests review on Wednesday, and it gets merged on Friday afternoon.
  - Total Lead Time = 5 calendar days.
- **Aggregation:** Median (p50) and 90th percentile (p90).

---

### 2.3 Commit Activity Count (`commit_activity_count`)

#### 💡 In Plain English:
A verified tally of code contributions made by an engineer or added to a repository.

- **Whose metric is this?** Repository contribution history and Engineer footprint.
- **Crucial Anti-Productivity Qualification:** **Commit counts are NOT productivity scores.** A junior engineer might push 10 commits changing 10 lines of CSS, while a principal architect might push 1 commit that redesigns the payment gateway. Cortex displays commit counts solely for architectural footprint, not performance ranking.
- **Mandatory Size Context:** Every display of commits must show lines added ($+$), lines deleted ($-$), and total files modified.
- **Co-Author Support:** Commits that list `Co-authored-by: Name <email>` in Git trailers automatically credit both developers.
- **Excluded:** Automated CI bots, release tagging commits, and orphaned branches that were never merged.

---

### 2.4 Pull Request Count (`pr_merged_count`)

#### 💡 In Plain English:
The exact number of approved and merged pull requests authored by a developer or merged into a repository.

- **Whose metric is this?** Engineer activity and repository throughput.
- **Squash-Merge Rule:** If an engineer pushes 15 temporary commits to a PR branch and it gets "Squash and Merged" into `main`, Cortex counts this as **exactly 1 merged pull request**.
- **Excluded:** Abandoned PRs, open draft PRs, closed unmerged PRs, and bot updates.

---

### 2.5 Repository Bus Factor (`repo_bus_factor`)

#### 💡 In Plain English:
**"If key developers get hit by a bus (or quit tomorrow), how many people would it take to lose more than 50% of the codebase's knowledge?"**

- **Whose metric is this?** The Repository (Codebase Fragility).
- **Why it matters:** If a repository has a Bus Factor of 1, your company has a **Single Point of Failure (SPOF)**. If that one person leaves or takes sick leave, nobody else understands the code.
- **The Step-by-Step Algorithm:**
  1. Retrieve all active human contributors for repository $R$.
  2. Filter out bot accounts (`dependabot`, `github-actions`, etc.).
  3. Filter out alumni/departed developers (a developer who already left cannot maintain the code today).
  4. Rank active engineers from highest to lowest based on their contributions.
  5. Count contributors one-by-one until their combined commits reach **50% of the total commits**.
  6. The number of people required is the **Bus Factor**.
- **Real-World Example:**
  - Suppose `payments-service` has 100 total commits:
    - **Priya:** 65 commits (65%)
    - **Rohan:** 20 commits (20%)
    - **Devendra:** 15 commits (15%)
  - Priya alone accounts for 65%, which is $\ge 50\%$.
  - Therefore, it only takes **1 person (Priya)** to exceed half the codebase.
  - **Bus Factor = 1 (Fragile / Single Point of Failure).**
  - **Primary Owner = Priya (65% ownership).**
- **Status Tiers:**
  - **Bus Factor = 1:** `fragile` (Red Alert: Single Point of Failure).
  - **Bus Factor = 2:** `concentrated` (Yellow Alert: High risk; only two people know the system).
  - **Bus Factor $\ge 3$:** `healthy` (Green: Knowledge is safely shared across 3 or more engineers).

---

### 2.6 Repository Ownership Percentage (`repo_ownership_percent`)

#### 💡 In Plain English:
**"What percentage of this specific codebase is owned or understood by a particular engineer?"**

- **Whose metric is this?** Contributor-to-Repository relationship.
- **Moving Time-Decay Buckets (No Stale Distortion):**
  Code written yesterday is far more relevant than code written 3 years ago. Cortex automatically weights commits based on how recently they were authored:
  - Last 30 days: **100% weight ($1.0$)** (fresh in the engineer's memory)
  - 31 to 90 days: **70% weight ($0.7$)**
  - 91 to 180 days: **40% weight ($0.4$)**
  - Older than 180 days: **15% weight ($0.15$)** (historical baseline)
- **Real-World Example:**
  - If Alice wrote 100 commits 2 years ago, but Bob wrote 50 commits this month, Bob's current active ownership is much higher than Alice's because Bob has fresh context on the recent changes.

---

### 2.7 Knowledge Departure Risk Score (`knowledge_departure_risk`)

#### 💡 In Plain English:
**"If this specific person walks out the door tomorrow, how badly will the engineering organization be hurt?"**

- **Whose metric is this?** The Individual Engineer (Departure Vulnerability).
- **The 6 Real-World Factors (0% to 100%):**
  $$\text{RiskScore} = (0.30 \times \text{Ownership}) + (0.20 \times \text{Dependency}) + (0.15 \times \text{Activity}) + (0.15 \times \text{Docs}) + (0.10 \times \text{Expertise}) + (0.10 \times \text{Work})$$
  1. **Ownership (30% weight):** Does this person own 80%–100% of any critical repository with no backup?
  2. **Dependency (20% weight):** Do other critical company microservices depend on the code this person wrote?
  3. **Activity (15% weight):** Are they actively committing code, or has their knowledge already started to go stale?
  4. **Documentation (15% weight):** Did this person write clear documentation and Slack/Jira explanations, or is all the architecture trapped in their head?
  5. **Sole Expertise (10% weight):** Are they the *only* person in the entire company who knows a specific technology (e.g., only Kafka expert, only Rust expert)?
  6. **Pending Work (10% weight):** Do they have open PRs and critical uncompleted tasks that no one else can take over?
- **Risk Tiers:**
  - **$\ge 60\%$ (Critical Risk - Red):** Severe danger. If they leave, an outage or project stall is almost guaranteed. Immediate handover needed.
  - **$40\% - 59\%$ (High Risk - Amber):** High ownership concentration. Backup pairing advised.
  - **$25\% - 39\%$ (Moderate Risk - Blue):** Normal healthy contributor with shared ownership.
  - **$< 25\%$ (Low Risk - Green):** Healthy distribution or onboarding new joiner.

---

### 2.8 Successor Recommendation Match (`successor_match_score`)

#### 💡 In Plain English:
**"If Priya resigns or goes on vacation, which teammate is best suited to take over her repositories?"**

- **Whose metric is this?** Handover Pair (Outgoing Owner $\to$ Recommended Successor).
- **The 4-Factor Matching Formula:**
  $$\text{MatchScore} = (0.40 \times \text{TechOverlap}) + (0.30 \times \text{RepoOverlap}) + (0.20 \times \text{Activity}) + (0.10 \times \text{Capacity})$$
  1. **Technology Overlap (40% weight):** Does the candidate know the same programming languages, databases, and frameworks?
  2. **Repository Overlap (30% weight):** Has the candidate previously reviewed PRs or made commits in Priya's repositories?
  3. **Recent Activity (20% weight):** Is the candidate actively coding in the company right now?
  4. **Capacity Headroom (10% weight):** Does the candidate have time to take this on, or are they already overloaded with 5 other projects?
- **Safety Disqualification Rule:** If a teammate has $0\%$ technology overlap and $0\%$ repository overlap, Cortex strictly refuses to recommend them, avoiding a false sense of security.

---

## 3. Top-Level Dashboard Scores (The Big Numbers at the Top)

When an executive, manager, or engineer opens the Cortex Dashboard, they immediately see the **Top Overview Cards**. Here is what every score means, who it belongs to, and how it is calculated:

### 🏆 A. Engineering Health Index (Headline Score: 0 to 100)
- **Whose score is this?** The Entire Organization / Company Workspace.
- **What it tells you:** An overall health grade for your engineering department. Think of it like a corporate credit score for codebase safety.
- **Grades:**
  - **Grade A (85–100):** Optimal Health (Knowledge is well shared, few bottlenecks).
  - **Grade B (70–84):** Moderate Health (Good shape, a few single-owner repos).
  - **Grade C (50–69):** Elevated Risk (Several critical bottlenecks need attention).
  - **Grade D (< 50):** Critical Action Required (Half the company's code relies on single individuals).
- **How it is calculated:**
  $$\text{CompositeRisk} = (0.35 \times \text{AvgKnowledgeRisk}) + (0.35 \times \text{SPOFPct}) + (0.30 \times \text{BusFactorPenalty})$$
  $$\text{HealthScore} = 100 - \text{CompositeRisk}$$
  - $\text{AvgKnowledgeRisk}$: The average risk score across all engineers.
  - $\text{SPOFPct}$: The percentage of active repositories with Bus Factor $\le 1$.
  - $\text{BusFactorPenalty}$: A penalty if the average Bus Factor across repositories is below the target of $2.0$.

### 📊 B. The 5 Key Stats Strip
1. **Repositories:** Total count of monitored codebases, highlighting how many are Single Points of Failure (Bus Factor = 1).
2. **People:** Total count of active human team members, highlighting how many have high departure risk ($\ge 40\%$).
3. **Technologies:** Total distinct technologies detected (e.g. Node.js, PostgreSQL, Docker), flagging any "single-expert stack" where only 1 person has knowledge.
4. **Average Bus Factor:** The average number of developers maintaining each active codebase (Target: $\ge 2.0$).
5. **Urgent Risk Alerts:** Priority list of critical warnings (e.g. single-owner services, departing engineers, undocumented codebases).

---

## 4. Noise Filtering & Data Hygiene Rules

1. **Bot Filtering Protocol:**
   - Every contributor is checked by `isBotAccount(name, email, username, externalId)` against known bot patterns (`dependabot[bot]`, `renovate[bot]`, `github-actions`, etc.).
   - Bots are strictly excluded from human metrics, Bus Factors, and successor matching so automated scripts don't falsely skew ownership.
   - An override parameter `includeBots: true` is available if someone explicitly wishes to audit bot activity.
   - Any suspicious accounts are sent to a `suspect_bots` review list.

2. **Extreme Outliers:**
   - Any pull request open or waiting for review for more than 30 days is categorized as an extreme outlier.
   - These are excluded from the headline median speed so abandoned side-projects don't make active developers look slow.
   - They are always accessible in a dedicated `stale_outliers` section.

3. **Incomplete Data & Sample Size Transparency:**
   - If a repository or person has fewer than 5 events (`sample_size < 5`), Cortex explicitly labels the score as `data_completeness: "partial"` with a warning: *"Sample size too small for statistical significance (<5 PRs/commits)"*. Cortex never pretends a 1-commit repository is fully audited.

---

## 5. Product Claims & Guarantees

### What Cortex Guarantees:
- **Zero Generative Guesswork:** Every number is derived from deterministic mathematical algorithms and actual recorded events in PostgreSQL and Neo4j. Cortex never lets an AI hallucinate numbers.
- **Single Source of Truth:** The dashboard, chat agent, API endpoints, and executive reports use the identical calculation functions in `packages/analytics/`.
- **Honest Statistical Representation:** Medians and distributions are provided instead of distorted scalar averages.
- **Anti-Productivity Ethics:** Metrics are explicitly labeled as engineering activity indicators, never individual performance or output rankings.

### What Cortex Does NOT Guarantee:
- **External Offline Activities:** Cortex cannot capture architectural discussions conducted in-person, on unrecorded phone calls, or in private repositories without webhook integration.
- **Syntactic Code Quality:** Metric calculations measure organizational knowledge distribution, not code correctness or test coverage (for code syntax, pair Cortex with static analyzers).

---

## 6. How Integrations & Background Sync Work (Layman's Guide)

To keep all of the above metrics 100% accurate in real time without burdening developers or IT administrators, Cortex uses five purpose-built mechanisms:

1. **Zero-Touch Dynamic Webhook Auto-Registration:**
   - When an administrator connects GitHub, Slack, or Jira via OAuth, Cortex automatically contacts the provider's API, registers the webhook endpoint, generates cryptographic secrets, and saves them in PostgreSQL. Developers never have to manually copy and paste webhook URLs or secrets.
2. **Slack Sub-50ms Immediate ACK (No Timeout Cascades):**
   - Slack enforces a strict 3,000ms response timeout. If a server takes longer than 3 seconds to process a message, Slack assumes failure and retries the message 3 times, causing massive duplicate storms.
   - Cortex solves this by cryptographically validating the HMAC signature, acknowledging Slack with `200 OK` in less than 20 milliseconds, and handing off the heavy analysis asynchronously to BullMQ (Redis). Slack never retries, and server CPU remains calm.
3. **Jira Token Auto-Refresh Lifecycle:**
   - Atlassian OAuth tokens strictly expire every 60 minutes.
   - Cortex maintains a proactive rotation service: if a token has less than 5 minutes remaining, or if an hourly cron triggers, Cortex automatically exchanges the stored refresh token for a brand-new access token without human intervention.
4. **GitHub Polite Pacing & Rate-Limit Shield:**
   - Traversing GitHub contributors and repositories can quickly hit GitHub's 5,000 req/hr rate limit or trigger secondary burst blocks.
   - Cortex introduces polite 60ms pacing delays between contributor queries and monitors the `x-ratelimit-remaining` header. If quota drops below 10 requests, directory sync politely pauses rather than failing or risking an account block.
5. **Strict Identity Resolution ("Two Nodes are Better Than a False Merge"):**
   - In real engineering teams, developers often use different emails across tools (e.g. `panukishu.dev@gmail.com` on GitHub vs `panukishu@company.com` on Slack).
   - Cortex enforces a strict principle: *"A wrong merge is far more dangerous than having two separate accounts."*
   - Auto-merging is permitted **only** when there is an exact verified email match or a strong, clean, non-generic username. Fuzzy name matching is strictly forbidden, ensuring that two different people named "Alex" or "Kishu" are never accidentally combined into one person.
