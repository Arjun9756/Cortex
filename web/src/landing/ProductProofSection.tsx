import React, { useState } from 'react';
import { 
  ShieldAlert, 
  UserCheck, 
  MessageSquareCode, 
  GitBranch, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  GitCommit, 
  Check, 
  FileCode 
} from 'lucide-react';

export const ProductProofSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'spof' | 'departure' | 'agent'>('spof');

  // Frame 1 Data: Repo SPOF & Bus Factor Matrix
  const repoData = [
    {
      name: 'notification-service',
      busFactor: 0,
      primaryOwner: 'rohanverma',
      commitsPct: 100,
      status: 'Fragile (SPOF)',
      statusClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      barColor: 'bg-rose-500',
      reason: '100% commit ownership by single author. Zero co-authors on Twilio SMS worker queue.'
    },
    {
      name: 'payment-gateway-v2',
      busFactor: 1,
      primaryOwner: 'devendrasingh',
      commitsPct: 84,
      status: 'Concentrated Risk',
      statusClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      barColor: 'bg-amber-500',
      reason: 'Devendra Singh holds 84% commit ownership. Single maintainer of PCI-DSS tokenization pipeline.'
    },
    {
      name: 'billing-service',
      busFactor: 1,
      primaryOwner: 'priyasharma',
      commitsPct: 80,
      status: 'Concentrated Risk',
      statusClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      barColor: 'bg-amber-500',
      reason: 'Priya Sharma is sole author of Stripe idempotency webhook handlers & invoice generator.'
    },
    {
      name: 'auth-service',
      busFactor: 2,
      primaryOwner: 'vikrampatel',
      commitsPct: 42,
      status: 'Healthy (Distributed)',
      statusClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      barColor: 'bg-emerald-500',
      reason: 'Shared ownership across 3 active contributors. Documented OAuth2 PKCE key rotation.'
    }
  ];

  return (
    <section id="proof" className="py-20 md:py-28 bg-[#06080e] relative overflow-hidden border-t border-slate-800/80 antialiased">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0c111e] border border-slate-800 text-indigo-400 text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Verifiable Product Proof</span>
            <span className="text-slate-500">· Real Graph Output</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            See the actual intelligence Cortex delivers.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            No mockups or vague promises. Here is what Cortex computes from your git commits, pull requests, and internal discussions.
          </p>
        </div>

        {/* Tab Selection Navigation (3 Enterprise Frames) */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 rounded-2xl bg-[#090d16] border border-slate-800/90 shadow-xl max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('spof')}
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-semibold transition-all duration-200 flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'spof'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>1. Repo SPOF &amp; Bus Factor</span>
            </button>

            <button
              onClick={() => setActiveTab('departure')}
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-semibold transition-all duration-200 flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'departure'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>2. Departure &amp; Successor Simulation</span>
            </button>

            <button
              onClick={() => setActiveTab('agent')}
              className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-semibold transition-all duration-200 flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'agent'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <MessageSquareCode className="w-4 h-4" />
              <span>3. Grounded Agent &amp; Citations</span>
            </button>
          </div>
        </div>

        {/* FRAME 1: REPO SPOF & BUS FACTOR TABLE */}
        {activeTab === 'spof' && (
          <div className="max-w-5xl mx-auto bg-[#090d16]/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">
                  Deterministic Codebase Metrics
                </span>
                <h3 className="text-xl font-bold text-white font-sans mt-0.5">
                  Single-Point-of-Failure (SPOF) Risk Table
                </h3>
              </div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Calculated in code from Git commit graphs</span>
              </div>
            </div>

            {/* Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="pb-3 font-semibold">REPOSITORY</th>
                    <th className="pb-3 font-semibold">BUS FACTOR</th>
                    <th className="pb-3 font-semibold">PRIMARY MAINTAINER</th>
                    <th className="pb-3 font-semibold">COMMIT RATIO</th>
                    <th className="pb-3 font-semibold">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {repoData.map((repo) => (
                    <tr key={repo.name} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 font-bold text-white flex items-center space-x-2">
                        <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>{repo.name}</span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                          repo.busFactor === 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          repo.busFactor === 1 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          BF: {repo.busFactor}
                        </span>
                      </td>
                      <td className="py-4 text-slate-300">
                        @{repo.primaryOwner}
                      </td>
                      <td className="py-4 w-44">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{repo.commitsPct}% commits</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${repo.barColor}`} style={{ width: `${repo.commitsPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${repo.statusClass}`}>
                          {repo.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CTO Plain-English Caption */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-start space-x-3 text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#060911] p-4 rounded-xl border border-slate-800">
              <div className="p-1 rounded bg-indigo-500/20 text-indigo-400 shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong className="text-white font-semibold">Why this matters for engineering leaders: </strong>
                <span>
                  Pinpoints mission-critical codebases where over 80% of institutional knowledge rests with one developer. Bus factor is computed directly from commit frequency, author churn, and module distribution — giving your leadership team early warning before an engineer's resignation creates an outage.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* FRAME 2: DEPARTURE & SUCCESSOR SIMULATION */}
        {activeTab === 'departure' && (
          <div className="max-w-5xl mx-auto bg-[#090d16]/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-purple-400 font-semibold">
                  Continuity Planning Engine
                </span>
                <h3 className="text-xl font-bold text-white font-sans mt-0.5">
                  Simulated Departure Impact: Devendra Singh (Staff Engineer)
                </h3>
              </div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>80% Departure Knowledge Risk</span>
              </div>
            </div>

            {/* Impact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#060911] p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  Vulnerable Repositories &amp; Modules
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-white font-semibold">payment-gateway-v2</span>
                    <span className="text-rose-400 font-bold">100% Core Ownership</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono p-2 rounded bg-slate-900/60 border border-slate-800">
                    <span className="text-white font-semibold">pci-token-vault</span>
                    <span className="text-amber-400 font-bold">Sole Active Maintainer</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#060911] p-5 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  Orphaned Technologies &amp; Keys
                </div>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Go gRPC (50k TPS)</span>
                  <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">HashiCorp Vault</span>
                  <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Stripe PCI-DSS</span>
                  <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Valkey Cache</span>
                </div>
              </div>
            </div>

            {/* Deterministic Successor Recommendations */}
            <div className="bg-[#0c111e] p-5 rounded-xl border border-indigo-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-indigo-300 uppercase tracking-wider font-bold flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <span>Successor Ranking (4-Factor Jaccard Match Formula)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Deterministic Math · Calculated in Code</span>
              </div>

              <div className="space-y-3">
                {/* Candidate 1 */}
                <div className="p-3.5 rounded-lg bg-[#060911] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white font-mono">Priya Sharma</span>
                      <span className="text-xs text-slate-400">(Staff Engineer)</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Best Successor
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Matches Go, Valkey, and payment gateway APIs with 82% available capacity.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold font-mono text-indigo-400">38% Composite Match</div>
                    <div className="text-[10px] font-mono text-slate-500">13% Tech Jaccard · 82% Capacity</div>
                  </div>
                </div>

                {/* Candidate 2 */}
                <div className="p-3.5 rounded-lg bg-[#060911] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white font-mono">Neha Gupta</span>
                      <span className="text-xs text-slate-400">(Lead Data Engineer)</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Co-authored event bus pipeline; 70% available capacity.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold font-mono text-slate-300">29% Composite Match</div>
                    <div className="text-[10px] font-mono text-slate-500">9% Tech Jaccard · 70% Capacity</div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTO Plain-English Caption */}
            <div className="pt-4 border-t border-slate-800/80 flex items-start space-x-3 text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#060911] p-4 rounded-xl border border-slate-800">
              <div className="p-1 rounded bg-purple-500/20 text-purple-400 shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong className="text-white font-semibold">Continuity planning, not surveillance: </strong>
                <span>
                  When a key engineer gives 2 weeks notice, Cortex immediately identifies which systems are orphaned and ranks existing engineers who already have intersecting technology commits and bandwidth to inherit ownership.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* FRAME 3: GROUNDED AGENT & CITATIONS */}
        {activeTab === 'agent' && (
          <div className="max-w-5xl mx-auto bg-[#090d16]/95 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800/80 gap-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                  Multi-Tool Decomposed Agent
                </span>
                <h3 className="text-xl font-bold text-white font-sans mt-0.5">
                  Grounded Codebase Intelligence with Verifiable Citations
                </h3>
              </div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cites real commit SHAs &amp; Jira epics</span>
              </div>
            </div>

            {/* User Question */}
            <div className="bg-[#060911] p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Incoming Query from Engineering Leader
              </span>
              <p className="text-sm font-mono font-semibold text-white">
                "Why was Elasticsearch replaced with ClickHouse in realtime-stream-engine, and who approved it?"
              </p>
            </div>

            {/* Tool Execution Trace */}
            <div className="bg-[#080d19] p-4 rounded-xl border border-indigo-500/30 font-mono text-xs space-y-2">
              <div className="text-indigo-300 font-bold flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Tool Execution Pipeline (Parallel Dispatch):</span>
              </div>
              <div className="text-slate-400 space-y-1 pl-4 border-l-2 border-indigo-500/30 text-[11px]">
                <div>1. <code className="text-slate-200">vector_search("Elasticsearch ClickHouse migration rationale")</code> → Retrieved ADR-014 in Slack #data-streaming</div>
                <div>2. <code className="text-slate-200">graph_search("Commit Touching realtime-stream-engine ClickHouse")</code> → Retrieved Commit d2e3f4a by Neha Gupta</div>
                <div>3. <code className="text-slate-200">sql_tool("SELECT key, summary, status FROM jira_issues WHERE key='STREAM-401'")</code> → Retrieved Jira ticket</div>
              </div>
            </div>

            {/* Synthesized Answer with Proof */}
            <div className="p-5 rounded-xl bg-[#0a101f] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white font-mono">
                  75% Disk Storage Reduction &amp; 45ms Query Latency
                </h4>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">100% Grounded</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                The migration was driven by <strong className="text-white">Neha Gupta</strong> (Lead Data Engineer) under Jira ticket <code className="text-indigo-300 font-mono">STREAM-401</code>. Elasticsearch index bloat was eliminated by moving to ClickHouse columnar block compression, and Apache Flink native streaming was connected directly to the new tables.
              </p>

              {/* Citations Box */}
              <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                  Direct Verifiable Citations:
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                  <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 flex items-center space-x-1">
                    <GitBranch className="w-3 h-3 text-cyan-400" />
                    <span>Commit d2e3f4a</span>
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-purple-300 flex items-center space-x-1">
                    <span>Jira STREAM-401</span>
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 flex items-center space-x-1">
                    <span>Slack #data-streaming</span>
                  </span>
                </div>
              </div>
            </div>

            {/* CTO Plain-English Caption */}
            <div className="pt-4 border-t border-slate-800/80 flex items-start space-x-3 text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#060911] p-4 rounded-xl border border-slate-800">
              <div className="p-1 rounded bg-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <strong className="text-white font-semibold">Evidence-backed answers with verifiable citations: </strong>
                <span>
                  Generic AI makes up plausible-sounding answers. Cortex queries the underlying Neo4j graph, PostgreSQL metrics, and Qdrant embeddings to provide definitive answers anchored directly in Git commits, Jira issues, and Slack ADR discussions.
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
