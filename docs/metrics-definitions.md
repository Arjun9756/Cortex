# Cortex Engineering Metrics Specification & Definitions
*Document Version: 2.0.0 | Status: Canonical Reference & Ground-Truth Standard*

> **Core Principle:** A metric can be technically correct and still be misleading. Cortex metrics are designed to provide clear, actionable context (median, p90, interquartile distributions, size context) rather than bare unweighted averages or misleading "productivity" scores.

---

## 1. Metric Catalog & Quick Reference

| Metric Identifier | Headline Aggregation | Secondary Context | Default Unit | Primary Consumer Surface |
| :--- | :--- | :--- | :--- | :--- |
| `pr_review_cycle_time` | Median (p50) | p90, IQR, Min, Max, Outliers (>30d) | Wall-Clock Hours | Dashboard, Chat Agent, API |
| `pr_total_lead_time` | Median (p50) | p90, IQR, Min, Max | Calendar Days / Hours | Dashboard, Chat Agent, API |
| `commit_activity_count` | Exact Sum | Lines Added (+), Deleted (-), Files | Verified Count | Dashboard, Contributor Profile, Agent |
| `pr_merged_count` | Exact Sum | Additions, Deletions, Files | Merged PRs | Dashboard, Contributor Profile, Agent |
| `repo_bus_factor` | Deterministic Coverage | Contributor %, Top Owner | Integer ($\ge 1$) | Dashboard, Risk Table, Agent |
| `repo_ownership_percent`| Relative Ratio (0–100%) | Time-decayed Exponential (180d) | Percentage (%) | Dashboard, Graph, Knowledge Risk |
| `knowledge_departure_risk`| 6-Factor Composite (0–100)| Sub-factor breakdown | Percentage (%) | Executive Briefing, SPOF Radar |
| `successor_match_score` | 4-Factor Weighted (0–100) | Tech, Repo, Activity, Capacity | Percentage (%) | Successor Modal, Simulator, Agent |

---

## 2. Detailed Metric Specifications

### 2.1 PR Review Cycle Time (`pr_review_cycle_time`)
*The active review duration required to approve and merge a ready pull request, measured in calendar wall-clock hours.*

- **Exact Start Event:** Timestamp when the pull request is transitioned out of draft state or marked `ready_for_review`. If opened directly as a non-draft PR, the start event is `created_at`.
- **Exact End Event:** Timestamp when the pull request is merged (`merged_at`).
- **Formula:**
  $$\text{ReviewDuration} = \text{merged\_at} - \text{ready\_for\_review\_at}$$
  *Measured in continuous elapsed calendar wall-clock hours (24/7), explicitly labeled as Wall-Clock Duration.*
- **Included:**
  - Pull requests in `merged` state that were marked ready for review.
  - Squash-merged, rebase-merged, and merge-commit PRs.
- **Excluded:**
  - Pull requests currently in `draft` state (draft duration is excluded from review cycle time).
  - Pull requests closed without merging (`closed` with `merged_at IS NULL`).
  - Automated bot PRs (Dependabot, Renovate, GitHub Actions, Snyk, etc.).
  - Extreme outliers ($\text{Duration} > 30\text{ days}$) are excluded from the headline median and segregated into a dedicated `stale_outliers` array.
- **Aggregation:**
  - **Headline Number:** Median (p50) Wall-Clock Duration.
  - **Distribution:** 90th percentile (p90), 75th percentile (p75), 25th percentile (p25 / IQR), minimum, and maximum.
- **Units & Rounding:** Calendar wall-clock hours, rounded to 1 decimal place (e.g., `4.5 hours`).

---

### 2.2 PR Total Lead Time (`pr_total_lead_time`)
*The total elapsed calendar time from initial PR creation to production merge.*

- **Exact Start Event:** Timestamp when the pull request was originally created (`created_at`).
- **Exact End Event:** Timestamp when the pull request was merged (`merged_at`).
- **Formula:**
  $$\text{LeadTime} = \text{merged\_at} - \text{created\_at}$$
- **Included:** All merged pull requests (including time spent in draft).
- **Excluded:** Closed without merge, open unmerged PRs, confirmed bot PRs (unless `includeBots=true`).
- **Aggregation:** Median (p50) and p90.
- **Units & Rounding:** Days or Hours, rounded to 1 decimal place.

---

