import React from 'react';
import { Check, ArrowRight, Shield, Clock, Server } from 'lucide-react';

interface PricingSectionProps {
  onOpenContact: (planDetails?: string) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenContact }) => {
  const freeTierFeatures = [
    {
      category: 'Data Ingestion & Graph Lineage',
      items: [
        'GitHub & GitHub Enterprise ingestion (commits, PR reviews, branches)',
        'Slack workspace channel & thread contextual ingestion',
        'Jira issue & epic lineage tracking',
        'Canonical cross-platform identity resolution (GitHub + Slack + Git email)',
        'Unlimited repositories, microservices, and team contributors',
      ],
    },
    {
      category: 'Intelligence & Risk Calculation',
      items: [
        'Deterministic bus factor scoring per repository & core module',
        'Departure impact simulation with orphaned technology detection',
        '4-factor Jaccard successor ranking (stack overlap, bandwidth, recency)',
        'Grounded natural language search with exact Git commit & Jira citations',
        'Auditable Cypher and SQL query traces for all risk calculations',
      ],
    },
    {
      category: 'Infrastructure & Data Sovereignty',
      items: [
        '100% self-hosted inside your private VPC (AWS, GCP, Azure, or Docker)',
        'Compatible with free-tier managed cloud databases (Neo4j Aura & Qdrant Free)',
        'Local air-gapped LLM support (Ollama / vLLM) with zero internet egress',
        'Full data sovereignty — zero code or telemetry sent to Cortex servers',
        '1-on-1 guided deployment assistance with founding engineers',
      ],
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 bg-[#0B0F14] relative border-t border-white/10 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#12181F] border border-white/10 text-slate-300 text-xs font-mono mb-4">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Honest &amp; Transparent Access</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
            $0 license fee for design partners.
          </h2>

          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            We are actively partnering with engineering organizations to refine bus factor models and succession simulation. No license fees, seat taxes, or credit cards required.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-14">
          
          {/* Card 1: Active Design Partner Tier (Current) */}
          <div className="p-8 rounded-xl bg-[#12181F] border border-blue-500/30 flex flex-col justify-between space-y-8 shadow-lg relative">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                    Active Design Partner Tier
                  </span>
                  <h3 className="text-2xl font-bold text-white font-sans mt-3">
                    Self-Hosted Community Edition
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white font-mono">$0</div>
                  <div className="text-xs text-slate-400 font-mono">forever free license</div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                Deploy on your team's AWS, GCP, or Docker infrastructure. You maintain full ownership of all data, graph nodes, and database telemetry.
              </p>

              {/* Feature Checklist */}
              <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-300 pt-2 border-t border-white/5">
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Unlimited repositories, microservices, and team members</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Continuous webhook ingestion for GitHub, Slack &amp; Jira</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Deterministic single-point-of-failure (SPOF) bus factor scoring</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Simulated departure impact &amp; 4-factor successor ranking</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Grounded natural language search with exact commit &amp; issue citations</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>Direct 1-on-1 deployment walkthrough with founding engineers</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenContact('Self-Hosted Community Edition')}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
            >
              <span>Request Design Partner Setup</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Card 2: Enterprise Managed Cloud (Roadmap) */}
          <div className="p-8 rounded-xl bg-[#0E131A] border border-white/10 flex flex-col justify-between space-y-8 opacity-90">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                    Future Roadmap Tier
                  </span>
                  <h3 className="text-2xl font-bold text-slate-200 font-sans mt-3">
                    Managed Cloud &amp; Compliance
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-slate-400 font-mono">Custom</div>
                  <div className="text-xs text-slate-500 font-mono">annual contract</div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                For enterprise organizations that require Cortex-hosted single-tenant environments, compliance SLAs, and centralized identity governance.
              </p>

              {/* Feature Checklist */}
              <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-400 pt-2 border-t border-white/5">
                <div className="flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>Fully managed single-tenant dedicated cloud infrastructure</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>Enterprise SAML / Okta SSO &amp; SCIM automated provisioning</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>SOC2 Type II audit logging &amp; customizable data retention</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>99.9% platform availability uptime SLA</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>Dedicated solutions architect &amp; priority 24/7 incident response</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenContact('Enterprise Managed Tier Waitlist')}
              className="w-full py-3 px-4 text-sm font-semibold text-slate-300 hover:text-white bg-[#161B22] hover:bg-[#1E2630] border border-white/10 rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Join Enterprise Waitlist</span>
            </button>
          </div>

        </div>

        {/* DETAILED BREAKDOWN: WHAT IS INCLUDED IN THE FREE TIER */}
        <div className="max-w-5xl mx-auto p-6 sm:p-8 rounded-xl bg-[#12181F] border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-blue-400 font-semibold">
                Transparent Feature Matrix
              </span>
              <h3 className="text-lg font-bold text-white font-sans mt-0.5">
                What's included in the $0 Free Community Edition
              </h3>
            </div>
            <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
              <span>✓ No seat limits</span>
              <span>·</span>
              <span>✓ No credit card</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {freeTierFeatures.map((group) => (
              <div key={group.category} className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  {group.category}
                </h4>
                <ul className="space-y-2 text-xs text-slate-400 leading-relaxed">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start space-x-2">
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Zero Infrastructure Cost Callout */}
          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Runs comfortably within Neo4j Aura Free, Qdrant Cloud Free, and local/free LLM limits for small-to-mid engineering teams.
              </span>
            </div>
            <button
              onClick={() => onOpenContact('Free Tier Walkthrough')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap cursor-pointer"
            >
              Learn about free cloud setup →
            </button>
          </div>
        </div>

        {/* Reassurance note */}
        <div className="mt-10 text-center text-xs font-mono text-slate-500 max-w-xl mx-auto">
          The Self-Hosted Community Edition will remain free and fully functional. We believe engineering knowledge graph primitives should be open and auditable.
        </div>

      </div>
    </section>
  );
};
