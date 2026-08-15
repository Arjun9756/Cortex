import React, { useState } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      question: 'How does Cortex predict key-person departure loss risk?',
      answer:
        'Cortex computes a weighted 6-factor risk score (30% ownership concentration, 20% critical dependents, 15% activity staleness, 15% documentation gaps, 10% sole expertise, 10% pending work) by linking GitHub commits, PR co-authorship, and Jira ticket history in Neo4j.',
    },
    {
      question: 'How fast is the query engine?',
      answer:
        'Cortex features a ~0.1ms Fast-Path Intent Router that handles 80% of routine questions instantly with 0 token cost. Complex multi-part queries are automatically routed to Qwen 3.6 27B agent graphs.',
    },
    {
      question: 'Is my proprietary code kept 100% private?',
      answer:
        'Yes — Cortex is 100% self-hosted. It runs inside your Docker container or private cloud VPC (AWS, GCP, K8s). Your code, commits, and Slack messages never leave your infrastructure.',
    },
    {
      question: 'How does the 1-Click Auto-Fix PR generator work?',
      answer:
        'When Cortex detects single-contributor code with documentation risk, it drafts Markdown Architecture Decision Records (ADRs) and READMEs using verified graph context and pushes a merge-ready GitHub Pull Request.',
    },
    {
      question: 'What is the setup time for engineering teams?',
      answer:
        'Setup takes less than 60 seconds with our official Docker container (`docker run -d -p 3000:3000 cortex/app:latest`) or 1-click GitHub App integration.',
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 md:py-32 bg-[#06080e] relative overflow-hidden border-t border-slate-800/80 antialiased">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0c111e] border border-slate-800/80 text-indigo-400 text-xs font-mono mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            Technical FAQs for Engineering Leaders
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400 font-normal">
            Everything you need to know about Cortex architecture, self-hosting, and departure risk prediction.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="bg-[#090d16]/90 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl transition-all duration-200 overflow-hidden shadow-xl backdrop-blur-xl"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <span className="text-base sm:text-lg font-bold text-white font-sans">
                    {faq.question}
                  </span>
                  <div
                    className={`p-2 rounded-xl border transition-all duration-300 shrink-0 ${
                      isOpen
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 rotate-180'
                        : 'bg-[#060911] border-slate-800 text-slate-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm sm:text-base text-slate-300 leading-relaxed border-t border-slate-800/80 animate-in fade-in duration-200">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
