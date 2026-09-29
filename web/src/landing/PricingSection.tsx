import React from 'react';
import { 
  Check, 
  ArrowRight, 
  Shield
} from 'lucide-react';

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
    <section id="pricing" className="py-12 md:py-16 bg-[#06090F] relative antialiased">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono mb-5">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Honest &amp; Transparent Access</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight font-sans">
            $0 license fee for <span className="gradient-text">design partners.</span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            We are actively partnering with engineering organizations to refine bus factor models and succession simulation. No license fees, seat taxes, or credit cards required.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-10">
          
          {/* Card 1: Active Design Partner Tier (Current) */}
          <div className="p-8 rounded-2xl bg-[#0D1117] border border-blue-500/40 flex flex-col justify-between space-y-8 shadow-2xl relative">
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-blue-500/30 uppercase">
                    Active Design Partner Tier
                  </span>
                  <h3 className="text-2xl font-bold text-white font-sans mt-3">
                    Self-Hosted Community Edition
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-3xl sm:text-4xl font-bold text-white font-mono">$0</div>
                  <div className="text-xs text-slate-400 font-mono">perpetual free license</div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                Deploy on your team's AWS, GCP, or Docker infrastructure. You maintain 100% data sovereignty of all graphs, models, and telemetry.
              </p>

              {/* Feature Checklist */}
              <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-300 pt-3 border-t border-white/[0.04]">
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Unlimited repositories, microservices, and team members</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Continuous scoped webhook ingestion (GitHub, Slack, Jira)</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Deterministic single-point-of-failure (SPOF) bus factor scoring</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Departure impact simulation &amp; 4-factor successor candidate ranking</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Grounded natural language search with exact Git commit &amp; issue citations</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Direct 1-on-1 deployment walkthrough with founding engineers</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenContact('Self-Hosted Community Edition')}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              <span>Request Design Partner Setup</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Card 2: Enterprise Managed Cloud (Roadmap) */}
          <div className="p-8 rounded-2xl bg-[#0A0E16] border border-white/[0.06] flex flex-col justify-between space-y-8 opacity-90">
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                    Future Roadmap Tier
                  </span>
                  <h3 className="text-2xl font-bold text-slate-200 font-sans mt-3">
                    Managed Cloud &amp; Compliance
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl sm:text-3xl font-bold text-slate-300 font-mono">Custom</div>
                  <div className="text-xs text-slate-500 font-mono">annual SLA contract</div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                Dedicated multi-region high-availability cluster with managed updates, SOC2 Type II compliance pack, and custom SSO/SAML integration.
              </p>

              {/* Feature Checklist */}
              <div className="space-y-3 font-sans text-xs sm:text-sm text-slate-400 pt-3 border-t border-white/[0.04]">
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>Everything in Community Edition</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>Dedicated VPC peering or managed private link</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>Enterprise Okta / SAML 2.0 &amp; SCIM user provisioning</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>Automated weekly database backups &amp; multi-AZ failover</span>
                </div>
                <div className="flex items-start space-x-2.5">
                  <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span>Guaranteed 99.9% uptime SLA &amp; dedicated Slack channel</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onOpenContact('Enterprise Managed Cloud (Roadmap)')}
              className="w-full py-3 px-4 text-sm font-semibold text-slate-300 hover:text-white bg-[#0D1117] hover:bg-[#151D28] border border-white/[0.08] rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Join Enterprise Waitlist</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>


        {/* Detailed Feature Breakdown Categories */}
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white font-sans">
              Comprehensive Feature Breakdown
            </h3>
            <p className="text-xs text-slate-400 mt-1">Everything included in the Community Edition with zero limits.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {freeTierFeatures.map((cat) => (
              <div key={cat.category} className="p-6 rounded-2xl bg-[#0D1117] border border-white/[0.06] space-y-4">
                <h4 className="text-sm font-bold text-white font-sans flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>{cat.category}</span>
                </h4>
                <ul className="space-y-2.5 text-xs text-slate-300 font-sans">
                  {cat.items.map((it, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
