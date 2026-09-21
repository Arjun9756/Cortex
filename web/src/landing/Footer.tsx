import React from 'react';
import { ShieldCheck, Mail, GitBranch } from 'lucide-react';

interface FooterProps {
  onOpenContact: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenContact }) => {
  return (
    <footer className="bg-[#0B0F14] text-slate-400 border-t border-white/10 py-14 antialiased text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-white/10">
          
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#161B22] border border-white/10 overflow-hidden">
                <img src="/cortex-logo.png" alt="Cortex" className="w-full h-full object-cover" />
              </div>
              <span className="text-base font-bold text-white font-sans tracking-tight">
                Cortex
              </span>
            </div>
            
            <p className="text-slate-300 font-medium font-sans">
              "Engineering knowledge, decoupled from key engineers."
            </p>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              Self-hosted engineering knowledge graph for bus factor quantification, succession continuity, and grounded codebase Q&amp;A.
            </p>
          </div>

          {/* Navigation Links */}
          <div className="space-y-2.5 font-mono text-xs">
            <h5 className="font-semibold uppercase tracking-wider text-slate-200">
              Platform
            </h5>
            <ul className="space-y-2 text-slate-400">
              <li>
                <a href="#proof" className="hover:text-white transition-colors">
                  Product Proof &amp; SPOF Matrix
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#differentiation" className="hover:text-white transition-colors">
                  Deterministic Graph Math
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-white transition-colors">
                  Security &amp; BYOC Infrastructure
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Pricing (Community Edition)
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  Technical FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Direct Contact */}
          <div className="space-y-3 font-mono text-xs">
            <h5 className="font-semibold uppercase tracking-wider text-slate-200">
              Design Partner Access
            </h5>
            <p className="text-slate-400 leading-relaxed font-sans text-xs">
              Reach our founding engineering team for private VPC deployments and custom Helm charts.
            </p>
            <button
              onClick={onOpenContact}
              className="px-4 py-2 rounded-lg bg-[#161B22] hover:bg-[#1E2630] text-slate-200 hover:text-white border border-white/10 font-semibold transition-colors flex items-center space-x-2 cursor-pointer w-fit"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>Schedule Walkthrough</span>
            </button>
          </div>

        </div>

        {/* Legal & Status Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-slate-500">
          <div>
            <span>© {new Date().getFullYear()} Cortex Platform. Open Architecture.</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>VPC Isolated · Zero Code Egress</span>
            </span>
            <span>·</span>
            <span className="flex items-center space-x-1.5 text-slate-400">
              <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              <span>Continuous Webhook Ingestion</span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
