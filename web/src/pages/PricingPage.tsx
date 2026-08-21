import React, { useState } from 'react';
import { Navbar } from '../landing/Navbar';
import { PricingSection } from '../landing/PricingSection';
import { FaqSection } from '../landing/FaqSection';
import { Footer } from '../landing/Footer';
import { ContactModal } from '../landing/ContactModal';

interface PricingPageProps {
  onGoBack?: () => void;
  onLaunchDemo?: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onLaunchDemo }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#06080e] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-white antialiased">
      {/* Sticky Header Nav */}
      <Navbar onOpenContact={() => setIsModalOpen(true)} onLaunchDemo={onLaunchDemo} />

      <main className="pt-16">
        {/* Transparent One-Plan Pricing Section */}
        <PricingSection onOpenContact={() => setIsModalOpen(true)} />

        {/* Technical FAQ */}
        <FaqSection />
      </main>

      {/* Contact Modal overlay */}
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Footer */}
      <Footer onOpenContact={() => setIsModalOpen(true)} />
    </div>
  );
};

export default PricingPage;
