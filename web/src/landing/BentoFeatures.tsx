import React from 'react';
import { MessageSquareText, ShieldAlert, Webhook, GitFork, Zap, Sparkles } from 'lucide-react';

export const BentoFeatures: React.FC = () => {
  return (
    <section id="features" className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10">
      {/* Background radial glow */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Built &amp; Tested Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
            Engineered for Engineering Teams
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#9497A6]">
            No unbuilt promises. Cortex turns complex codebase history into precise, actionable graph intelligence.
          </p>
        </div>

        {/* Bento Grid (5 Tiles Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          
          {/* Tile 1: Ask in Plain English */}
          <div className="md:col-span-2 bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl p-6 transition-all duration-200 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <MessageSquareText className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-[#F5F5F7] font-mono mb-2">
                Ask in Plain English
              </h3>
              <p className="text-sm text-[#9497A6] leading-relaxed max-w-xl">
                Natural language Q&amp;A over your entire engineering organization. Ask who built a service, why an architectural decision was made, or how an API endpoint behaves.
              </p>
            </div>

            {/* Visual Mini Element */}
            <div className="mt-6 p-4 rounded-lg bg-[#0A0B0E] border border-white/10 font-mono text-xs text-[#F5F5F7]">
              <div className="flex items-center space-x-2 text-[#3B82F6] mb-2">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span className="font-semibold text-[#F5F5F7]">User Prompt:</span>
                <span>"Why do we retry payment webhooks 5 times?"</span>
              </div>
              <p className="text-[#9497A6] pl-4 border-l-2 border-[#3B82F6]/30 leading-relaxed">
                Found context in <span className="text-[#3B82F6]">Jira ENG-1402</span> (authored by @sarah) &amp; <span className="text-[#F5F5F7]">Slack #proj-payments</span>: Stripe API rate limits spike during peak hours.
              </p>
            </div>
          </div>

          {/* Tile 2: Knowledge Risk Scoring */}
          <div className="bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl p-6 transition-all duration-200 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-[#F5F5F7] font-mono mb-2">
                Knowledge Risk Scoring
              </h3>
              <p className="text-sm text-[#9497A6] leading-relaxed">
                See which people and systems are single points of failure before someone leaves your organization.
              </p>
            </div>

            {/* Visual Mini Element */}
            <div className="mt-6 p-3.5 rounded-lg bg-[#0A0B0E] border border-red-500/30 flex items-center justify-between font-mono text-xs">
              <span className="text-[#9497A6]">Bus Factor Risk:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                HIGH (1 owner)
              </span>
            </div>
          </div>

          {/* Tile 3: Multi-Source Ingestion */}
          <div className="bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl p-6 transition-all duration-200 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <Webhook className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-[#F5F5F7] font-mono mb-2">
                Multi-Source Ingestion
              </h3>
              <p className="text-sm text-[#9497A6] leading-relaxed">
                Connects GitHub, Slack, and Jira automatically via real-time event webhooks with zero manual data entry.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-[#0A0B0E] border border-white/10 text-[#F5F5F7]">GitHub</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#0A0B0E] border border-white/10 text-[#F5F5F7]">Slack</span>
              <span className="px-2.5 py-1 rounded-lg bg-[#0A0B0E] border border-white/10 text-[#F5F5F7]">Jira</span>
            </div>
          </div>

          {/* Tile 4: Graph-Powered Accuracy */}
          <div className="bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl p-6 transition-all duration-200 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <GitFork className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-[#F5F5F7] font-mono mb-2">
                Graph-Powered Accuracy
              </h3>
              <p className="text-sm text-[#9497A6] leading-relaxed">
                Real entity relationships, not keyword search — knows exact authorship, system ownership, and code dependencies.
              </p>
            </div>

            <div className="mt-6 p-3.5 rounded-lg bg-[#0A0B0E] border border-white/10 font-mono text-xs text-[#3B82F6]">
              Person ──[AUTHORED]──&gt; Commit ──[TOUCHES]──&gt; Service
            </div>
          </div>

          {/* Tile 5: Fast, Structured Answers */}
          <div className="bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl p-6 transition-all duration-200 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-[#F5F5F7] font-mono mb-2">
                Fast, Structured Answers
              </h3>
              <p className="text-sm text-[#9497A6] leading-relaxed">
                Direct graph queries for instantaneous facts combined with vector semantic search for contextual "why" questions.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between font-mono text-xs text-[#9497A6]">
              <span>Graph Fact Lookups:</span>
              <span className="text-[#3B82F6] font-semibold">Sub-second responses</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
