import React, { useState } from 'react';
import { Cloud, Shield, Server, Terminal, Copy, Check, Lock, Cpu, ArrowRight } from 'lucide-react';

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

  return (
    <section id="byoc" className="py-24 md:py-32 bg-[#06080e] relative overflow-hidden border-t border-slate-800/80 antialiased">
      {/* Glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0c111e] border border-slate-800/80 text-indigo-400 text-xs font-mono mb-4">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>100% Data Privacy &amp; Isolation</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight font-sans">
            Self-Hosted on Your Cloud. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">Zero Data Retention.</span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
            Your proprietary codebase, Git commits, and Slack channels never leave your infrastructure. Deploy Cortex in 60 seconds on Docker, AWS, GCP, or Kubernetes.
          </p>
        </div>

        {/* 1-Line Docker Command Terminal Box */}
        <div className="max-w-3xl mx-auto mb-16 bg-[#090d16]/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-white">60-Second Docker Quickstart</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">v1.0 Release Build</span>
          </div>

          <div className="p-4 bg-[#060911] rounded-xl border border-slate-800/80 flex items-center justify-between font-mono text-xs text-indigo-300 overflow-x-auto gap-4">
            <code className="text-slate-200 select-all">$ {dockerCmd}</code>

            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold transition-all shrink-0 flex items-center space-x-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Command</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Supported Deploy Infrastructure Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
          <div className="bg-[#090d16]/90 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-6 transition-all backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4">
              <Server className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-mono">Docker &amp; K8s</h4>
            <p className="text-xs text-indigo-400 font-mono mt-0.5">1-Line Container Deploy</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Standard Helm charts &amp; Compose manifests ready for ECS, EKS, or GKE.
            </p>
          </div>

          <div className="bg-[#090d16]/90 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl p-6 transition-all backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4">
              <Cloud className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-mono">AWS / GCP / Azure</h4>
            <p className="text-xs text-purple-400 font-mono mt-0.5">VPC Isolated</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Deploys inside your private cloud boundary with zero internet outbound code leaks.
            </p>
          </div>

          <div className="bg-[#090d16]/90 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-6 transition-all backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-mono">Neo4j Aura &amp; Qdrant</h4>
            <p className="text-xs text-emerald-400 font-mono mt-0.5">Free-Tier Compatible</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Connect to managed Neo4j AuraDB &amp; Qdrant Cloud or run embedded locally.
            </p>
          </div>

          <div className="bg-[#090d16]/90 border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-6 transition-all backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white font-mono">Local LLM / Ollama</h4>
            <p className="text-xs text-cyan-400 font-mono mt-0.5">Air-Gapped Ready</p>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Use Groq LPU API or run 100% offline via local vLLM / Ollama models.
            </p>
          </div>
        </div>

        {/* Action Banner */}
        <div className="max-w-4xl mx-auto bg-[#090d16]/90 border border-indigo-500/40 rounded-2xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-left max-w-xl">
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono mb-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>100% Self-Hosted &amp; Private</span>
              </div>
              <h3 className="text-xl font-bold text-white font-sans">
                Ready to deploy on your cloud?
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                Reach out and I'll personally assist you in provisioning and connecting your free-tier accounts in under 15 minutes.
              </p>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <button
                onClick={onOpenContact}
                className="w-full sm:w-auto px-6 py-3.5 text-xs font-mono font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Request Free Setup</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
