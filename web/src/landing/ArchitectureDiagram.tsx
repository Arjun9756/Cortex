import React from 'react';
import { GitBranch, Server, MessageSquare, Database, Sparkles, Layers, ArrowDown, Info, Zap } from 'lucide-react';

const SlackIcon = () => (
  <svg className="w-5 h-5 fill-current text-[#3B82F6]" viewBox="0 0 24 24">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.528 2.528 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.684a2.527 2.527 0 0 1-2.52-2.52 2.527 2.527 0 0 1 2.52-2.522h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.519h-6.313z"/>
  </svg>
);

const JiraIcon = () => (
  <svg className="w-5 h-5 fill-current text-[#3B82F6]" viewBox="0 0 24 24">
    <path d="M11.571 11.429H.143a.143.143 0 0 0-.143.143v2.857c0 5.286 4.286 9.571 9.571 9.571h2a.143.143 0 0 0 .143-.143v-12.286a.143.143 0 0 0-.143-.142zm12.286-5.714H12.429a.143.143 0 0 0-.143.143v2.857c0 5.286 4.286 9.571 9.571 9.571h2a.143.143 0 0 0 .143-.143V5.857a.143.143 0 0 0-.143-.142zM12.429 0h-2a.143.143 0 0 0-.143.143v12.286c0 .079.064.143.143.143h11.429a.143.143 0 0 0 .143-.143V2.857C22 1.286 20.714 0 19.143 0h-6.714z"/>
  </svg>
);

