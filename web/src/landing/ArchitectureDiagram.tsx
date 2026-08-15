import React from 'react';
import { GitBranch, Server, Layers, ArrowDown, Info } from 'lucide-react';

const SlackIcon = () => (
  <svg className="w-5 h-5 fill-current text-indigo-400" viewBox="0 0 24 24">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.528 2.528 0 0 1 2.521-2.52 2.528 2.528 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.684a2.527 2.527 0 0 1-2.52-2.52 2.527 2.527 0 0 1 2.52-2.522h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.519h-6.313z"/>
  </svg>
);

const JiraIcon = () => (
  <svg className="w-5 h-5 fill-current text-purple-400" viewBox="0 0 24 24">
    <path d="M11.571 11.429H.143a.143.143 0 0 0-.143.143v2.857c0 5.286 4.286 9.571 9.571 9.571h2a.143.143 0 0 0 .143-.143v-12.286a.143.143 0 0 0-.143-.142zm12.286-5.714H12.429a.143.143 0 0 0-.143.143v2.857c0 5.286 4.286 9.571 9.571 9.571h2a.143.143 0 0 0 .143-.143V5.857a.143.143 0 0 0-.143-.142zM12.429 0h-2a.143.143 0 0 0-.143.143v12.286c0 .079.064.143.143.143h11.429a.143.143 0 0 0 .143-.143V2.857C22 1.286 20.714 0 19.143 0h-6.714z"/>
  </svg>
);

export const ArchitectureDiagram: React.FC = () => {
  return (
    <section id="architecture" className="py-24 md:py-32 bg-[#06080e] relative overflow-hidden border-t border-b border-slate-800/80 antialiased">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0c111e] border border-slate-800/80 text-indigo-400 text-xs font-mono mb-4">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Open &amp; Transparent Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            How Data Flows Into Cortex
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 font-normal">
            Real-time webhook events stream into a hybrid knowledge engine combining Neo4j graph relationships, Qdrant vector embeddings, and Fast-Path intent routing.
          </p>
        </div>

        {/* Diagram Container */}
        <div className="max-w-4xl mx-auto bg-[#090d16]/90 border border-slate-800/80 rounded-2xl p-6 sm:p-10 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl relative">
          
          {/* ROW 1 Header */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
              ROW 1 — Ingestion Webhook Sources
            </span>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#060911] border border-slate-800 text-indigo-400 text-xs font-mono">
              <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Captured automatically via real-time webhooks</span>
            </div>
          </div>

          {/* ROW 1: Data Sources */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10">
            {/* Slack */}
            <div className="bg-[#0c111e] border border-slate-800/80 hover:border-indigo-500/50 rounded-xl p-5 flex items-center justify-between transition-all duration-300 shadow-xl group">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <SlackIcon />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-sans">Slack</h4>
                  <p className="text-xs text-slate-400">Channels &amp; Threads</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                #proj-chat
              </span>
            </div>

            {/* Jira */}
            <div className="bg-[#0c111e] border border-slate-800/80 hover:border-purple-500/50 rounded-xl p-5 flex items-center justify-between transition-all duration-300 shadow-xl group">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <JiraIcon />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-sans">Jira / Linear</h4>
                  <p className="text-xs text-slate-400">Issues &amp; Specs</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                ENG-1402
              </span>
            </div>

            {/* GitHub */}
            <div className="bg-[#0c111e] border border-slate-800/80 hover:border-cyan-500/50 rounded-xl p-5 flex items-center justify-between transition-all duration-300 shadow-xl group">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-sans">GitHub</h4>
                  <p className="text-xs text-slate-400">Repos &amp; Commits</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                main branch
              </span>
            </div>
          </div>

          {/* Flow Connector Arrow */}
          <div className="flex justify-center my-8">
            <div className="w-9 h-9 rounded-full bg-[#060911] border border-slate-800 flex items-center justify-center text-indigo-400 shadow-lg">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* ROW 2 Header */}
          <div className="mb-4">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
              ROW 2 — Cortex Grounded Knowledge Engine
            </span>
          </div>

          {/* ROW 2: Core Processing Card */}
          <div className="bg-[#0c111e] border border-indigo-500/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-sans">Cortex Graph Core Engine</h3>
                  <p className="text-xs text-slate-400 font-mono">Fast-Path Intent Router &amp; Multi-Tool Execution Graph</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold w-fit">
                ~0.1ms Fast-Path Router
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 bg-[#060911] rounded-xl border border-slate-800 space-y-1">
                <span className="text-indigo-400 font-bold block">1. Neo4j Graph DB</span>
                <span className="text-slate-400 text-[11px]">Sub-millisecond entity ownership &amp; dependency traversal.</span>
              </div>
              <div className="p-4 bg-[#060911] rounded-xl border border-slate-800 space-y-1">
                <span className="text-purple-400 font-bold block">2. Qdrant Vector Search</span>
                <span className="text-slate-400 text-[11px]">Semantic embedding retrieval for contextual "why" Q&amp;A.</span>
              </div>
              <div className="p-4 bg-[#060911] rounded-xl border border-slate-800 space-y-1">
                <span className="text-emerald-400 font-bold block">3. 1-Click Auto-Fix PR</span>
                <span className="text-slate-400 text-[11px]">Self-healing ADR &amp; README generation pushed to GitHub.</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
