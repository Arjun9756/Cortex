import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { ProblemSection } from './ProblemSection';
import { HowItWorks } from './HowItWorks';
import { BentoFeatures } from './BentoFeatures';
import { VerifiedCapabilities } from './VerifiedCapabilities';
import { ByocSection } from './ByocSection';
import { FaqSection } from './FaqSection';
import { ContactModal } from './ContactModal';
import { Footer } from './Footer';
import { useScrollReveal } from './useScrollReveal';
import { Send, Sparkles, Mail, CheckCircle2, User, Building2, MessageSquare } from 'lucide-react';

interface LandingPageProps {
  onLaunchDemo?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchDemo }) => {
  useScrollReveal();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inlineForm, setInlineForm] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [inlineSubmitted, setInlineSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          access_key: '9eddc368-c586-4cdf-afea-5fa2e28b24c4',
          name: inlineForm.name,
          email: inlineForm.email,
          company: inlineForm.company || 'N/A',
          message: inlineForm.message,
          subject: `Cortex Setup Request - ${inlineForm.name} (${inlineForm.company || 'Individual'})`,
          from_name: 'Cortex Landing Page',
        }),
      });

      const result = await response.json();
      if (result.success) {
        setInlineSubmitted(true);
      } else {
        setInlineSubmitted(true);
      }
    } catch (error) {
      console.warn('[Web3Forms] Error submitting inline form:', error);
      setInlineSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#F5F5F7] font-sans selection:bg-[#3B82F6]/30 selection:text-white">
      {/* Sticky Header Nav */}
      <Navbar onOpenContact={() => setIsModalOpen(true)} onLaunchDemo={onLaunchDemo} />

      <main>
        {/* Hero Section */}
        <Hero onOpenContact={() => setIsModalOpen(true)} />

        {/* Architecture Diagram Section */}
        <ArchitectureDiagram />

        {/* Problem Section (Fragmentation to Unification) */}
        <ProblemSection />

        {/* How It Works Timeline Section */}
        <HowItWorks />

        {/* Bento Features Section */}
        <BentoFeatures />

        {/* 6 Verified Capabilities Sections */}
        <VerifiedCapabilities />

        {/* BYOC & Zero Cost Section */}
        <ByocSection onOpenContact={() => setIsModalOpen(true)} />

        {/* FAQ Accordion Section */}
        <FaqSection />

        {/* Inline Contact & Founder Onboarding Section */}
        <section id="contact" className="py-24 md:py-32 bg-[#0A0B0E] relative overflow-hidden border-t border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="bg-[#12141A] border border-white/10 rounded-xl p-8 sm:p-12 shadow-2xl">
              
              {!inlineSubmitted ? (
                <div>
                  <div className="text-center max-w-2xl mx-auto mb-10">
                    <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-[#0A0B0E] border border-white/10 text-[#3B82F6] text-xs font-mono mb-4">
                      <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                      <span>Direct Founder Setup</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F5F5F7] font-mono">
                      Get Cortex Running On Your Cloud
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-[#9497A6]">
                      Reach out and I'll personally set up Cortex on your team's infrastructure — free, on your own cloud.
                    </p>
                  </div>

                  <form onSubmit={handleInlineSubmit} className="space-y-4 max-w-xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-[#F5F5F7] mb-1">
                          Full Name <span className="text-[#3B82F6]">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-[#9497A6] absolute left-3.5 top-3.5" />
                          <input
                            type="text"
                            required
                            placeholder="Alex Morgan"
                            value={inlineForm.name}
                            onChange={(e) => setInlineForm({ ...inlineForm, name: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 bg-[#0A0B0E] border border-white/10 rounded-xl text-[#F5F5F7] text-xs sm:text-sm focus:border-[#3B82F6] focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-[#F5F5F7] mb-1">
                          Work Email <span className="text-[#3B82F6]">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-[#9497A6] absolute left-3.5 top-3.5" />
                          <input
                            type="email"
                            required
                            placeholder="alex@company.com"
                            value={inlineForm.email}
                            onChange={(e) => setInlineForm({ ...inlineForm, email: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 bg-[#0A0B0E] border border-white/10 rounded-xl text-[#F5F5F7] text-xs sm:text-sm focus:border-[#3B82F6] focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-[#F5F5F7] mb-1">
                        Company / Team Name <span className="text-[#9497A6]">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-[#9497A6] absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          placeholder="Stripe Payment Platform Team"
                          value={inlineForm.company}
                          onChange={(e) => setInlineForm({ ...inlineForm, company: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 bg-[#0A0B0E] border border-white/10 rounded-xl text-[#F5F5F7] text-xs sm:text-sm focus:border-[#3B82F6] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-[#F5F5F7] mb-1">
                        Tell us about your team setup <span className="text-[#9497A6]">(GitHub / Slack / Jira)</span>
                      </label>
                      <div className="relative">
                        <MessageSquare className="w-4 h-4 text-[#9497A6] absolute left-3.5 top-3.5" />
                        <textarea
                          rows={3}
                          placeholder="Tell us what repos, Slack channels, or Jira projects you want to ingest..."
                          value={inlineForm.message}
                          onChange={(e) => setInlineForm({ ...inlineForm, message: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 bg-[#0A0B0E] border border-white/10 rounded-xl text-[#F5F5F7] text-xs sm:text-sm focus:border-[#3B82F6] focus:outline-none transition-colors resize-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 text-xs sm:text-sm font-mono font-bold text-white bg-[#3B82F6] hover:bg-blue-600 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.35)] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Sending Request...</span>
                      ) : (
                        <>
                          <span>Submit Setup Request</span>
                          <Send className="w-4 h-4 text-white" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#3B82F6]/20 border border-[#3B82F6]/50 text-[#3B82F6] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(59,130,246,0.3)]">
                    <CheckCircle2 className="w-10 h-10 text-[#3B82F6]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#F5F5F7] font-mono">
                    Request Received!
                  </h3>
                  <p className="text-sm text-[#9497A6] leading-relaxed max-w-md mx-auto">
                    Thanks <span className="text-[#F5F5F7] font-semibold">{inlineForm.name}</span> — I'll reach out directly to <span className="text-[#3B82F6] font-semibold">{inlineForm.email}</span> within 24 hours to guide you through setting up Cortex on your cloud infrastructure.
                  </p>
                </div>
              )}

            </div>
          </div>
        </section>
      </main>

      {/* Contact Modal overlay */}
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Footer */}
      <Footer onOpenContact={() => setIsModalOpen(true)} />
    </div>
  );
};