### 2.3 Commit Activity Count (`commit_activity_count`)
*A verifiable count of code commits authored by an engineer or contributed to a repository.*

- **Source of Truth:**
  - In Neo4j: `(p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)` with `rel.commitCount` property.
  - In PostgreSQL: `events` table (`provider = 'github' AND event_type = 'push'`) and `person_metrics.commit_count`.
- **Included:**
  - Commits merged into the default branch (`main` / `master`).
  - Co-authored commits: Commits containing Git trailers (`Co-authored-by: Name <email>`) credit both the primary author and co-authors.
- **Excluded:**
  - Reverted commits or orphaned branch commits that never merged to the canonical branch.
  - Individual `(:COMMIT)` nodes in Neo4j (compacted into `CONTRIBUTED_TO` rollup edges to prevent Neo4j Aura 150k node limits).
  - Automated bot commits (CI bump, release tags) unless explicitly queried.
- **Size Context (Mandatory):**
  Raw commit counts are **never** presented in isolation. Every surface must present:
  - `commits_count`: Total commits.
  - `lines_added`: Total additions ($+$).
  - `lines_deleted`: Total deletions ($-$).
  - `files_changed`: Total files modified.
- **Strict Anti-Productivity Qualification:**
  *Notice:* "Engineering Activity (Not a measure of individual productivity or engineering output)."

---

### 2.4 Pull Request Count (`pr_merged_count`)
*The count of merged pull requests authored by a contributor or merged into a repository.*

- **Start/End Event:** PR `merged_at IS NOT NULL`.
- **Squash-Merge Rule:** A squash-merged PR counts as **exactly 1 PR**, regardless of how many intermediate WIP branch commits were squashed into the merge.
- **Excluded:** Open PRs, draft PRs, closed unmerged PRs, bot PRs.
- **Units:** Exact integer.

---

### 2.5 Repository Bus Factor (`repo_bus_factor`)
*The minimum number of engineers whose combined contributions account for 50% or more of the repository's total commit history.*

- **Formula:**
  1. Retrieve all active human contributors for repository $R$ from `(p:PERSON)-[rel:CONTRIBUTED_TO]->(R)`.
  2. Filter out bot accounts (`CYPHER_BOT_FILTER` and `isBotAccount`).
  3. Sort contributors descending by commit volume: $C_1, C_2, \dots, C_k$.
  4. Find the smallest $B$ such that:
     $$\sum_{i=1}^{B} \text{Commits}(C_i) \ge 0.50 \times \sum_{j=1}^{k} \text{Commits}(C_j)$$
  5. If repository has 0 commits, $\text{BusFactor} = 0$ (Status: `empty`).
  6. If $B = 1$, repository is flagged as `fragile` (Critical Single Point of Failure).
  7. If $B \ge 3$, repository is flagged as `healthy`.
- **Primary Owner:** Contributor $C_1$ with highest contribution volume.

---

### 2.6 Repository Ownership Percentage (`repo_ownership_percent`)
*The relative share of institutional and technical knowledge an engineer holds over a specific codebase.*

- **Formula (Decayed Weighted Ownership):**
  $$\text{Ownership}(P, R) = \frac{\sum_{c \in \text{Commits}(P, R)} w(c)}{\sum_{c' \in \text{Commits}(*, R)} w(c')}$$
  where time-decay weight $w(c) = \exp\left(-\frac{\ln(2) \times \Delta t}{180\text{ days}}\right)$ with $\Delta t = \text{now} - \text{commit\_date}$.
- **Four Age Horizons (Bucketed Representation):**
  - Last 30 days: weight $= 1.0$
  - 31 to 90 days: weight $= 0.7$
  - 91 to 180 days: weight $= 0.4$
  - $>180$ days: weight $= 0.15$
- **Units:** Percentage ($0.0\%$ to $100.0\%$), rounded to 1 decimal place.

---

### 2.7 Knowledge Departure Risk Score (`knowledge_departure_risk`)
*The organizational risk and continuity blast-radius if a specific engineer departs.*

- **Composite Formula (6-Factor Mathematical Model):**
  $$\text{RiskScore} = (0.30 \times \text{Ownership}) + (0.20 \times \text{Dependency}) + (0.15 \times \text{Activity}) + (0.15 \times \text{Docs}) + (0.10 \times \text{Expertise}) + (0.10 \times \text{Work})$$
