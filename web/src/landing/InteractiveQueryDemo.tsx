import React, { useState } from 'react';
import { 
  Sparkles, 
  GitCommit, 
  Layers, 
  CheckCircle2, 
  MessageSquare, 
  Calculator
} from 'lucide-react';

interface SampleQuery {
  id: string;
  category: string;
  badgeColor: string;
  question: string;
  routeTelemetry: {
    tool: string;
    latency: string;
    strategy: string;
  };
  answer: {
    headline: string;
    summary: string;
    keyPoints: Array<{ label: string; value: string }>;
    mathProof?: string;
  };
  citations: Array<{
    type: 'git' | 'jira' | 'slack' | 'math';
    label: string;
    detail: string;
  }>;
}

const SAMPLE_QUERIES: SampleQuery[] = [
  {
    id: 'clickhouse-migration',
    category: 'Architectural Decision (ADR)',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    question: 'Why was Elasticsearch replaced with ClickHouse in realtime-stream-engine?',
    routeTelemetry: {
      tool: 'vector_search',
      latency: '18ms',
      strategy: 'Semantic Embedding Sub-Question Retrieval'
    },
    answer: {
      headline: '75% Storage Reduction & Sub-50ms Query Latency',
      summary: 'The migration was driven by Neha Gupta (Lead Data Engineer) under STREAM-401 to replace batch-oriented Elasticsearch log indexing with ClickHouse columnar compression and Apache Flink native streaming.',
      keyPoints: [
        { label: 'Disk Footprint', value: 'Reduced by 75% via ClickHouse columnar block compression vs Elasticsearch index.' },
        { label: 'Query Latency', value: 'Dropped from 1.8s down to 45ms (~97% faster analytical response times).' },
        { label: 'Pipeline Architecture', value: 'Apache Flink stateful windowing pipeline now writes directly to ClickHouse tables.' }
      ]
    },
    citations: [
      { type: 'git', label: 'Commit d2e3f4a', detail: 'STREAM-408: Implemented ClickHouse columnar table sink in realtime-stream-engine' },
      { type: 'jira', label: 'Jira STREAM-401', detail: 'Replace Elasticsearch with ClickHouse & Apache Flink for real-time telemetry' },
      { type: 'slack', label: 'Slack #data-streaming', detail: 'Neha Gupta: ClickHouse + Flink streaming is live! Columnar compression cut disk by 75%' }
    ]
  },
  {
    id: 'successor-simulation',
    category: 'Successor Recommendation & SPOF',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    question: 'If Devendra Singh leaves tomorrow, who is the best backup owner for payment-gateway-v2?',
    routeTelemetry: {
      tool: 'knowledge_risk + successor_service',
      latency: '24ms',
      strategy: '4-Factor Jaccard Similarity & Workload Capacity'
    },
    answer: {
      headline: 'Priya Sharma (38% Composite Match • 82% Available Capacity)',
      summary: 'Devendra Singh holds 100% commit ownership on payment-gateway-v2 (Bus Factor = 1, 80% SPOF risk). Cortex evaluated candidate engineers using the deterministic 4-factor formula (Jaccard technology similarity, commit overlap, recency, and capacity).',
      keyPoints: [
        { label: 'Primary Candidate', value: 'Priya Sharma (Staff Engineer) has matching expertise in Go, Valkey, and Stripe API.' },
        { label: 'Skill Similarity', value: '13% Jaccard technology set overlap across payment and ledger infrastructure.' },
        { label: 'Workload Capacity', value: '82% available bandwidth with low existing departure risk (18%).' }
      ],
      mathProof: 'Composite Match = 0.40*(Tech Jaccard) + 0.25*(Repo Overlap) + 0.20*(Recency) + 0.15*(Capacity)'
    },
    citations: [
      { type: 'git', label: 'Commit f1a2b3c', detail: 'PAY-901: Architected core PCI-DSS tokenization pipeline in Go & HashiCorp Vault' },
      { type: 'jira', label: 'Jira PAY-901', detail: 'Architect Go gRPC and HashiCorp Vault tokenization pipeline in payment-gateway-v2' },
      { type: 'slack', label: 'Slack #fintech-payments', detail: 'Devendra Singh: Finalized payment-gateway-v2 architecture using Go & Vault (50k TPS)' },
      { type: 'math', label: 'Deterministic Engine', detail: '4-Factor Jaccard formula calculated in code — Grounded proof' }
    ]
  },
  {
    id: 'cve-remediation',
    category: 'Security Remediation & Git SHA',
    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    question: 'How was CVE-2026-1082 remediated in auth-service, and which commit contains the fix?',
    routeTelemetry: {
      tool: 'vector_search + graph_search',
      latency: '15ms',
      strategy: 'Multi-hop Commit & Issue Entity Grounding'
    },
    answer: {
      headline: 'Enforced OAuth2 PKCE & Rotated RS256 Signing Keys',
      summary: 'Vikram Patel patched CVE-2026-1082 (JWT signature validation vulnerability) by enforcing strict PKCE verification and migrating all authentication tokens from HS256 to RS256 RSA keys.',
      keyPoints: [
        { label: 'Definitive Commit', value: 'c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d9 (authored by Vikram Patel in auth-service).' },
        { label: 'Modified Files', value: 'services/auth/jwt.ts, services/auth/pkce.ts, and config/keys.json.' },
        { label: 'Token Lifecycle', value: 'Legacy HS256 tokens expired at midnight; all microservices now verify against RS256 JWKS.' }
      ]
    },
    citations: [
      { type: 'git', label: 'Commit c9d8e7f', detail: 'AUTH-501: Remediated CVE-2026-1082 via PKCE enforcement and RS256 key rotation' },
      { type: 'jira', label: 'Jira AUTH-501', detail: 'Remediate CVE-2026-1082 JWT signature validation vulnerability in auth-service' },
      { type: 'slack', label: 'Slack #secops', detail: 'Vikram Patel: AUTH-501 patch applied via commit c9d8e7f6... RS256 rotation complete' }
    ]
  }
];

