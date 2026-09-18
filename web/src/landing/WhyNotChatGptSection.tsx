import React from 'react';
import { 
  XCircle, 
  CheckCircle2, 
  Bot, 
  Network
} from 'lucide-react';
import { TrustBadge } from './TrustBadge';

export const WhyNotChatGptSection: React.FC = () => {
  return (
    <section id="why-cortex" className="py-24 md:py-32 bg-[#06080e] relative overflow-hidden border-t border-slate-800/80 antialiased">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0c111e] border border-slate-800/80 text-indigo-400 text-xs font-mono mb-4">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>Architecture &amp; Distinction</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            "Isn't this just ChatGPT with extra steps?"
          </h2>

          <p className="mt-5 text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            <strong className="text-white font-semibold">No.</strong> ChatGPT has zero access to your company's data, cannot perform deterministic math (Bus Factor, risk formulas), and cannot merge developer identities across tools.
          </p>
          <p className="mt-2 text-sm sm:text-base text-slate-400 font-normal leading-relaxed">
            Cortex builds the persistent Knowledge Graph and computes the hard math <strong className="text-indigo-300 font-semibold">FIRST</strong> — the AI simply translates verified graph evidence into plain English.
          </p>
        </div>

        {/* Side-by-Side Comparison Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* LEFT CARD: Raw ChatGPT / General LLMs */}
          <div className="p-8 rounded-2xl bg-[#090c15] border border-slate-800/80 space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-200">Raw ChatGPT / Generic LLMs</h3>
                    <p className="text-xs text-slate-500 font-mono">Unconnected Language Model</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-slate-800/80 text-slate-400 uppercase">
                  Text Generator
                </span>
              </div>

              <div className="space-y-4 font-sans text-xs sm:text-sm text-slate-400">
                <div className="flex items-start space-x-3">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-300 font-semibold block">Manual Data Copy-Paste:</strong>
                    <span>No live connection to your infrastructure. Context windows expire and forget your codebase.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-300 font-semibold block">Guesses &amp; Hallucinates on Math:</strong>
                    <span>LLMs cannot reliably compute Bus Factor, percentile coverage, or Jaccard similarity without making up numbers.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-300 font-semibold block">Fragmented Identity Silos:</strong>
                    <span>Treats <code className="text-slate-300 font-mono">Arjun9756</code> on GitHub, <code className="text-slate-300 font-mono">U098...</code> on Slack, and Git emails as completely unrelated strangers.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-300 font-semibold block">Zero Grounded Proof:</strong>
                    <span>Answers come without verifiable Git commit hashes, Jira ticket keys, or traceable source links.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-500 text-xs font-mono">
              Outcome: High risk of hallucination; requires constant manual context feeding.
            </div>
          </div>

          {/* RIGHT CARD: Cortex Enterprise Platform */}
          <div className="p-8 rounded-2xl bg-gradient-to-b from-[#0e1424] to-[#0a0f1d] border border-indigo-500/40 shadow-2xl shadow-indigo-950/50 space-y-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-indigo-500/20">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    <Network className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">Cortex Intelligence Platform</h3>
                    <p className="text-xs text-indigo-300 font-mono">Knowledge Graph + Deterministic Math</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Connected Graph
                </span>
              </div>

              <div className="space-y-4 font-sans text-xs sm:text-sm text-slate-200">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Automatic 24/7 Webhook Ingestion:</strong>
                    <span>Continuously syncs GitHub pushes/PRs, Jira issues, and Slack architectural ADRs in real time.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-white font-semibold block">Deterministic Risk Math:</strong>
                      <TrustBadge label="Formula calculated in code" />
                    </div>
                    <span className="text-slate-300 text-xs mt-0.5 block">
                      Calculates exact Bus Factor formulas and 4-factor Jaccard successor matches in code before LLM synthesis.
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Cross-Platform Identity Resolution:</strong>
                    <span>Merges GitHub logins, Slack IDs, and Git commit emails into unified developer profile nodes.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white font-semibold block">Traceable Multi-Source Evidence:</strong>
                    <span>Every answer is linked to exact commit SHAs (<code className="text-purple-300 font-mono text-xs">d2e3f4a</code>), Jira epics, and Slack channel discussions.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs font-mono flex items-center justify-between">
              <span>Outcome: Grounded graph intelligence with mathematical proof.</span>
            </div>
          </div>

        </div>

        {/* Core Architecture Callout Strip */}
        <div className="mt-12 max-w-4xl mx-auto p-6 rounded-2xl bg-[#080d18] border border-slate-800 text-center space-y-2">
          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
            <strong className="text-white">The Bottom Line:</strong> LLMs are just a voice box. The central nervous system — the multi-hop Neo4j graph, the PostgreSQL risk analytics, the live webhook pipeline, and the identity resolution engine — <strong className="text-indigo-300">is Cortex.</strong>
          </p>
        </div>

      </div>
    </section>
  );
};
