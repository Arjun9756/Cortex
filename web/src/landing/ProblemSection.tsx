import React, { useState } from 'react';
import { GitBranch, MessageSquare, Ticket, FileText, Network, Sparkles, CheckCircle2 } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  const [isUnified, setIsUnified] = useState(true);

  return (
    <section className="py-24 md:py-32 bg-[#06080e] relative overflow-hidden border-t border-slate-800/80 antialiased">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0c111e] border border-slate-800/80 text-indigo-400 text-xs font-mono mb-4">
            <Network className="w-3.5 h-3.5 text-indigo-400" />
            <span>The Tribal Knowledge Gap</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            Engineering context is scattered across silos.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
            Commits live in GitHub. Context lives in Slack. Architectural decisions live in Jira. When key engineers leave, nobody remembers <em className="text-slate-200 font-semibold italic">why</em> critical systems were built.
          </p>
        </div>

        {/* Interactive Visualization Card */}
        <div className="max-w-4xl mx-auto bg-[#090d16]/90 border border-slate-800/80 rounded-2xl p-6 sm:p-10 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl relative">
          
          {/* Toggle Control Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800/80 flex-wrap gap-4">
            <div>
              <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">Interactive Architecture Comparison</span>
              <h3 className="text-lg font-bold text-white font-sans mt-0.5">
                {isUnified ? 'Unified Cortex Knowledge Graph' : 'Fragmented Siloed Systems'}
              </h3>
            </div>

            <button
              onClick={() => setIsUnified(!isUnified)}
              className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-lg shadow-indigo-600/15 flex items-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isUnified ? 'Show Fragmented State' : 'Unify into Cortex Graph'}</span>
            </button>
          </div>

          {/* Canvas Area */}
          <div className="relative min-h-[340px] flex items-center justify-center p-6 bg-[#060911] rounded-xl border border-slate-800/80 overflow-hidden">
            
            {/* SVG Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700" style={{ opacity: isUnified ? 1 : 0.1 }}>
              <line x1="25%" y1="30%" x2="50%" y2="50%" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="75%" y1="30%" x2="50%" y2="50%" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="25%" y1="70%" x2="50%" y2="50%" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="75%" y1="70%" x2="50%" y2="50%" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
            </svg>

            {/* Central Cortex Core */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-700 transform ${
                isUnified ? 'scale-110 opacity-100' : 'scale-75 opacity-20'
              }`}
            >
              <div className="bg-gradient-to-b from-[#0e1526] to-[#070b14] border-2 border-indigo-500 rounded-2xl p-6 shadow-2xl shadow-indigo-500/40 text-center w-52">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500 text-indigo-400 mx-auto flex items-center justify-center mb-2 animate-pulse">
                  <Network className="w-6 h-6" />
                </div>
                <h4 className="text-base font-extrabold text-white font-sans">Cortex Graph</h4>
                <p className="text-[11px] text-indigo-300 font-mono mt-0.5">Unified Intelligence</p>
              </div>
            </div>

            {/* 4 Connected Nodes Grid */}
            <div className="w-full grid grid-cols-2 gap-y-28 sm:gap-y-32 relative z-10">
              
              {/* Node 1: GitHub */}
              <div
                className={`transition-all duration-700 transform flex items-center space-x-3 bg-[#0d121f] border border-slate-800 rounded-xl p-3.5 w-44 shadow-xl ${
                  isUnified ? 'translate-x-4 translate-y-4 border-indigo-500/50' : '-translate-x-2 -translate-y-2 opacity-60'
                }`}
              >
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-mono">GitHub</div>
                  <div className="text-[10px] text-slate-400">Commits &amp; PRs</div>
                </div>
              </div>

              {/* Node 2: Slack */}
              <div
                className={`justify-self-end transition-all duration-700 transform flex items-center space-x-3 bg-[#0d121f] border border-slate-800 rounded-xl p-3.5 w-44 shadow-xl ${
                  isUnified ? '-translate-x-4 translate-y-4 border-purple-500/50' : 'translate-x-2 -translate-y-2 opacity-60'
                }`}
              >
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-mono">Slack</div>
                  <div className="text-[10px] text-slate-400">Architectural Context</div>
                </div>
              </div>

              {/* Node 3: Jira */}
              <div
                className={`transition-all duration-700 transform flex items-center space-x-3 bg-[#0d121f] border border-slate-800 rounded-xl p-3.5 w-44 shadow-xl ${
                  isUnified ? 'translate-x-4 -translate-y-4 border-cyan-500/50' : '-translate-x-2 translate-y-2 opacity-60'
                }`}
              >
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-mono">Jira / Linear</div>
                  <div className="text-[10px] text-slate-400">Issue History</div>
                </div>
              </div>

              {/* Node 4: Neo4j Docs */}
              <div
                className={`justify-self-end transition-all duration-700 transform flex items-center space-x-3 bg-[#0d121f] border border-slate-800 rounded-xl p-3.5 w-44 shadow-xl ${
                  isUnified ? '-translate-x-4 -translate-y-4 border-emerald-500/50' : 'translate-x-2 translate-y-2 opacity-60'
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-mono">Docs &amp; Events</div>
                  <div className="text-[10px] text-slate-400">Entity Lineage</div>
                </div>
              </div>

            </div>

          </div>

          {/* Footer Note */}
          <div className="mt-6 text-center text-xs font-mono text-slate-400 flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Cortex automatically ingests, links, and indexes all 4 systems into a single self-hosted Knowledge Graph.</span>
          </div>

        </div>

      </div>
    </section>
  );
};
