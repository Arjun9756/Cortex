import React, { useState } from 'react';
import { 
  Lock, 
  Copy, 
  Check, 
  Cloud, 
  ShieldCheck, 
  ArrowRight, 
  Database, 
  FileCheck2, 
  Key, 
  RefreshCw 
} from 'lucide-react';

interface ByocSectionProps {
  onOpenContact: () => void;
}

export const ByocSection: React.FC<ByocSectionProps> = ({ onOpenContact }) => {
  const [copied, setCopied] = useState(false);
  const dockerCmd = 'docker run -d -p 3000:3000 -e NEO4J_URI=bolt://localhost:7687 cortex/app:latest';

  const handleCopy = () => {
    navigator.clipboard.writeText(dockerCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const securityPillars = [
    {
      title: 'BYOC Deployment Perimeter',
      icon: Cloud,
      detailTag: 'Customer VPC Boundary',
      description:
        'Cortex runs entirely as a containerized service inside your AWS, GCP, Azure, or on-premise private subnet. Your proprietary source code never leaves your infrastructure boundary.'
    },
    {
      title: 'Strict Scoped Read-Only Access',
      icon: Key,
      detailTag: 'Zero Write Permissions',
      description:
        'Integrations are limited to read-only webhook subscriptions on GitHub, Slack, and Jira. Cortex has zero write permissions to your production git branches and cannot modify repository settings.'
    },
    {
      title: 'What Is Read vs What Is Stored',
      icon: Database,
      detailTag: 'Zero Code Blobs Stored',
      description:
        'Cortex reads event metadata: commit hashes, author git trailers, diff statistics (+lines / -lines), PR timestamps, and thread context. Compact relational metrics and property graphs are stored in your VPC database. Full codebase repositories are never cloned or stored in multi-tenant SaaS.'
    },
    {
      title: 'Identity Resolution Protocol',
      icon: ShieldCheck,
      detailTag: 'Canonical Person Mapping',
      description:
        'Maps fragmented identities (git commit emails, GitHub handles, Slack user IDs) into unified canonical person profiles in PostgreSQL and Neo4j, eliminating ghost accounts, bots, and duplicate entries.'
    },
    {
      title: '13 Automated Invariant Audits',
      icon: FileCheck2,
      detailTag: 'Self-Healing Integrity Guard',
      description:
        'An automated integrity guard validates 13 cross-field logical invariants after every recalculation job (e.g. 0 commits strictly collapses to 0 contributors and null owner; bus factor <= contributor count). Violations are self-healed and logged.'
    },
    {
      title: 'Distributed Mutex & Zero Lost Updates',
      icon: RefreshCw,
      detailTag: 'Redis Distributed Lock',
      description:
        'Metrics calculation uses a distributed Redis mutex lock with debounced quiet-period windows. If new Jira tickets or commits arrive during calculation, the dirty flag is maintained to ensure zero events are ever lost.'
    }
  ];

  return (
    <section id="security" className="py-20 md:py-28 bg-[#0B0F14] relative border-t border-white/10 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#12181F] border border-white/10 text-slate-300 text-xs font-mono mb-4">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Security &amp; Data Handling Architecture</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
            Runs in your cloud. Zero code leaves your VPC.
          </h2>

          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Enterprise engineering teams cannot export proprietary source code to multi-tenant AI startups. Cortex runs as a self-hosted container inside your infrastructure perimeter under strict read-only scopes.
          </p>
        </div>

        {/* 1-Line Docker Quickstart Terminal */}
        <div className="max-w-3xl mx-auto mb-16 browser-chrome">
          <div className="browser-header justify-between">
            <div className="flex items-center space-x-2">
              <span className="browser-dot bg-[#EF4444]/80" />
              <span className="browser-dot bg-[#F59E0B]/80" />
              <span className="browser-dot bg-[#10B981]/80" />
              <span className="text-xs text-slate-400 font-mono ml-2">Docker Container Quickstart</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Self-Hosted Community &amp; Enterprise</span>
          </div>

          <div className="p-5 bg-[#090D12] flex items-center justify-between font-mono text-xs overflow-x-auto gap-4">
            <code className="text-slate-200 select-all">$ {dockerCmd}</code>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded bg-[#12181F] hover:bg-[#1A222D] text-slate-300 hover:text-white border border-white/10 font-semibold transition-all shrink-0 flex items-center space-x-1.5 cursor-pointer text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 6 Security & Data Handling Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-14">
          {securityPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={pillar.title}
                className="p-6 rounded-xl bg-[#12181F] border border-white/10 space-y-4 hover:border-white/20 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-[#0E131A] border border-white/10 flex items-center justify-center text-blue-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                      {pillar.detailTag}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-white font-sans">
                    {pillar.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Technical Buyer & Security Officer Assurance Callout */}
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-2xl bg-[#12181F] border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-left space-y-1.5">
            <div className="text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider">
              Security Review &amp; Architecture Walkthrough
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white font-sans">
              Conduct a technical security audit with our engineering team.
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Inspect our open Terraform modules, Kubernetes Helm manifests, and verify read-only IAM policies before connecting your repositories.
            </p>
          </div>

          <button
            onClick={onOpenContact}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shrink-0 flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <span>Request Architecture Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </section>
  );
};