export const InteractiveQueryDemo: React.FC = () => {
  const [selectedQueryId, setSelectedQueryId] = useState<string>('clickhouse-migration');

  const selectedQuery = SAMPLE_QUERIES.find(q => q.id === selectedQueryId) || SAMPLE_QUERIES[0];

  return (
    <div className="w-full rounded-2xl border border-slate-800/80 bg-[#090d16]/95 shadow-2xl shadow-indigo-950/40 overflow-hidden backdrop-blur-xl">
      
      {/* Top Demo Header */}
      <div className="px-5 py-3.5 bg-[#060911] border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-mono text-slate-300 font-semibold pl-2">
            Interactive Query Walkthrough • Grounded Multi-Source Evidence
          </span>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span>Representative Scenario (Fixture Data)</span>
        </div>
      </div>

      {/* Question Selector Tabs */}
      <div className="p-4 bg-[#070b14] border-b border-slate-800/80">
        <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider block mb-2.5">
          Select an Example Walkthrough Scenario:
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {SAMPLE_QUERIES.map((q) => {
            const isSelected = q.id === selectedQueryId;
            return (
              <button
                key={q.id}
                onClick={() => setSelectedQueryId(q.id)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/90 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${q.badgeColor}`}>
                    {q.category}
                  </span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />}
                </div>
                <p className={`text-xs font-medium line-clamp-2 ${isSelected ? 'text-white font-semibold' : 'text-slate-300'}`}>
                  "{q.question}"
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Query Display & Response Body */}
      <div className="p-6 sm:p-8 space-y-6 bg-[#070a12] font-sans">
        
        {/* Telemetry Route Banner */}
        <div className="p-3 bg-[#0b101c] border border-indigo-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 text-[10px]">
              TOOL: {selectedQuery.routeTelemetry.tool}
            </span>
            <span className="text-slate-400 text-[11px]">
              Latency: <strong className="text-emerald-400">{selectedQuery.routeTelemetry.latency}</strong>
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 text-[11px]">
              {selectedQuery.routeTelemetry.strategy}
            </span>
          </div>

          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Calculator className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
            <span>Deterministic Graph Traversal</span>
          </span>
        </div>

        {/* User Question Bubble */}
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0 text-xs">
            Q
          </div>
          <div className="bg-[#0e1424] p-4 rounded-2xl rounded-tl-none border border-slate-800 text-white w-full font-medium text-sm shadow-md">
            "{selectedQuery.question}"
          </div>
        </div>

        {/* Cortex Verified Answer Card */}
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          
          <div className="bg-[#0b1120] p-6 rounded-2xl rounded-tl-none border border-slate-800 space-y-4 w-full shadow-xl">
            {/* Headline */}
            <div>
              <h4 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>{selectedQuery.answer.headline}</span>
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {selectedQuery.answer.summary}
              </p>
            </div>

            {/* Key Verified Takeaway Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs pt-1">
              {selectedQuery.answer.keyPoints.map((pt, i) => (
                <div key={i} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                    {pt.label}
                  </span>
                  <p className="text-slate-300 text-[11px] leading-snug">
                    {pt.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Optional Math Proof Drawer */}
            {selectedQuery.answer.mathProof && (
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 font-mono text-[11px] text-indigo-200 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Formula: <strong className="text-white">{selectedQuery.answer.mathProof}</strong></span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase font-bold shrink-0">
                  Deterministic
                </span>
              </div>
            )}

            {/* ─── EVIDENCE CITATION CHIPS ───────────────────────────────────── */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Evidence Citations (Grounding Subgraph):</span>
              </span>

              <div className="flex flex-wrap gap-2 pt-0.5">
                {selectedQuery.citations.map((c, idx) => (
                  <div
                    key={idx}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                      c.type === 'git'
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        : c.type === 'jira'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                        : c.type === 'slack'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}
                    title={c.detail}
                  >
                    {c.type === 'git' && <GitCommit className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                    {c.type === 'jira' && <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    {c.type === 'slack' && <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {c.type === 'math' && <Calculator className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    <span className="font-bold">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
