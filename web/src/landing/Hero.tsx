import React, { useState } from 'react';
import { ArrowRight, Sparkles, Network, Database, Lock, ArrowUpRight, CheckCircle2, User, GitCommit, FileCode, AlertTriangle } from 'lucide-react';
import { GraphBackground } from './GraphBackground';

interface HeroProps {
  onOpenContact: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenContact }) => {
  const [activeTab, setActiveTab] = useState<'qa' | 'graph' | 'risk'>('qa');

  const scrollToArchitecture = () => {
    const el = document.getElementById('architecture');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-[#0A0B0E]">
      {/* Dynamic Graph Background Canvas */}
      <GraphBackground />

      {/* Subtle Blue Radial Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="text-center max-w-4xl mx-auto">
          
          {/* 1. Category Badge: WHAT IS THIS? */}
          <div
            onClick={onOpenContact}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#9497A6] text-xs font-mono mb-8 hover:border-blue-500/40 transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
            <span className="text-[#F5F5F7] font-semibold">AI Knowledge Graph for Engineering Teams</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#3B82F6] ml-1" />
          </div>

          {/* 2. Emotional Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#F5F5F7] tracking-tight leading-[1.1]">
            Codebase remembers every line.
            <span className="block mt-2 font-serif italic text-[#9497A6] font-normal text-3xl sm:text-5xl lg:text-6xl">
              Nobody remembers why.
            </span>
          </h1>

          {/* 3. Subheadline (Mechanism + Problem) */}
          <p className="mt-6 text-lg sm:text-xl text-[#9497A6] font-normal max-w-3xl mx-auto leading-relaxed">
            When engineers leave, their tribal knowledge leaves with them. <span className="text-[#F5F5F7] font-medium">Cortex ingests your GitHub, Slack, and Jira</span> into a living knowledge graph, letting you ask questions in plain English about code, architectural decisions, and ownership.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenContact}
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold font-mono text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl transition-all duration-200 shadow-[0_0_25px_rgba(59,130,246,0.35)] flex items-center justify-center space-x-2 cursor-pointer transform hover:-translate-y-0.5"
            >
              <span>Request Free Setup</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>

            <button
              onClick={scrollToArchitecture}
              className="w-full sm:w-auto px-7 py-3.5 text-sm font-semibold font-mono text-[#F5F5F7] bg-[#12141A] border border-white/10 hover:border-white/20 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Network className="w-4 h-4 text-[#3B82F6]" />
              <span>See Architecture</span>
            </button>
          </div>

          {/* 4. USP Reinforcement 1 (Under CTAs) */}
          <p className="mt-4 text-xs font-mono text-[#3B82F6] flex items-center justify-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
            <span className="font-medium text-slate-300">Self-hosted on your own cloud. <strong className="text-white font-bold">₹0 forever.</strong></span>
          </p>
        </div>

        {/* Browser Window Mockup */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="rounded-xl border border-white/10 bg-[#12141A] shadow-2xl overflow-hidden">
            
            {/* Top Browser Header Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0A0B0E] border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              </div>

              {/* Fake URL Bar */}
              <div className="flex items-center space-x-2 px-4 py-1 rounded-lg bg-[#12141A] border border-white/10 text-xs font-mono text-[#9497A6] max-w-md w-full justify-center">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span className="text-[#F5F5F7]">cortex.yourteam.dev</span>
                <span className="text-[#9497A6]">/query</span>
              </div>

              {/* Tabs */}
              <div className="flex space-x-1 bg-[#0A0B0E] p-1 rounded-lg border border-white/10 text-[11px] font-mono">
                <button
                  onClick={() => setActiveTab('qa')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'qa'
                      ? 'bg-[#3B82F6]/20 text-[#3B82F6] font-semibold'
                      : 'text-[#9497A6] hover:text-[#F5F5F7]'
                  }`}
                >
                  Natural Q&amp;A
                </button>
                <button
                  onClick={() => setActiveTab('graph')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'graph'
                      ? 'bg-[#3B82F6]/20 text-[#3B82F6] font-semibold'
                      : 'text-[#9497A6] hover:text-[#F5F5F7]'
                  }`}
                >
                  Graph Query
                </button>
                <button
                  onClick={() => setActiveTab('risk')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeTab === 'risk'
                      ? 'bg-[#3B82F6]/20 text-[#3B82F6] font-semibold'
                      : 'text-[#9497A6] hover:text-[#F5F5F7]'
                  }`}
                >
                  Bus Factor
                </button>
              </div>
            </div>

            {/* Chat & Query Interface Window - Fixed Height Container */}
            <div className="p-6 sm:p-8 font-mono text-xs sm:text-sm text-[#F5F5F7] min-h-[290px] flex flex-col justify-center bg-[#0A0B0E]">
              
              {/* TAB 1: NATURAL Q&A */}
              {activeTab === 'qa' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* User Question */}
                  <div className="flex items-start space-x-3 text-[#3B82F6]">
                    <div className="w-7 h-7 rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6] font-bold shrink-0">
                      U
                    </div>
                    <div className="bg-[#12141A] p-3.5 rounded-xl border border-white/10 text-[#F5F5F7] w-full font-medium">
                      "Why did we migrate from Redis to Valkey, and is Arjun still the owner?"
                    </div>
                  </div>

                  {/* Cortex Answer */}
                  <div className="flex items-start space-x-3">
                    <div className="w-7 h-7 rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6] font-bold shrink-0">
                      <Sparkles className="w-4 h-4 text-[#3B82F6]" />
                    </div>
                    <div className="bg-[#12141A] p-4 rounded-xl border border-white/10 space-y-3 w-full">
                      <p className="text-[#F5F5F7] leading-relaxed">
                        Migrated due to licensing restrictions (Redis SSPL change). Arjun Kumar authored the migration commit and remains the sole contributor — no backup owner assigned.
                      </p>

                      {/* Source Citation Chips */}
                      <div className="flex items-center space-x-2 pt-1 font-mono text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-[#0A0B0E] border border-white/10 text-[#3B82F6] font-semibold flex items-center space-x-1">
                          <span>[Jira ENG-1402]</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-[#0A0B0E] border border-white/10 text-[#3B82F6] font-semibold flex items-center space-x-1">
                          <span>[GitHub commit a1b2c3d]</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GRAPH QUERY */}
              {activeTab === 'graph' && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Header Label */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center space-x-2 text-[#3B82F6]">
                      <Database className="w-4 h-4" />
                      <span className="text-xs font-semibold text-[#F5F5F7]">Graph Traversal Visualizer</span>
                    </div>
                    <span className="text-[11px] text-[#9497A6]">Entity Path: 3 Hops</span>
                  </div>

                  {/* SVG & Card Mini Visual Graph Fragment */}
                  <div className="bg-[#12141A] p-4 sm:p-5 rounded-xl border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    
                    {/* Node 1: Person */}
                    <div className="bg-[#0A0B0E] border border-[#3B82F6]/40 rounded-xl p-3 flex items-center space-x-2.5 shadow-md">
                      <User className="w-4 h-4 text-[#3B82F6]" />
                      <div>
                        <div className="text-xs font-bold text-[#F5F5F7]">Arjun Kumar</div>
                        <div className="text-[10px] text-[#9497A6]">Person Entity</div>
                      </div>
                    </div>

                    {/* Edge 1 */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-[#3B82F6] font-semibold uppercase tracking-wider mb-0.5">-- AUTHORED --&gt;</span>
                      <div className="w-12 h-0.5 bg-[#3B82F6]/60" />
                    </div>

                    {/* Node 2: Commit */}
                    <div className="bg-[#0A0B0E] border border-[#3B82F6]/40 rounded-xl p-3 flex items-center space-x-2.5 shadow-md">
                      <GitCommit className="w-4 h-4 text-[#3B82F6]" />
                      <div>
                        <div className="text-xs font-bold text-[#F5F5F7]">Commit a1b2c3d</div>
                        <div className="text-[10px] text-[#9497A6]">Code Commit</div>
                      </div>
                    </div>

                    {/* Edge 2 */}
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-[#3B82F6] font-semibold uppercase tracking-wider mb-0.5">-- MODIFIES --&gt;</span>
                      <div className="w-12 h-0.5 bg-[#3B82F6]/60" />
                    </div>

                    {/* Node 3: Service */}
                    <div className="bg-[#0A0B0E] border border-[#3B82F6]/40 rounded-xl p-3 flex items-center space-x-2.5 shadow-md">
                      <FileCode className="w-4 h-4 text-[#3B82F6]" />
                      <div>
                        <div className="text-xs font-bold text-[#F5F5F7]">billing/stripe_sync</div>
                        <div className="text-[10px] text-[#9497A6]">Service Logic</div>
                      </div>
                    </div>

                  </div>

                  {/* Result Footnote */}
                  <div className="text-center sm:text-left text-xs font-mono text-[#9497A6]">
                    <span className="text-[#3B82F6] font-semibold">✓ Direct graph traversal</span> — 3 hops, no keyword guessing
                  </div>
                </div>
              )}

              {/* TAB 3: BUS FACTOR */}
              {activeTab === 'risk' && (
                <div className="space-y-4 animate-fadeIn">
                  
                  {/* 1. Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-bold text-[#F5F5F7]">Knowledge Risk: services/billing</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold">
                      HIGH RISK
                    </span>
                  </div>

                  {/* 2. Visual Risk Meter / Horizontal Gauge */}
                  <div className="bg-[#12141A] p-4 rounded-xl border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#9497A6]">Risk Level Meter</span>
                      <span className="text-red-400 font-bold">84% Single Ownership</span>
                    </div>

                    {/* Horizontal Bar Gauge (Green / Amber / Red) */}
                    <div className="relative h-3 w-full rounded-full bg-[#0A0B0E] overflow-hidden p-0.5 border border-white/10 flex">
                      <div className="w-1/3 h-full bg-emerald-500/30 rounded-l-full" />
                      <div className="w-1/3 h-full bg-amber-500/40" />
                      <div className="w-1/3 h-full bg-red-500/80 rounded-r-full relative">
                        {/* Needle/Indicator pin */}
                        <div className="absolute right-2 top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_#ef4444] animate-pulse" />
                      </div>
                    </div>
                  </div>

                  {/* 3. Concrete Finding */}
                  <div className="bg-[#12141A] p-3.5 rounded-xl border border-white/10 text-xs text-[#F5F5F7] leading-relaxed">
                    Dave R. owns 84% of this logic. No co-authors. If Dave leaves, this system has no backup maintainer.
                  </div>

                  {/* 4. Why this matters one-liner */}
                  <div className="text-xs text-[#9497A6] font-mono flex items-center space-x-1.5">
                    <span className="text-[#3B82F6] font-bold">Why this matters:</span>
                    <span>Knowledge risk scoring flags these gaps before they become incidents.</span>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