export const ArchitectureDiagram: React.FC = () => {
  return (
    <section id="architecture" className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-b border-white/10">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
            <Layers className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Open &amp; Transparent Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
            How Data Flows Into Cortex
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#9497A6]">
            Real-time webhook events stream into a hybrid knowledge engine combining graph relationships, vector embeddings, and relational state.
          </p>
        </div>

        {/* Diagram Main Container */}
        <div className="max-w-4xl mx-auto bg-[#0A0B0E]/90 border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl relative">
          
          {/* GUIDED TOUR ANNOTATION 1: SOURCE INGESTION */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#9497A6] font-semibold">
              ROW 1 — Ingestion Webhook Sources
            </span>
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono shadow-sm">
              <Info className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
              <span>Every message, commit, and ticket — captured automatically</span>
            </div>
          </div>

          {/* ROW 1: Data Sources Grid with Gradient Depth */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-2 relative z-10">
            {/* Slack */}
            <div className="relative bg-gradient-to-b from-[#12141A] to-[#0D0F16] border border-white/10 hover:border-[#3B82F6]/50 rounded-xl p-6 flex items-center justify-between transition-all duration-300 shadow-xl shadow-black/50 group hover:-translate-y-1">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <SlackIcon />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#F5F5F7] font-mono">Slack</h4>
                  <p className="text-xs text-[#9497A6]">Channels &amp; Threads</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 font-semibold">
                #proj-chat
              </span>
            </div>

            {/* Jira */}
            <div className="relative bg-gradient-to-b from-[#12141A] to-[#0D0F16] border border-white/10 hover:border-[#3B82F6]/50 rounded-xl p-6 flex items-center justify-between transition-all duration-300 shadow-xl shadow-black/50 group hover:-translate-y-1">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <JiraIcon />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#F5F5F7] font-mono">Jira</h4>
                  <p className="text-xs text-[#9497A6]">Issues &amp; Workflows</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 font-semibold">
                ENG-1402
              </span>
            </div>

            {/* GitHub */}
            <div className="relative bg-gradient-to-b from-[#12141A] to-[#0D0F16] border border-white/10 hover:border-[#3B82F6]/50 rounded-xl p-6 flex items-center justify-between transition-all duration-300 shadow-xl shadow-black/50 group hover:-translate-y-1">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#F5F5F7] font-mono">GitHub</h4>
                  <p className="text-xs text-[#9497A6]">Repos, PRs &amp; Commits</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-lg bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 font-semibold">
                main @ #f8a10
              </span>
            </div>
          </div>

          {/* CURVED SVG CONVERGING PARTICLE PIPELINE 1 */}
          <div className="relative my-4 flex flex-col items-center">
            <svg className="w-full h-24 overflow-visible" viewBox="0 0 800 100" fill="none">
              {/* Background Curved Path Lines */}
              <path d="M 133 0 C 133 50, 400 50, 400 100" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 400 0 C 400 50, 400 50, 400 100" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 667 0 C 667 50, 400 50, 400 100" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="2" strokeDasharray="4 4" />

              {/* Path 1 Slack Particle Stream */}
              <circle r="4" fill="#3B82F6" className="shadow-[0_0_12px_#3B82F6]">
                <animateMotion path="M 133 0 C 133 50, 400 50, 400 100" dur="2.2s" repeatCount="indefinite" begin="0s" />
              </circle>
              <circle r="3" fill="#60A5FA">
                <animateMotion path="M 133 0 C 133 50, 400 50, 400 100" dur="2.2s" repeatCount="indefinite" begin="1.1s" />
              </circle>

              {/* Path 2 Jira Particle Stream */}
              <circle r="4" fill="#3B82F6" className="shadow-[0_0_12px_#3B82F6]">
                <animateMotion path="M 400 0 C 400 50, 400 50, 400 100" dur="2.2s" repeatCount="indefinite" begin="0.4s" />
              </circle>
              <circle r="3" fill="#60A5FA">
                <animateMotion path="M 400 0 C 400 50, 400 50, 400 100" dur="2.2s" repeatCount="indefinite" begin="1.5s" />
              </circle>

              {/* Path 3 GitHub Particle Stream */}
              <circle r="4" fill="#3B82F6" className="shadow-[0_0_12px_#3B82F6]">
                <animateMotion path="M 667 0 C 667 50, 400 50, 400 100" dur="2.2s" repeatCount="indefinite" begin="0.7s" />
              </circle>
              <circle r="3" fill="#60A5FA">
                <animateMotion path="M 667 0 C 667 50, 400 50, 400 100" dur="2.2s" repeatCount="indefinite" begin="1.8s" />
              </circle>
            </svg>

            <div className="text-[10px] font-mono text-[#3B82F6] bg-[#12141A] px-3.5 py-1 rounded-xl border border-[#3B82F6]/40 -mt-2 z-10 flex items-center space-x-1 shadow-lg">
              <Zap className="w-3 h-3 text-[#3B82F6]" />
              <span>Real-Time Event Streams Converging</span>
            </div>
            <ArrowDown className="w-4 h-4 text-[#3B82F6] animate-bounce mt-1" />
          </div>

          {/* GUIDED TOUR ANNOTATION 2 */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#9497A6] font-semibold">
              ROW 2 — High Throughput Ingestion Queue
            </span>
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono shadow-sm">
              <Info className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
              <span>Nothing is lost, even at high volume</span>
            </div>
          </div>

          {/* ROW 2: Event Queue Box */}
          <div className="bg-gradient-to-b from-[#12141A] to-[#0D0F16] border border-white/10 rounded-xl p-6 mb-2 text-center shadow-xl shadow-black/50 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6]">
                  <Server className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-base font-bold text-[#F5F5F7] font-mono">Kafka / Event Queue</h4>
                  <p className="text-xs text-[#9497A6]">Async buffer, event deduplication &amp; ordering</p>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-xl text-xs font-mono bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 font-semibold">
                High-throughput event buffering
              </span>
            </div>
          </div>

          {/* SVG PIPELINE 2 (KAFKA TO CORTEX SERVER) */}
          <div className="relative my-4 flex flex-col items-center">
            <svg className="w-full h-20 overflow-visible" viewBox="0 0 800 80" fill="none">
              <path d="M 400 0 L 400 80" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
              <circle r="4" fill="#3B82F6" className="shadow-[0_0_12px_#3B82F6]">
                <animateMotion path="M 400 0 L 400 80" dur="1.8s" repeatCount="indefinite" begin="0s" />
              </circle>
              <circle r="3" fill="#60A5FA">
                <animateMotion path="M 400 0 L 400 80" dur="1.8s" repeatCount="indefinite" begin="0.9s" />
              </circle>
            </svg>

            <span className="text-[10px] font-mono text-[#3B82F6] bg-[#12141A] px-3 py-0.5 rounded-xl border border-[#3B82F6]/30 -mt-8 z-10 shadow-md">
              [Entity Parsing &amp; Graph Resolution]
            </span>
            <ArrowDown className="w-4 h-4 text-[#3B82F6] animate-bounce mt-3" />
          </div>

          {/* GUIDED TOUR ANNOTATION 3 */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#9497A6] font-semibold">
              ROW 3 — Core Intelligence Server &amp; Multi-Database Engine
            </span>
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono shadow-sm">
              <Info className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
              <span>AI extracts who did what, why, and how it connects</span>
            </div>
          </div>

          {/* ROW 3: PROMINENT CORTEX SERVER HUB (VISUALLY LARGER & GLOWING) */}
          <div className="bg-gradient-to-b from-[#12141A] via-[#0E1119] to-[#0A0C13] border-2 border-[#3B82F6] rounded-2xl p-8 sm:p-10 mb-2 shadow-[0_0_50px_rgba(59,130,246,0.25)] relative">
            <div className="flex items-center justify-between pb-5 mb-6 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-3.5 h-3.5 rounded-full bg-[#3B82F6] animate-ping" />
                <h3 className="text-xl font-extrabold text-[#F5F5F7] font-mono flex items-center gap-2">
                  <span>Cortex Server</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-xl bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40 font-semibold">
                    Core Intelligence Engine
                  </span>
                </h3>
              </div>
              <Sparkles className="w-6 h-6 text-[#3B82F6]" />
            </div>

            {/* 3 Storage Nodes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
              <div className="bg-[#0A0B0E] border border-white/10 rounded-xl p-5 text-center hover:border-[#3B82F6]/40 transition-colors shadow-inner">
                <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] mx-auto flex items-center justify-center mb-2.5">
                  <Database className="w-4 h-4" />
                </div>
                <h5 className="text-sm font-bold text-[#F5F5F7] font-mono">Neo4j</h5>
                <p className="text-[11px] text-[#3B82F6] font-mono mt-0.5">Graph Database</p>
                <p className="text-[11px] text-[#9497A6] mt-1">Relationships &amp; Ownership</p>
              </div>

              <div className="bg-[#0A0B0E] border border-white/10 rounded-xl p-5 text-center hover:border-[#3B82F6]/40 transition-colors shadow-inner">
                <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] mx-auto flex items-center justify-center mb-2.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h5 className="text-sm font-bold text-[#F5F5F7] font-mono">Qdrant</h5>
                <p className="text-[11px] text-[#3B82F6] font-mono mt-0.5">Vector Database</p>
                <p className="text-[11px] text-[#9497A6] mt-1">Semantic "Why" Intent Context</p>
              </div>

              <div className="bg-[#0A0B0E] border border-white/10 rounded-xl p-5 text-center hover:border-[#3B82F6]/40 transition-colors shadow-inner">
                <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] mx-auto flex items-center justify-center mb-2.5">
                  <Layers className="w-4 h-4" />
                </div>
                <h5 className="text-sm font-bold text-[#F5F5F7] font-mono">PostgreSQL</h5>
                <p className="text-[11px] text-[#3B82F6] font-mono mt-0.5">Relational DB</p>
                <p className="text-[11px] text-[#9497A6] mt-1">Metadata &amp; System Logs</p>
              </div>
            </div>
          </div>

          {/* SVG PIPELINE 3 (SERVER TO Q&A) */}
          <div className="relative my-4 flex flex-col items-center">
            <svg className="w-full h-20 overflow-visible" viewBox="0 0 800 80" fill="none">
              <path d="M 400 0 L 400 80" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
              <circle r="4" fill="#3B82F6" className="shadow-[0_0_12px_#3B82F6]">
                <animateMotion path="M 400 0 L 400 80" dur="1.8s" repeatCount="indefinite" begin="0.3s" />
              </circle>
              <circle r="3" fill="#60A5FA">
                <animateMotion path="M 400 0 L 400 80" dur="1.8s" repeatCount="indefinite" begin="1.2s" />
              </circle>
            </svg>

            <span className="text-[10px] font-mono text-[#3B82F6] bg-[#12141A] px-3 py-0.5 rounded-xl border border-[#3B82F6]/30 -mt-8 z-10 shadow-md">
              [Hybrid Graph Execution]
            </span>
            <ArrowDown className="w-4 h-4 text-[#3B82F6] animate-bounce mt-3" />
          </div>

          {/* GUIDED TOUR ANNOTATION 4 */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#9497A6] font-semibold">
              ROW 4 — User Natural Language Q&amp;A Layer
            </span>
            <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono shadow-sm">
              <Info className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
              <span>Ask in plain English — get answers backed by your actual team's history</span>
            </div>
          </div>

          {/* ROW 4: Q&A Interface */}
          <div className="bg-gradient-to-b from-[#12141A] to-[#0D0F16] border border-white/10 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-black/50">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#F5F5F7] font-mono">Natural Language Q&amp;A Interface</h4>
                <p className="text-xs text-[#9497A6]">
                  Ask plain English questions — get instant structured answers, code references, and team lineage.
                </p>
              </div>
            </div>
            <div className="shrink-0 px-3 py-1.5 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6] text-xs font-mono font-semibold">
              Fast structured answers
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
