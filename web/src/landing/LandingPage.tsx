import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { ProductProofSection } from './ProductProofSection';
import { HowItWorks } from './HowItWorks';
import { DifferentiationSection } from './DifferentiationSection';
import { ByocSection } from './ByocSection';
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

  // Auto-open modal if URL query parameter asks for it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('request') === 'true' || params.get('demo') === 'true' || window.location.pathname === '/request') {
      setIsModalOpen(true);
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
    <div className="min-h-screen bg-[#0B0F14] text-[#F3F4F6] font-sans antialiased selection:bg-blue-600/30 selection:text-white">
      {/* 1. Navigation Header */}
      <Navbar 
        onOpenContact={() => setIsModalOpen(true)} 
        onLaunchDemo={onLaunchDemo} 
      />

      <main>
        {/* 2. Hero Section (Headline, 2-line subcopy, CTAs, 3 trust chips, integration logo strip) */}
        <Hero onOpenContact={() => setIsModalOpen(true)} />

        {/* 3. Product Proof in Authentic Browser Chrome Frames (SPOF Table · Departure Simulation · Grounded Q&A) */}
        <ProductProofSection />

        {/* 4. How It Works (3 Steps: Connect -> Build Graph -> Mitigate Risk & Search) */}
        <HowItWorks />

        {/* 5. Differentiation (Deterministic Graph Math vs Generic LLMs & DORA Metrics) */}
        <DifferentiationSection />

        {/* 6. Security & BYOC Infrastructure (VPC Boundary, Air-Gapped, Docker Quickstart) */}
        <ByocSection onOpenContact={() => setIsModalOpen(true)} />

        {/* 7. Transparent Pricing (Community Edition $0 License Fee + Future Enterprise Cloud) */}
        <PricingSection onOpenContact={openContactWithPlan} />

        {/* 8. Technical FAQ for Engineering Leaders */}
        <FaqSection />

        {/* 9. High-Conversion Final CTA & Embedded Setup Request Section */}
        <section id="contact" className="py-20 md:py-28 bg-[#0B0F14] relative border-t border-white/10 antialiased">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#12181F] border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl">
              
              <div className="text-center max-w-2xl mx-auto mb-8">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#0E131A] border border-white/10 text-blue-400 text-xs font-mono mb-4">
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
        </section>
      </main>

      {/* 10. Minimal Institutional Footer */}
      <Footer onOpenContact={() => setIsModalOpen(true)} />

      {/* Mobile Sticky Bottom CTA Bar */}
      {showMobileStickyCta && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-[#0B0F14]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-3 shadow-2xl">
          <div className="flex flex-col min-w-0 pl-1">
            <span className="text-xs font-semibold text-white truncate font-sans">Cortex Self-Hosted</span>
            <span className="text-[10px] text-blue-400 font-mono">$0 License Fee · VPC</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shrink-0 flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <span>Request Setup</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Enterprise Contact & Walkthrough Modal */}
      <ContactModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialMessage={modalMessage}
      />
    </div>
  );
};
