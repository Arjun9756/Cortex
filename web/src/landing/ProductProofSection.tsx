import React, { useState } from 'react';
import { 
  ShieldAlert, 
  UserCheck, 
  MessageSquareCode, 
  GitBranch, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode, 
  Lock, 
  Search, 
  ExternalLink 
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
      badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      barColor: 'bg-rose-500',
      reason: '100% commit ownership by single author. Zero co-authors on SMS worker queue.'
    },
    {
      name: 'payment-gateway-v2',
      busFactor: 1,
      primaryOwner: 'devendrasingh',
      commitsPct: 84,
      status: 'Concentrated Risk',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      barColor: 'bg-amber-500',
      reason: 'Devendra Singh holds 84% commit volume. Sole author of PCI-DSS tokenization pipeline.'
    },
    {
      name: 'billing-service',
      busFactor: 1,
      primaryOwner: 'priyasharma',
      commitsPct: 80,
      status: 'Concentrated Risk',
      badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      barColor: 'bg-amber-500',
      reason: 'Priya Sharma is primary author of Stripe idempotency webhook handlers & invoice generator.'
    },
    {
      name: 'auth-service',
      busFactor: 3,
      primaryOwner: 'vikrampatel',
      commitsPct: 42,
      status: 'Distributed (Healthy)',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      barColor: 'bg-emerald-500',
      reason: 'Shared ownership across 3 active contributors. Documented OAuth2 PKCE key rotation.'
    }
  ];

  return (
    <section id="proof" className="py-20 md:py-28 bg-[#0B0F14] relative border-t border-white/10 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#12181F] border border-white/10 text-slate-300 text-xs font-mono mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Product Proof · Real Interface Views</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
            Quantifiable engineering risk. Not opinions.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Cortex parses git commits, PR review graphs, and issue discussions into deterministic risk metrics and grounded contextual search.
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-lg bg-[#12181F] border border-white/10 max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveTab('spof')}
              className={`px-4 sm:px-5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'spof'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>1. Single Point of Failure (SPOF)</span>
            </button>

            <button
              onClick={() => setActiveTab('departure')}
              className={`px-4 sm:px-5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'departure'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>2. Departure &amp; Successor Simulation</span>
            </button>

            <button
              onClick={() => setActiveTab('agent')}
              className={`px-4 sm:px-5 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'agent'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquareCode className="w-4 h-4" />
              <span>3. Grounded Q&amp;A With Citations</span>
            </button>
          </div>
        </div>

        {/* REAL BROWSER CHROME CONTAINER */}
        <div className="max-w-5xl mx-auto browser-chrome">
          {/* Browser Window Header Bar */}
          <div className="browser-header justify-between">
            <div className="flex items-center space-x-2">
              <span className="browser-dot bg-[#EF4444]/80" />
              <span className="browser-dot bg-[#F59E0B]/80" />
              <span className="browser-dot bg-[#10B981]/80" />
              <span className="text-xs text-slate-500 font-mono ml-2 hidden sm:inline">Cortex Enterprise UI</span>
            </div>

            {/* Simulated Address Bar */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-[#090D12] border border-white/5 rounded-md text-[11px] font-mono text-slate-400 w-72 sm:w-96 truncate">
              <Lock className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">
                {activeTab === 'spof' && 'https://cortex.internal/v1/metrics/bus-factor'}
                {activeTab === 'departure' && 'https://cortex.internal/v1/simulate/devendra-singh'}
                {activeTab === 'agent' && 'https://cortex.internal/v1/grounded-query?q=clickhouse-migration'}
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
              VPC Isolated
            </div>
          </div>

          {/* Browser Window Body Content */}
          <div className="p-6 sm:p-8 bg-[#12181F]">
            
            {/* FRAME 1: REPO SPOF TABLE */}
            {activeTab === 'spof' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-bold text-white font-sans">
                        Repository Bus Factor Matrix
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Formula: Author Dispersion
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Computed from 1,420 commits across 4 services over a 180-day rolling window.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                    <span>Export CSV</span>
                    <span>·</span>
                    <span className="text-blue-400">View Cypher Query</span>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-[11px]">
                        <th className="pb-3 font-semibold">SERVICE</th>
                        <th className="pb-3 font-semibold">BUS FACTOR</th>
                        <th className="pb-3 font-semibold">PRIMARY MAINTAINER</th>
                        <th className="pb-3 font-semibold">COMMIT RATIO</th>
                        <th className="pb-3 font-semibold">DIAGNOSTIC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {repoData.map((repo) => (
                        <tr key={repo.name} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 font-semibold text-white flex items-center space-x-2">
                            <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{repo.name}</span>
                          </td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              repo.busFactor === 0 ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' :
                              repo.busFactor === 1 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                              'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              BF: {repo.busFactor}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-300">
                            @{repo.primaryOwner}
                          </td>
                          <td className="py-3.5 w-40">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>{repo.commitsPct}% commits</span>
                              </div>
                              <div className="h-1.5 w-full bg-[#0E131A] rounded-full overflow-hidden">
                                <div className={`h-full ${repo.barColor}`} style={{ width: `${repo.commitsPct}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${repo.badgeClass}`}>
                              {repo.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Plain-spoken takeaway */}
                <div className="p-4 rounded-lg bg-[#0E131A] border border-white/10 text-xs text-slate-300 leading-relaxed flex items-start space-x-3">
                  <div className="w-5 h-5 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white">Why engineering leaders rely on this: </strong>
                    <span>
                      Identifies modules where knowledge is concentrated in a single head before an unexpected departure triggers a production incident. No manual surveys or documentation sprints required.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* FRAME 2: DEPARTURE & SUCCESSOR SIMULATION */}
            {activeTab === 'departure' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white font-sans">
                      Departure Impact Simulation: Devendra Singh (Staff Engineer)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Evaluates orphaned components, unreviewed pull requests, and matching successors based on tech stack intersection.
                    </p>
                  </div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>84% Core Payment Risk</span>
                  </div>
                </div>

                {/* At-risk modules grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-[#0E131A] border border-white/10 space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Vulnerable Modules &amp; Repositories
                    </span>
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between p-2 rounded bg-[#12181F] border border-white/5">
                        <span className="text-white">payment-gateway-v2</span>
                        <span className="text-rose-400">Sole Active Maintainer</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-[#12181F] border border-white/5">
                        <span className="text-white">pci-token-vault</span>
                        <span className="text-amber-400">84% Ownership</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-[#0E131A] border border-white/10 space-y-2">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      Associated Technologies &amp; Keys
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1 text-xs font-mono">
                      <span className="px-2 py-1 rounded bg-[#12181F] text-slate-300 border border-white/10">Go gRPC (50k TPS)</span>
                      <span className="px-2 py-1 rounded bg-[#12181F] text-slate-300 border border-white/10">HashiCorp Vault</span>
                      <span className="px-2 py-1 rounded bg-[#12181F] text-slate-300 border border-white/10">Stripe PCI-DSS</span>
                      <span className="px-2 py-1 rounded bg-[#12181F] text-slate-300 border border-white/10">Valkey Cache</span>
                    </div>
                  </div>
                </div>

                {/* Successor Recommendation */}
                <div className="p-5 rounded-lg bg-[#0E131A] border border-blue-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      <span>Recommended Successors (4-Factor Jaccard Match)</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Deterministic Algorithm</span>
                  </div>

                  <div className="space-y-2.5">
                    {/* Candidate 1 */}
                    <div className="p-3 rounded-lg bg-[#12181F] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-white font-mono">Priya Sharma</span>
                          <span className="text-xs text-slate-400">(Staff Engineer)</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Primary Recommendation
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Co-authors payment gateway webhook handlers; 82% current bandwidth capacity.
                        </p>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <div className="text-sm font-bold text-blue-400">38% Composite Match</div>
                        <div className="text-[10px] text-slate-500">Go, Vault, Postgres overlap</div>
                      </div>
                    </div>

                    {/* Candidate 2 */}
                    <div className="p-3 rounded-lg bg-[#12181F] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-white font-mono">Neha Gupta</span>
                          <span className="text-xs text-slate-400">(Lead Data Engineer)</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Maintains event pipeline consuming payment events; 70% available capacity.
                        </p>
                      </div>
                      <div className="text-right shrink-0 font-mono">
                        <div className="text-sm font-semibold text-slate-300">29% Composite Match</div>
                        <div className="text-[10px] text-slate-500">Kafka &amp; Go overlap</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plain-spoken takeaway */}
                <div className="p-4 rounded-lg bg-[#0E131A] border border-white/10 text-xs text-slate-300 leading-relaxed flex items-start space-x-3">
                  <div className="w-5 h-5 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white">Continuity without drama: </strong>
                    <span>
                      When an engineer gives notice, leadership immediately knows which internal peers already share the necessary technical context to take over ownership smoothly.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* FRAME 3: GROUNDED AGENT Q&A */}
            {activeTab === 'agent' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white font-sans">
                      Grounded Codebase Search with Source Citations
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Queries graph topology and vector search in parallel. Returns answers backed by exact Git commits and Jira epics.
                    </p>
                  </div>
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
                    <Search className="w-3.5 h-3.5" />
                    <span>Exact Source Citations</span>
                  </div>
                </div>

                {/* Simulated Query Box */}
                <div className="p-3.5 rounded-lg bg-[#0E131A] border border-white/10">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                    Leadership Query:
                  </span>
                  <p className="text-sm font-mono text-white font-medium">
                    "Why was Elasticsearch replaced with ClickHouse in realtime-stream-engine, and who approved it?"
                  </p>
                </div>

                {/* Execution Trace */}
                <div className="p-4 rounded-lg bg-[#0E131A] border border-white/10 font-mono text-xs space-y-2">
                  <div className="text-blue-400 font-semibold flex items-center space-x-2 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>Graph &amp; Vector Execution Trace:</span>
                  </div>
                  <div className="space-y-1 text-slate-400 pl-3 border-l border-white/10 text-[11px]">
                    <div>1. <code className="text-slate-200">vector_search("ClickHouse migration rationale")</code> → Retrieved ADR-014 from Slack #data-streaming</div>
                    <div>2. <code className="text-slate-200">{"graph_cypher(\"MATCH (p:Person)-[:AUTHORED]->(c:Commit)-[:TOUCHES]->(:Repo {name: 'realtime-stream'})\")"}</code> → Retrieved Commit d2e3f4a</div>
                    <div>3. <code className="text-slate-200">jira_lookup("STREAM-401")</code> → Epic status: Done by Neha Gupta</div>
                  </div>
                </div>

                {/* Grounded Result Box */}
                <div className="p-5 rounded-lg bg-[#0E131A] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">
                      Migration Rationale &amp; Author Lineage
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                      Verified from 3 Sources
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                    The migration was led by <strong className="text-white">Neha Gupta</strong> (Lead Data Engineer) under Jira ticket <code className="text-blue-400 font-mono">STREAM-401</code> to resolve 75% disk storage bloat. Elasticsearch index compaction issues were eliminated by switching to ClickHouse columnar compression, reducing query latency from 340ms to 45ms for realtime streaming dashboards.
                  </p>

                  {/* Citations list */}
                  <div className="pt-3 border-t border-white/10 space-y-2 font-mono text-xs">
                    <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
                      Verifiable Source Links:
                    </span>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2.5 py-1 rounded bg-[#12181F] border border-white/10 text-slate-300 flex items-center space-x-1.5">
                        <GitBranch className="w-3 h-3 text-blue-400" />
                        <span>Commit d2e3f4a (merged 2024-08-14)</span>
                      </span>
                      <span className="px-2.5 py-1 rounded bg-[#12181F] border border-white/10 text-slate-300 flex items-center space-x-1.5">
                        <ExternalLink className="w-3 h-3 text-purple-400" />
                        <span>Jira Epic STREAM-401</span>
                      </span>
                      <span className="px-2.5 py-1 rounded bg-[#12181F] border border-white/10 text-slate-300 flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Slack #data-streaming (thread 1892)</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plain-spoken takeaway */}
                <div className="p-4 rounded-lg bg-[#0E131A] border border-white/10 text-xs text-slate-300 leading-relaxed flex items-start space-x-3">
                  <div className="w-5 h-5 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <strong className="text-white">Zero hallucination risk: </strong>
                    <span>
                      General-purpose AI guesses and invents code reasons. Cortex anchors every sentence to an audited Git commit, Jira ticket, or Slack architecture discussion.
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </section>
  );
};
