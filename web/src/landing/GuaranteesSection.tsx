import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertOctagon, 
  Check, 
  Terminal, 
  Activity
} from 'lucide-react';

export const GuaranteesSection: React.FC = () => {
  const [activeView, setActiveView] = useState<'all' | 'guarantees' | 'boundaries'>('all');

  const guarantees = [
    {
      id: 'inv-01',
      title: 'Zero Generative Guesswork',
      category: 'Mathematical Determinism',
      assertion: "assert(typeof busFactor === 'number' && llmCalculations === 0);",
      badge: 'PASS · DETERMINISTIC_MATH',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      description:
        'Every risk score, bus factor, ownership decay percentage, and successor ranking is calculated by deterministic TypeScript algorithms running directly on your PostgreSQL telemetry and Neo4j graph. Zero LLM involvement in any numerical calculation.'
    },
    {
      id: 'inv-02',
      title: 'Single Canonical Source of Truth',
      category: 'Parity Guarantee',
      assertion: "assert(queryEngine.dashboard === queryEngine.api && queryEngine.agent);",
      badge: 'PASS · 100% PARITY',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      description:
        'The executive dashboard, natural-language chat agent, API endpoints, and scheduled reports query the identical analytical functions in packages/analytics/. UI tooltips, internal documentation, and public definitions never disagree.'
    },
    {
      id: 'inv-03',
      title: 'Honest Non-Parametric Distributions',
      category: 'Statistical Integrity',
      assertion: "assert(metric.type === 'median_p50' && outliers.isSegregated);",
      badge: 'PASS · OUTLIERS_SEGREGATED',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      description:
        'Metrics are presented as medians (p50), 90th percentiles (p90), and interquartile ranges (IQR) rather than distorted scalar averages. Dormant outliers (>30 days) and automated bot accounts are segregated rather than silently buried.'
    },
    {
      id: 'inv-04',
      title: 'Self-Healing Invariant Parity',
      category: 'Database Invariant',
      assertion: "assert(repo.commits === 0 ? repo.busFactor === 0 : repo.busFactor <= repo.contributors);",
      badge: 'PASS · INVARIANT_GUARD_ACTIVE',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      description:
        'Post-recalculation invariant guards automatically enforce cross-table mathematical parity. A repository with 0 commits strictly collapses to 0 contributors, null primary owner, and bus factor 0. Active repository bus factors never exceed total contributor counts.'
    },
    {
      id: 'inv-05',
      title: 'Strict Anti-Productivity Ethics',
      category: 'Ethics & Privacy',
      assertion: "assert(system.keystrokeLogging === false && system.rankings === null);",
      badge: 'PASS · ZERO_SURVEILLANCE',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      description:
        'Metrics are strictly engineering continuity and knowledge blast-radius indicators. Cortex contains zero employee keystroke monitoring, individual ranking leaderboards, or productivity quotas.'
    }
  ];

  const nonGuarantees = [
    {
      id: 'bound-01',
      title: 'External Offline & Hallway Discussions',
      scopeTag: 'OUT OF SCOPE BY DESIGN',
      companionTool: 'Engineering RFCs & Architecture Decision Records (ADRs)',
      description:
        'Cortex cannot capture hallway conversations, whiteboarding sessions, unrecorded telephone calls, or discussions conducted in private repositories without webhook integration.'
    },
    {
      id: 'bound-02',
      title: 'Syntactic Code Quality & Static Analysis',
      scopeTag: 'OUT OF SCOPE BY DESIGN',
      companionTool: 'Pair with SonarQube, Semgrep, or ESLint',
      description:
        'Metric calculations measure organizational knowledge distribution, not syntax correctness, unit test coverage, or runtime efficiency. For code syntax and vulnerabilities, pair Cortex with static analyzers (SAST/linter).'
    },
    {
      id: 'bound-03',
      title: 'Resignation Intent or Attrition Timelines',
      scopeTag: 'OUT OF SCOPE BY DESIGN',
      companionTool: '1-on-1 Engineering Manager Check-ins & Culture Surveys',
      description:
        'Cortex evaluates the architectural blast-radius and system vulnerability if an engineer departs. It does not predict human career decisions, job satisfaction, or personal resignation timelines.'
    },
    {
      id: 'bound-04',
      title: 'Automated Wiki Replacement',
      scopeTag: 'OUT OF SCOPE BY DESIGN',
      companionTool: 'Living AST Graph + Grounded Semantic Citations',
      description:
        'Cortex surfaces exactly which microservices lack documentation and exposes real commit history. It does not hallucinate unverified architectural documentation or replace human architectural review.'
    }
  ];

  return (
    <section id="guarantees" className="py-12 md:py-16 bg-[#06090F] relative antialiased">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono mb-5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audited Engineering Boundaries</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight font-sans">
            System invariants &amp; <span className="gradient-text">capability boundaries.</span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Honest capability boundaries pulled directly from our engineering audit. We document what the platform mathematically proves, and where human context remains essential.
          </p>
        </div>

        {/* Runtime Invariant Console Banner */}
        <div className="max-w-5xl mx-auto mb-10 p-4 rounded-xl bg-[#0D1117] border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-white">Runtime Invariant Audit Status:</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  13/13 INVARIANTS PASSING
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Self-healing mathematical integrity guard runs automatically on every ingestion batch.
              </p>
            </div>
          </div>

          {/* View Filter Switcher */}
          <div className="inline-flex p-1 rounded-lg bg-[#0A0E16] border border-white/[0.06] text-xs font-mono shrink-0">
            <button
              onClick={() => setActiveView('all')}
              className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                activeView === 'all'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All (9)
            </button>
            <button
              onClick={() => setActiveView('guarantees')}
              className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                activeView === 'guarantees'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Guaranteed (5)
            </button>
            <button
              onClick={() => setActiveView('boundaries')}
              className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                activeView === 'boundaries'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Boundaries (4)
            </button>
          </div>
        </div>

        {/* Dynamic Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
          
          {/* Column 1: What Cortex Guarantees (Invariant Proofs) */}
          {(activeView === 'all' || activeView === 'guarantees') && (
            <div className={`${activeView === 'guarantees' ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-4`}>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">
                      What Cortex Guarantees
                    </h3>
                    <span className="text-[11px] font-mono text-emerald-400">Deterministic Mathematical Proofs</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500">5 Verified Invariants</span>
              </div>

              <div className="space-y-3.5">
                {guarantees.map((item) => (
                  <div 
                    key={item.id}
                    className="p-5 rounded-xl bg-[#0D1117] border border-white/[0.06] hover:border-emerald-500/30 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block mb-1">
                          {item.category}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-white font-sans">
                          {item.title}
                        </h4>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {item.description}
                    </p>

                    {/* Verifiable Code Assertion Snippet */}
                    <div className="p-2.5 rounded-lg bg-[#080B0F] border border-white/[0.04] font-mono text-[11px] text-emerald-400/90 overflow-x-auto flex items-center space-x-2">
                      <Terminal className="w-3 h-3 text-emerald-400 shrink-0" />
                      <code>{item.assertion}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Column 2: What Cortex Does NOT Guarantee (Operational Boundaries) */}
          {(activeView === 'all' || activeView === 'boundaries') && (
            <div className={`${activeView === 'boundaries' ? 'lg:col-span-12' : 'lg:col-span-5'} space-y-4`}>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">
                      Operational Boundaries
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">Explicit Product Scoping</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500">4 Scoped Boundaries</span>
              </div>

              <div className="space-y-3.5">
                {nonGuarantees.map((item) => (
                  <div 
                    key={item.id}
                    className="p-5 rounded-xl bg-[#0D1117] border border-white/[0.06] hover:border-amber-500/20 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <h4 className="text-sm sm:text-base font-semibold text-slate-200 font-sans">
                        {item.title}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {item.scopeTag}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {item.description}
                    </p>

                    {/* Recommended Companion Solution */}
                    <div className="p-2.5 rounded-lg bg-[#0A0E16] border border-white/[0.04] space-y-1">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">Recommended Companion:</div>
                      <div className="text-xs font-mono text-slate-300 font-medium">{item.companionTool}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
