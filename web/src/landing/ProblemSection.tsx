import React, { useState } from 'react';
import { GitBranch, MessageSquare, Ticket, FileText, Network, Sparkles } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  const [isUnified, setIsUnified] = useState(false);

  return (
    <section className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10 reveal-on-scroll">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
            <Network className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>The Fragmented Knowledge Gap</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
            Engineering knowledge is scattered everywhere.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#9497A6] leading-relaxed">
            Commits live in GitHub. Context lives in Slack. Decisions live in Jira. When someone leaves, nobody knows why things were built the way they are.
          </p>
        </div>

        {/* Interactive Fragmentation-to-Unification Visual */}
        <div className="max-w-4xl mx-auto bg-[#12141A] border border-white/10 rounded-2xl p-8 sm:p-12 shadow-2xl relative">
          
          {/* Toggle Control Bar */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10 flex-wrap gap-4">
            <div>
              <span className="text-xs font-mono text-[#9497A6] uppercase tracking-wider">Visual Demonstration</span>
              <h3 className="text-lg font-bold text-[#F5F5F7] font-mono mt-0.5">
                {isUnified ? 'Unified Cortex Knowledge Graph' : 'Fragmented Siloed Systems'}
              </h3>
            </div>

            <button
              onClick={() => setIsUnified(!isUnified)}
              className="px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/40 hover:bg-[#3B82F6] hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.2)] flex items-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isUnified ? 'Show Fragmented State' : 'Unify into Cortex Graph'}</span>
            </button>
          </div>

          {/* Interactive Canvas Area */}
          <div className="relative min-h-[320px] flex items-center justify-center p-6 bg-[#0A0B0E] rounded-xl border border-white/10 overflow-hidden">
            
            {/* SVG Connecting Lines (Visible when unified) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700" style={{ opacity: isUnified ? 1 : 0.15 }}>
              <line x1="20%" y1="30%" x2="50%" y2="50%" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="80%" y1="30%" x2="50%" y2="50%" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="20%" y1="70%" x2="50%" y2="50%" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 4" />
              <line x1="80%" y1="70%" x2="50%" y2="50%" stroke="#3B82F6" strokeWidth="2" strokeDasharray="4 4" />
            </svg>

            {/* Central Cortex Hub */}
            <div
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-700 transform ${
                isUnified ? 'scale-110 opacity-100' : 'scale-90 opacity-40'
              }`}
            >
              <div className="bg-gradient-to-b from-[#12141A] to-[#0A0B0E] border-2 border-[#3B82F6] rounded-2xl p-6 shadow-[0_0_40px_rgba(59,130,246,0.4)] text-center w-48">
                <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/20 border border-[#3B82F6] text-[#3B82F6] mx-auto flex items-center justify-center mb-2 animate-pulse-glow">
                  <Network className="w-6 h-6" />
                </div>
                <h4 className="text-base font-extrabold text-[#F5F5F7] font-mono">Cortex Graph</h4>
                <p className="text-[11px] text-[#3B82F6] font-mono mt-0.5">Unified Intelligence</p>
              </div>
            </div>

            {/* Floating Disconnected Nodes */}
            <div className="w-full grid grid-cols-2 gap-y-24 sm:gap-y-28 relative z-10">
              
              {/* GitHub Node */}
              <div
                className={`transition-all duration-700 transform flex items-center space-x-3 bg-[#12141A] border border-white/10 rounded-xl p-3.5 w-44 shadow-lg ${
                  isUnified ? 'translate-x-4 translate-y-4 border-[#3B82F6]/50' : '-translate-x-2 -translate-y-2'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6]">
                  <GitBranch className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F5F5F7] font-mono">GitHub</div>
                  <div className="text-[10px] text-[#9497A6]">Commits &amp; PRs</div>
                </div>
              </div>

              {/* Slack Node */}
              <div
                className={`justify-self-end transition-all duration-700 transform flex items-center space-x-3 bg-[#12141A] border border-white/10 rounded-xl p-3.5 w-44 shadow-lg ${
                  isUnified ? '-translate-x-4 translate-y-4 border-[#3B82F6]/50' : 'translate-x-2 -translate-y-2'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F5F5F7] font-mono">Slack</div>
                  <div className="text-[10px] text-[#9497A6]">Discussions</div>
                </div>
              </div>

              {/* Jira Node */}
              <div
                className={`transition-all duration-700 transform flex items-center space-x-3 bg-[#12141A] border border-white/10 rounded-xl p-3.5 w-44 shadow-lg ${
                  isUnified ? 'translate-x-4 -translate-y-4 border-[#3B82F6]/50' : '-translate-x-2 translate-y-2'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6]">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F5F5F7] font-mono">Jira</div>
                  <div className="text-[10px] text-[#9497A6]">Tickets &amp; Specs</div>
                </div>
              </div>

              {/* CI/CD & Docs Node */}
              <div
                className={`justify-self-end transition-all duration-700 transform flex items-center space-x-3 bg-[#12141A] border border-white/10 rounded-xl p-3.5 w-44 shadow-lg ${
                  isUnified ? '-translate-x-4 -translate-y-4 border-[#3B82F6]/50' : 'translate-x-2 translate-y-2'
                }`}
              >
                <div className="p-2 rounded-lg bg-[#3B82F6]/10 text-[#3B82F6]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F5F5F7] font-mono">Docs &amp; Events</div>
                  <div className="text-[10px] text-[#9497A6]">Build &amp; Deploy Logs</div>
                </div>
              </div>

            </div>

          </div>

          {/* Footer Caption */}
          <div className="mt-6 text-center text-xs font-mono text-[#9497A6] flex items-center justify-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
            <span>
              {isUnified
                ? 'All relationships, identities, and decisions normalized into a single queryable graph.'
                : 'Click above to see how Cortex automatically unifies fragmented systems in real time.'}
            </span>
          </div>

        </div>

      </div>
    </section>
  );
};
