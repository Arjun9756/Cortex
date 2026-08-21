import React, { useState } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  Network, 
  ArrowUpRight, 
  CheckCircle2, 
  User, 
  Zap, 
  ShieldAlert, 
  GitPullRequest, 
  Check 
} from 'lucide-react';
import { GraphBackground } from './GraphBackground';

interface HeroProps {
  onOpenContact: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenContact }) => {
  const [activeTab, setActiveTab] = useState<'fastpath' | 'risk' | 'autofix'>('fastpath');
  const [prMerged, setPrMerged] = useState(false);

  const scrollToArchitecture = () => {
    const el = document.getElementById('architecture');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-[#06080e] antialiased">
      {/* Dynamic Graph Background Canvas */}
      <GraphBackground />

      {/* Subtle Indigo/Violet Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-indigo-600/10 via-purple-600/10 to-pink-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="text-center max-w-4xl mx-auto">
          
          {/* 1. Category Badge */}
          <div
            onClick={onOpenContact}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[#0d121f] border border-slate-800/80 text-slate-300 text-xs font-mono mb-8 hover:border-indigo-500/40 transition-all cursor-pointer shadow-lg shadow-indigo-950/20 group"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-200 font-semibold tracking-wide">AI Knowledge Graph for Engineering Teams</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>

          {/* 2. Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08] font-sans">
            Engineering Knowledge,
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-200 to-indigo-400 font-extrabold">
              Decoupled From Key Engineers.
            </span>
          </h1>

          {/* 3. Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-slate-400 font-normal max-w-3xl mx-auto leading-relaxed">
            When engineers leave, tribal knowledge vanishes. <strong className="text-slate-200 font-semibold">Cortex ingests GitHub, Slack, and Jira</strong> into a self-hosted Knowledge Graph — predicting departure loss risk, answering complex codebase questions, and auto-generating documentation before engineers offboard.
          </p>

          {/* 4. Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenContact}
              className="w-full sm:w-auto px-8 py-4 text-sm font-bold font-mono text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all duration-200 shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer transform hover:-translate-y-0.5 border border-indigo-400/20"
            >
              <span>Request Free Setup</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>

            <button
              onClick={scrollToArchitecture}
              className="w-full sm:w-auto px-7 py-4 text-sm font-bold font-mono text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-md"
            >
              <Network className="w-4 h-4 text-indigo-400" />
              <span>Explore Architecture</span>
            </button>
          </div>

          {/* 5. Telemetry Guarantees */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-400">
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Self-Hosted &amp; 100% Private</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>~0.1ms Fast-Path Intent Router</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              <span>6-Factor Departure Risk Engine</span>
            </span>
          </div>
        </div>

        {/* Browser Window Interactive Prototype Mockup */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-slate-800/80 bg-[#090d16]/90 shadow-2xl shadow-indigo-950/40 overflow-hidden backdrop-blur-xl">
            
            {/* Top Browser Header Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-[#060911] border-b border-slate-800/80 gap-3">
              <div className="flex items-center space-x-2 shrink-0">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono text-slate-500 ml-2 font-semibold">Cortex Intelligence OS</span>
              </div>

              {/* Interactive Tabs */}
              <div className="flex space-x-1 bg-[#0c111e] p-1 rounded-xl border border-slate-800/80 text-xs font-mono w-full sm:w-auto justify-center">
                <button
                  onClick={() => setActiveTab('fastpath')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'fastpath'
                      ? 'bg-indigo-600 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Fast-Path AI Assistant</span>
                </button>

                <button
                  onClick={() => setActiveTab('risk')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'risk'
                      ? 'bg-indigo-600 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Departure Loss Risk</span>
                </button>

                <button
                  onClick={() => setActiveTab('autofix')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                    activeTab === 'autofix'
                      ? 'bg-indigo-600 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1-Click Auto-Fix PR</span>
                </button>
              </div>
            </div>

            {/* Interactive Tab Body Content */}
            <div className="p-6 sm:p-8 font-sans text-xs sm:text-sm text-slate-100 min-h-[360px] bg-[#070a12] flex flex-col justify-center">
              
              {/* TAB 1: FAST-PATH AI ASSISTANT */}
              {activeTab === 'fastpath' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Telemetry Route Banner */}
                  <div className="p-3 bg-[#0b101c] border border-indigo-500/30 rounded-xl flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                        ROUTER MATCH (~0.1ms)
                      </span>
                      <span className="text-slate-400">Target Tool: <strong className="text-indigo-300">knowledge_risk</strong></span>
                    </div>
                    <span className="text-slate-500 text-[11px] hidden sm:inline">Qwen 3.6 27B Decomposed Chain</span>
                  </div>

                  {/* User Query */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="bg-[#0e1424] p-4 rounded-2xl rounded-tl-none border border-slate-800 text-white w-full font-medium text-sm shadow-md">
                      "What breaks if Vikram Patel leaves the engineering team?"
                    </div>
                  </div>

                  {/* Bot Response */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="bg-[#0b1120] p-5 rounded-2xl rounded-tl-none border border-slate-800 space-y-3 w-full shadow-xl">
                      <p className="text-slate-200 leading-relaxed text-sm">
                        Vikram Patel holds a <strong className="text-rose-400 font-bold">76% Knowledge Loss Risk Score (Critical)</strong>. If Vikram leaves, 2 major production subsystems are at immediate risk of silent failure:
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-xs pt-1">
                        <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-300">
                          • <strong className="text-indigo-300">Cache / Queue Engine</strong>: 100% commit ownership on BullMQ &amp; Redis fallback dispatchers.
                        </div>
                        <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-300">
                          • <strong className="text-purple-300">Auth Token Service</strong>: Sole co-author on OAuth Refresh rotation logic.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DEPARTURE LOSS RISK MODEL */}
              {activeTab === 'risk' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-[#0b1222] border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-4 border-b border-slate-800">
                      <div className="flex items-center space-x-4">
                        {/* Circular SVG Gauge */}
                        <div className="relative">
                          <svg className="w-20 h-20 transform -rotate-90">
                            <circle cx="40" cy="40" r="34" className="text-slate-900" strokeWidth="7" stroke="currentColor" fill="transparent" />
                            <circle
                              cx="40"
                              cy="40"
                              r="34"
                              strokeWidth="7"
                              stroke="#f43f5e"
                              strokeDasharray={2 * Math.PI * 34}
                              strokeDashoffset={(2 * Math.PI * 34) * (1 - 0.76)}
                              strokeLinecap="round"
                              fill="transparent"
                              className="transition-all duration-1000 ease-out"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-lg font-extrabold text-white">76%</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">RISK</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-base text-white">Vikram Patel</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase">
                              CRITICAL RISK
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            6-Factor Departure Loss Score &amp; Single-Contributor Evidence
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2 font-mono text-xs text-center">
                        <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Files Owned</span>
                          <span className="font-bold text-indigo-400">14 Files</span>
                        </div>
                        <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-slate-500 block text-[10px]">Dependents</span>
                          <span className="font-bold text-purple-400">3 Services</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Factor Bars */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Ownership Concentration (30%)</span>
                          <span className="text-rose-400 font-bold">100%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full w-[100%]" />
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Critical Dependents (20%)</span>
                          <span className="text-amber-400 font-bold">85%</span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full w-[85%]" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: 1-CLICK AUTO-FIX PR */}
              {activeTab === 'autofix' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="p-4 bg-[#0b1222] border border-slate-800 rounded-2xl space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center space-x-2">
                        <GitPullRequest className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-white">Auto-Generated ADR Documentation PR</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Branch: <code className="text-indigo-300">cortex/autofix-doc-gaps</code></span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 leading-relaxed text-slate-300 overflow-x-auto">
                      <div className="text-emerald-400 font-bold">+ # ADR-014: BullMQ Queue &amp; Redis Fallback Architecture</div>
                      <div className="text-emerald-400">+ Author: Cortex Self-Healing Engine (Validated via Neo4j Subgraph)</div>
                      <div className="text-slate-400 mt-1">+ Details: Documents retry backoff algorithm, queue concurrency thresholds, and outage mitigation steps previously untracked in Git.</div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Fixes 15% Documentation Gap Risk for Vikram Patel</span>

                      <button
                        onClick={() => setPrMerged(true)}
                        disabled={prMerged}
                        className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                          prMerged
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 cursor-pointer'
                        }`}
                      >
                        {prMerged ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>PR Merged &amp; Knowledge Risk Reduced!</span>
                          </>
                        ) : (
                          <>
                            <GitPullRequest className="w-4 h-4" />
                            <span>1-Click Merge GitHub PR</span>
                          </>
                        )}
                      </button>
                    </div>
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
