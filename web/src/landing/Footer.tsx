import React from 'react';
import { Mail, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onOpenContact: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenContact }) => {
  return (
    <footer className="bg-[#06080e] text-slate-400 border-t border-slate-800/80 py-16 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800/80">
          
          {/* Col 1: Brand & Tagline */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 overflow-hidden shadow-lg shadow-indigo-500/20">
                <img src="/cortex-logo.png" alt="Cortex Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-bold text-white font-sans tracking-tight">
                Cortex
              </span>
            </div>
            
            <p className="text-sm text-slate-200 max-w-md font-medium leading-relaxed font-sans">
              "Engineering knowledge, decoupled from key engineers."
            </p>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Self-hosted AI Knowledge Graph &amp; Key-Person Loss Risk Engine. Ingests GitHub commits, Slack channels, and Jira issues into one unified, searchable graph.
            </p>
          </div>

          {/* Col 2: Platform Links */}
          <div className="space-y-3 font-mono text-xs">
            <h5 className="font-bold uppercase tracking-wider text-white">
              Platform Nav
            </h5>
            <ul className="space-y-2.5">
              <li>
                <a href="#architecture" className="hover:text-white transition-colors">
                  Graph Architecture
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Core Capabilities
                </a>
              </li>
              <li>
                <a href="#byoc" className="hover:text-white transition-colors">
                  Docker Self-Hosted Setup
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors text-indigo-400 font-semibold">
                  Pricing &amp; Plans
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  Technical FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Enterprise Contact */}
          <div className="space-y-3 font-mono text-xs">
            <h5 className="font-bold uppercase tracking-wider text-white">
              Get Started
            </h5>
            <div className="flex flex-col space-y-3">
              <button
                onClick={onOpenContact}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Request Setup</span>
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs space-y-4 sm:space-y-0 font-mono">
          <div className="flex items-center space-x-2 text-slate-500">
            <span>© {new Date().getFullYear()} Cortex Platform. Open Architecture.</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-full bg-[#0c111e] border border-slate-800 text-slate-300 text-[11px] flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Self-Hosted &amp; Private</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
