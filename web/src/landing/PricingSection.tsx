import React, { useState } from 'react';
import { Check, Sparkles, Shield, ArrowRight } from 'lucide-react';

interface PricingSectionProps {
  onOpenContact: (planDetails?: string) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenContact }) => {
  const [billingCycle, setBillingCycle] = useState<'quarterly' | 'annual'>('annual');

  const featureGroups = [
    {
      category: '🧠 Agentic Knowledge Engine',
      features: [
        { name: 'Multi-hop Graph Traversal & Cypher engine', quarterly: true, annual: true },
        { name: 'Hybrid Graph + SQL + Vector Semantic RAG', quarterly: true, annual: true },
        { name: 'Sub-second real-time SSE token streaming', quarterly: true, annual: true },
        { name: 'Self-verifying reflection & targeted recovery loop', quarterly: true, annual: true },
        { name: 'Live schema caching & unbounded query decomposition', quarterly: true, annual: true },
        { name: 'Deterministic zero-hallucination grounding guarantee', quarterly: true, annual: true },
      ],
    },
    {
      category: '⚡ Departure Risk & Engineering Intelligence',
      features: [
        { name: '6-Dimension Departure Knowledge Risk calculation', quarterly: true, annual: true },
        { name: 'Real-time Bus Factor = 1 heatmaps & fragility alerts', quarterly: true, annual: true },
        { name: 'Automated Successor Recommendation ranking', quarterly: true, annual: true },
        { name: 'Single-Point-of-Failure & Departure Blast Radius audit', quarterly: true, annual: true },
        { name: 'Historical Architecture Decision Records (ADRs) semantic memory', quarterly: true, annual: true },
      ],
    },
    {
      category: '🔌 Ingestors & Automated Pulses',
      features: [
        { name: 'GitHub, GitLab & Bitbucket Organization live sync', quarterly: true, annual: true },
        { name: 'Jira, Linear & GitHub Issues cross-linking', quarterly: true, annual: true },
        { name: 'Slack channel decision mining & thread summaries', quarterly: true, annual: true },
        { name: 'Automated 24h Executive Daily HTML Pulse Digest', quarterly: true, annual: true },
        { name: 'GitHub Pull Request Knowledge Sentinel Bot & Webhooks', quarterly: true, annual: true },
      ],
    },
    {
      category: '🛡️ Enterprise Security & Data Governance',
      features: [
        { name: 'Zero model training on customer source code / intellectual property', quarterly: true, annual: true },
        { name: 'Mumbai / Local VPC data residency & zero retention', quarterly: true, annual: true },
        { name: 'Self-hosted Docker / Kubernetes deployment support', quarterly: true, annual: true },
        { name: 'Role-Based Access Control (RBAC), SSO & full audit logs', quarterly: true, annual: true },
      ],
    },
    {
      category: '🤝 Onboarding & Support',
      features: [
        { name: '14-day 100% money-back guarantee', quarterly: true, annual: true },
        { name: 'Minimum seats', quarterly: '10 Engineers', annual: '10 Engineers' },
        { name: 'Historical codebase & repo onboarding', quarterly: '₹15,000 one-time', annual: 'Included Free (₹15,000 value)' },
        { name: 'Dedicated engineering support', quarterly: 'Email & Community Slack', annual: 'Dedicated Slack Connect Channel' },
      ],
    },
  ];

  const addOns = [
    { item: 'Self-Hosted Air-Gapped Setup / Custom On-Prem Deployment', billing: 'One-time', price: 'Custom Quote' },
    { item: 'Historical Ingestion & Initial Graph Migration', billing: 'One-time', price: '₹15,000 · Free on Annual' },
    { item: 'Architecture Deep-Dive & Team Training', billing: 'Per session', price: '₹5,000 · 2 Free on Annual' },
    { item: 'LLM Token Usage (Groq / OpenAI BYOK or Cortex Managed)', billing: 'Direct pass-through', price: 'At published rates' },
  ];

  return (
    <section id="pricing" className="py-24 md:py-32 bg-[#06080e] relative overflow-hidden border-t border-slate-800/80">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            One plan. <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Everything in it.</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            No tiers, no locked features, no upgrade nag. Full Knowledge Graph, Agentic AI, Departure Risk Engine, Daily Pulse, and Bus Factor Analytics — all of it, on both billing terms. The only choice is how long you commit for.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
            <button
              onClick={() => setBillingCycle('quarterly')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                billingCycle === 'quarterly'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quarterly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
                billingCycle === 'annual'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Annual</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Save 30%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
          {/* Quarterly Plan Card */}
          <div
            className={`rounded-2xl p-8 sm:p-10 transition-all flex flex-col justify-between relative ${
              billingCycle === 'quarterly'
                ? 'bg-[#090d16] border-2 border-indigo-500 shadow-2xl shadow-indigo-950/40 ring-1 ring-indigo-500/50'
                : 'bg-[#090d16]/70 border border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Quarterly Commitment</h3>
                  <p className="text-xs text-slate-400 mt-1">Billed every 3 months</p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Flexible Term
                </span>
              </div>

              <p className="text-sm text-slate-300 mb-6">
                Start without a year-long commitment. The complete enterprise product from day one.
              </p>

              <div className="flex items-baseline space-x-2 mb-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-white">₹999</span>
                <span className="text-sm text-slate-400 font-medium">/ engineer / mo</span>
              </div>
              <p className="text-xs text-slate-400 mb-8">
                ₹11,988 per engineer / year &bull; Min 10 engineers (₹9,990/mo total)
              </p>

              <ul className="space-y-3.5 text-sm text-slate-200 mb-8 border-t border-slate-800/80 pt-6">
                <li className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Everything in Cortex</strong>, zero locked features</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>14-day 100% money-back guarantee</strong></span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Cancel at the end of any quarter</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Switch to annual plan whenever you like</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenContact('Quarterly Plan (₹999/user/mo)')}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all cursor-pointer bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 flex items-center justify-center space-x-2"
            >
              <span>Book a Live Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Annual Plan Card (Featured) */}
          <div
            className={`rounded-2xl p-8 sm:p-10 transition-all flex flex-col justify-between relative overflow-hidden ${
              billingCycle === 'annual'
                ? 'bg-gradient-to-b from-[#0e1322] to-[#090d16] border-2 border-indigo-500 shadow-2xl shadow-indigo-900/40 ring-2 ring-indigo-500/50'
                : 'bg-[#090d16]/70 border border-slate-800/80 hover:border-slate-700'
            }`}
          >
            {/* Top highlight ribbon */}
            <div className="absolute top-0 right-0">
              <div className="bg-gradient-to-l from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider py-1 px-4 rounded-bl-xl shadow-md">
                Save 30% &bull; Best Value
              </div>
            </div>

            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <span>Annual Commitment</span>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Billed annually upfront</p>
                </div>
              </div>

              <p className="text-sm text-slate-300 mb-6">
                The same complete product for three months' less money, and historical onboarding on us.
              </p>

              <div className="flex items-baseline space-x-2 mb-2">
                <span className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
                  ₹700
                </span>
                <span className="text-sm text-slate-400 font-medium">/ engineer / mo</span>
              </div>
              <p className="text-xs text-emerald-400 font-semibold mb-8">
                ₹8,400 per engineer / year &bull; You save ₹3,588/yr per engineer
              </p>

              <ul className="space-y-3.5 text-sm text-slate-200 mb-8 border-t border-slate-800/80 pt-6">
                <li className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Everything in Cortex</strong>, nothing held back</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Free Onboarding & Repo Ingestion</strong> (₹15,000 value included)</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>14-day 100% money-back guarantee</strong></span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>Dedicated Slack Connect channel with Core Engineers</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenContact('Annual Plan (₹700/user/mo - Save 30%)')}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all cursor-pointer bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/30 flex items-center justify-center space-x-2"
            >
              <span>Talk to Sales & Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Guarantee Banner */}
        <div className="max-w-4xl mx-auto mb-20 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-indigo-950/40 border border-indigo-500/30 text-center flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 shadow-xl">
          <Shield className="w-8 h-8 text-indigo-400 flex-shrink-0" />
          <div className="text-left">
            <h4 className="text-sm font-bold text-white">14-Day Zero-Risk Money-Back Guarantee</h4>
            <p className="text-xs text-slate-300">
              Deploy Cortex with your repositories. If you don't discover critical bus-factor risks or save hours of engineering lookup time within 14 days, get a 100% full refund with zero questions asked.
            </p>
          </div>
        </div>

        {/* Detailed Feature Breakdown Table */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              Everything, on both terms.
            </h3>
            <p className="text-sm text-slate-400">
              We do not withhold features to create artificial upgrade tiers. The list below is the entire product.
            </p>
          </div>

          <div className="bg-[#090d16] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-slate-900/90 border-b border-slate-800 p-4 sm:p-6 text-xs sm:text-sm font-bold text-slate-200">
              <div className="col-span-6 sm:col-span-8">What you get</div>
              <div className="col-span-3 sm:col-span-2 text-center text-slate-300">
                Quarterly<br /><span className="text-[11px] font-normal text-slate-400">₹999/mo</span>
              </div>
              <div className="col-span-3 sm:col-span-2 text-center text-indigo-400 font-extrabold">
                Annual<br /><span className="text-[11px] font-normal text-emerald-400">₹700/mo</span>
              </div>
            </div>

            {/* Feature Categories & Rows */}
            {featureGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="border-b border-slate-800/80 last:border-0">
                <div className="bg-slate-950/60 px-4 sm:px-6 py-3 text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider border-b border-slate-800/40">
                  {group.category}
                </div>
                {group.features.map((feat, featIdx) => (
                  <div
                    key={featIdx}
                    className="grid grid-cols-12 px-4 sm:px-6 py-3.5 text-xs sm:text-sm border-b border-slate-800/30 last:border-0 hover:bg-slate-800/20 transition-colors items-center"
                  >
                    <div className="col-span-6 sm:col-span-8 text-slate-300 font-medium">
                      {feat.name}
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-center">
                      {typeof feat.quarterly === 'boolean' ? (
                        feat.quarterly ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">&mdash;</span>
                        )
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">{feat.quarterly}</span>
                      )}
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-center">
                      {typeof feat.annual === 'boolean' ? (
                        feat.annual ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">&mdash;</span>
                        )
                      ) : (
                        <span className="text-xs font-semibold text-emerald-400 font-mono">{feat.annual}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Add-ons & Transparent Pass-Through */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Billed Separately & Transparently</h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Real pass-through costs and optional specialized service work. Everything else is completely included in the seat price.
            </p>
          </div>

          <div className="bg-[#090d16] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-12 bg-slate-900/90 border-b border-slate-800 p-4 text-xs font-bold text-slate-300">
              <div className="col-span-6">Service / Add-on</div>
              <div className="col-span-3 text-center">Billing Type</div>
              <div className="col-span-3 text-right">Price (Excl. GST)</div>
            </div>

            {addOns.map((addon, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 p-4 text-xs sm:text-sm border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors items-center"
              >
                <div className="col-span-6 text-slate-200 font-medium">{addon.item}</div>
                <div className="col-span-3 text-center text-slate-400 text-xs font-mono">{addon.billing}</div>
                <div className="col-span-3 text-right text-indigo-400 font-semibold font-mono text-xs sm:text-sm">
                  {addon.price}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-xs text-slate-500">
            Minimum 10 Engineers. Prices exclude GST (18%). Self-hosted infrastructure hosting or token BYOK accounts are billed directly by your cloud provider.
          </div>
        </div>
      </div>
    </section>
  );
};
