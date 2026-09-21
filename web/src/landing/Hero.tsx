import React from 'react';
import { 
  ArrowRight, 
  Terminal, 
  CheckCircle2,
  Lock,
  GitBranch,
  Calculator
} from 'lucide-react';
import { GraphBackground } from './GraphBackground';

interface HeroProps {
  onOpenContact: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenContact }) => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[#0B0F14] antialiased">
      {/* Non-distracting CSS dot grid background */}
      <GraphBackground />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="text-center max-w-3xl mx-auto">
          
          {/* 1. Category Tag */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#12181F] border border-white/10 text-slate-300 text-xs font-mono mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-medium tracking-wide">Self-Hosted Knowledge Graph for Engineering Teams</span>
          </div>

          {/* 2. Headline: Problem + Outcome in 1 clear headline (≤ 2 lines, no rainbow gradient) */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.12] font-sans">
            Engineering knowledge, decoupled from key engineers.
          </h1>

          {/* 3. Subcopy: Exactly 2 lines of value prop for VP Eng / CTO */}
          <p className="mt-6 text-base sm:text-lg text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto">
            When senior developers leave, critical system context disappears. Cortex ingests GitHub, Slack, and Jira into a self-hosted graph to quantify bus factor, simulate departure impact, and ground codebase Q&amp;A.
          </p>

          {/* 4. Action CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={onOpenContact}
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <span>Book a 30-Min Walkthrough</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('proof');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-slate-200 hover:text-white bg-[#12181F] hover:bg-[#1A222D] border border-white/10 hover:border-white/20 rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <Terminal className="w-4 h-4 text-slate-400" />
              <span>Explore Product Proof</span>
            </button>
          </div>

          {/* 5. Three Concrete Trust Chips */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#12181F] border border-white/10">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Self-hosted in your VPC</span>
            </span>
            <span className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#12181F] border border-white/10">
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span>Deterministic risk formulas</span>
            </span>
            <span className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#12181F] border border-white/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero code leaves your infrastructure</span>
            </span>
          </div>
        </div>

        {/* 6. Integration Strip / Social Proof Structure */}
        <div className="mt-16 pt-12 border-t border-white/10 text-center max-w-4xl mx-auto">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-6">
            CONTINUOUS INGESTION FROM YOUR EXISTING ENGINEERING STACK
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-2 text-slate-300 font-mono text-xs">
              <GitBranch className="w-4 h-4 text-slate-400" />
              <span>GitHub &amp; GitHub Enterprise</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span>GitLab Self-Managed</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Slack Workspace</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-300 font-mono text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Jira &amp; Linear Issues</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
