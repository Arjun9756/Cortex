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
  RefreshCw,
  CheckCircle2,
  XCircle,
  Cpu
} from 'lucide-react';

interface ByocSectionProps {
  onOpenContact: () => void;
}

export const ByocSection: React.FC<ByocSectionProps> = ({ onOpenContact }) => {
  const [deployMode, setDeployMode] = useState<'docker' | 'helm' | 'terraform'>('docker');
  const [copied, setCopied] = useState(false);
  const [dataTab, setDataTab] = useState<'read' | 'stored' | 'never'>('read');

  const manifests = {
    docker: `# Run Cortex Core inside your private VPC
version: '3.8'
services:
  cortex-app:
    image: cortex/app:latest
    ports:
      - "3000:3000"
    environment:
      - NEO4J_URI=bolt://neo4j:7687
      - POSTGRES_URL=postgresql://cortex:secret@postgres:5432/cortex_db
      - QDRANT_URL=http://qdrant:6333
      - VPC_MODE=true
    restart: unless-stopped`,
    helm: `# Helm install Cortex into private Kubernetes cluster
helm repo add cortex https://charts.cortex.internal
helm install cortex cortex/cortex-platform \\
  --namespace cortex \\
  --create-namespace \\
  --set ingress.enabled=false \\
  --set networkPolicy.egressBlocked=true \\
  --set persistence.storageClass=gp3-encrypted`,
    terraform: `# Terraform AWS VPC Private Subnet Module
module "cortex_vpc_cluster" {
  source           = "terraform-aws-modules/ecs/aws"
  cluster_name     = "cortex-internal-vpc"
  fargate_capacity = 2
  subnets          = module.vpc.private_subnets
  security_groups  = [aws_security_group.internal_only.id]
  # Zero public internet ingress/egress rules
}`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(manifests[deployMode]);
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

  const dataHandlingItems = {
    read: [
      'Commit author metadata, git timestamps, and co-authorship trailers',
      'Pull request state transitions (draft -> ready_for_review -> merged_at)',
      'Aggregated diff line counts (+additions, -deletions, files_changed)',
      'Public engineering Slack channel threads and architecture discussions',
      'Jira issue keys, status workflows, and component ownership tags'
    ],
    stored: [
      'Compacted Neo4j property graph: (:PERSON)-[:CONTRIBUTED_TO]->(:REPOSITORY)',
      'Relational PostgreSQL metrics: Bus factors, lead times, 180-day decay scores',
      'Private vector embeddings of architecture discussions inside VPC Qdrant',
      'Canonical identity alias mappings (email -> GitHub login -> Slack ID)',
      'Audit log of recalculated invariants and timestamped evidence chains'
    ],
    never: [
      'Zero raw source code file blobs or proprietary algorithmic intellectual property',
      'Zero production database credentials, API secrets, or private keys',
      'Zero employee keystroke tracking, active-window timers, or surveillance data',
      'Zero telemetry or code tokens transmitted to external multi-tenant AI clouds'
    ]
  };

  return (
    <section id="security" className="py-12 md:py-16 bg-[#06090F] relative antialiased">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono mb-5">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Enterprise Security &amp; VPC Perimeter</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight font-sans">
            Runs in your private cloud. <span className="gradient-text">Zero code leaves your VPC.</span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Enterprise engineering organizations cannot export proprietary repositories to multi-tenant AI startups. Cortex operates as a self-hosted container inside your infrastructure perimeter under strict read-only scopes.
          </p>
        </div>

        {/* VISUAL VPC PERIMETER ARCHITECTURE SCHEMATIC */}
        <div className="max-w-5xl mx-auto mb-10 p-6 sm:p-8 rounded-2xl bg-[#0D1117] border border-white/[0.06] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono pb-4 border-b border-white/[0.06] mb-6">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-bold">CUSTOMER VPC PERIMETER (AWS / GCP / DOCKER)</span>
            </div>
            <span className="text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 font-bold">
              100% AIR-GAPPED READY
            </span>
          </div>

          {/* Architecture Diagram Visualization */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* Left: Scoped Ingress Webhooks */}
            <div className="md:col-span-4 space-y-3">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-rose-400" />
                <span>Scoped Read-Only Ingress</span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="p-3 rounded-lg bg-[#080B0F] border border-white/[0.04] flex items-center justify-between">
                  <span className="text-white">GitHub Enterprise</span>
                  <span className="text-[10px] text-emerald-400">HMAC SHA-256</span>
                </div>
                <div className="p-3 rounded-lg bg-[#080B0F] border border-white/[0.04] flex items-center justify-between">
                  <span className="text-white">Slack Engineering</span>
                  <span className="text-[10px] text-emerald-400">Public Chans Only</span>
                </div>
                <div className="p-3 rounded-lg bg-[#080B0F] border border-white/[0.04] flex items-center justify-between">
                  <span className="text-white">Jira Software Cloud</span>
                  <span className="text-[10px] text-emerald-400">Issue Metadata</span>
                </div>
              </div>
            </div>

            {/* Center: In-VPC Core Pipeline */}
            <div className="md:col-span-5 p-5 rounded-xl bg-[#080B0F] border border-blue-500/30 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cortex Core (In-VPC)</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-400">Isolated Network</span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-[#0D1117] border border-white/[0.04] flex items-center justify-between text-slate-300">
                  <span>Living Graph Engine</span>
                  <strong className="text-white">Private Neo4j</strong>
                </div>
                <div className="p-2.5 rounded bg-[#0D1117] border border-white/[0.04] flex items-center justify-between text-slate-300">
                  <span>Deterministic Math</span>
                  <strong className="text-white">PostgreSQL</strong>
                </div>
                <div className="p-2.5 rounded bg-[#0D1117] border border-white/[0.04] flex items-center justify-between text-slate-300">
                  <span>Private Vector Store</span>
                  <strong className="text-white">Qdrant In-VPC</strong>
                </div>
              </div>
            </div>

            {/* Right: Zero Egress Guarantee */}
            <div className="md:col-span-3 p-4 rounded-xl bg-[#080B0F] border border-emerald-500/30 space-y-2 text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-white font-sans">
                Zero Code Egress
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                Source code blobs never leave your subnet. 0 bytes sent to external SaaS.
              </p>
            </div>

          </div>
        </div>

        {/* INTERACTIVE DEPLOYMENT QUICKSTART MANIFEST */}
        <div className="max-w-4xl mx-auto mb-10 browser-chrome shadow-xl">
          <div className="browser-header justify-between">
            <div className="flex items-center space-x-2">
              <span className="browser-dot bg-[#EF4444]/80" />
              <span className="browser-dot bg-[#F59E0B]/80" />
              <span className="browser-dot bg-[#10B981]/80" />
              <span className="text-xs text-slate-400 font-mono ml-2">Self-Hosted Deployment Manifest</span>
            </div>

            {/* Manifest Switcher Tabs */}
            <div className="flex items-center space-x-1 p-0.5 rounded-md bg-[#0D1117] border border-white/[0.04] text-[11px] font-mono">
              <button
                onClick={() => setDeployMode('docker')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  deployMode === 'docker' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Docker Compose
              </button>
              <button
                onClick={() => setDeployMode('helm')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  deployMode === 'helm' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Kubernetes Helm
              </button>
              <button
                onClick={() => setDeployMode('terraform')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  deployMode === 'terraform' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Terraform AWS
              </button>
            </div>
          </div>

          <div className="p-5 bg-[#090D12] relative font-mono text-xs overflow-x-auto">
            <button
              onClick={handleCopy}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-[#0D1117] hover:bg-[#1C2333] text-slate-300 hover:text-white border border-white/[0.06] font-semibold transition-all flex items-center space-x-1.5 cursor-pointer text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Manifest</span>
                </>
              )}
            </button>

            <pre className="text-slate-300 leading-relaxed pt-2">
              <code>{manifests[deployMode]}</code>
            </pre>
          </div>
        </div>

        {/* AUDITED DATA HANDLING MATRIX: READ vs STORED vs NEVER */}
        <div className="max-w-4xl mx-auto mb-10 p-6 rounded-2xl bg-[#0D1117] border border-white/[0.06] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                Data Handling Transparency Matrix
              </h3>
              <p className="text-xs text-slate-400">Audited perimeter classification for security and compliance officers.</p>
            </div>

            <div className="inline-flex p-1 rounded-lg bg-[#080B0F] border border-white/[0.06] text-xs font-mono">
              <button
                onClick={() => setDataTab('read')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                  dataTab === 'read' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                What Is Read
              </button>
              <button
                onClick={() => setDataTab('stored')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                  dataTab === 'stored' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                What Is Stored in VPC
              </button>
              <button
                onClick={() => setDataTab('never')}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                  dataTab === 'never' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                What Is NEVER Touched
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {dataHandlingItems[dataTab].map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-[#080B0F] border border-white/[0.04] flex items-center space-x-3 text-xs">
                {dataTab === 'never' ? (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span className="text-slate-200 font-sans">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 6 Security & Data Handling Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-14">
          {securityPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={pillar.title}
                className="p-6 rounded-2xl bg-[#0D1117] border border-white/[0.06] space-y-4 hover:border-white/[0.15] transition-all flex flex-col justify-between shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#0A0E16] border border-white/[0.06] flex items-center justify-center text-indigo-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/[0.04]">
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
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-2xl bg-[#0D1117] border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="text-left space-y-1.5">
            <div className="text-xs font-mono text-indigo-400 font-semibold uppercase tracking-wider">
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
            className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shrink-0 flex items-center space-x-1.5 cursor-pointer shadow-md"
          >
            <span>Request Architecture Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </section>
  );
};
