import React from 'react';
import { CheckCircle2, GitBranch, Cpu, MessageSquareText } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Connect your sources',
      description:
        'Point Cortex at your GitHub, Slack, and Jira. Webhooks start streaming events immediately, no manual setup.',
      bullets: [
        'GitHub App install in 2 clicks',
        'Slack workspace OAuth',
        'Jira webhook config',
      ],
      icon: <GitBranch className="w-5 h-5 text-[#3B82F6]" />,
    },
    {
      number: '02',
      title: 'AI builds the graph',
      description:
        'Every commit, message, and ticket gets parsed into entities and relationships — who did what, why, and how it connects.',
      bullets: [
        'Automatic entity resolution',
        'Real-time graph updates',
        'No manual tagging needed',
      ],
      icon: <Cpu className="w-5 h-5 text-[#3B82F6]" />,
    },
    {
      number: '03',
      title: 'Ask anything',
      description:
        'Query your engineering history in plain English. Get structured facts or narrative context, whichever the question needs.',
      bullets: [
        'Natural language Q&A',
        'Knowledge risk scoring',
        'Full team visibility',
      ],
      icon: <MessageSquareText className="w-5 h-5 text-[#3B82F6]" />,
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
            <Cpu className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Seamless 3-Step Setup</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
            How Cortex Works
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#9497A6]">
            From raw webhook events to an intelligent team knowledge graph in minutes.
          </p>
        </div>

        {/* Timeline Container */}
        <div className="max-w-4xl mx-auto relative">
          
          {/* Vertical Connector Line for Desktop */}
          <div className="hidden md:block absolute left-1/2 top-10 bottom-10 w-0.5 -translate-x-1/2 bg-gradient-to-b from-[#3B82F6]/40 via-[#3B82F6]/20 to-[#3B82F6]/40" />

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
                  <div className="bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl p-6 shadow-xl transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl sm:text-4xl font-extrabold font-mono text-[#9497A6] group-hover:text-[#3B82F6] transition-colors">
                        {step.number}
                      </span>
                      <div className="p-2.5 rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/10 text-[#3B82F6]">
                        {step.icon}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-[#F5F5F7] font-mono mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-[#9497A6] leading-relaxed mb-6">
                      {step.description}
                    </p>

                    {/* Bullet List */}
                    <div className="space-y-2.5 border-t border-white/10 pt-5 font-mono text-xs sm:text-sm text-[#F5F5F7]">
                      {step.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-center space-x-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#3B82F6] shrink-0" />
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline Center Node Indicator */}
                <div className="hidden md:flex items-center justify-center relative shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-[#0A0B0E] border-2 border-[#3B82F6]/60 shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center z-10 text-[#3B82F6] font-mono font-bold text-sm">
                    {step.number}
                  </div>
                </div>

                {/* Empty Spacer Column */}
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
