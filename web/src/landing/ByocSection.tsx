import React from 'react';
import { Cloud, Shield, DollarSign, ArrowRight, Lock, Server } from 'lucide-react';

interface ByocSectionProps {
  onOpenContact: () => void;
}

export const ByocSection: React.FC<ByocSectionProps> = ({ onOpenContact }) => {
  return (
    <section id="byoc" className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10">
      {/* Blue Glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-6">
            <Cloud className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Zero Infrastructure Markup</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
            Free to try. Free to host. <span className="text-[#3B82F6]">Zero cost to you.</span>
          </h2>

          {/* USP Reinforcement 2: Emotional Hook */}
          <div className="mt-6 inline-block bg-[#12141A] border border-[#3B82F6]/40 rounded-xl px-6 py-3 shadow-lg shadow-blue-950/30">
            <p className="text-lg sm:text-2xl font-extrabold text-[#F5F5F7] font-mono">
              "You pay ₹0 forever. We don't touch your cloud bill."
            </p>
          </div>

          <p className="mt-6 text-base sm:text-lg text-[#9497A6] max-w-2xl mx-auto leading-relaxed">
            With our <span className="text-[#F5F5F7] font-semibold">BYOC (Bring Your Own Cloud)</span> architecture, Cortex deploys directly onto free-tier cloud resources you own and control. Your proprietary data never leaves your environment.
          </p>
        </div>

        {/* 4 Supported Free-Tier Cloud Providers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-14">
          
          {/* Oracle Cloud Free Tier */}
          <div className="bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl p-6 transition-all duration-200">
            <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center mb-4">
              <Server className="w-4 h-4" />
            </div>
            <h4 className="text-base font-bold text-[#F5F5F7] font-mono">Oracle Cloud Free</h4>
            <p className="text-xs text-[#3B82F6] font-mono mt-0.5">4 ARM vCPUs + 24GB RAM</p>
            <p className="text-xs text-[#9497A6] mt-2 leading-relaxed">
              Always Free Compute shapes to run the core Cortex Server &amp; webhook consumers.
            </p>
          </div>

          {/* Cloudflare Workers / Pages */}
          <div className="bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl p-6 transition-all duration-200">
            <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center mb-4">
              <Cloud className="w-4 h-4" />
            </div>
            <h4 className="text-base font-bold text-[#F5F5F7] font-mono">Cloudflare Free</h4>
            <p className="text-xs text-[#3B82F6] font-mono mt-0.5">100k requests/day</p>
            <p className="text-xs text-[#9497A6] mt-2 leading-relaxed">
              Edge routing, SSL termination, and static asset hosting with zero latency.
            </p>
          </div>

          {/* Neo4j Aura Free */}
          <div className="bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl p-6 transition-all duration-200">
            <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center mb-4">
              <Shield className="w-4 h-4" />
            </div>
            <h4 className="text-base font-bold text-[#F5F5F7] font-mono">Neo4j AuraDB Free</h4>
            <p className="text-xs text-[#3B82F6] font-mono mt-0.5">200k Nodes &amp; Edges</p>
            <p className="text-xs text-[#9497A6] mt-2 leading-relaxed">
              Fully managed cloud graph database for code ownership and relationship queries.
            </p>
          </div>

          {/* Qdrant Cloud Free */}
          <div className="bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl p-6 transition-all duration-200">
            <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#3B82F6] flex items-center justify-center mb-4">
              <DollarSign className="w-4 h-4" />
            </div>
            <h4 className="text-base font-bold text-[#F5F5F7] font-mono">Qdrant Cloud Free</h4>
            <p className="text-xs text-[#3B82F6] font-mono mt-0.5">1GB Vector Storage</p>
            <p className="text-xs text-[#9497A6] mt-2 leading-relaxed">
              High-speed vector similarity search for natural language engineering Q&amp;A.
            </p>
          </div>

        </div>

        {/* Cloud Boundary Diagram */}
        <div className="max-w-4xl mx-auto mb-14 p-6 sm:p-8 bg-[#0A0B0E] border-2 border-dashed border-[#3B82F6]/40 rounded-2xl relative">
          <div className="absolute -top-3.5 left-6 bg-[#12141A] px-3.5 py-0.5 rounded-lg border border-[#3B82F6]/50 text-xs font-mono text-[#3B82F6] font-bold">
            YOUR CLOUD BOUNDARY (100% Data Isolation)
          </div>
          <div className="text-center pt-2 pb-4">
            <p className="text-xs font-mono text-[#9497A6]">Cortex Engine runs completely inside your infrastructure. No external servers read your code or data.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
            <div className="bg-[#12141A] p-3 rounded-xl border border-white/10 text-[#F5F5F7]">Oracle Cloud Instance</div>
            <div className="bg-[#12141A] p-3 rounded-xl border border-white/10 text-[#F5F5F7]">Neo4j Aura Graph</div>
            <div className="bg-[#12141A] p-3 rounded-xl border border-white/10 text-[#F5F5F7]">Qdrant Vector DB</div>
            <div className="bg-[#12141A] p-3 rounded-xl border border-white/10 text-[#F5F5F7]">PostgreSQL DB</div>
          </div>
        </div>

        {/* Solo Builder Credibility Badge */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#12141A] border border-white/10 text-xs font-mono text-[#F5F5F7]">
            <span>🛠 Actively built by one developer. No sales team. No funding. Just working code.</span>
          </div>
        </div>

        {/* Feature Highlights & Founder CTA Banner */}
        <div className="max-w-4xl mx-auto bg-[#12141A] border border-[#3B82F6]/40 rounded-xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-left max-w-xl">
              <div className="flex items-center space-x-2 text-[#3B82F6] text-xs font-mono mb-2">
                <Lock className="w-4 h-4 text-[#3B82F6]" />
                <span>100% Self-Hosted &amp; Private</span>
              </div>
              <h3 className="text-xl font-bold text-[#F5F5F7] font-mono">
                Ready to deploy on your cloud?
              </h3>
              <p className="text-xs sm:text-sm text-[#9497A6] mt-1 leading-relaxed">
                Reach out and I'll personally assist you in provisioning and connecting your free-tier accounts in under 15 minutes.
              </p>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <button
                onClick={onOpenContact}
                className="w-full sm:w-auto px-6 py-3.5 text-xs font-mono font-bold text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Request Free Setup</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
