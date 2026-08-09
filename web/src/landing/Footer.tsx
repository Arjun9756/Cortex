import React from 'react';
import { Mail, ExternalLink } from 'lucide-react';

const GithubIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z" />
  </svg>
);

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
              Connect
            </h5>
            <div className="flex flex-col space-y-2.5 text-xs">
              <a
                href="https://github.com/Arjun9756/Cortex"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-[#9497A6] hover:text-[#3B82F6] transition-colors"
              >
                <GithubIcon />
                <span>GitHub Repository</span>
                <ExternalLink className="w-3 h-3 text-[#9497A6]" />
              </a>

              <button
                onClick={onOpenContact}
                className="flex items-center space-x-2 text-[#9497A6] hover:text-[#3B82F6] transition-colors cursor-pointer text-left"
              >
                <Mail className="w-4 h-4 text-[#3B82F6]" />
                <span>Contact Founder &amp; Request Setup</span>
              </button>

              <a
                href="https://linkedin.com/in/arjun-singh-negi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-[#9497A6] hover:text-[#3B82F6] transition-colors"
              >
                <LinkedinIcon />
                <span>LinkedIn Profile</span>
                <ExternalLink className="w-3 h-3 text-[#9497A6]" />
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs space-y-4 sm:space-y-0">
          
          {/* Creator Credit & Credibility Note */}
          <div className="flex flex-col space-y-1 text-left">
            <div className="flex items-center space-x-2 text-[#9497A6]">
              <span>Built by</span>
              <a
                href="https://github.com/Arjun9756"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#3B82F6] font-semibold font-mono hover:underline flex items-center space-x-1"
              >
                <span>Arjun Singh Negi</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-[#9497A6] font-mono">
              Self-taught. Bootstrapped. Built to solve a real problem, not chase a trend.
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
