import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  FileCode2, 
  Scale 
} from 'lucide-react';

interface MetricDef {
  id: string;
  name: string;
  identifier: string;
  headlineAggregation: string;
  defaultUnit: string;
  shortDescription: string;
  formula: string;
  startEndEvents: { start: string; end: string };
  included: string[];
  excluded: string[];
  whyExclusionMatters: string;
  groundedExample: {
    dataset: string;
    sampleResult: string;
    note: string;
  };
}

export const MetricsDefinedSection: React.FC = () => {
  const [selectedMetricId, setSelectedMetricId] = useState<string>('pr_review_cycle_time');

  const metrics: MetricDef[] = [
    {
      id: 'pr_review_cycle_time',
      name: 'PR Review Cycle Time',
      identifier: 'pr_review_cycle_time',
      headlineAggregation: 'Median (p50)',
      defaultUnit: 'Wall-Clock Hours',
      shortDescription:
        'The active review duration required to inspect, approve, and merge a pull request once it is ready for review.',
      formula: 'ReviewDuration = merged_at - ready_for_review_at',
      startEndEvents: {
        start: 'Timestamp when PR is transitioned out of draft or marked ready_for_review. If opened non-draft, created_at.',
        end: 'Timestamp when the PR is merged into canonical branch (merged_at).'
      },
      included: [
        'Merged pull requests marked ready for review',
        'Squash-merged, rebase-merged, and merge-commit PRs',
        'Multi-author co-authored pull requests'
      ],
      excluded: [
        'Pull requests currently in draft state (draft authoring time is excluded)',
        'Closed without merging (abandoned PRs with merged_at IS NULL)',
        'Automated bot PRs (Dependabot, Renovate, Snyk, GitHub Actions)',
        'Extreme outliers (>30 days open) segregated into dedicated audit list'
      ],
      whyExclusionMatters:
        'Draft PRs reflect author drafting time, not reviewer responsiveness. Automated dependency bumps distort review velocity downward, while 90-day abandoned PRs skew unweighted averages. Cortex calculates the median (p50) exclusively on human, reviewable PRs while exposing outliers transparently in a secondary array.',
      groundedExample: {
        dataset: 'Golden Dataset Alpha (35 PR verification suite)',
        sampleResult: 'Median: 4.0 Wall-Clock Hours · p90: 24.5 Hours · Outliers: 2 segregated',
        note: 'Verified against manual ground truth in scripts/verify_metrics_golden_dataset.ts'
      }
    },
    {
      id: 'pr_total_lead_time',
      name: 'PR Total Lead Time',
      identifier: 'pr_total_lead_time',
      headlineAggregation: 'Median (p50) & p90',
      defaultUnit: 'Calendar Days / Hours',
      shortDescription:
        'The total elapsed calendar time from initial pull request creation to production merge, capturing entire authoring and review lifecycle.',
      formula: 'LeadTime = merged_at - created_at',
      startEndEvents: {
        start: 'Initial PR creation timestamp (created_at).',
        end: 'Production merge timestamp (merged_at).'
      },
      included: [
        'All merged pull requests',
        'Time spent in draft or work-in-progress state',
        'Multi-commit branch cycles'
      ],
      excluded: [
        'Closed pull requests without merge',
        'Open unmerged PRs currently in flight',
        'Confirmed automated bot pull requests'
      ],
      whyExclusionMatters:
        'Differentiates end-to-end delivery cycle time from peer review latency. Comparing Total Lead Time against Review Cycle Time isolates whether bottlenecks stem from complex drafting iterations or review queue delays.',
      groundedExample: {
        dataset: 'Golden Dataset Alpha (Draft-heavy test cases)',
        sampleResult: 'Lead Time: 10.2 Days (includes 10d draft window) vs Review Cycle: 4.8 Hours',
        note: 'Ensures teams do not misdiagnose long authoring periods as slow code reviews.'
      }
    },
    {
      id: 'repo_bus_factor',
      name: 'Repository Bus Factor',
      identifier: 'repo_bus_factor',
      headlineAggregation: 'Deterministic Minimum Subset',
      defaultUnit: 'Integer (>= 0)',
      shortDescription:
        'The minimum number of engineers whose combined contributions account for 50% or more of the repository’s commit history.',
      formula: 'Smallest B such that: Σ_{i=1}^B Commits(C_i) >= 0.50 * TotalCommits',
      startEndEvents: {
        start: 'All active human contributor edges (p:PERSON)-[:CONTRIBUTED_TO]->(r:REPOSITORY).',
        end: 'Ranked cumulative commit coverage threshold calculation.'
      },
      included: [
        'Active verified human engineers with canonical identity linkage',
        'Co-authored commits credited via git trailers',
        'Compacted default-branch commit history'
      ],
      excluded: [
        'Automated bot accounts (CI bots, release scripts, Dependabot)',
        'Orphaned branch commits that never merged into main branch',
        'Scaffold / 0-commit repositories (strictly collapse to Bus Factor = 0, status empty)'
      ],
      whyExclusionMatters:
        'Counting bot commits or mass formatting scripts as contributors artificially inflates bus factor, masking dangerous single points of failure. Invariant 5 guarantees: Bus Factor == 0 if and only if contributors == 0.',
      groundedExample: {
        dataset: 'Live Verified Workspace (20 Repositories Audited)',
        sampleResult: 'Critical SPOF Repos: 6 (BF=1) · Healthy Repos: 11 (BF>=2) · Scaffold Repos: 3 (BF=0)',
        note: 'Audited and verified in scripts/verify_dashboard_invariants.ts'
      }
    },
    {
      id: 'repo_ownership_percent',
      name: 'Repository Ownership Percentage',
      identifier: 'repo_ownership_percent',
      headlineAggregation: 'Time-Decayed Ratio',
      defaultUnit: 'Percentage (0.0% – 100.0%)',
      shortDescription:
        'The relative share of operational and institutional knowledge an engineer holds over a specific repository, weighted by contribution recency.',
      formula: 'Ownership(P, R) = Σ w(c) / Σ w(c\') where w(c) = exp(-ln(2) * Δt / 180 days)',
      startEndEvents: {
        start: 'All commit timestamps for engineer P on repository R.',
        end: 'Recency decay weighting relative to current calculation timestamp.'
      },
      included: [
        'Four age horizons: Last 30d (weight 1.0), 31-90d (0.7), 91-180d (0.4), >180d (0.15)',
        'Active repository contributions',
        'Normalized to 100.0% across all active contributors'
      ],
      excluded: [
        'Reverted branch commits',
        'Sole maintainer dilution from unrelated microservices in the organization',
        'Empty scaffold repositories (ownership collapses to None)'
      ],
      whyExclusionMatters:
        'An engineer who authored 500 commits 3 years ago does not possess active operational context over recent architecture changes. Time-decay weighting reflects current institutional reality rather than ancient git history.',
      groundedExample: {
        dataset: 'Authoritative repo_metrics Top Contributors Table',
        sampleResult: 'Primary Owner % range: 35.0% to 100.0% · Sum of Contributor % == 100% (±0.5%)',
        note: 'Guarantees Invariant 3: contributor percentages sum to 100% per active repo.'
      }
    },
    {
      id: 'knowledge_departure_risk',
      name: 'Knowledge Departure Risk Score',
      identifier: 'knowledge_departure_risk',
      headlineAggregation: '6-Factor Composite Model',
      defaultUnit: 'Percentage (0% – 100%)',
      shortDescription:
        'The organizational continuity blast-radius and vulnerability to system disruption if a specific engineer departs.',
      formula: 'Risk = (0.30 * Ownership) + (0.20 * Dependency) + (0.15 * Activity) + (0.15 * Docs) + (0.10 * Expertise) + (0.10 * Workload)',
      startEndEvents: {
        start: 'Graph traversal evaluating owned services, AST microservice dependencies, and activity.',
        end: 'Risk classification into Low (0-40%), Moderate (41-70%), or Critical (71-100%).'
      },
      included: [
        'Highest decayed code ownership across repositories (30%)',
        'Downstream microservice dependencies on owned services (20%)',
        'Contribution recency decay (15%)',
        'Ratio of undocumented microservices owned (15%)',
        'Sole-expert technologies with no internal backup (10%)',
        'Active unassigned issues and open in-flight PRs (10%)'
      ],
      excluded: [
        'Closed or resolved Jira tickets and merged PRs',
        'Bot accounts and automated service principals',
        'Subjective manager opinions or self-reported survey responses'
      ],
      whyExclusionMatters:
        'Prevents key-person vulnerabilities from remaining hidden until someone resigns. Because raw commit volume does not equal complexity, Cortex evaluates indirect architectural blast radius: dependencies, missing docs, and sole technology expertise.',
      groundedExample: {
        dataset: '11 Canonical Active Engineers (Verified Dataset)',
        sampleResult: 'Critical Risk: 2 engineers (Risk >= 75%) · Moderate: 4 · Low Continuity Risk: 5',
        note: 'Computed deterministically in packages/analytics/knowledge.risk.predict.ts'
      }
    },
    {
      id: 'successor_match_score',
      name: 'Successor Recommendation Match',
      identifier: 'successor_match_score',
      headlineAggregation: '4-Factor Weighted Ranking',
      defaultUnit: 'Percentage (0% – 100%)',
      shortDescription:
        'A deterministic ranking identifying the optimal internal engineer to succeed an outgoing primary maintainer on a specific codebase.',
      formula: 'Score = (0.40 * TechJaccard) + (0.30 * RepoOverlap) + (0.20 * Recency) + (0.10 * Capacity)',
      startEndEvents: {
        start: 'Candidate evaluation across technology footprint, shared repositories, and recency.',
        end: 'Workload penalty deduction and candidate ranking.'
      },
      included: [
        'Technology footprint Jaccard similarity: |T_target ∩ T_candidate| / |T_target ∪ T_candidate| (40%)',
        'Direct repository contribution overlap ratio (30%)',
        'Recent contribution recency factor within 30/60/90 days (20%)',
        'Workload capacity headroom: 1.0 - existingRisk - (spofCount * 0.15) (10%)'
      ],
      excluded: [
        'Departing engineer and their linked account aliases (cannot be own successor)',
        'Zero-Overlap candidates: 0% tech overlap AND 0% repo overlap are strictly disqualified',
        'Automated bot accounts and alumni engineers',
        'Repositories with <= 1 contributor (strictly return empty candidate list per Invariant 8)'
      ],
      whyExclusionMatters:
        'Prevents recommending candidates who have zero technical affinity with the repository or who are already overwhelmed by maintaining multiple single-point-of-failure codebases. Recommendations are grounded in actual past code contributions.',
      groundedExample: {
        dataset: 'Successor Service Simulation (Core Repositories)',
        sampleResult: 'Top Match Score: 82% (High Tech Jaccard + direct repo history) · Disqualified: 3 candidates',
        note: 'Executed in packages/analytics/successor.service.ts'
      }
    }
  ];

  const currentMetric = metrics.find(m => m.id === selectedMetricId) || metrics[0];

  return (
    <section id="metrics-defined" className="py-20 md:py-28 bg-[#0B0F14] relative border-t border-white/10 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#12181F] border border-white/10 text-slate-300 text-xs font-mono mb-4">
            <Scale className="w-3.5 h-3.5 text-blue-400" />
            <span>Canonical Metrics Ground-Truth</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
            Metrics, defined.
          </h2>

          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Public documentation of what every Cortex metric measures, exact mathematical formulas, and why noise exclusions matter. Most intelligence platforms never publish this.
          </p>
        </div>

        {/* Anti-Productivity Qualification Banner */}
        <div className="max-w-4xl mx-auto mb-12 p-4 rounded-xl bg-[#12181F] border border-white/10 flex items-start space-x-3 text-xs text-slate-300 font-sans">
          <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-white">Strict Anti-Productivity Ethics Notice: </span>
            Cortex metrics measure organizational knowledge distribution, architectural continuity, and single-point-of-failure vulnerabilities. They are explicitly not individual productivity rankings, performance quotas, or employee evaluation scores.
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex justify-center mb-10 overflow-x-auto pb-2">
          <div className="inline-flex p-1 rounded-xl bg-[#12181F] border border-white/10 max-w-full">
            {metrics.map((m) => {
              const isSelected = selectedMetricId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMetricId(m.id)}
                  className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Metric Deep-Dive Layout (Varying Rhythm: Two-Column Technical Matrix) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
          
          {/* Column A: Metric Specification & Mathematical Formula */}
          <div className="lg:col-span-6 bg-[#12181F] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {currentMetric.identifier}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Unit: {currentMetric.defaultUnit}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white font-sans">
                {currentMetric.name}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                {currentMetric.shortDescription}
              </p>
            </div>

            {/* Formula Block in Monospace Typography */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Documented Mathematical Formula
              </span>
              <div className="p-4 rounded-xl bg-[#080B0F] border border-white/10 font-mono text-xs text-blue-400 overflow-x-auto">
                <code>{currentMetric.formula}</code>
              </div>
            </div>

            {/* Headline Aggregation & Event Boundaries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-[#0E131A] border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Aggregation</span>
                <div className="font-mono text-white font-semibold">{currentMetric.headlineAggregation}</div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#0E131A] border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Primary Surface</span>
                <div className="font-mono text-slate-300">Dashboard · API · Reports</div>
              </div>
            </div>

            {/* Event Boundaries */}
            <div className="p-4 rounded-xl bg-[#0E131A] border border-white/5 space-y-2 text-xs">
              <div className="font-mono text-slate-400 text-[11px] font-semibold">Event Boundaries:</div>
              <div className="space-y-1 font-sans text-slate-300">
                <div><span className="font-mono text-blue-400">Start: </span>{currentMetric.startEndEvents.start}</div>
                <div><span className="font-mono text-blue-400">End: </span>{currentMetric.startEndEvents.end}</div>
              </div>
            </div>

            {/* Grounded Dataset Result */}
            <div className="p-4 rounded-xl bg-[#080B0F] border border-blue-500/20 space-y-1.5 text-xs">
              <div className="flex items-center space-x-2 font-mono text-blue-400 text-[11px]">
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Verified Reference Ground-Truth</span>
              </div>
              <div className="font-mono text-white text-xs">{currentMetric.groundedExample.sampleResult}</div>
              <div className="text-[11px] text-slate-400 font-sans">{currentMetric.groundedExample.note}</div>
            </div>

          </div>

          {/* Column B: Inclusions, Noise Exclusions, and Anti-Distortion Rationale */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Included Events Card */}
            <div className="bg-[#12181F] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 text-sm font-semibold text-white font-sans">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Explicitly Included</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 font-sans leading-relaxed">
                {currentMetric.included.map((item, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Excluded Noise & Distortions Card */}
            <div className="bg-[#12181F] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 text-sm font-semibold text-white font-sans">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Explicitly Excluded (Noise Filtering)</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300 font-sans leading-relaxed">
                {currentMetric.excluded.map((item, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-rose-400 font-bold shrink-0">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Why This Exclusion Matters (Differentiation Callout) */}
            <div className="bg-[#12181F] border border-blue-500/30 rounded-2xl p-6 space-y-2">
              <div className="text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
                Why This Exclusion Matters (Integrity &amp; Differentiation)
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {currentMetric.whyExclusionMatters}
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
