import React, { useState } from 'react';
import { ShieldAlert, UserCheck, GitPullRequest, ChevronDown, CheckCircle2, AlertTriangle, Layers, Network, Sparkles, User, FileCode } from 'lucide-react';
import { CountUp } from './CountUp';

export const VerifiedCapabilities: React.FC = () => {
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState(true);

  const toggleWhy = (repoId: string) => {
    setExpandedWhy((prev) => ({ ...prev, [repoId]: !prev[repoId] }));
  };

  const busFactorRepos = [
    {
      id: 'notif',
      name: 'notification-service',
      busFactor: 0,
      riskScore: 100,
      status: 'Fragile (SPOF)',
      statusColor: 'bg-red-500/20 text-red-400 border-red-500/30',
      barColor: 'bg-red-500',
      reason: '100% commit ownership by single author (rohanverma). Zero co-authors on critical Twilio SMS dispatcher queue files.'
    },
    {
      id: 'billing',
      name: 'billing-service',
      busFactor: 1,
      riskScore: 80,
      status: 'Concentrated Risk',
      statusColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      barColor: 'bg-amber-500',
      reason: 'Priya Sharma is sole owner of Stripe idempotency & invoice generation modules. High departure risk impact.'
    },
    {
      id: 'cortex',
      name: 'Cortex Engine',
      busFactor: 1,
      riskScore: 80,
      status: 'Concentrated Risk',
      statusColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      barColor: 'bg-amber-500',
      reason: 'Arjun Kumar authored 94% of core graph traversal and agent graph workflow nodes.'
    },
  ];

  return (
    <div className="bg-[#0A0B0E] space-y-0 text-[#F5F5F7]">
      
      {/* CAPABILITY 1: INTERACTIVE KNOWLEDGE GRAPH */}
      <section className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10 reveal-on-scroll">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
              <Network className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Core Graph Engine</span>
              <span className="text-[#9497A6]">· Demo workspace</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
              See how your engineering organization is actually connected.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#9497A6] leading-relaxed">
              Cortex links engineers, commits, services, technologies, and incidents into an interconnected graph. Hover over nodes to inspect live relationships.
            </p>
          </div>

          {/* Interactive Graph Node Explorer Card */}
          <div className="max-w-4xl mx-auto bg-[#12141A] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-6 mb-8 border-b border-white/10">
              <div className="flex items-center space-x-2 text-xs font-mono text-[#9497A6]">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-ping" />
                <span className="text-[#F5F5F7] font-semibold">Interactive Graph Traversal Subgraph</span>
              </div>
              <span className="text-xs font-mono text-[#3B82F6]">Hover nodes to reveal lineage</span>
            </div>

            {/* Nodes Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10">
              
              {/* Node 1: Person */}
              <div
                onMouseEnter={() => setHoveredNode('person')}
                onMouseLeave={() => setHoveredNode(null)}
                className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer text-center ${
                  hoveredNode === 'person' || !hoveredNode
                    ? 'bg-[#0A0B0E] border-[#3B82F6] shadow-[0_0_25px_rgba(59,130,246,0.3)] transform -translate-y-1'
                    : 'bg-[#0A0B0E]/60 border-white/5 opacity-40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] mx-auto flex items-center justify-center mb-3">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold font-mono text-[#F5F5F7]">Priya Sharma</div>
                <div className="text-[10px] font-mono text-[#3B82F6] mt-0.5">:PERSON</div>
                <p className="text-[11px] text-[#9497A6] mt-2">Software Engineer</p>
              </div>

              {/* Node 2: Repository */}
              <div
                onMouseEnter={() => setHoveredNode('repo')}
                onMouseLeave={() => setHoveredNode(null)}
                className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer text-center ${
                  hoveredNode === 'repo' || !hoveredNode
                    ? 'bg-[#0A0B0E] border-[#3B82F6] shadow-[0_0_25px_rgba(59,130,246,0.3)] transform -translate-y-1'
                    : 'bg-[#0A0B0E]/60 border-white/5 opacity-40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] mx-auto flex items-center justify-center mb-3">
                  <FileCode className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold font-mono text-[#F5F5F7]">billing-service</div>
                <div className="text-[10px] font-mono text-[#3B82F6] mt-0.5">:REPOSITORY</div>
                <p className="text-[11px] text-[#9497A6] mt-2">Core Payments Codebase</p>
              </div>

              {/* Node 3: Technology */}
              <div
                onMouseEnter={() => setHoveredNode('tech')}
                onMouseLeave={() => setHoveredNode(null)}
                className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer text-center ${
                  hoveredNode === 'tech' || !hoveredNode
                    ? 'bg-[#0A0B0E] border-[#3B82F6] shadow-[0_0_25px_rgba(59,130,246,0.3)] transform -translate-y-1'
                    : 'bg-[#0A0B0E]/60 border-white/5 opacity-40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] mx-auto flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold font-mono text-[#F5F5F7]">Stripe SDK</div>
                <div className="text-[10px] font-mono text-[#3B82F6] mt-0.5">:TECHNOLOGY</div>
                <p className="text-[11px] text-[#9497A6] mt-2">External Dependency</p>
              </div>

              {/* Node 4: Issue / Incident */}
              <div
                onMouseEnter={() => setHoveredNode('issue')}
                onMouseLeave={() => setHoveredNode(null)}
                className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer text-center ${
                  hoveredNode === 'issue' || !hoveredNode
                    ? 'bg-[#0A0B0E] border-[#3B82F6] shadow-[0_0_25px_rgba(59,130,246,0.3)] transform -translate-y-1'
                    : 'bg-[#0A0B0E]/60 border-white/5 opacity-40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] mx-auto flex items-center justify-center mb-3">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold font-mono text-[#F5F5F7]">BILL-204</div>
                <div className="text-[10px] font-mono text-[#3B82F6] mt-0.5">:ISSUE</div>
                <p className="text-[11px] text-[#9497A6] mt-2">Double-Charge Fix</p>
              </div>

            </div>

            {/* Dynamic Graph Relation Description Box */}
            <div className="mt-8 p-4 rounded-xl bg-[#0A0B0E] border border-white/10 text-xs font-mono leading-relaxed flex items-center justify-between">
              <div>
                <span className="text-[#3B82F6] font-bold">Graph Edge Relation: </span>
                <span className="text-[#F5F5F7]">
                  {hoveredNode === 'person' && '(Priya Sharma)-[:WORKS_ON]->(billing-service) · (Priya Sharma)-[:USES]->(Stripe SDK)'}
                  {hoveredNode === 'repo' && '(billing-service)-[:DEPENDS_ON]->(Stripe SDK) · (billing-service)-[:HAS_PROBLEM]->(BILL-204)'}
                  {hoveredNode === 'tech' && '(Stripe SDK)<-[:USES]-(Priya Sharma) · Only Priya Sharma has authored code touching this dependency'}
                  {hoveredNode === 'issue' && '(BILL-204)-[:AUTHORED_BY]->(Priya Sharma) · Resolved Stripe webhook idempotency bug'}
                  {!hoveredNode && 'Hover over any node above to inspect Cypher graph relationships computed by Cortex.'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CAPABILITY 2: KNOWLEDGE RISK & BUS FACTOR */}
      <section className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10 reveal-on-scroll">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
              <ShieldAlert className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Real Graph Metric</span>
              <span className="text-[#9497A6]">· Demo workspace</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
              Find engineering risk before it becomes an incident.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#9497A6] leading-relaxed">
              Cortex computes bus factor and knowledge risk scores directly from commit lineage, PR activity, and co-author patterns — not arbitrary guesses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {busFactorRepos.map((repo) => (
              <div
                key={repo.id}
                className="bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl p-6 transition-all duration-300 shadow-xl flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-[#F5F5F7] font-mono truncate">
                      {repo.name}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold border ${repo.statusColor}`}>
                      {repo.status}
                    </span>
                  </div>

                  <div className="my-5 bg-[#0A0B0E] p-4 rounded-xl border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-mono text-[#9497A6]">BUS FACTOR</div>
                      <div className="text-4xl font-extrabold text-[#F5F5F7] font-mono mt-0.5">
                        <CountUp end={repo.busFactor} duration={1200} />
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] font-mono text-[#9497A6]">RISK SCORE</div>
                      <div className="text-xl font-bold text-[#F5F5F7] font-mono mt-0.5">
                        <CountUp end={repo.riskScore} duration={1400} suffix="/100" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-[11px] font-mono text-[#9497A6]">
                      <span>Ownership Concentration</span>
                      <span>{repo.riskScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#0A0B0E] rounded-full overflow-hidden border border-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${repo.barColor}`}
                        style={{ width: `${repo.riskScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={() => toggleWhy(repo.id)}
                    className="w-full flex items-center justify-between text-xs font-mono text-[#3B82F6] hover:underline cursor-pointer py-1"
                  >
                    <span>Why is this flagged?</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        expandedWhy[repo.id] ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expandedWhy[repo.id] && (
                    <div className="mt-2 p-3 rounded-lg bg-[#0A0B0E] border border-white/10 text-xs text-[#9497A6] leading-relaxed">
                      {repo.reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CAPABILITY 3: PR RISK EVALUATION ENGINE */}
      <section className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10 reveal-on-scroll">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
              <GitPullRequest className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>PR Risk Scoring Engine</span>
              <span className="text-[#9497A6]">· Demo workspace</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
              Understand the risk of every change before it merges.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#9497A6] leading-relaxed">
              Cortex evaluates pull requests using a 5-factor weighted algorithm combining subgraph blast radius, author departure risk, bus factor, single-point-of-failure files, and recent incidents.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
              <div>
                <span className="text-xs font-mono text-[#9497A6] uppercase tracking-wider">GitHub Pull Request Event</span>
                <h3 className="text-xl font-bold text-[#F5F5F7] font-mono mt-0.5">PR #142 · Add rate-limiting worker queue for Twilio SMS dispatcher</h3>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-xs font-mono text-[#9497A6]">PR Risk Score:</span>
                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-bold font-mono">
                  72 / 100 (Medium-High)
                </span>
              </div>
            </div>

            {/* 5 Weighted Factor Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
              <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/10">
                <div className="text-[#9497A6] mb-1">1. Subgraph Blast Radius (25%)</div>
                <div className="text-[#3B82F6] font-bold">Medium (2 Hops Affected)</div>
                <p className="text-[11px] text-[#9497A6] mt-1">notification-service → twilio-worker</p>
              </div>

              <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/10">
                <div className="text-[#9497A6] mb-1">2. Author Departure Risk (20%)</div>
                <div className="text-amber-400 font-bold">High (Rohan Verma = 95%)</div>
                <p className="text-[11px] text-[#9497A6] mt-1">Sole active worker contributor</p>
              </div>

              <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/10">
                <div className="text-[#9497A6] mb-1">3. Repository Bus Factor (25%)</div>
                <div className="text-amber-400 font-bold">Fragile (Bus Factor = 0)</div>
                <p className="text-[11px] text-[#9497A6] mt-1">notification-service</p>
              </div>

              <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/10">
                <div className="text-[#9497A6] mb-1">4. SPOF Files Touched (15%)</div>
                <div className="text-[#F5F5F7] font-bold">2 Critical SPOF Files</div>
                <p className="text-[11px] text-[#9497A6] mt-1">packages/queue/dispatcher.ts</p>
              </div>

              <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/10">
                <div className="text-[#9497A6] mb-1">5. Recent Incidents (15%)</div>
                <div className="text-[#3B82F6] font-bold">1 Related Incident (30d)</div>
                <p className="text-[11px] text-[#9497A6] mt-1">Twilio 429 Rate Limit Incident</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0A0B0E] border border-amber-500/30 flex items-center space-x-3 text-xs font-mono text-[#F5F5F7]">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong className="text-amber-400">Automated Recommendation:</strong> Require secondary review from @Arjun before merging into main branch.
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* CAPABILITY 4: DEPARTURE SIMULATION & CONTINUITY PLANNING */}
      <section className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10 reveal-on-scroll">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
              <UserCheck className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Continuity Planning</span>
              <span className="text-[#9497A6]">· Demo workspace</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
              Know what happens when critical knowledge leaves.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#9497A6] leading-relaxed">
              Not surveillance — continuity planning. Simulate what codebases, dependencies, and business logic are affected if a key engineer departs.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
              <div>
                <span className="text-xs font-mono text-[#9497A6] uppercase tracking-wider">Simulated Departure Profile</span>
                <h3 className="text-2xl font-bold text-[#F5F5F7] font-mono mt-0.5">Priya Sharma</h3>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono text-[#9497A6]">Departure Knowledge Risk:</span>
                <span className="px-3.5 py-1 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-sm font-bold font-mono">
                  25% (Concentrated)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/10 space-y-2">
                <div className="text-xs font-mono text-[#9497A6]">AFFECTED CODEBASES</div>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-[#12141A] border border-white/10 text-[#F5F5F7]">billing-service</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#12141A] border border-white/10 text-[#F5F5F7]">billing-worker</span>
                </div>
              </div>

              <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/10 space-y-2">
                <div className="text-xs font-mono text-[#9497A6]">AFFECTED DEPENDENCIES</div>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-[#12141A] border border-white/10 text-[#3B82F6]">Stripe Idempotency API</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#12141A] border border-white/10 text-[#3B82F6]">PostgreSQL Billing DB</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/10 font-mono text-xs text-[#F5F5F7] space-y-1">
              <span className="text-[#3B82F6] font-semibold">Graph Grounded Evidence:</span>
              <p className="text-[#9497A6]">
                "Only Priya Sharma uses this" — <code className="text-[#F5F5F7]">billing-service</code>, <code className="text-[#F5F5F7]">BILL-204</code> commit <code className="text-[#F5F5F7]">b7e2f91a</code>
              </p>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center space-x-2 text-xs font-mono text-[#9497A6]">
              <CheckCircle2 className="w-4 h-4 text-[#3B82F6] shrink-0" />
              <span>Successor recommendation derived from shared commit graph traversal</span>
            </div>
          </div>

        </div>
      </section>

      {/* CAPABILITY 5: MULTI-TOOL REASONING & GROUNDED AI COPILOT */}
      <section className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10 reveal-on-scroll">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Decomposed Multi-Tool Reasoning</span>
              <span className="text-[#9497A6]">· Verified Agent Graph</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
              Ask complex questions. Get answers backed by evidence, not guesses.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#9497A6] leading-relaxed">
              Cortex decomposes multi-part compound queries into distinct parallel tool lookups (Graph, Vector, Knowledge Risk, SQL) — synthesizing answers only from retrieved evidence.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-[#12141A] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 font-mono text-xs sm:text-sm">
            
            {/* User Prompt */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6] font-bold shrink-0">
                U
              </div>
              <div className="bg-[#0A0B0E] p-4 rounded-xl border border-white/10 text-[#F5F5F7] font-semibold w-full">
                "Who is Priya Sharma, what's her knowledge risk, and what technologies does she use?"
              </div>
            </div>

            {/* Agent Decomposition Log */}
            <div className="bg-[#0A0B0E] p-4 rounded-xl border border-[#3B82F6]/30 text-xs space-y-2">
              <div className="text-[#3B82F6] font-bold flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
                <span>Cortex Agent Decomposition (3 Tool Calls Executed):</span>
              </div>
              <div className="text-[#9497A6] space-y-1 pl-4 border-l-2 border-[#3B82F6]/30 text-[11px]">
                <div>1. <code className="text-[#F5F5F7]">graph_search({`{"action":"describeEntity","entities":["Priya Sharma"]}`})</code></div>
                <div>2. <code className="text-[#F5F5F7]">knowledge_risk({`{"personName":"Priya Sharma"}`})</code></div>
                <div>3. <code className="text-[#F5F5F7]">graph_search({`{"action":"listNodes","target":"TECHNOLOGY","relation":"USES"}`})</code></div>
              </div>
            </div>

            {/* Synthesized Answer */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6] shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-[#3B82F6]" />
              </div>
              <div className="bg-[#0A0B0E] p-5 rounded-xl border border-white/10 space-y-4 w-full text-[#F5F5F7] leading-relaxed">
                <div>
                  <strong className="text-[#3B82F6]">1. Identity &amp; Role:</strong> Priya Sharma is a Software Engineer (<code className="text-[#F5F5F7]">priya.sharma@company.com</code>) who works on and contributes to the <code className="text-[#F5F5F7]">billing-service</code> repository. She authored commit <code className="text-[#F5F5F7]">b7e2f91a</code> and issue <code className="text-[#F5F5F7]">BILL-204</code>.
                </div>

                <div>
                  <strong className="text-[#3B82F6]">2. Knowledge Risk Score:</strong> Her total knowledge risk is <strong className="text-amber-400">25%</strong>. Key components: activity at 95%, ownership at 33%, and expertise at 10%. She is the sole contributor for these items.
                </div>

                <div>
                  <strong className="text-[#3B82F6]">3. Technologies Used:</strong> The indexed system records zero additional unlinked technologies associated with her USES relation.
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-[#9497A6]">
                  <button
                    onClick={() => setExpandedEvidence(!expandedEvidence)}
                    className="text-[#3B82F6] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <span>{expandedEvidence ? 'Hide Cited Evidence' : 'Show Cited Evidence (2 Grounded Lookups)'}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${expandedEvidence ? 'rotate-180' : ''}`} />
                  </button>
                  <span>Confidence: 100% (0 guesses)</span>
                </div>

                {expandedEvidence && (
                  <div className="p-3 rounded-lg bg-[#12141A] border border-white/10 text-[11px] text-[#9497A6] space-y-1">
                    <div><strong className="text-[#F5F5F7]">[Graph Entity]:</strong> name: "Priya Sharma", email: "priya.sharma@company.com", repo: "billing-service"</div>
                    <div><strong className="text-[#F5F5F7]">[Knowledge Risk]:</strong> totalRisk: 0.25, evidence: {`{"ownership":["commit b7e2f91a"],"expertise":["BILL-204"]}`}</div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* CAPABILITY 6: CANONICAL IDENTITY RESOLUTION */}
      <section className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10 reveal-on-scroll">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
              <User className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Multi-Provider Cross-Linking</span>
              <span className="text-[#9497A6]">· Demo workspace</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
              One person. One identity. Every system.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#9497A6] leading-relaxed">
              Engineers use different handles across GitHub, Slack, and Jira. Cortex automatically resolves and merges disparate provider accounts into a single canonical Person entity.
            </p>
          </div>

          {/* Identity Resolution Visual Diagram */}
          <div className="max-w-4xl mx-auto bg-[#12141A] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-[#0A0B0E] border border-white/10 rounded-xl p-4 text-center">
                <div className="text-xs font-mono text-[#9497A6] mb-1">GitHub Account</div>
                <div className="text-sm font-bold text-[#F5F5F7] font-mono">@priyasharma</div>
                <div className="text-[10px] text-[#3B82F6] mt-1 font-mono">Commits &amp; PRs</div>
              </div>

              <div className="bg-[#0A0B0E] border border-white/10 rounded-xl p-4 text-center">
                <div className="text-xs font-mono text-[#9497A6] mb-1">Slack User ID</div>
                <div className="text-sm font-bold text-[#F5F5F7] font-mono">U555PRIYA1</div>
                <div className="text-[10px] text-[#3B82F6] mt-1 font-mono">Messages &amp; Threads</div>
              </div>

              <div className="bg-[#0A0B0E] border border-white/10 rounded-xl p-4 text-center">
                <div className="text-xs font-mono text-[#9497A6] mb-1">Jira Email</div>
                <div className="text-sm font-bold text-[#F5F5F7] font-mono">priya.sharma@company.com</div>
                <div className="text-[10px] text-[#3B82F6] mt-1 font-mono">Tickets &amp; Assignments</div>
              </div>
            </div>

            {/* Convergence Marker */}
            <div className="text-center my-4 text-xs font-mono text-[#3B82F6]">
              ↓ Cortex Automated Identity Resolution Engine ↓
            </div>

            <div className="bg-gradient-to-b from-[#12141A] to-[#0A0B0E] border-2 border-[#3B82F6] rounded-xl p-6 text-center max-w-md mx-auto shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6] text-[#3B82F6] mx-auto flex items-center justify-center mb-2">
                <User className="w-5 h-5" />
              </div>
              <div className="text-base font-extrabold text-[#F5F5F7] font-mono">Priya Sharma</div>
              <div className="text-xs text-[#3B82F6] font-mono mt-0.5">Canonical Node (:PERSON)</div>
              <p className="text-xs text-[#9497A6] mt-2">
                Unified cross-provider history across 3 connected platforms.
              </p>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
};
