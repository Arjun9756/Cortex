import React from 'react';
import { ShieldCheck, Mail, GitBranch, Scale, Lock, BookOpen } from 'lucide-react';
import { CortexLogo } from '../components/CortexLogo';

interface FooterProps {
  onOpenContact: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenContact }) => {
  return (
    <footer className="bg-[#0B0F14] text-slate-400 border-t border-white/10 py-14 antialiased text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-10 border-b border-white/10">
          
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2.5">
              <CortexLogo className="w-7 h-7" />
              <span className="text-base font-bold text-white font-sans tracking-tight">
                Cortex
              </span>
            </div>
            
            <p className="text-slate-300 font-medium font-sans">
              "Engineering knowledge, decoupled from key engineers."
            </p>
            <p className="text-slate-400 max-w-sm leading-relaxed font-sans">
              Self-hosted engineering intelligence platform for bus factor quantification, succession continuity, and evidence-backed codebase lineage.
            </p>

            <div className="pt-2 text-[11px] font-mono text-slate-500 leading-relaxed border-t border-white/5">
              <span className="text-blue-400 font-semibold">Strict Anti-Productivity Policy: </span>
              Cortex measures organizational continuity risk and architectural blast radius. Never individual performance or employee quotas.
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-2.5 font-mono text-xs">
            <h5 className="font-semibold uppercase tracking-wider text-slate-200">
              Platform
            </h5>
            <ul className="space-y-2 text-slate-400">
              <li>
                <a href="#proof" className="hover:text-white transition-colors">
                  Product Proof &amp; SPOF
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#metrics-defined" className="hover:text-white transition-colors">
                  Metrics, Defined
                </a>
              </li>
              <li>
                <a href="#guarantees" className="hover:text-white transition-colors">
                  What We Guarantee / What We Don't
                </a>
              </li>
              <li>
                <a href="#use-cases" className="hover:text-white transition-colors">
                  Operational Use Cases
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-white transition-colors">
                  Security &amp; Data Handling
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Community Edition Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  Technical FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Verification & Specifications */}
          <div className="space-y-2.5 font-mono text-xs">
            <h5 className="font-semibold uppercase tracking-wider text-slate-200">
              Ground-Truth Docs
            </h5>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center space-x-1.5">
                <BookOpen className="w-3 h-3 text-blue-400" />
                <span>docs/metrics-definitions.md</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Scale className="w-3 h-3 text-blue-400" />
                <span>13 Invariant Audit Suite</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <GitBranch className="w-3 h-3 text-blue-400" />
                <span>Golden Dataset Harness</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Lock className="w-3 h-3 text-blue-400" />
                <span>BYOC Single Source of Truth</span>
              </li>
            </ul>
          </div>

          {/* Direct Contact */}
          <div className="space-y-3 font-mono text-xs">
            <h5 className="font-semibold uppercase tracking-wider text-slate-200">
              Design Partner Program
            </h5>
            <p className="text-slate-400 leading-relaxed font-sans text-xs">
              Connect directly with our engineering team for private VPC deployments and Helm charts.
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
              <span>VPC Boundary · Zero Code Egress</span>
            </span>
            <span>·</span>
            <span className="flex items-center space-x-1.5 text-slate-400">
              <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              <span>Continuous Invariant Verification</span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
