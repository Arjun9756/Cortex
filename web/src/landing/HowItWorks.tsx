import React from 'react';
import { CheckCircle2, GitBranch, Cpu, MessageSquareText } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Connect your sources',
      description:
        'Point Cortex at your GitHub, Slack, and Jira. Webhooks stream events in real time with zero manual tagging.',
      bullets: [
        'GitHub App install in 2 clicks',
        'Slack workspace OAuth',
        'Jira webhook integration',
      ],
      icon: <GitBranch className="w-5 h-5 text-indigo-400" />,
    },
    {
      number: '02',
      title: 'Graph builds automatically',
      description:
        'Commits, PRs, and messages are parsed into Neo4j graph entities — linking who authored what, why, and how components depend on each other.',
      bullets: [
        'Automatic entity resolution',
        'Real-time Neo4j & Vector indexing',
        'No manual data entry',
      ],
      icon: <Cpu className="w-5 h-5 text-purple-400" />,
    },
    {
      number: '03',
      title: 'Ask questions & fix risk',
      description:
        'Query codebase history in plain English with ~0.1ms Fast-Path responses or trigger 1-Click Auto-Fix PRs to eliminate knowledge risk.',
      bullets: [
        'Natural language Q&A',
        '6-Factor departure risk scoring',
        '1-Click Auto-Doc GitHub PRs',
      ],
      icon: <MessageSquareText className="w-5 h-5 text-emerald-400" />,
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-[#06080e] relative overflow-hidden border-t border-slate-800/80 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0c111e] border border-slate-800/80 text-indigo-400 text-xs font-mono mb-4">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Seamless Data Flow</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            How Cortex Operates
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 font-normal">
            From raw webhooks to an intelligent, self-healing knowledge graph in minutes.
          </p>
        </div>

        {/* Timeline Container */}
        <div className="max-w-4xl mx-auto relative">
          
          {/* Vertical Connector Line */}
          <div className="hidden md:block absolute left-1/2 top-10 bottom-10 w-0.5 -translate-x-1/2 bg-gradient-to-b from-indigo-500/40 via-purple-500/40 to-emerald-500/40" />

          <div className="space-y-12 md:space-y-16">
            {steps.map((step, idx) => (
              <div
                key={step.number}
                className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${
                  idx % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                {/* Content Box */}
                <div className="w-full md:w-1/2">
                  <div className="bg-[#090d16]/90 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/20 transition-all duration-300 group backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-500 group-hover:text-indigo-400 transition-colors">
                        {step.number}
                      </span>
                      <div className="p-3 rounded-xl border border-slate-800 bg-[#060911]">
                        {step.icon}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-white font-sans mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6 font-normal">
                      {step.description}
                    </p>

                    {/* Bullet List */}
                    <div className="space-y-2.5 border-t border-slate-800/80 pt-5 font-mono text-xs text-slate-300">
                      {step.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-center space-x-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline Center Node Indicator */}
                <div className="hidden md:flex items-center justify-center relative shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-[#06080e] border-2 border-indigo-500/60 shadow-lg shadow-indigo-500/30 flex items-center justify-center z-10 text-indigo-400 font-mono font-bold text-sm">
                    {step.number}
                  </div>
                </div>

                {/* Spacer Column */}
                <div className="hidden md:block w-1/2" />
              </div>
            ))}
          </div>

        </div>

        {/* Solo-Builder Credibility Badge */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#12141A] border border-white/10 text-[#9497A6] text-xs font-mono">
            <span>🛠 Actively built by one developer. No sales team. No funding. Just working code.</span>
          </div>
        </div>

      </div>
    </section>
  );
};
