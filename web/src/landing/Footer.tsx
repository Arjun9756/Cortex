import React from 'react';
import { Mail } from 'lucide-react';

interface FooterProps {
  onOpenContact: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenContact }) => {
  return (
    <footer className="bg-[#0A0B0E] text-[#9497A6] border-t border-white/10 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          
          {/* Col 1: Brand & Tagline */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#12141A] border border-[#3B82F6]/50 overflow-hidden shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                <img src="/cortex-logo.png" alt="Cortex Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-bold text-[#F5F5F7] font-mono tracking-tight">
                Cortex
              </span>
            </div>
            
            <p className="text-sm text-[#F5F5F7] max-w-md font-medium leading-relaxed">
              "Codebase remembers every line. Nobody remembers why."
            </p>
            <p className="text-xs text-[#9497A6] max-w-md leading-relaxed">
              An open, AI-powered engineering knowledge graph platform. Ingests GitHub, Slack, and Jira into one unified graph.
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F5F7]">
              Platform
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#architecture" className="hover:text-[#3B82F6] transition-colors">
                  Architecture Visualization
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#3B82F6] transition-colors">
                  Bento Features
                </a>
              </li>
              <li>
                <a href="#byoc" className="hover:text-[#3B82F6] transition-colors">
                  BYOC Cloud Setup
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#3B82F6] transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <button onClick={onOpenContact} className="hover:text-[#3B82F6] transition-colors text-left cursor-pointer">
                  Request Free Onboarding
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Connect & Socials */}
          <div className="space-y-3">
            <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F5F7]">
              Connect & Support
            </h5>
            <div className="flex flex-col space-y-2.5 text-xs">
              <button
                onClick={onOpenContact}
                className="flex items-center space-x-2 text-[#9497A6] hover:text-[#3B82F6] transition-colors cursor-pointer text-left"
              >
                <Mail className="w-4 h-4 text-[#3B82F6]" />
                <span>Contact & Request Free Setup</span>
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs space-y-4 sm:space-y-0">
          
          {/* Copyright & Info */}
          <div className="flex flex-col space-y-1 text-left">
            <div className="flex items-center space-x-2 text-[#9497A6]">
              <span className="font-mono text-xs text-[#F5F5F7]">Cortex Knowledge Graph Platform</span>
            </div>
            <p className="text-[11px] text-[#9497A6] font-mono">
              Self-hosted. Open architecture. Built to unify engineering knowledge.
            </p>
          </div>

          {/* USP Reinforcement 3 */}
          <div className="font-mono text-[11px] text-[#F5F5F7] bg-[#12141A] px-3.5 py-1.5 rounded-xl border border-white/10">
            Self-hosted AI knowledge graph. <strong className="text-[#3B82F6]">₹0 forever.</strong> Zero vendor lock-in.
          </div>

        </div>
      </div>
    </footer>
  );
};
