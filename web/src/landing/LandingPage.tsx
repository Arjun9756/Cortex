import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { ProblemSection } from './ProblemSection';
import { HowItWorks } from './HowItWorks';
import { BentoFeatures } from './BentoFeatures';
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
    <div className="min-h-screen bg-[#06080e] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-white antialiased">
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

        {/* BYOC & Zero Cost Section */}
        <ByocSection onOpenContact={() => setIsModalOpen(true)} />

        {/* FAQ Accordion Section */}
        <FaqSection />

        {/* Inline Contact & Founder Onboarding Section */}
        <section id="contact" className="py-24 md:py-32 bg-[#06080e] relative overflow-hidden border-t border-slate-800/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="bg-[#090d16]/90 border border-slate-800/80 rounded-2xl p-8 sm:p-12 shadow-2xl shadow-indigo-950/30 backdrop-blur-xl">
              
              {!inlineSubmitted ? (
                <div>
                  <div className="text-center max-w-2xl mx-auto mb-10">
                    <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0c111e] border border-slate-800/80 text-indigo-400 text-xs font-mono mb-4">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Enterprise Self-Hosted Onboarding</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-sans">
                      Deploy Cortex on Your Infrastructure
                    </h2>
                    <p className="mt-3 text-sm sm:text-base text-slate-400 font-normal">
                      Get Cortex running on your team's AWS, GCP, or Docker infrastructure — 100% self-hosted &amp; private.
                    </p>
                  </div>

                  <form onSubmit={handleInlineSubmit} className="space-y-4 max-w-xl mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-slate-300 mb-1">
                          Full Name <span className="text-indigo-400">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                          <input
                            type="text"
                            required
                            placeholder="Alex Morgan"
                            value={inlineForm.name}
                            onChange={(e) => setInlineForm({ ...inlineForm, name: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-[#060911] border border-slate-800/80 rounded-xl text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-slate-300 mb-1">
                          Work Email <span className="text-indigo-400">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                          <input
                            type="email"
                            required
                            placeholder="alex@company.com"
                            value={inlineForm.email}
                            onChange={(e) => setInlineForm({ ...inlineForm, email: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-[#060911] border border-slate-800/80 rounded-xl text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">
                        Company / Team Name <span className="text-slate-500">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          placeholder="Stripe Infrastructure Team"
                          value={inlineForm.company}
                          onChange={(e) => setInlineForm({ ...inlineForm, company: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-[#060911] border border-slate-800/80 rounded-xl text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 mb-1">
                        Tell us about your setup <span className="text-slate-500">(GitHub / Slack / Jira)</span>
                      </label>
                      <div className="relative">
                        <MessageSquare className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        <textarea
                          rows={3}
                          placeholder="Tell us what repos, Slack channels, or Jira projects you want to ingest..."
                          value={inlineForm.message}
                          onChange={(e) => setInlineForm({ ...inlineForm, message: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-[#060911] border border-slate-800/80 rounded-xl text-white text-xs sm:text-sm focus:border-indigo-500 focus:outline-none transition-colors resize-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 px-4 text-xs sm:text-sm font-mono font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 border border-indigo-400/20"
                    >
                      {isSubmitting ? (
                        <span>Sending Request...</span>
                      ) : (
                        <>
                          <span>Submit Onboarding Request</span>
                          <Send className="w-4 h-4 text-white" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/50 text-indigo-400 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/30">
                    <CheckCircle2 className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white font-sans">
                    Request Received!
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                    Thanks <span className="text-white font-semibold">{inlineForm.name}</span> — I'll reach out directly to <span className="text-indigo-400 font-semibold">{inlineForm.email}</span> within 24 hours to guide you through setting up Cortex on your cloud infrastructure.
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
