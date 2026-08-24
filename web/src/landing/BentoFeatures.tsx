import React from 'react';
import { Network, ShieldAlert, Zap, Sparkles, Database, CheckCircle2, Calculator } from 'lucide-react';
import { TrustBadge } from './TrustBadge';

export const BentoFeatures: React.FC = () => {
  return (
    <section id="features" className="py-24 md:py-32 bg-[#06080e] relative overflow-hidden border-t border-slate-800/80 antialiased">
      {/* Background radial glow */}
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0c111e] border border-slate-800/80 text-purple-400 text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Built &amp; Verified Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            Engineered for Production Codebases.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 font-normal leading-relaxed">
            Zero unbuilt promises. Cortex turns complex codebase history and developer commits into verified, actionable graph intelligence with mathematical proof.
          </p>
        </div>

        {/* Bento Grid (4 Core Pillars) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          
          {/* Card 1: Knowledge Graph Ingestion */}
          <div className="bg-[#090d16]/90 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-950/30 group flex flex-col justify-between backdrop-blur-xl">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Network className="w-6 h-6" />
                </div>
                <TrustBadge label="Multi-hop Cypher Graph Traversal" />
              </div>
              <h3 className="text-xl font-bold text-white font-sans mb-3">
                Neo4j Knowledge Graph Ingestion
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Connects GitHub commits, Slack discussions, and Jira issues automatically. Ingests entities (Person, Service, Repository, Issue, PR, Technology) into an interconnected Neo4j graph with cross-platform identity resolution.
              </p>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[#060911] border border-slate-800/80 font-mono text-xs text-slate-300">
              <div className="flex items-center space-x-2 text-indigo-400 mb-1 font-bold">
                <Database className="w-3.5 h-3.5" />
                <span>Neo4j Graph Schema:</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                (Person)-[:AUTHORED]-&gt;(Commit)-[:PART_OF]-&gt;(Repository)-[:USES]-&gt;(Technology)
              </p>
            </div>
          </div>

          {/* Card 2: 6-Factor Departure Risk Model */}
          <div className="bg-[#090d16]/90 border border-slate-800/80 hover:border-rose-500/40 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-950/30 group flex flex-col justify-between backdrop-blur-xl">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <TrustBadge label="Calculated from real graph data — not AI-generated" />
              </div>
              <h3 className="text-xl font-bold text-white font-sans mb-3">
                6-Factor Departure Loss Risk Score
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Computes single-point-of-failure risk before developers offboard: 30% Ownership, 20% Critical Dependents, 15% Activity Staleness, 15% Documentation Gaps, 10% Sole Expertise, 10% Pending Work.
              </p>
            </div>

            <div className="mt-6 p-3.5 rounded-xl bg-[#060911] border border-rose-500/30 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Vikram Patel Departure Risk:</span>
                <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold uppercase text-[11px]">
                  76% CRITICAL RISK
                </span>
              </div>
              <span className="text-[10px] text-slate-500 hidden sm:inline font-bold font-mono">Pure Math</span>
            </div>
          </div>

          {/* Card 3: ~0.1ms Fast-Path Intent Router */}
          <div className="bg-[#090d16]/90 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-950/30 group flex flex-col justify-between backdrop-blur-xl">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <TrustBadge label="Deterministic Fast-Path Rules" />
              </div>
              <h3 className="text-xl font-bold text-white font-sans mb-3">
                ~0.1ms Fast-Path Intent Router
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Matches routine queries using high-speed fast-path rules in sub-milliseconds with zero token cost, seamlessly handing off complex multi-hop queries to parallel agent graph tools.
              </p>
            </div>

            <div className="mt-6 p-3.5 rounded-xl bg-[#060911] border border-slate-800/80 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">Rule Match Latency:</span>
              <span className="text-amber-400 font-bold">~0.1ms (0 Token Cost)</span>
            </div>
          </div>

          {/* Card 4: 4-Factor Successor Recommendation Engine */}
          <div className="bg-[#090d16]/90 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/30 group flex flex-col justify-between backdrop-blur-xl">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calculator className="w-6 h-6" />
                </div>
                <TrustBadge label="Pure math, zero AI guessing" />
              </div>
              <h3 className="text-xl font-bold text-white font-sans mb-3">
                Deterministic Successor Recommendation
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                When key maintainers depart, Cortex calculates backup owners mathematically: 40% Tech Jaccard similarity, 25% Repository overlap, 20% Activity recency, and 15% Workload capacity.
              </p>
            </div>

            <div className="mt-6 p-3.5 rounded-xl bg-[#060911] border border-emerald-500/30 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">Formula Jaccard Match:</span>
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Zero Hallucination</span>
              </span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
