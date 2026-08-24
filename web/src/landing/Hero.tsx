import React from 'react';
import { 
  ArrowRight, 
  Network, 
  ArrowUpRight, 
  CheckCircle2
} from 'lucide-react';
import { GraphBackground } from './GraphBackground';
import { InteractiveQueryDemo } from './InteractiveQueryDemo';
import { TrustBadge } from './TrustBadge';

interface HeroProps {
  onOpenContact: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenContact }) => {
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

          {/* 3. Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-slate-400 font-normal max-w-3xl mx-auto leading-relaxed">
            When engineers leave, tribal knowledge vanishes. <strong className="text-slate-200 font-semibold">Cortex ingests GitHub, Slack, and Jira</strong> into a self-hosted Knowledge Graph — predicting departure loss risk, answering complex codebase questions, and calculating backup owners with deterministic math.
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
              <TrustBadge label="Pure math, zero AI guessing" />
            </span>
          </div>
        </div>

        {/* Interactive Query Playground (Proves Answers Come With Proof) */}
        <div className="mt-16 max-w-5xl mx-auto">
          <InteractiveQueryDemo />
        </div>

      </div>
    </section>
  );
};
