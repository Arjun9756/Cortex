import React, { useState } from 'react';
import { Plus, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // 1st item open by default

  const faqs: FaqItem[] = [
    {
      question: 'Which sources does Cortex actually connect to?',
      answer:
        'GitHub (repos, PRs, commits), Slack (channels, threads), and Jira (issues, workflows). Every event writes into one unified knowledge graph.',
    },
    {
      question: 'Do I need to host anything myself?',
      answer:
        'Yes — Cortex runs on the BYOC (Bring Your Own Cloud) model. You connect your own free-tier infrastructure (Oracle Cloud, Neo4j Aura, Qdrant Cloud) and Cortex runs entirely on accounts you control. Zero cost, zero vendor lock-in.',
    },
    {
      question: 'How accurate is the AI extraction?',
      answer:
        'Cortex uses graph-based entity resolution (not just keyword matching) — it knows exact authorship, ownership, and relationships. Ambiguous entities trigger a clarification question rather than guessing.',
    },
    {
      question: 'Where is my data stored?',
      answer:
        'Entirely in infrastructure you own and control (your own Neo4j, Qdrant, and Postgres instances). Cortex doesn\'t store your data on any third-party server.',
    },
    {
      question: 'Is this free?',
      answer:
        'Yes. Cortex itself is free to run under the BYOC model — you only use free-tier cloud infrastructure. Reach out and we\'ll personally help you set it up.',
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F5F5F7] tracking-tight">
            Clear Answers for Engineering Teams
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#9497A6]">
            Everything you need to know about Cortex architecture, self-hosting, and privacy.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="bg-[#12141A] border border-white/10 hover:border-[#3B82F6]/40 rounded-xl transition-all duration-200 overflow-hidden shadow-lg"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <span className="text-base sm:text-lg font-bold text-[#F5F5F7] font-mono">
                    {faq.question}
                  </span>
                  <div
                    className={`p-2 rounded-lg border transition-transform duration-200 shrink-0 ${
                      isOpen
                        ? 'bg-[#3B82F6]/20 border-[#3B82F6]/50 text-[#3B82F6] rotate-45'
                        : 'bg-[#0A0B0E] border-white/10 text-[#9497A6]'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm sm:text-base text-[#9497A6] leading-relaxed border-t border-white/10 animate-fadeIn">
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
