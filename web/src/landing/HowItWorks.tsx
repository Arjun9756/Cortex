import React from 'react';
import { GitBranch, Database, ShieldCheck } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Connect Ingestion Sources',
      icon: GitBranch,
      description:
        'Install the lightweight GitHub App or configure webhook endpoints for GitHub, Slack, and Jira. Cortex begins ingesting commits, PR reviews, and architectural discussions immediately.',
      details: [
        'Webhooks stream changes continuously',
        'Zero code instrumentation or agent sidecars',
        'Scoped read-only repository permissions',
      ],
    },
    {
      step: '02',
      title: 'Build Living Knowledge Graph',
      icon: Database,
      description:
        'Cortex parses historical commit trees, authorship frequencies, and cross-tool identities into a private Neo4j graph with vector embeddings stored in your private cluster.',
      details: [
        'Cross-platform developer identity resolution',
        'Deterministic bus factor formulas computed in code',
        'No training on your proprietary codebase',
      ],
    },
    {
      step: '03',
      title: 'Mitigate Risk & Query Context',
      icon: ShieldCheck,
      description:
        'Engineering leadership monitors bus factor vulnerabilities, simulates departure impacts before employees leave, and enables engineers to query system lineage with citations.',
      details: [
        'Live departure impact & successor ranking',
        'Grounded Q&A backed by exact commit SHAs',
        'Optional 1-click architecture documentation PRs',
      ],
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-[#0B0F14] relative border-t border-white/10 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#12181F] border border-white/10 text-slate-300 text-xs font-mono mb-4">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Deployment &amp; Lifecycle</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
            How Cortex operates in production.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            From initial webhook connection to fully indexed organizational knowledge graph in under thirty minutes.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.step}
                className="p-6 sm:p-7 rounded-xl bg-[#12181F] border border-white/10 flex flex-col justify-between space-y-6 hover:border-white/20 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-blue-400">
                      STEP {item.step}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-[#0E131A] border border-white/10 flex items-center justify-center text-slate-300">
                      <Icon className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white font-sans">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2 font-mono text-xs text-slate-300">
                  {item.details.map((detail) => (
                    <div key={detail} className="flex items-start space-x-2">
                      <span className="text-blue-400 font-bold">✓</span>
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
