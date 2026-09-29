import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { ProductProofSection } from './ProductProofSection';
import { HowItWorks } from './HowItWorks';
import { MetricsDefinedSection } from './MetricsDefinedSection';
import { GuaranteesSection } from './GuaranteesSection';
import { DifferentiationSection } from './DifferentiationSection';
import { ByocSection } from './ByocSection';
import { UseCasesSection } from './UseCasesSection';
import { PricingSection } from './PricingSection';
import { FaqSection } from './FaqSection';
import { ContactModal } from './ContactModal';
import { DemoRequestForm } from './DemoRequestForm';
import { Footer } from './Footer';
import { Shield, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onLaunchDemo?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchDemo }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [showMobileStickyCta, setShowMobileStickyCta] = useState(false);

  // Auto-open modal if URL query parameter asks for it, or handle section anchors
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('request') === 'true' || params.get('demo') === 'true' || window.location.pathname === '/request') {
      setIsModalOpen(true);
    }

    // Direct section jump if specified via ?section=
    const sectionParam = params.get('section');
    if (sectionParam) {
      setTimeout(() => {
        const el = document.getElementById(sectionParam);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    const handleScroll = () => {
      setShowMobileStickyCta(window.scrollY > 450);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  const openContactWithPlan = (planTitle?: string) => {
    if (planTitle) {
      setModalMessage(`Interested in: ${planTitle}`);
    } else {
      setModalMessage('');
    }
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#06090F] text-[#F0F2F5] font-sans antialiased selection:bg-indigo-600/30 selection:text-white">
      {/* 1. Navigation Header */}
      <Navbar 
        onOpenContact={() => setIsModalOpen(true)} 
        onLaunchDemo={onLaunchDemo} 
      />

      <main>
        {/* 2. Hero Section */}
        <Hero onOpenContact={() => setIsModalOpen(true)} />

        {/* 3. Product Proof in Authentic Browser Chrome Frames (SPOF Table · Departure Simulation · Grounded Q&A) */}
        <ProductProofSection />

        {/* 4. How It Works (Deterministic Pipeline Flow: Read-Only Webhooks -> Graph Compaction -> Deterministic Math -> Grounded Lineage) */}
        <HowItWorks />

        {/* 5. Metrics, Defined (Public Canonical Ground-Truth: Exact Formulas, Inclusions, Noise Exclusions & Rationale) */}
        <MetricsDefinedSection />

        {/* 6. What Cortex Guarantees / What Cortex Does NOT Guarantee (Strict Capability Boundaries) */}
        <GuaranteesSection />

        {/* 7. Differentiation (Deterministic Graph Math vs Generic LLMs & DORA Metrics) */}
        <DifferentiationSection />

        {/* 8. Built For / Operational Use Cases (Departure Handover, Onboarding, Incident Triage, Stale Docs) */}
        <UseCasesSection />

        {/* 9. Security & Data Handling (BYOC Boundary, Read-Only Scopes, What Is Read vs Stored, 13 Invariant Safeguards) */}
        <ByocSection onOpenContact={() => setIsModalOpen(true)} />

        {/* 10. Transparent Pricing (Community Edition $0 License Fee + Future Enterprise Cloud) */}
        <PricingSection onOpenContact={openContactWithPlan} />

        {/* 11. Technical FAQ for Technical Buyers & Engineering Leaders */}
        <FaqSection />

        {/* 12. High-Conversion Final CTA & Embedded Setup Request Section */}
        <section id="contact" className="py-12 md:py-16 bg-[#06090F] relative antialiased">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass-card p-6 sm:p-10 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />
              </div>
              
              <div className="relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-8">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono mb-4">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Design Partner Program</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white font-sans tracking-tight">
                    Deploy Cortex on your infrastructure.
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">
                    Schedule a 30-minute architecture walkthrough and receive custom Docker Compose or Kubernetes Helm manifests for your team's VPC.
                  </p>
                </div>

                {/* Embedded High-UX Enterprise Demo Request Form */}
                <DemoRequestForm source="Landing Page Bottom Section" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 13. Footer */}
      <Footer onOpenContact={() => setIsModalOpen(true)} />

      {/* Mobile Sticky Bottom CTA Bar */}
      <div 
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
          showMobileStickyCta 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-full opacity-0'
        }`}
      >
        <div className="p-3 bg-[#06090F]/95 backdrop-blur-xl border-t border-white/[0.06] flex items-center justify-between gap-3 shadow-2xl">
          <div className="flex flex-col min-w-0 pl-1">
            <span className="text-xs font-semibold text-white truncate font-sans">Cortex Self-Hosted</span>
            <span className="text-[10px] text-indigo-400 font-mono">$0 License Fee · VPC</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shrink-0 flex items-center space-x-1.5 cursor-pointer shadow-sm shadow-indigo-500/20"
          >
            <span>Request Setup</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Enterprise Contact & Walkthrough Modal */}
      <ContactModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialMessage={modalMessage}
      />
    </div>
  );
};
