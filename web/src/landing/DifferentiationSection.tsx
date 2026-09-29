import React, { useState } from 'react';
import { 
  Check, 
  X, 
  ShieldCheck, 
  Calculator,
  Layers,
  Sparkles
} from 'lucide-react';

export const DifferentiationSection: React.FC = () => {
  const [selectedPrompt, setSelectedPrompt] = useState<'departure' | 'spof' | 'decision'>('departure');
  const [filterCategory, setFilterCategory] = useState<'all' | 'security' | 'accuracy' | 'continuity'>('all');

  const interactivePrompts = {
    departure: {
      question: 'What is the organizational departure risk if Priya Sharma resigns?',
      genericResponse:
        'Priya Sharma appears to be a senior engineer who has contributed to many repositories. Losing her might cause some delays in sprint delivery and require other team members to take on extra tickets.',
      genericFlaws: [
        'Zero quantified risk index',
        'Cannot compute microservice dependency blast-radius',
        'No concrete successor recommendation'
      ],
      cortexResponse: {
        headline: 'Critical Departure Risk: 81.2 / 100 · 1 Fragile SPOF Module Identified',
        metrics: [
          { label: 'Primary Ownership', value: 'billing-service (80% commits)' },
          { label: 'Bus Factor Impact', value: 'BF drops 1 -> 0 (Orphaned Service)' },
          { label: 'Recommended Successor', value: 'Vikram Patel (82% Match Score)' },
          { label: 'Unreviewed Files', value: '14 files require knowledge handover' },
        ],
        citations: 'Backed by 412 commits, PR #84 (Stripe idempotency), and Neo4j dependency traversal.'
      }
    },
    spof: {
      question: 'Which microservices in our platform represent single points of failure (SPOF)?',
      genericResponse:
        'Single points of failure usually include critical databases, authentication services, or any component without a redundant replica. We recommend setting up automated backups and load balancers.',
      genericFlaws: [
        'Confuses infrastructure HA with human code ownership SPOFs',
        'Cannot inspect commit graphs or author dispersion',
        'Hallucinates generic DevOps advice'
      ],
      cortexResponse: {
        headline: 'Deterministic Audit: 2 Services at Critical Bus Factor 1',
        metrics: [
          { label: 'notification-worker', value: 'Bus Factor 1 (Rohan Verma: 100%)' },
          { label: 'payment-gateway-v2', value: 'Bus Factor 1 (Devendra Singh: 84%)' },
          { label: 'auth-service', value: 'Bus Factor 3 (Healthy Distribution)' },
          { label: 'Core Action', value: 'Schedule pairing sessions for SMS queue' },
        ],
        citations: 'Audited across 1,420 commits and 180-day decayed ownership formulas.'
      }
    },
    decision: {
      question: 'Why was Valkey chosen to replace Redis in platform-gateway?',
      genericResponse:
        'Valkey is a popular open-source alternative to Redis that was created after Redis changed its licensing model in 2024. Teams often switch to maintain open-source compliance.',
      genericFlaws: [
        'Generic Wikipedia knowledge',
        'Cannot cite your team’s private PR discussion or benchmark commit',
        'Guesses reasoning rather than referencing actual internal RFC'
      ],
      cortexResponse: {
        headline: 'Grounded Architectural Decision Record with Verifiable Git Citations',
        metrics: [
          { label: 'Commit SHA', value: '8f3b12a (PR #89 by @alice-dev)' },
          { label: 'Merged Date', value: 'March 14, 2025 by @vikrampatel' },
          { label: 'Discussion Thread', value: '#eng-backend Slack (Thread ts: 1710403200)' },
          { label: 'Verification Status', value: '100% Grounded (Zero Speculation)' },
        ],
        citations: 'Cited from internal git commit history and private Slack engineering channel archives.'
      }
    }
  };

  const comparisonItems = [
    {
      dimension: 'Data Privacy & Hosting Perimeter',
      category: 'security',
      cortex: 'Self-hosted inside customer VPC (Docker, AWS ECS, EKS). Zero proprietary code or tokens ever leave your perimeter.',
      genericLlm: 'Third-party cloud SaaS. Code snippets, prompts, and tokens transmitted over public internet.',
      doraTools: 'SaaS-only vendors. Requires storing commit metadata and employee activity on vendor databases.',
    },
    {
      dimension: 'Bus Factor & Risk Computation',
      category: 'accuracy',
      cortex: 'Pure TypeScript deterministic math (author dispersion, 6-factor risk, 4-factor Jaccard). Auditable and repeatable.',
      genericLlm: 'Hallucinates mathematical scores. LLMs cannot compute graph centrality or dispersion deterministically.',
      doraTools: 'Measures PR cycle times and velocity; lacks knowledge graph or successor continuity modeling.',
    },
    {
      dimension: 'Developer Identity Resolution',
      category: 'continuity',
      cortex: 'Automated canonical merging matching GitHub logins, Slack IDs, and Git commit emails into single Person entities.',
      genericLlm: 'Treats disparate tool handles as unrelated strangers with zero persistent memory across sessions.',
      doraTools: 'Basic email matching for commit velocity; lacks cross-tool communication graph context.',
    },
    {
      dimension: 'Answer Grounding & Citations',
      category: 'accuracy',
      cortex: 'Every query response is backed by exact Git commit SHAs, Jira issue keys, and Slack channel thread links.',
      genericLlm: 'Generates plausible-sounding explanations without verifiable source links or audited commit hashes.',
      doraTools: 'No natural language codebase search; limited to static dashboards and chart filters.',
    },
    {
      dimension: 'Silent Departure Impact Modeling',
      category: 'continuity',
      cortex: 'Simulates who can absorb orphaned microservices before an engineer gives notice, checking capacity headroom.',
      genericLlm: 'Has no access to team workload or repository contribution histories.',
      doraTools: 'Surfaces retrospective velocity; cannot simulate organizational blast radius or successor matches.',
    },
    {
      dimension: 'Anti-Productivity Ethics Invariants',
      category: 'security',
      cortex: 'Strict anti-surveillance invariant: 0 keystroke monitoring, 0 individual rankings, 0 employee scorecards.',
      genericLlm: 'No built-in guardrails; can generate harmful employee comparisons if prompted.',
      doraTools: 'Often misapplied as individual developer speed leaderboards, degrading engineering morale.',
    },
  ];

  const currentDiff = interactivePrompts[selectedPrompt];

  const filteredItems = filterCategory === 'all'
    ? comparisonItems
    : comparisonItems.filter(item => item.category === filterCategory);

  return (
    <section id="differentiation" className="py-12 md:py-16 bg-[#06090F] relative antialiased">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono mb-5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Architectural Differentiation</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight font-sans">
            Deterministic graph math. <span className="gradient-text">Not AI speculation.</span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Why engineering leaders choose a private, deterministic knowledge graph over generic LLM wrappers and surface-level DORA dashboards.
          </p>
        </div>

        {/* 3 High-Level Architectural Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-10">
          
          {/* Card 1: Cortex (Emphasized) */}
          <div className="p-6 rounded-2xl bg-[#0D1117] border border-blue-500/40 relative shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-blue-500/30">
                PROPRIETARY GRAPH ENGINE
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white font-sans">
                Cortex Platform
              </h3>
              <span className="text-xs font-mono text-indigo-400">Living Property Graph + Math</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300 font-sans">
              <li className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Runs 100% inside your VPC perimeter (Zero code egress)</span>
              </li>
              <li className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Deterministic Cypher math for Bus Factor &amp; Departure Risk</span>
              </li>
              <li className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Verifiable evidence chains with exact commit SHAs &amp; PRs</span>
              </li>
              <li className="flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Cross-tool canonical identity resolution (Git, Slack, Jira)</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Generic LLM Wrappers */}
          <div className="p-6 rounded-2xl bg-[#0A0E16] border border-white/[0.06] space-y-4 opacity-90">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                STOCHASTIC PROMPT WRAPPERS
              </span>
              <X className="w-4 h-4 text-rose-400" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-200 font-sans">
                Generic LLMs &amp; AI Bots
              </h3>
              <span className="text-xs font-mono text-slate-500">Stateless Cloud Prompts</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-400 font-sans">
              <li className="flex items-start space-x-2">
                <X className="w-4 h-4 text-rose-500/70 shrink-0 mt-0.5" />
                <span>Transmits proprietary code tokens to multi-tenant cloud</span>
              </li>
              <li className="flex items-start space-x-2">
                <X className="w-4 h-4 text-rose-500/70 shrink-0 mt-0.5" />
                <span>Hallucinates mathematical scores; no graph centrality</span>
              </li>
              <li className="flex items-start space-x-2">
                <X className="w-4 h-4 text-rose-500/70 shrink-0 mt-0.5" />
                <span>Fabricates plausible answers with zero verifiable SHAs</span>
              </li>
              <li className="flex items-start space-x-2">
                <X className="w-4 h-4 text-rose-500/70 shrink-0 mt-0.5" />
                <span>Zero identity mapping; treats aliases as strangers</span>
              </li>
            </ul>
          </div>

          {/* Card 3: Standard DORA Velocity Metrics */}
          <div className="p-6 rounded-2xl bg-[#0A0E16] border border-white/[0.06] space-y-4 opacity-90">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
                SURFACE VELOCITY TOOLS
              </span>
              <Layers className="w-4 h-4 text-slate-500" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-200 font-sans">
                Standard DORA Dashboards
              </h3>
              <span className="text-xs font-mono text-slate-500">Surface PR Timestamps</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-400 font-sans">
              <li className="flex items-start space-x-2">
                <X className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>SaaS vendor storage; requires employee activity egress</span>
              </li>
              <li className="flex items-start space-x-2">
                <X className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>Measures velocity without tracking knowledge continuity</span>
              </li>
              <li className="flex items-start space-x-2">
                <X className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>Blind to bus factors; misses critical single points of failure</span>
              </li>
              <li className="flex items-start space-x-2">
                <X className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>Often weaponized as individual developer speed metrics</span>
              </li>
            </ul>
          </div>

        </div>

        {/* INTERACTIVE REALITY CHECK: SIDE-BY-SIDE PROMPT OUTPUT DIFF */}
        <div className="max-w-5xl mx-auto mb-10 p-6 sm:p-8 rounded-2xl bg-[#0D1117] border border-white/[0.06] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base sm:text-lg font-bold text-white font-sans">
                  Interactive Output Comparison: Real Query Audit
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Select an engineering scenario to contrast generic AI speculation against Cortex’s grounded graph evidence.
              </p>
            </div>

            {/* Prompt Selector Pills */}
            <div className="inline-flex p-1 rounded-lg bg-[#0A0E16] border border-white/[0.06] text-xs font-mono overflow-x-auto">
              <button
                onClick={() => setSelectedPrompt('departure')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                  selectedPrompt === 'departure' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Departure Risk
              </button>
              <button
                onClick={() => setSelectedPrompt('spof')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                  selectedPrompt === 'spof' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                2. SPOF Audit
              </button>
              <button
                onClick={() => setSelectedPrompt('decision')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                  selectedPrompt === 'decision' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                3. Architecture RFC
              </button>
            </div>
          </div>

          {/* Target Query Display */}
          <div className="p-3.5 rounded-xl bg-[#080B0F] border border-white/[0.04] flex items-center space-x-2 text-xs font-mono text-indigo-300">
            <span className="text-slate-500 uppercase text-[10px]">User Query:</span>
            <span>"{currentDiff.question}"</span>
          </div>

          {/* Comparison Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Generic LLM Panel */}
            <div className="p-5 rounded-xl bg-[#0A0E16] border border-rose-500/20 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-rose-400 font-bold flex items-center space-x-1.5">
                    <X className="w-3.5 h-3.5" />
                    <span>Generic Cloud LLM Output</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Unverifiable</span>
                </div>

                <p className="text-xs text-slate-300 font-sans italic leading-relaxed bg-[#080B0F] p-3.5 rounded-lg border border-white/[0.02]">
                  "{currentDiff.genericResponse}"
                </p>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-white/[0.04]">
                <div className="text-[10px] font-mono text-rose-400 font-semibold uppercase">Why this fails engineering leaders:</div>
                <ul className="space-y-1 text-[11px] text-slate-400">
                  {currentDiff.genericFlaws.map((flaw, i) => (
                    <li key={i} className="flex items-center space-x-1.5">
                      <span className="text-rose-500/80">✕</span>
                      <span>{flaw}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Cortex Grounded Graph Panel */}
            <div className="p-5 rounded-xl bg-[#0A0E16] border border-blue-500/30 space-y-3 flex flex-col justify-between shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-indigo-400 font-bold flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cortex Grounded Graph Output</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Deterministic Math
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-[#080B0F] border border-blue-500/20 space-y-3">
                  <div className="text-xs font-bold text-white font-sans">
                    {currentDiff.cortexResponse.headline}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    {currentDiff.cortexResponse.metrics.map((m, idx) => (
                      <div key={idx} className="p-2 rounded bg-[#0D1117] border border-white/[0.04]">
                        <div className="text-slate-400">{m.label}</div>
                        <div className="text-indigo-300 font-bold mt-0.5">{m.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-white/[0.04]">
                    <span className="text-indigo-400 font-semibold">Evidence: </span>
                    {currentDiff.cortexResponse.citations}
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-500 pt-2 flex items-center justify-between">
                <span>Calculated via Cypher traversal in VPC</span>
                <span className="text-emerald-400">Zero Hallucination</span>
              </div>
            </div>

          </div>
        </div>

        {/* Comprehensive Capability Table with Category Filter */}
        <div className="max-w-5xl mx-auto bg-[#0D1117] border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 bg-[#0A0E16] border-b border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-mono font-bold text-white">Full Architectural Capability Matrix</span>
            </div>

            {/* Filter buttons */}
            <div className="inline-flex p-1 rounded-lg bg-[#080B0F] border border-white/[0.04] text-[11px] font-mono">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  filterCategory === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                All (6)
              </button>
              <button
                onClick={() => setFilterCategory('security')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  filterCategory === 'security' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Security &amp; Privacy
              </button>
              <button
                onClick={() => setFilterCategory('accuracy')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  filterCategory === 'accuracy' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Math Accuracy
              </button>
              <button
                onClick={() => setFilterCategory('continuity')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  filterCategory === 'continuity' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Continuity
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-[#0A0E16]/50 text-slate-400 font-mono text-[11px]">
                  <th className="py-4 px-6 w-1/4 font-semibold uppercase tracking-wider">Dimension</th>
                  <th className="py-4 px-6 w-1/3 text-white font-bold uppercase tracking-wider bg-indigo-600/10 border-x border-blue-500/20">
                    <span className="text-indigo-400 flex items-center space-x-1.5">
                      <span>Cortex Platform</span>
                    </span>
                  </th>
                  <th className="py-4 px-6 w-1/5 font-semibold uppercase tracking-wider hidden md:table-cell">Generic LLMs</th>
                  <th className="py-4 px-6 w-1/5 font-semibold uppercase tracking-wider hidden lg:table-cell">Standard DORA Metrics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {filteredItems.map((item) => (
                  <tr key={item.dimension} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-6 font-semibold text-white font-mono text-xs">
                      {item.dimension}
                    </td>

                    {/* Cortex Column (Emphasized) */}
                    <td className="py-4 px-6 bg-indigo-600/[0.04] border-x border-blue-500/20 text-slate-200 font-medium">
                      <div className="flex items-start space-x-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed text-xs">{item.cortex}</span>
                      </div>
                    </td>

                    {/* Generic LLMs */}
                    <td className="py-4 px-6 text-slate-400 text-xs hidden md:table-cell">
                      <div className="flex items-start space-x-2">
                        <X className="w-4 h-4 text-rose-500/70 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{item.genericLlm}</span>
                      </div>
                    </td>

                    {/* Standard DORA */}
                    <td className="py-4 px-6 text-slate-400 text-xs hidden lg:table-cell">
                      <div className="flex items-start space-x-2">
                        <X className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{item.doraTools}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Summary Bar */}
          <div className="p-4 bg-[#0A0E16] border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-400 gap-2">
            <div className="flex items-center space-x-2">
              <Calculator className="w-3.5 h-3.5 text-indigo-400" />
              <span>Calculated deterministically before model formatting.</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SOC2 Type II Compatible Architecture</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
