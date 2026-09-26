import React, { useState } from 'react';
import { 
  Cpu, 
  Terminal 
} from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const [activeStage, setActiveStage] = useState<number>(1);

  const stages = [
    {
      id: 1,
      step: '01',
      title: 'Scoped Read-Only Ingestion (BYOC Boundary)',
      badge: 'Zero Code Egress',
      summary:
        'Connects to GitHub, Slack, and Jira through scoped, read-only webhooks inside your private VPC perimeter. Cortex never clones or exports raw repository blobs.',
      technicalDetails: [
        { label: 'GitHub Scopes', value: 'Read-only metadata: commit authors, git trailers (Co-authored-by), PR review timestamps, diff volume.' },
        { label: 'Slack & Jira', value: 'Public architectural discussion channels, thread resolutions, and issue status transitions.' },
        { label: 'Cryptographic Auth', value: 'All incoming webhooks verified with HMAC SHA-256 signatures before worker queue dispatch.' }
      ],
      codeSample: `// packages/ingestion/github/processGithubEvent.ts
export async function processGithubEvent(event: IngestionPayload) {
  // Scoped read-only parser: extract commit metadata & trailers
  const { sha, author, message, additions, deletions, files } = event;
  const coAuthors = parseGitTrailers(message); // credits Co-authored-by
  await queueIngestionJob({ sha, author, coAuthors, filesCount: files.length });
}`
    },
    {
      id: 2,
      step: '02',
      title: 'Entity Resolution & Living Property Graph',
      badge: 'Identity Parity',
      summary:
        'Resolves fragmented aliases across tools (git emails, GitHub handles, Slack user IDs) into a unified canonical engineer entity within a private Neo4j graph.',
      technicalDetails: [
        { label: 'Alias Resolution', value: 'Dynamic identity mapping ties alice@acme.com, @alice-dev, and U02XYZ to Alice Zhang.' },
        { label: 'Graph Compaction', value: 'Commits roll up into (:PERSON)-[:CONTRIBUTED_TO {commitCount, lastCommitAt}]->(:REPOSITORY) to prevent node bloat.' },
        { label: 'Vector Index', value: 'Architectural context and PR discussions embedded in private Qdrant vectors for semantic retrieval.' }
      ],
      codeSample: `// packages/analytics/knowledge.risk.predict.ts
// Cypher relationship traversal with identity alias resolution
MATCH (p:PERSON)-[rel:CONTRIBUTED_TO]->(r:REPOSITORY)
WHERE (p.canonicalPersonId = $canonicalPersonId OR p.name IN $names)
  AND NOT p.name ENDS WITH '[bot]'
RETURN r.name AS repository, sum(rel.commitCount) AS totalCommits,
       rel.lastCommitAt AS lastActiveTimestamp`
    },
    {
      id: 3,
      step: '03',
      title: 'Deterministic Metric & Risk Computation',
      badge: 'Zero AI Guesswork',
      summary:
        'Pure TypeScript mathematical algorithms run directly on PostgreSQL and Neo4j telemetry. No LLM touches or generates any risk score, bus factor, or metric.',
      technicalDetails: [
        { label: 'Bus Factor', value: 'Minimum contributors whose combined volume covers >=50% of repository commits. B=1 flags Critical SPOF.' },
        { label: 'Ownership Decay', value: 'Time-weighted exponential decay with 180-day half-life: w(c) = exp(-ln(2) * Δt / 180d).' },
        { label: '6-Factor Risk', value: '30% Ownership + 20% Dependency + 15% Activity + 15% Docs + 10% Expertise + 10% Workload.' }
      ],
      codeSample: `// packages/analytics/knowledge.service.ts
// 6-Factor Deterministic Knowledge Departure Risk Formula
const totalRisk =
    0.30 * ownership.score +      // Highest decayed code ownership
    0.20 * dependency.score +     // Downstream microservice dependencies
    0.15 * activity.score +       // Contribution recency decay
    0.15 * documentation.score +  // Undocumented microservices ratio
    0.10 * expertise.score +      // Exclusive single-expert technologies
    0.10 * pendingWork.score;     // Active in-flight PRs & open issues`
    },
    {
      id: 4,
      step: '04',
      title: 'Evidence-Backed Context & Grounded Answers',
      badge: 'Verifiable Citations',
      summary:
        'When engineers query system lineage or leaders review succession candidates, Cortex returns verifiable evidence chains with exact commit SHAs and PR links.',
      technicalDetails: [
        { label: 'Successor Ranking', value: '4-Factor match: 40% Tech Jaccard + 30% Repo overlap + 20% Activity + 10% Capacity headroom.' },
        { label: 'Evidence Chains', value: 'Every query response cites exact commit hashes, PR numbers, and referenced service dependencies.' },
        { label: 'Data Completeness', value: 'Explicit partial warnings when sample size < 5. Zero fabricated fallbacks when data is missing.' }
      ],
      codeSample: `// packages/analytics/successor.service.ts
// 4-Factor Successor Candidate Ranking
const compositeScore = 
    (0.40 * techJaccard) +        // |T_target ∩ T_candidate| / |T_target ∪ T_candidate|
    (0.30 * repoOverlapRatio) +   // Direct repository contribution experience
    (0.20 * recentActivityFactor) + // 30d/60d/90d recency decay
    (0.10 * capacityFactor);      // Headroom: 1.0 - existingRisk - spofPenalty`
    }
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-[#0B0F14] relative border-t border-white/10 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#12181F] border border-white/10 text-slate-300 text-xs font-mono mb-4">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Architecture &amp; Pipeline</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
            How Cortex operates in production.
          </h2>

          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            From scoped read-only webhooks inside your VPC to a deterministic knowledge graph with verifiable evidence chains.
          </p>
        </div>

        {/* Minimal Visual SVG Pipeline Diagram */}
        <div className="mb-14 p-6 sm:p-8 rounded-2xl bg-[#12181F] border border-white/10 overflow-x-auto">
          <div className="min-w-[720px] max-w-5xl mx-auto">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3 px-2">
              <span>CUSTOMER INFRASTRUCTURE BOUNDARY (VPC)</span>
              <span className="text-blue-400">DETERMINISTIC PIPELINE</span>
            </div>

            <svg viewBox="0 0 960 160" className="w-full h-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Flow Path Lines */}
              <path d="M 190 80 L 280 80" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 440 80 L 530 80" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 690 80 L 780 80" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 4" />

              {/* Node 1: Ingestion Sources */}
              <rect x="20" y="30" width="170" height="100" rx="10" fill="#0E131A" stroke="#2563EB" strokeWidth="1.5" />
              <text x="105" y="60" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="600" fontFamily="sans-serif">Read-Only Ingestion</text>
              <text x="105" y="82" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">GitHub · Slack · Jira</text>
              <text x="105" y="102" textAnchor="middle" fill="#3B82F6" fontSize="9" fontFamily="monospace">HMAC-SHA256 Webhooks</text>

              {/* Arrow 1 */}
              <polygon points="280,80 272,75 272,85" fill="#3B82F6" />

              {/* Node 2: Entity & Graph Engine */}
              <rect x="280" y="30" width="160" height="100" rx="10" fill="#0E131A" stroke="#2563EB" strokeWidth="1.5" />
              <text x="360" y="60" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="600" fontFamily="sans-serif">Living Knowledge Graph</text>
              <text x="360" y="82" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">Neo4j + Qdrant Vectors</text>
              <text x="360" y="102" textAnchor="middle" fill="#3B82F6" fontSize="9" fontFamily="monospace">Identity Resolution</text>

              {/* Arrow 2 */}
              <polygon points="530,80 522,75 522,85" fill="#3B82F6" />

              {/* Node 3: Deterministic Calculator */}
              <rect x="530" y="30" width="160" height="100" rx="10" fill="#0E131A" stroke="#2563EB" strokeWidth="1.5" />
              <text x="610" y="60" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="600" fontFamily="sans-serif">Deterministic Math</text>
              <text x="610" y="82" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">Bus Factor · Decay · Risk</text>
              <text x="610" y="102" textAnchor="middle" fill="#3B82F6" fontSize="9" fontFamily="monospace">TypeScript Engine</text>

              {/* Arrow 3 */}
              <polygon points="780,80 772,75 772,85" fill="#3B82F6" />

              {/* Node 4: Grounded Delivery */}
              <rect x="780" y="30" width="160" height="100" rx="10" fill="#0E131A" stroke="#2563EB" strokeWidth="1.5" />
              <text x="860" y="60" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="600" fontFamily="sans-serif">Grounded Delivery</text>
              <text x="860" y="82" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">Exact Citations &amp; SHAs</text>
              <text x="860" y="102" textAnchor="middle" fill="#3B82F6" fontSize="9" fontFamily="monospace">Zero Hallucination</text>
            </svg>
          </div>
        </div>

        {/* 4 Sequential Interactive Stages */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Stage Selector Tabs */}
          <div className="lg:col-span-5 space-y-3">
            {stages.map((stage) => {
              const isActive = activeStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStage(stage.id)}
                  className={`w-full text-left p-5 rounded-xl border transition-all cursor-pointer flex flex-col space-y-2 ${
                    isActive
                      ? 'bg-[#12181F] border-blue-500/40 shadow-lg'
                      : 'bg-[#0E131A]/60 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-blue-400">
                      STAGE {stage.step}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                      {stage.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white font-sans">
                    {stage.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    {stage.summary}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right: Active Stage Deep-Dive & Code Spec */}
          <div className="lg:col-span-7 bg-[#12181F] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
            {(() => {
              const current = stages.find(s => s.id === activeStage) || stages[0];
              return (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="space-y-1">
                      <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">
                        Stage {current.step} Technical Specification
                      </span>
                      <h4 className="text-lg font-bold text-white font-sans">
                        {current.title}
                      </h4>
                    </div>
                  </div>

                  {/* Technical Fact Matrix */}
                  <div className="space-y-3">
                    {current.technicalDetails.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-lg bg-[#0E131A] border border-white/5 space-y-1">
                        <div className="text-[11px] font-mono text-blue-400 font-semibold">
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-300 font-sans leading-relaxed">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Verifiable Code Sample */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                      <span className="flex items-center space-x-1.5">
                        <Terminal className="w-3.5 h-3.5 text-blue-400" />
                        <span>Codebase Implementation</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Pure TypeScript</span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#080B0F] border border-white/10 overflow-x-auto">
                      <pre className="font-mono text-xs text-slate-300 leading-relaxed">
                        <code>{current.codeSample}</code>
                      </pre>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

        </div>

      </div>
    </section>
  );
};
