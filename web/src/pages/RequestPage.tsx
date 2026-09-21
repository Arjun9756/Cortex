import React from 'react';
import { Navbar } from '../landing/Navbar';
import { DemoRequestForm } from '../landing/DemoRequestForm';
import { Footer } from '../landing/Footer';
import { Shield, Lock, Calculator, CheckCircle2 } from 'lucide-react';

interface RequestPageProps {
  onGoBack?: () => void;
  onLaunchDemo?: () => void;
}

export const RequestPage: React.FC<RequestPageProps> = ({ onGoBack, onLaunchDemo }) => {
  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F3F4F6] font-sans antialiased selection:bg-blue-600/30 selection:text-white">
      {/* Header Nav */}
      <Navbar onOpenContact={() => {}} onLaunchDemo={onLaunchDemo} />

      <main className="pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="mb-6 inline-flex items-center space-x-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>← Back to Overview</span>
            </button>
          )}

          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#12181F] border border-white/10 text-slate-300 text-xs font-mono mb-4">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Design Partner Onboarding</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
              Schedule a 30-Minute Architecture Walkthrough
            </h1>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed font-sans">
              Deploy Cortex on your private cloud infrastructure (AWS ECS/EKS, GCP, or Docker). Full data sovereignty, zero seat taxes, $0 license fee.
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-[#12181F] border border-white/10 rounded-2xl p-6 sm:p-10 shadow-2xl">
            <DemoRequestForm source="Dedicated /request Page" />
          </div>

          {/* Trust Guarantees */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-slate-400 text-center">
            <div className="p-4 rounded-xl bg-[#12181F] border border-white/10 flex items-center justify-center space-x-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <span>Runs in your VPC</span>
            </div>
            <div className="p-4 rounded-xl bg-[#12181F] border border-white/10 flex items-center justify-center space-x-2">
              <Calculator className="w-4 h-4 text-blue-400" />
              <span>Deterministic formulas</span>
            </div>
            <div className="p-4 rounded-xl bg-[#12181F] border border-white/10 flex items-center justify-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>$0 Design partner license</span>
            </div>
          </div>

        </div>
      </main>

      {/* Minimal Footer */}
      <Footer onOpenContact={() => {}} />
    </div>
  );
};

export default RequestPage;
