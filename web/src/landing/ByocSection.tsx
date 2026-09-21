import React, { useState } from 'react';
import { 
  Lock, 
  Copy, 
  Check, 
  Server, 
  Cloud, 
  ShieldCheck, 
  Cpu,
  ArrowRight
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

  const securityFeatures = [
    {
      title: 'VPC Boundary Isolation',
      icon: Cloud,
      description: 'Deploys directly into your AWS, GCP, or Azure private subnet. No inbound network egress from your codebase to external model providers.',
    },
    {
      title: 'Air-Gapped Local Inference',
      icon: Cpu,
      description: 'Connect to local OpenAI-compatible inference servers (Ollama, vLLM) for completely offline, air-gapped defense or regulated environments.',
    },
    {
      title: 'HMAC Webhook Verification',
      icon: Lock,
      description: 'All GitHub, GitLab, and Jira event webhooks are cryptographically validated using HMAC SHA-256 signatures before graph ingestion.',
    },
    {
      title: 'Full Database Sovereignty',
      icon: Server,
      description: 'Your Neo4j Aura, Qdrant vector index, and PostgreSQL relational metrics reside under your team\'s direct cloud credentials.',
    },
  ];

  return (
    <section id="security" className="py-20 md:py-28 bg-[#0B0F14] relative border-t border-white/10 antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#12181F] border border-white/10 text-slate-300 text-xs font-mono mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Security &amp; Self-Hosted Infrastructure</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
            Runs in your cloud. Zero code leaves your VPC.
          </h2>

          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Enterprise engineering teams cannot hand private source code over to multi-tenant AI startups. Cortex runs as a self-hosted container inside your infrastructure perimeter.
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
            <span className="text-[11px] font-mono text-slate-500">v1.0 Production Release</span>
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

        {/* 4 Security Guarantees Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-12">
          {securityFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div 
                key={feat.title}
                className="p-5 rounded-xl bg-[#12181F] border border-white/10 space-y-3"
              >
                <div className="w-8 h-8 rounded-lg bg-[#0E131A] border border-white/10 flex items-center justify-center text-blue-400">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-white font-sans">
                  {feat.title}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Dedicated Deployment Assistance Strip */}
        <div className="max-w-4xl mx-auto p-6 sm:p-7 rounded-xl bg-[#12181F] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-left space-y-1">
            <h3 className="text-base font-bold text-white font-sans">
              Need assistance provisioning Helm charts or Terraform modules?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Our engineering team works directly with design partner infrastructure leads to verify VPC IAM permissions and webhook configurations.
            </p>
          </div>

          <button
            onClick={onOpenContact}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shrink-0 flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <span>Request Setup Walkthrough</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </section>
  );
};
