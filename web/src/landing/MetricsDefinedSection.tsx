import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  FileCode2, 
  Scale,
  BarChart3,
  Clock,
  ShieldAlert,
  UserCheck,
  TrendingDown,
  Info,
  Sliders,
  Sparkles
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

/* ── Interactive Visualizer 1: PR Review Cycle Time Distribution ── */
const PRCycleVisualizer: React.FC = () => {
  const [filterNoise, setFilterNoise] = useState(true);

  // Distribution bins: [hours bracket, count with filter, count without filter (with bots)]
  const bins = [
    { label: '< 2h', clean: 42, noisy: 120, pct: '38%' },
    { label: '2-4h', clean: 68, noisy: 72, pct: '52%' },
    { label: '4-8h', clean: 34, noisy: 40, pct: '30%' },
    { label: '8-24h', clean: 18, noisy: 22, pct: '16%' },
    { label: '24-48h', clean: 8, noisy: 15, pct: '8%' },
    { label: '> 48h (Outlier)', clean: 2, noisy: 85, pct: '4%' },
  ];

  return (
    <div className="p-5 rounded-xl bg-[#080B0F] border border-white/[0.06] space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-white">Interactive Distribution Histogram</span>
        </div>
        <div className="flex items-center space-x-1.5 p-1 rounded-lg bg-[#0D1117] border border-white/[0.06] text-[11px] font-mono">
          <button
            onClick={() => setFilterNoise(true)}
            className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
              filterNoise ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Noise Filtered (Cortex p50)
          </button>
          <button
            onClick={() => setFilterNoise(false)}
            className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
              !filterNoise ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Raw Distorted Mean
          </button>
        </div>
      </div>

      {/* Chart Bars */}
      <div className="space-y-2 pt-2">
        <div className="grid grid-cols-6 gap-2 h-28 items-end pb-1 border-b border-white/[0.06]">
          {bins.map((bin) => {
            const height = filterNoise ? (bin.clean / 70) * 100 : (bin.noisy / 120) * 100;
            const isP50 = bin.label === '2-4h';
            return (
              <div key={bin.label} className="flex flex-col items-center gap-1 h-full justify-end">
                <div 
                  className={`w-full rounded-t-sm transition-all duration-500 relative group cursor-pointer ${
                    isP50 && filterNoise 
                      ? 'bg-cyan-400 shadow-sm shadow-cyan-500/50' 
                      : filterNoise 
                        ? 'bg-indigo-500/70 hover:bg-indigo-400' 
                        : 'bg-rose-500/60 hover:bg-rose-400'
                  }`}
                  style={{ height: `${Math.min(height, 100)}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded text-[9px] font-mono text-white whitespace-nowrap z-10 transition-opacity">
                    {filterNoise ? bin.clean : bin.noisy} PRs
                  </div>
                </div>
                <span className="text-[9px] font-mono text-slate-400 truncate max-w-full">{bin.label}</span>
              </div>
            );
          })}
        </div>

        {/* Legend & Stat summary */}
        <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className={`w-2 h-2 rounded-full ${filterNoise ? 'bg-cyan-400' : 'bg-rose-400'}`} />
              <strong className="text-white">{filterNoise ? 'Median (p50): 4.0h' : 'Mean: 38.2h'}</strong>
            </span>
            <span className="text-slate-500 hidden sm:inline">·</span>
            <span className="hidden sm:inline">p90: 24.5h</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${filterNoise ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {filterNoise ? 'Bots & Drafts Excluded' : 'Distorted by 85 Bot PRs'}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ── Interactive Visualizer 2: PR Total Lead Time Breakdown ── */
const PRLeadTimeVisualizer: React.FC = () => {
  return (
    <div className="p-5 rounded-xl bg-[#080B0F] border border-white/[0.06] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-white">Full Lifecycle Phase Breakdown</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          Draft vs Review Latency
        </span>
      </div>

      {/* Visual Gantt Bar */}
      <div className="space-y-3">
        <div className="h-6 w-full rounded-md bg-[#0D1117] flex overflow-hidden p-0.5 border border-white/[0.06]">
          <div className="bg-slate-600 h-full rounded-l-sm transition-all flex items-center justify-center text-[9px] font-mono text-slate-300" style={{ width: '75%' }}>
            Draft Authoring (10.2d)
          </div>
          <div className="bg-cyan-500 h-full transition-all flex items-center justify-center text-[9px] font-mono text-white font-bold" style={{ width: '15%' }}>
            Review (4.8h)
          </div>
          <div className="bg-emerald-500 h-full rounded-r-sm transition-all flex items-center justify-center text-[9px] font-mono text-white font-bold" style={{ width: '10%' }}>
            CI (1.2h)
          </div>
        </div>

        {/* Phase stats */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-xs">
          <div className="p-2 rounded-lg bg-[#0A0E16] border border-white/[0.04]">
            <div className="text-[10px] text-slate-500">DRAFT PHASE</div>
            <div className="font-bold text-slate-300">10.2 Days</div>
            <div className="text-[9px] text-slate-500">Excluded from Cycle</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0A0E16] border border-cyan-500/30">
            <div className="text-[10px] text-cyan-400">ACTIVE REVIEW</div>
            <div className="font-bold text-white">4.8 Hours</div>
            <div className="text-[9px] text-cyan-400">True Bottleneck Metric</div>
          </div>
          <div className="p-2 rounded-lg bg-[#0A0E16] border border-white/[0.04]">
            <div className="text-[10px] text-slate-500">CI & MERGE</div>
            <div className="font-bold text-emerald-400">1.2 Hours</div>
            <div className="text-[9px] text-slate-500">Automated Runs</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Interactive Visualizer 3: Repository Bus Factor Cumulative Curve ── */
const BusFactorVisualizer: React.FC = () => {
  const [simulated, setSimulated] = useState(false);

  const contributors = simulated
    ? [
        { name: 'alice-zhang', pct: 40, color: '#10B981' },
        { name: 'devendra-s', pct: 32, color: '#3B82F6' },
        { name: 'priya-sharma', pct: 18, color: '#8B5CF6' },
        { name: 'vikram-p', pct: 10, color: '#64748B' },
      ]
    : [
        { name: 'devendra-s', pct: 84, color: '#EF4444' },
        { name: 'rohan-verma', pct: 11, color: '#64748B' },
        { name: 'priya-sharma', pct: 5, color: '#475569' },
      ];

  return (
    <div className="p-5 rounded-xl bg-[#080B0F] border border-white/[0.06] space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-white">Cumulative Commit Dispersion</span>
        </div>
        <button
          onClick={() => setSimulated(!simulated)}
          className="px-2.5 py-1 rounded bg-[#0D1117] hover:bg-[#161D26] border border-white/10 text-[11px] font-mono text-cyan-300 flex items-center space-x-1.5 cursor-pointer transition-all"
        >
          <Sliders className="w-3 h-3 text-cyan-400" />
          <span>{simulated ? 'Reset to Current SPOF' : 'Simulate Review Rebalancing'}</span>
        </button>
      </div>

      {/* Cumulative Stacked Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>Commit Volume Coverage</span>
          <span className={simulated ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {simulated ? 'Bus Factor: 2 (Healthy)' : 'Bus Factor: 1 (Critical SPOF)'}
          </span>
        </div>

        <div className="h-6 w-full rounded-md bg-[#0D1117] flex overflow-hidden p-0.5 border border-white/[0.06]">
          {contributors.map((c) => (
            <div 
              key={c.name}
              className="h-full transition-all duration-500 relative group flex items-center justify-center text-[9px] font-mono text-white font-bold"
              style={{ width: `${c.pct}%`, backgroundColor: c.color }}
            >
              <span className="truncate px-1">{c.name.split('-')[0]} {c.pct}%</span>
            </div>
          ))}
        </div>

        {/* Invariant status explanation */}
        <div className="p-3 rounded-lg bg-[#0A0E16] border border-white/[0.04] text-[11px] font-mono text-slate-300 flex items-center justify-between">
          <span>Threshold: 50% commit coverage</span>
          <span className="text-cyan-400">
            {simulated ? '2 engineers needed for >=50%' : '1 engineer holds 84% alone (>50%)'}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ── Interactive Visualizer 4: 6-Factor Knowledge Departure Risk ── */
const DepartureRiskVisualizer: React.FC = () => {
  const factors = [
    { name: 'Ownership Score (180d Decayed)', weight: 30, score: 84, weighted: 25.2, color: 'bg-rose-500' },
    { name: 'Microservice Downstream Deps', weight: 20, score: 75, weighted: 15.0, color: 'bg-amber-500' },
    { name: 'Contribution Recency Decay', weight: 15, score: 90, weighted: 13.5, color: 'bg-indigo-500' },
    { name: 'Undocumented Modules Ratio', weight: 15, score: 80, weighted: 12.0, color: 'bg-purple-500' },
    { name: 'Exclusive Tech Footprint', weight: 10, score: 85, weighted: 8.5, color: 'bg-cyan-500' },
    { name: 'In-Flight PRs & Open Workload', weight: 10, score: 70, weighted: 7.0, color: 'bg-emerald-500' },
  ];

  const total = factors.reduce((sum, f) => sum + f.weighted, 0).toFixed(1);

  return (
    <div className="p-5 rounded-xl bg-[#080B0F] border border-white/[0.06] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingDown className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-mono font-semibold text-white">6-Factor Deterministic Risk Weighting</span>
        </div>
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs font-bold">
          <span>Composite Risk: {total} / 100</span>
        </div>
      </div>

      {/* Factor Bars */}
      <div className="space-y-2.5">
        {factors.map((f) => (
          <div key={f.name} className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-300 truncate">{f.name}</span>
              <span className="text-slate-400 text-[10px] shrink-0">
                {f.weight}% wt · score {f.score}% = <strong className="text-white">{f.weighted} pts</strong>
              </span>
            </div>
            <div className="h-2 w-full bg-[#0D1117] rounded-full overflow-hidden">
              <div className={`h-full ${f.color} rounded-full transition-all duration-500`} style={{ width: `${f.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Interactive Visualizer 5: 4-Factor Successor Recommendation ── */
const SuccessorVisualizer: React.FC = () => {
  const candidates = [
    { 
      name: 'Vikram Patel', 
      title: 'Senior Backend Engineer', 
      total: 82, 
      badge: 'Top Match (82%)', 
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      jaccard: '0.78 (TypeScript, Neo4j, Redis)', 
      repoOverlap: '100% (payment-gateway)', 
      recency: '90d active', 
      headroom: 'Healthy (0 SPOFs maintained)' 
    },
    { 
      name: 'Sarah Jenkins', 
      title: 'Staff Platform Engineer', 
      total: 64, 
      badge: 'Secondary (64%)', 
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      jaccard: '0.62 (Go, TypeScript)', 
      repoOverlap: '50% (PR reviews only)', 
      recency: '30d active', 
      headroom: 'Moderate (Maintains 1 SPOF)' 
    },
  ];

  return (
    <div className="p-5 rounded-xl bg-[#080B0F] border border-white/[0.06] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserCheck className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-white">4-Factor Successor Candidate Comparison</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Ranked Candidates
        </span>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {candidates.map((c) => (
          <div key={c.name} className="p-3.5 rounded-lg bg-[#0D1117] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-bold">{c.name}</span>
                <span className="text-slate-400 text-[10px] ml-2 font-sans">{c.title}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] border ${c.badgeClass}`}>
                {c.badge}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px] text-slate-400">
              <div className="bg-[#0A0E16] p-2 rounded">
                <div className="text-slate-500">TECH JACCARD (40%)</div>
                <div className="text-slate-200 font-bold">{c.jaccard.split(' ')[0]}</div>
              </div>
              <div className="bg-[#0A0E16] p-2 rounded">
                <div className="text-slate-500">REPO OVERLAP (30%)</div>
                <div className="text-slate-200 font-bold">{c.repoOverlap.split(' ')[0]}</div>
              </div>
              <div className="bg-[#0A0E16] p-2 rounded">
                <div className="text-slate-500">RECENCY (20%)</div>
                <div className="text-slate-200 font-bold">{c.recency}</div>
              </div>
              <div className="bg-[#0A0E16] p-2 rounded">
                <div className="text-slate-500">HEADROOM (10%)</div>
                <div className="text-emerald-400 font-bold">{c.headroom.split(' ')[0]}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
        'Multi-author co-authored pull requests credited via git trailers'
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
        dataset: 'Notification Worker Service (180-day window)',
        sampleResult: 'Bus Factor: 1 (Rohan Verma accounts for 100% commits) · Status: Fragile SPOF',
        note: 'Audited in packages/analytics/knowledge.service.ts'
      }
    },
    {
      id: 'departure_risk_score',
      name: '6-Factor Departure Risk Score',
      identifier: 'departure_risk_score',
      headlineAggregation: 'Bounded Score (0.0 to 1.0)',
      defaultUnit: 'Index (0-100)',
      shortDescription:
        'Holistic departure blast-radius evaluating the organizational and architectural impact if a specific engineer resigns.',
      formula: 'Risk = 0.30*Own + 0.20*Dep + 0.15*Act + 0.15*Docs + 0.10*Tech + 0.10*Work',
      startEndEvents: {
        start: 'Extraction of target person’s ownership graph and downstream service dependencies.',
        end: 'Normalized linear weighting across 6 distinct architectural risk vectors.'
      },
      included: [
        'Time-decayed code ownership with 180-day exponential half-life',
        'Downstream service dependency blast radius from Neo4j AST graph',
        'Recency factor based on active contributions in 30d/60d/90d windows',
        'Ratio of undocumented microservices touched by author'
      ],
      excluded: [
        'Subjective manager performance reviews or sentiment analysis',
        'Employee tenure length or job title seniority biases',
        'Off-hours active time or Slack activity telemetry'
      ],
      whyExclusionMatters:
        'Assessing departure impact via tenure or vanity commit counts fails to reflect current system dependencies. Cortex isolates actual production risk: if an engineer owning undocumented PCI-DSS payment tokenization leaves, the blast radius is severe regardless of tenure.',
      groundedExample: {
        dataset: 'Payment Gateway v2 (Devendra Singh)',
        sampleResult: 'Departure Risk Score: 81.2 (High) · Top Driver: 84% Decayed Ownership + 3 Downstream Services',
        note: 'Calculated in packages/analytics/knowledge.risk.predict.ts'
      }
    },
    {
      id: 'successor_recommendation',
      name: '4-Factor Successor Recommendation',
      identifier: 'successor_recommendation',
      headlineAggregation: 'Multi-Criteria Ranked Match',
      defaultUnit: 'Match Score (0-100%)',
      shortDescription:
        'Deterministic candidate ranking to identify the best engineers to absorb ownership when a primary maintainer departs.',
      formula: 'MatchScore = 0.40*TechJaccard + 0.30*RepoOverlap + 0.20*Recency + 0.10*Capacity',
      startEndEvents: {
        start: 'Target engineer technology footprint and repository contribution history.',
        end: 'Candidate scoring across active engineers, penalizing peers already maintaining SPOF services.'
      },
      included: [
        'Jaccard similarity coefficient across languages and frameworks: |T_target ∩ T_cand| / |T_target ∪ T_cand|',
        'Direct past contribution overlap in the target repository',
        'Workload capacity headroom to prevent burning out overloaded staff engineers'
      ],
      excluded: [
        'Alumni, departed engineers, and inactive accounts',
        'Automated CI/CD service accounts and bot identities',
        'Overloaded engineers maintaining existing SPOF modules (penalized in capacity)'
      ],
      whyExclusionMatters:
        'Assigning successors purely by organizational proximity results in dumping fragile code onto already burnt-out engineers. Cortex objectively matches technical skill overlap while checking capacity headroom.',
      groundedExample: {
        dataset: 'Successor Service Simulation (Core Repositories)',
        sampleResult: 'Top Match Score: 82% (High Tech Jaccard + direct repo history) · Disqualified: 3 candidates',
        note: 'Executed in packages/analytics/successor.service.ts'
      }
    }
  ];

  const currentMetric = metrics.find(m => m.id === selectedMetricId) || metrics[0];

  return (
    <section id="metrics-defined" className="py-12 md:py-16 bg-[#06090F] relative antialiased">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono mb-5">
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
            <span>Canonical Metrics Ground-Truth</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight font-sans">
            Metrics, <span className="gradient-text">defined with mathematical clarity.</span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Public documentation of exact mathematical formulas, interactive visualizations, and why noise exclusions protect engineering organizations from distorted conclusions.
          </p>
        </div>

        {/* Anti-Productivity Qualification Banner */}
        <div className="max-w-4xl mx-auto mb-10 p-4 rounded-xl bg-[#0D1117] border border-white/[0.06] flex items-start space-x-3 text-xs text-slate-300 font-sans shadow-sm">
          <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-white">Strict Anti-Productivity Ethics Invariant: </span>
            Cortex metrics measure organizational knowledge distribution, architectural continuity, and single-point-of-failure vulnerabilities. They are strictly not employee surveillance scores, individual rankings, or performance quotas.
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex justify-center mb-10 overflow-x-auto pb-2">
          <div className="inline-flex p-1.5 rounded-xl bg-[#0D1117] border border-white/[0.06] max-w-full gap-1">
            {metrics.map((m) => {
              const isSelected = selectedMetricId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMetricId(m.id)}
                  className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-mono transition-all whitespace-nowrap cursor-pointer flex items-center space-x-2 ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <span>{m.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Metric Deep-Dive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
          
          {/* Column A: Metric Specification, Interactive Visualizer & Mathematical Formula */}
          <div className="lg:col-span-7 bg-[#0D1117] border border-white/[0.06] rounded-2xl p-6 sm:p-8 space-y-6">
            
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {currentMetric.identifier}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Unit: <span className="text-slate-200">{currentMetric.defaultUnit}</span>
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white font-sans">
                {currentMetric.name}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                {currentMetric.shortDescription}
              </p>
            </div>

            {/* DYNAMIC INTERACTIVE VISUALIZER FOR SELECTED METRIC */}
            <div>
              {selectedMetricId === 'pr_review_cycle_time' && <PRCycleVisualizer />}
              {selectedMetricId === 'pr_total_lead_time' && <PRLeadTimeVisualizer />}
              {selectedMetricId === 'repo_bus_factor' && <BusFactorVisualizer />}
              {selectedMetricId === 'departure_risk_score' && <DepartureRiskVisualizer />}
              {selectedMetricId === 'successor_recommendation' && <SuccessorVisualizer />}
            </div>

            {/* Formula Block in Monospace Typography */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Audited Mathematical Algorithm</span>
              </span>
              <div className="p-4 rounded-xl bg-[#080B0F] border border-white/[0.06] font-mono text-xs text-cyan-300 overflow-x-auto">
                <code>{currentMetric.formula}</code>
              </div>
            </div>

            {/* Headline Aggregation & Event Boundaries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-[#0A0E16] border border-white/[0.04] space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Aggregation Metric</span>
                <div className="font-mono text-white font-semibold">{currentMetric.headlineAggregation}</div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#0A0E16] border border-white/[0.04] space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Target Surface</span>
                <div className="font-mono text-slate-300">Dashboard · Cypher API · Grounded Chat</div>
              </div>
            </div>

            {/* Event Boundaries */}
            <div className="p-4 rounded-xl bg-[#0A0E16] border border-white/[0.04] space-y-2 text-xs">
              <div className="font-mono text-slate-400 text-[11px] font-semibold">Lifecycle Event Boundaries:</div>
              <div className="space-y-1 font-sans text-slate-300">
                <div><span className="font-mono text-cyan-400">Start Trigger: </span>{currentMetric.startEndEvents.start}</div>
                <div><span className="font-mono text-cyan-400">Terminal State: </span>{currentMetric.startEndEvents.end}</div>
              </div>
            </div>

            {/* Grounded Dataset Result */}
            <div className="p-4 rounded-xl bg-[#080B0F] border border-cyan-500/20 space-y-1.5 text-xs">
              <div className="flex items-center space-x-2 font-mono text-cyan-400 text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Reference Ground-Truth</span>
              </div>
              <div className="font-mono text-white text-xs">{currentMetric.groundedExample.sampleResult}</div>
              <div className="text-[11px] text-slate-400 font-sans">{currentMetric.groundedExample.note}</div>
            </div>

          </div>

          {/* Column B: Inclusions, Noise Exclusions, and Anti-Distortion Rationale */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Included Events Card */}
            <div className="bg-[#0D1117] border border-white/[0.06] rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 text-sm font-semibold text-white font-sans">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Explicitly Included in Calculation</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 font-sans leading-relaxed">
                {currentMetric.included.map((item, i) => (
                  <li key={i} className="flex items-start space-x-2.5">
                    <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Excluded Noise & Distortions Card */}
            <div className="bg-[#0D1117] border border-white/[0.06] rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 text-sm font-semibold text-white font-sans">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Explicitly Excluded (Noise Filtering)</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-300 font-sans leading-relaxed">
                {currentMetric.excluded.map((item, i) => (
                  <li key={i} className="flex items-start space-x-2.5">
                    <span className="text-rose-400 font-bold shrink-0 mt-0.5">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Why Exclusion Matters (Anti-Distortion Rationale) */}
            <div className="bg-[#0D1117] border border-cyan-500/20 rounded-2xl p-6 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
                <Info className="w-3.5 h-3.5" />
                <span>Anti-Distortion Rationale</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {currentMetric.whyExclusionMatters}
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
