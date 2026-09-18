import React from 'react';
import { 
  ArrowRight, 
  Network, 
  ArrowUpRight, 
  CheckCircle2
} from 'lucide-react';
import { GraphBackground } from './GraphBackground';
import { InteractiveQueryDemo } from './InteractiveQueryDemo';
import { VideoShowcase } from './VideoShowcase';

interface HeroProps {
  onOpenContact: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenContact }) => {
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
            <span className="text-slate-200 font-semibold tracking-wide">Enterprise Knowledge Graph for Engineering Teams</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>

          {/* 2. Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.08] font-sans">
            Engineering Knowledge,
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-200 to-indigo-400 font-extrabold">
              Decoupled From Key Engineers.
            </span>
          </h1>

          {/* 3. Subheadline - 2 Lines Max for CTOs */}
          <p className="mt-6 text-base sm:text-lg text-slate-300 font-normal max-w-3xl mx-auto leading-relaxed">
            When engineers leave, tribal knowledge vanishes. <strong className="text-white font-semibold">Cortex connects GitHub, Slack, and Jira</strong> into a self-hosted Knowledge Graph to calculate bus factor, simulate departure impact, and answer codebase questions with mathematical proof.
          </p>

          {/* 4. Action CTAs - Clear Hierarchy & Keyboard Focus */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenContact}
              className="w-full sm:w-auto px-8 py-4 text-sm font-bold font-mono text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all duration-200 shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer transform hover:-translate-y-0.5 border border-indigo-400/20 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
            >
              <span>Request Free Setup</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('proof');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-4 text-sm font-bold font-mono text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
            >
              <Network className="w-4 h-4 text-indigo-400" />
              <span>See Product Proof</span>
            </button>
          </div>

          {/* 5. Enterprise Trust Row (Verified & Honest) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-300">
            <span className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Self-Hosted in Your VPC</span>
            </span>
            <span className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Deterministic Risk Formulas</span>
            </span>
            <span className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              <span>GitHub, Slack &amp; Jira Webhooks</span>
            </span>
          </div>
        </div>

        {/* Product Video Showcase */}
        <div className="mt-14 max-w-5xl mx-auto">
          <VideoShowcase
            src="/Cortex.mp4"
            poster="/cortex-video-poster.jpg"
            title="Cortex Product Walkthrough"
            subtitle="Autonomous Neural Knowledge Graph • Ingesting GitHub, Jira & Slack with deterministic accuracy"
          />
        </div>
        
        {/* Interactive Query Playground (Proves Answers Come With Proof) */}
        <div className="mt-16 max-w-5xl mx-auto">
          <InteractiveQueryDemo />
        </div>

      </div>
    </section>
  );
};
