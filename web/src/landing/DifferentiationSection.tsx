import React from 'react';
import { 
  Check, 
  X, 
  ShieldCheck, 
  Calculator
} from 'lucide-react';

export const DifferentiationSection: React.FC = () => {
  const comparisonItems = [
    {
      dimension: 'Data Privacy & Hosting',
      cortex: 'Self-hosted inside your VPC (Docker, AWS ECS, EKS). Zero proprietary code or tokens leave your infrastructure.',
      genericLlm: 'Third-party cloud SaaS. Code snippets and context sent over public internet to external model providers.',
      doraTools: 'SaaS-only vendors. Requires storing commit metadata and employee activity on third-party servers.',
    },
    {
      dimension: 'Bus Factor & Risk Computation',
      cortex: 'Deterministic graph formulas in code (author dispersion & 4-factor Jaccard matches). Auditable and repeatable.',
      genericLlm: 'Hallucinates mathematical scores. LLMs cannot compute graph centrality or dispersion reliably.',
      doraTools: 'Measures PR cycle times and velocity metrics; lacks knowledge graph or successor continuity modeling.',
    },
    {
      dimension: 'Developer Identity Resolution',
      cortex: 'Automated canonical merging matching GitHub logins, Slack IDs, and Git commit emails into single Person entities.',
      genericLlm: 'Treats disparate tool handles as unrelated strangers with zero persistent memory across sessions.',
      doraTools: 'Basic email matching for commit velocity; lacks cross-tool communication graph context.',
    },
    {
      dimension: 'Answer Grounding & Citations',
      cortex: 'Every query response is backed by exact Git commit SHAs, Jira issue keys, and Slack channel thread links.',
      genericLlm: 'Generates plausible-sounding explanations without verifiable source links or audited commit hashes.',
      doraTools: 'No natural language codebase search; limited to static dashboards and chart filters.',
    },
  ];

  return (
    <section id="differentiation" className="py-20 md:py-28 bg-[#0B0F14] relative border-t border-white/10 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#12181F] border border-white/10 text-slate-300 text-xs font-mono mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Architectural Differentiation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
            Deterministic graph math. Not AI speculation.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Why engineering leaders choose a private knowledge graph over generic LLM wrappers and surface-level DORA dashboards.
          </p>
        </div>

        {/* Comparison Table / Matrix */}
        <div className="max-w-5xl mx-auto bg-[#12181F] border border-white/10 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-[#0E131A] text-slate-400 font-mono text-[11px]">
                  <th className="py-4 px-6 w-1/4 font-semibold uppercase tracking-wider">Capabilities</th>
                  <th className="py-4 px-6 w-1/3 text-white font-bold uppercase tracking-wider bg-blue-600/10 border-x border-blue-500/20">
                    <span className="text-blue-400 flex items-center space-x-1.5">
                      <span>Cortex Platform</span>
                    </span>
                  </th>
                  <th className="py-4 px-6 w-1/5 font-semibold uppercase tracking-wider hidden md:table-cell">Generic LLMs</th>
                  <th className="py-4 px-6 w-1/5 font-semibold uppercase tracking-wider hidden lg:table-cell">Standard DORA Metrics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {comparisonItems.map((item) => (
                  <tr key={item.dimension} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 px-6 font-semibold text-white font-mono text-xs">
                      {item.dimension}
                    </td>

                    {/* Cortex Column (Emphasized) */}
                    <td className="py-4 px-6 bg-blue-600/[0.04] border-x border-blue-500/20 text-slate-200 font-medium">
                      <div className="flex items-start space-x-2">
                        <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed text-xs">{item.cortex}</span>
                      </div>
                    </td>

                    {/* Generic LLMs */}
                    <td className="py-4 px-6 text-slate-400 text-xs hidden md:table-cell">
                      <div className="flex items-start space-x-2">
                        <X className="w-4 h-4 text-rose-500/70 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{item.genericLlm}</span>
                      </div>
                    </td>

                    {/* Standard DORA */}
                    <td className="py-4 px-6 text-slate-400 text-xs hidden lg:table-cell">
                      <div className="flex items-start space-x-2">
                        <X className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{item.doraTools}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Summary Bar */}
          <div className="p-4 bg-[#0E131A] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-400 gap-2">
            <div className="flex items-center space-x-2">
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span>Calculated deterministically before model formatting.</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SOC2 Type II Compatible Architecture</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
