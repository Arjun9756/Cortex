import React, { useState } from 'react';
import { 
  UserMinus, 
  UserPlus, 
  Flame, 
  FileText, 
  Layers,
  FileCode,
  CheckSquare,
  Square,
  Activity,
  Search,
  Sparkles,
  ArrowRight
} from 'lucide-react';

/* ── Interactive View 1: Departure Handover Mission Control ── */
const DepartureMissionControl: React.FC = () => {
  const [selectedCandidate, setSelectedCandidate] = useState<'vikram' | 'sarah'>('vikram');
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({
    task1: true,
    task2: false,
    task3: false,
  });

  const toggleTask = (id: string) => {
    setCheckedTasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-5">
      {/* Target Departure Profile Banner */}
      <div className="p-4 rounded-xl bg-[#080B0F] border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center font-bold text-rose-300 font-mono">
            DS
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white font-sans">Devendra Singh</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Resignation Notice: 14 Days Remaining
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Primary Author: payment-gateway-v2 (84% commits · Critical SPOF)
            </p>
          </div>
        </div>
        <div className="text-right font-mono text-xs text-slate-400">
          <span className="text-rose-400 font-bold">1 Fragile SPOF</span> · 14 Files at Risk
        </div>
      </div>

      {/* 4-Factor Successor Candidate Comparison */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Deterministic Successor Matching</span>
          <span className="text-indigo-400">4-Factor Jaccard Algorithm</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Candidate 1 */}
          <button
            onClick={() => setSelectedCandidate('vikram')}
            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
              selectedCandidate === 'vikram'
                ? 'bg-[#0D1117] border-emerald-500/40 shadow-md shadow-emerald-500/5'
                : 'bg-[#0A0E16] border-white/[0.04] opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white font-sans">Vikram Patel (Senior Eng)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                82% Match · Primary
              </span>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Tech Jaccard:</span>
                <span>0.78 (TypeScript, Redis, Neo4j)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Repo Overlap:</span>
                <span className="text-emerald-400">100% (payment-gateway)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Workload Headroom:</span>
                <span className="text-emerald-400">Healthy (0 SPOFs owned)</span>
              </div>
            </div>
          </button>

          {/* Candidate 2 */}
          <button
            onClick={() => setSelectedCandidate('sarah')}
            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
              selectedCandidate === 'sarah'
                ? 'bg-[#0D1117] border-amber-500/40 shadow-md shadow-amber-500/5'
                : 'bg-[#0A0E16] border-white/[0.04] opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 font-sans">Sarah Jenkins (Staff Eng)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                64% Match · Secondary
              </span>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span className="text-slate-500">Tech Jaccard:</span>
                <span>0.62 (Go, TypeScript)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Repo Overlap:</span>
                <span>50% (PR reviews only)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Workload Headroom:</span>
                <span className="text-amber-400">Moderate (Maintains 1 SPOF)</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Interactive Handover Checklist */}
      <div className="p-4 rounded-xl bg-[#080B0F] border border-white/[0.06] space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-300 font-semibold">Knowledge Transition Checklist:</span>
          <span className="text-indigo-400">
            {Object.values(checkedTasks).filter(Boolean).length} / 3 Completed
          </span>
        </div>

        <div className="space-y-2 font-mono text-xs">
          <div 
            onClick={() => toggleTask('task1')}
            className="flex items-center space-x-2.5 p-2 rounded-lg bg-[#0D1117] hover:bg-[#141A23] cursor-pointer transition-colors"
          >
            {checkedTasks.task1 ? (
              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <span className={checkedTasks.task1 ? 'line-through text-slate-500' : 'text-slate-200'}>
              Review Stripe PCI-DSS idempotency token cache in src/webhook.ts
            </span>
          </div>

          <div 
            onClick={() => toggleTask('task2')}
            className="flex items-center space-x-2.5 p-2 rounded-lg bg-[#0D1117] hover:bg-[#141A23] cursor-pointer transition-colors"
          >
            {checkedTasks.task2 ? (
              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <span className={checkedTasks.task2 ? 'line-through text-slate-500' : 'text-slate-200'}>
              Transfer sole-reviewer status on 4 active in-flight PRs to @vikrampatel
            </span>
          </div>

          <div 
            onClick={() => toggleTask('task3')}
            className="flex items-center space-x-2.5 p-2 rounded-lg bg-[#0D1117] hover:bg-[#141A23] cursor-pointer transition-colors"
          >
            {checkedTasks.task3 ? (
              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <span className={checkedTasks.task3 ? 'line-through text-slate-500' : 'text-slate-200'}>
              Document manual key rotation procedure in #eng-payments channel
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Interactive View 2: Living Microservice Knowledge Map ── */
const OnboardingExplorer: React.FC = () => {
  const [selectedService, setSelectedService] = useState<'auth' | 'billing' | 'notification'>('auth');

  const services = {
    auth: {
      name: 'auth-service',
      busFactor: 3,
      status: 'Healthy (Bus Factor 3)',
      statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      owner: 'Vikram Patel (42% ownership)',
      tech: ['TypeScript', 'Redis', 'JWT PKCE', 'Fastify'],
      lastCommit: '3 hours ago (PR #204 - PKCE key rotation)',
      contributors: [
        { name: 'Vikram Patel', pct: 42, color: '#10B981' },
        { name: 'Alice Zhang', pct: 35, color: '#3B82F6' },
        { name: 'Devendra Singh', pct: 23, color: '#8B5CF6' },
      ]
    },
    billing: {
      name: 'billing-service',
      busFactor: 1,
      status: 'Concentrated Risk (Bus Factor 1)',
      statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      owner: 'Priya Sharma (80% ownership)',
      tech: ['Go', 'PostgreSQL', 'Stripe API', 'RabbitMQ'],
      lastCommit: 'Yesterday (PR #112 - Invoice generator refactor)',
      contributors: [
        { name: 'Priya Sharma', pct: 80, color: '#F59E0B' },
        { name: 'Rohan Verma', pct: 20, color: '#64748B' },
      ]
    },
    notification: {
      name: 'notification-worker',
      busFactor: 1,
      status: 'Critical SPOF (Bus Factor 1)',
      statusColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      owner: 'Rohan Verma (100% ownership)',
      tech: ['TypeScript', 'BullMQ', 'Twilio SDK', 'SendGrid'],
      lastCommit: '4 days ago (commit 4b2f19a)',
      contributors: [
        { name: 'Rohan Verma', pct: 100, color: '#EF4444' },
      ]
    }
  };

  const current = services[selectedService];

  return (
    <div className="space-y-4">
      {/* Service Selector Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-1">
        {(Object.keys(services) as Array<keyof typeof services>).map((key) => {
          const s = services[key];
          const isSel = selectedService === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedService(key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-all flex items-center space-x-2 whitespace-nowrap ${
                isSel
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'bg-[#080B0F] text-slate-400 hover:text-white border border-white/[0.04]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Service Card */}
      <div className="p-5 rounded-xl bg-[#080B0F] border border-white/[0.06] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-base font-bold text-white font-mono">{current.name}</h4>
            <span className="text-xs text-slate-400 font-sans">Primary Maintainer: <strong className="text-slate-200">{current.owner}</strong></span>
          </div>
          <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded border ${current.statusColor}`}>
            {current.status}
          </span>
        </div>

        {/* Ownership Distribution Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>Decayed 180-Day Code Ownership</span>
            <span className="text-indigo-400">Living Git Ast Reality</span>
          </div>
          <div className="h-4 w-full rounded-md bg-[#0D1117] flex overflow-hidden p-0.5 border border-white/[0.04]">
            {current.contributors.map((c) => (
              <div 
                key={c.name}
                className="h-full transition-all duration-300 flex items-center justify-center text-[9px] font-mono text-white font-bold"
                style={{ width: `${c.pct}%`, backgroundColor: c.color }}
              >
                <span className="truncate px-1">{c.name.split(' ')[0]} ({c.pct}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack Tags */}
        <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
          <span className="text-[10px] font-mono text-slate-500 uppercase">Verified Technology Footprint:</span>
          <div className="flex flex-wrap gap-1.5">
            {current.tech.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded bg-[#0D1117] border border-white/[0.06] text-xs font-mono text-indigo-300">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-2.5 rounded-lg bg-[#0A0E16] border border-white/[0.04] text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span>Last production merge:</span>
          <span className="text-slate-200">{current.lastCommit}</span>
        </div>
      </div>
    </div>
  );
};

/* ── Interactive View 3: 2:00 AM Incident Triage Blast Radius ── */
const IncidentTriageHUD: React.FC = () => {
  return (
    <div className="p-5 rounded-xl bg-[#080B0F] border border-rose-500/20 space-y-4">
      {/* Alert Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-md bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Flame className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-rose-400">CRITICAL P1 ALERT · 02:14 UTC</div>
            <div className="text-xs font-sans text-slate-300 font-semibold">Payment routing gateway latency spike (504 Gateway Timeout)</div>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
          Blast Radius: 3 Services
        </span>
      </div>

      {/* Visual Dependency Blast Radius Flow */}
      <div className="p-3.5 rounded-lg bg-[#0A0E16] border border-white/[0.04] space-y-2">
        <div className="text-[10px] font-mono text-slate-500 uppercase">Downstream AST Dependency Traversal:</div>
        <div className="flex items-center space-x-2 font-mono text-xs overflow-x-auto py-1">
          <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 whitespace-nowrap">
            api-core-gateway
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold whitespace-nowrap">
            billing-service [FAILING]
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap">
            stripe-webhook-queue
          </span>
        </div>
      </div>

      {/* Recent Merges in Last 48 Hours */}
      <div className="space-y-2 font-mono text-xs">
        <div className="text-[10px] text-slate-500 uppercase">Recent Merges in Last 48 Hours:</div>
        <div className="p-3 rounded-lg bg-[#0D1117] border border-white/[0.06] flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-white font-semibold">PR #142: Stripe idempotent webhook retry logic</div>
            <div className="text-[11px] text-slate-400">Merged 3.5 hours ago by @priyasharma · 4 files changed (+142, -18)</div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            commit e4f82a1
          </span>
        </div>
      </div>

      {/* Direct On-Call Primary Owner Contact */}
      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs font-mono">
        <div>
          <span className="text-emerald-400 font-bold">Recommended On-Call Lead: </span>
          <span className="text-white">Priya Sharma (80% decayed ownership)</span>
        </div>
        <span className="text-[11px] text-emerald-400">Slack: @priya · Phone on PagerDuty</span>
      </div>
    </div>
  );
};

/* ── Interactive View 4: Grounded Architecture Query with Real Citations ── */
const StaleDocsExplorer: React.FC = () => {
  const [expandedCitation, setExpandedCitation] = useState<number | null>(1);

  const citations = [
    {
      id: 1,
      title: 'Git Commit 8f3b12a (PR #89)',
      author: 'Alice Zhang',
      date: 'March 14, 2025',
      summary: 'Replace Redis with Valkey 8.0 cluster client to maintain permissive BSD-3 license compliance.',
      diff: '+ import { ValkeyCluster } from "iovalkey";\n- import { Redis } from "ioredis";'
    },
    {
      id: 2,
      title: 'Slack Discussion #eng-backend (Thread ts: 1710403200)',
      author: 'Vikram Patel',
      date: 'March 12, 2025',
      summary: 'Staff RFC review agreed: Valkey drop-in protocol compatibility confirmed with 0 client changes needed.',
      diff: 'Thread: "Benchmark showed 4.2% lower p99 latency under 20k RPS on staging."'
    }
  ];

  return (
    <div className="p-5 rounded-xl bg-[#080B0F] border border-white/[0.06] space-y-4 font-mono text-xs">
      <div className="p-3 rounded-lg bg-[#0D1117] border border-indigo-500/20 flex items-center space-x-2 text-indigo-300">
        <Search className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="text-slate-400 font-sans">Query: </span>
        <span className="font-bold">"Why did we migrate from Redis to Valkey in platform-gateway?"</span>
      </div>

      <div className="p-4 rounded-xl bg-[#0A0E16] border border-white/[0.04] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-emerald-400 font-bold flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Grounded Response (Zero Hallucination)</span>
          </span>
          <span className="text-slate-500">2 Verifiable Citations</span>
        </div>
        <p className="text-xs text-slate-200 font-sans leading-relaxed">
          Redis was replaced with Valkey 8.0 in commit <code className="text-indigo-400 font-mono">8f3b12a</code> (PR #89) authored by Alice Zhang following licensing policy audits. Staging load benchmarks validated protocol parity with 4.2% latency reduction.
        </p>
      </div>

      {/* Expandable Citations */}
      <div className="space-y-2">
        <div className="text-[10px] text-slate-500 uppercase">Auditable Source Lineage:</div>
        {citations.map((c) => (
          <div key={c.id} className="rounded-lg bg-[#0D1117] border border-white/[0.04] overflow-hidden">
            <button
              onClick={() => setExpandedCitation(expandedCitation === c.id ? null : c.id)}
              className="w-full p-2.5 text-left flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
            >
              <div className="flex items-center space-x-2">
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-white font-semibold">{c.title}</span>
              </div>
              <span className="text-[10px] text-slate-500">{c.date}</span>
            </button>

            {expandedCitation === c.id && (
              <div className="p-3 bg-[#080B0F] border-t border-white/[0.04] space-y-2 text-[11px]">
                <p className="text-slate-300 font-sans">{c.summary}</p>
                <div className="p-2 rounded bg-[#05070B] border border-white/[0.04] text-slate-400 font-mono text-[10px] overflow-x-auto">
                  <code>{c.diff}</code>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const UseCasesSection: React.FC = () => {
  const [selectedCaseId, setSelectedCaseId] = useState<'departure' | 'onboarding' | 'incident' | 'stale-docs'>('departure');

  const useCases = [
    {
      id: 'departure' as const,
      icon: UserMinus,
      title: 'Sudden Engineer Departure',
      tag: 'Successor Recommendation',
      scenario:
        'A principal engineer who authored 84% of your payment tokenization microservice gives two weeks notice. Team leadership needs an objective, data-backed handover plan before knowledge walks out the door.',
      deterministicBehavior:
        'Cortex evaluates technology footprint Jaccard similarity (40%), direct repository contribution history (30%), 30-day activity recency (20%), and current workload capacity headroom (10%). Overloaded peers maintaining existing SPOF services are penalized.',
    },
    {
      id: 'onboarding' as const,
      icon: UserPlus,
      title: 'New Hire Onboarding',
      tag: 'Living Knowledge Map',
      scenario:
        'A newly hired engineer is assigned their first bug fix in a distributed microservices repo with 20 services. Internal Confluence wikis were last updated 14 months ago and contradict current production code.',
      deterministicBehavior:
        'The new engineer queries the living knowledge graph to inspect who actively touches each service, decayed code ownership percentages over the last 180 days, and current technology stacks without constantly interrupting senior engineers.',
    },
    {
      id: 'incident' as const,
      icon: Flame,
      title: 'Production Incident Triage',
      tag: 'Blast Radius & Recent Merges',
      scenario:
        'A critical P1 error spikes in core payment routing at 2:00 AM. The on-call engineer needs to determine within minutes: what changed recently, what downstream services depend on this, and who has deepest current operational context.',
      deterministicBehavior:
        'Cortex instantly surfaces the repository’s Single Point of Failure (SPOF) rating, recent pull request merges within the last 48 hours, active microservice dependency edges, and the primary author of the affected module.',
    },
    {
      id: 'stale-docs' as const,
      icon: FileText,
      title: 'Stale Architecture & Debt',
      tag: 'Evidence-Backed Q&A',
      scenario:
        'An engineering team is debating why an in-memory Redis cache was replaced with Valkey six months ago. Documentation contains conflicting Jira tickets and no one remembers the exact context.',
      deterministicBehavior:
        'Engineers ask Cortex natural language architectural queries. The agent navigates the property graph and vector embeddings, returning grounded answers with exact commit SHAs, PR review discussions, and Slack architectural thread citations.',
    }
  ];

  const currentCase = useCases.find(c => c.id === selectedCaseId) || useCases[0];

  return (
    <section id="use-cases" className="py-12 md:py-16 bg-[#06090F] relative antialiased">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono mb-5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Built For Production Engineering</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight font-sans">
            Engineered for <span className="gradient-text">critical operational scenarios.</span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Concrete engineering continuity problems solved by deterministic knowledge graphs. No fabricated customer testimonials or generic marketing fluff.
          </p>
        </div>

        {/* 4 Interactive Scenario Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 max-w-6xl mx-auto">
          {useCases.map((uc) => {
            const Icon = uc.icon;
            const isSelected = selectedCaseId === uc.id;
            return (
              <button
                key={uc.id}
                onClick={() => setSelectedCaseId(uc.id)}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-[#0D1117] border-amber-500/50 shadow-lg shadow-amber-500/5'
                    : 'bg-[#0A0E16] border-white/[0.04] hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white/5 text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {uc.tag}
                  </span>
                </div>

                <div>
                  <div className="font-bold text-sm text-white font-sans">
                    {uc.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {uc.scenario}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Deep Dive Scenario Workbench Container */}
        <div className="bg-[#0D1117] border border-white/[0.06] rounded-2xl p-6 sm:p-10 max-w-6xl mx-auto space-y-8 shadow-2xl">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Operational Context & Product Determinism */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
                  Operational Scenario #{useCases.findIndex(u => u.id === selectedCaseId) + 1}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                  {currentCase.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  {currentCase.scenario}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-white/[0.04]">
                <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Deterministic Product Action</span>
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {currentCase.deterministicBehavior}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#080B0F] border border-white/[0.04] space-y-1 text-xs font-mono text-slate-400">
                <div className="text-indigo-400 font-semibold">Integrations Active:</div>
                <div>GitHub Enterprise · Jira Cloud · Slack Webhooks</div>
              </div>
            </div>

            {/* Right: Rich Interactive Simulator View */}
            <div className="lg:col-span-7">
              {selectedCaseId === 'departure' && <DepartureMissionControl />}
              {selectedCaseId === 'onboarding' && <OnboardingExplorer />}
              {selectedCaseId === 'incident' && <IncidentTriageHUD />}
              {selectedCaseId === 'stale-docs' && <StaleDocsExplorer />}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