- **Sub-factor Definitions:**
  1. *Ownership (30%):* Highest decayed ownership percentage across all repositories.
  2. *Dependency (20%):* Downstream service dependencies on repos owned by this engineer.
  3. *Activity (15%):* Recency of contributions (dormant engineers receive higher departure vulnerability).
  4. *Documentation (15%):* Ratio of undocumented microservices owned by this engineer.
  5. *Expertise (10%):* Sole-expert technologies where no secondary engineer exists.
  6. *Workload (10%):* Active PRs and unassigned critical issues currently in flight.
- **Range & Tiers:**
  - $0\% - 40\%$: Low Risk (Healthy continuity)
  - $41\% - 70\%$: Moderate Risk (Cross-training advised)
  - $71\% - 100\%$: Critical Risk (Immediate handover and successor pairing required)

---

### 2.8 Successor Recommendation Match (`successor_match_score`)
*A 4-factor deterministic ranking determining the optimal internal engineer to succeed an outgoing primary owner.*

- **Formula:**
  $$\text{Score} = (0.40 \times \text{TechOverlap}) + (0.30 \times \text{RepoOverlap}) + (0.20 \times \text{Activity}) + (0.10 \times \text{Capacity})$$
- **Sub-factors:**
  1. *Tech Overlap (40%):* Jaccard similarity of technology footprints: $\frac{|T_{\text{owner}} \cap T_{\text{candidate}}|}{|T_{\text{owner}} \cup T_{\text{candidate}}|}$.
  2. *Repo Overlap (30%):* Shared repository contributions: $\frac{|R_{\text{owner}} \cap R_{\text{candidate}}|}{|R_{\text{owner}}|}$.
  3. *Recent Activity (20%):* Exponential recency decay over candidate's last contribution.
  4. *Capacity (10%):* Current workload head-room: $1.0 - \text{WorkloadPenalty}$.
- **Zero-Overlap Disqualification:** If a candidate has $0\%$ technology overlap and $0\%$ repository overlap, they are disqualified from recommendation.

---

## 3. Noise Filtering & Data Hygiene Rules

1. **Bot Filtering Protocol:**
   - Evaluated by `isBotAccount(name, email, username, externalId)` against `KNOWN_BOT_USERNAMES` and pattern heuristics (`*[bot]`, `bot-*`, `*-bot`, `*@users.noreply.github.com`).
   - Default behavior: Excluded from all human metrics, bus factors, and successor candidates.
   - Override: Explicit parameter `includeBots: true` supported on all metric APIs.
   - Telemetry: Any activity matching suspect patterns is logged to `suspect_bots` review queue. If suspect activity exceeds $5\%$ of total volume, a warning banner is surfaced.

2. **Extreme Outliers:**
   - Any PR open or pending review $>30$ days is segregated into `stale_outliers`.
   - The headline median (p50) is calculated without these extreme outliers so that abandoned/dormant PRs do not distort standard engineering cadence.
   - Outliers are always exposed as a secondary field: `{ stale_outliers_count, stale_outliers: [...] }`.

3. **Incomplete Data & Sample Size Transparency:**
   - Every metric response must return `sample_size` (total events evaluated).
   - If `sample_size < 5`, response includes: `data_completeness: "partial"`, `warning: "Sample size too small for statistical significance (<5 PRs/commits)"`.
   - Never present a metric computed from partial data as complete.

---

## 4. Product Claims & Guarantees

### What Cortex Guarantees:
- **Zero Generative Guesswork:** Every number is derived from deterministic mathematical algorithms and actual recorded events in PostgreSQL and Neo4j.
- **Single Source of Truth:** The dashboard, chat agent, API endpoints, and executive reports use the identical calculation functions in `packages/analytics/`.
- **Honest Statistical Representation:** Medians and distributions are provided instead of distorted scalar averages.
- **Anti-Productivity Ethics:** Metrics are explicitly labeled as engineering activity indicators, never individual performance or output rankings.

### What Cortex Does NOT Guarantee:
- **External Offline Activities:** Cortex cannot capture architectural discussions conducted in-person, on unrecorded phone calls, or in private repositories without webhook integration.
- **Syntactic Code Quality:** Metric calculations measure organizational knowledge distribution, not code correctness or test coverage (for code syntax, pair Cortex with static analyzers).
