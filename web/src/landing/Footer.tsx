import React from 'react';
import { 
  ShieldCheck, 
  Mail, 
  GitBranch, 
  Scale, 
  Lock, 
  BookOpen, 
  ArrowUpRight, 
  Heart
} from 'lucide-react';
import { CortexLogo } from '../components/CortexLogo';

interface FooterProps {
  onOpenContact: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenContact }) => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="relative bg-[#06090F] text-slate-400 antialiased overflow-hidden">
      
      {/* Top gradient line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      

      {/* Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/[0.06]">
          
          {/* Brand & Purpose — spans 4 columns */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center space-x-2.5">
              <CortexLogo className="w-7 h-7" />
              <span className="text-lg font-bold text-white font-sans tracking-tight">
                Cortex
              </span>
            </div>
            
            <p className="text-sm text-slate-300 font-medium font-sans leading-relaxed">
              Engineering knowledge, decoupled from key engineers.
            </p>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Self-hosted engineering intelligence platform for bus factor quantification, 
              succession continuity, and evidence-backed codebase lineage.
            </p>

            <div className="pt-3 flex items-start space-x-2 text-[11px] text-slate-500 border-t border-white/[0.04]">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
              <span>
                <span className="text-indigo-400 font-semibold">Anti-Productivity Policy: </span>
                Measures organizational continuity risk. Never individual performance or quotas.
              </span>
            </div>
          </div>

          {/* Platform Links — 2 columns */}
          <div className="md:col-span-2 space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Platform
            </h5>
            <ul className="space-y-2.5">
              {[
                { href: '#proof', label: 'Product Proof' },
                { href: '#how-it-works', label: 'How It Works' },
                { href: '#metrics-defined', label: 'Metrics, Defined' },
                { href: '#guarantees', label: 'Guarantees' },
                { href: '#use-cases', label: 'Use Cases' },
                { href: '#security', label: 'Security & BYOC' },
                { href: '#pricing', label: 'Pricing' },
                { href: '#faq', label: 'FAQ' },
              ].map(link => (
                <li key={link.href}>
                  <a 
                    href={link.href} 
                    className="text-xs text-slate-400 hover:text-white transition-colors duration-200 flex items-center space-x-1 group"
                  >
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Docs & Verification — 3 columns */}
          <div className="md:col-span-3 space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Ground-Truth Documentation
            </h5>
            <ul className="space-y-2.5">
              {[
                { icon: BookOpen, label: 'docs/metrics-definitions.md', color: 'text-indigo-400' },
                { icon: Scale, label: '13 Invariant Audit Suite', color: 'text-purple-400' },
                { icon: GitBranch, label: 'Golden Dataset Harness', color: 'text-cyan-400' },
                { icon: Lock, label: 'BYOC Architecture Spec', color: 'text-indigo-400' },
              ].map((doc, i) => (
                <li key={i} className="flex items-center space-x-2 text-xs text-slate-400 group cursor-default">
                  <doc.icon className={`w-3 h-3 ${doc.color} shrink-0`} />
                  <span className="font-mono">{doc.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact / Program — 3 columns */}
          <div className="md:col-span-3 space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Connect
            </h5>
            <p className="text-xs text-slate-500 leading-relaxed">
              Connect directly with our engineering team for private VPC deployments and Helm charts.
            </p>
            <button
              onClick={onOpenContact}
              className="group px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/[0.08] hover:border-white/[0.15] font-semibold text-xs transition-all duration-200 flex items-center space-x-2 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Schedule Walkthrough</span>
              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="flex items-center space-x-1.5">
            <span>© {currentYear} Cortex Platform.</span>
            <span className="text-slate-600">·</span>
            <span>BSL 1.1 License</span>
            <span className="text-slate-600">·</span>
            <span>Open Architecture</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5 text-slate-500">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>VPC Boundary · Zero Code Egress</span>
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center space-x-1.5 text-slate-500">
              <Heart className="w-3 h-3 text-rose-500/60" />
              <span>Built with care</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom gradient decoration */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
    </footer>
  );
};
