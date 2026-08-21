import React, { useState } from 'react';
import { 
  Check, 
  Sparkles, 
  Shield, 
  ArrowRight, 
  ExternalLink, 
  Server, 
  Cloud, 
  Cpu, 
  Lock, 
  Database, 
  Brain, 
  BarChart3, 
  UserCheck, 
  Zap, 
  Info, 
  ShieldCheck, 
  Terminal 
} from 'lucide-react';

interface PricingSectionProps {
  onOpenContact: (planDetails?: string) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onOpenContact }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // The 3-part breakdown of what "free" actually means
  const modelPillars = [
    {
      step: '01',
      title: 'The software is free',
      badge: 'Zero License Fees',
      icon: GiftIcon,
      color: 'from-blue-500/20 via-indigo-500/10 to-transparent',
      borderColor: 'border-blue-500/30 group-hover:border-blue-500/60',
      iconColor: 'text-blue-400',
      description:
        'Cortex itself has no license fee, no subscription, no per-seat pricing. You never pay us a single rupee for the core software.',
      bulletPoints: [
        'No seat caps or tier limits',
        'No credit card required',
        'Unlimited repositories & team members',
      ],
    },
    {
      step: '02',
      title: 'You bring your own cloud',
      badge: '100% Free-Tier Cloud',
      icon: Cloud,
      color: 'from-purple-500/20 via-indigo-500/10 to-transparent',
      borderColor: 'border-purple-500/30 group-hover:border-purple-500/60',
      iconColor: 'text-purple-400',
      description:
        'Runs on Neo4j Aura Free, Qdrant Cloud Free, Postgres, and Groq\'s free tier — infrastructure you sign up for and control directly.',
      bulletPoints: [
        'Zero vendor lock-in',
        'Proprietary code stays in your VPC',
        'Uses free-tier cloud limits you control',
      ],
    },
    {
      step: '03',
      title: 'We handle the setup',
      badge: 'Personal Onboarding',
      icon: UserCheck,
      color: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderColor: 'border-emerald-500/30 group-hover:border-emerald-500/60',
      iconColor: 'text-emerald-400',
      description:
        'Personal onboarding with no self-serve friction: Reach out and I\'ll personally set up Cortex on your infrastructure.',
      bulletPoints: [
        '1-on-1 guided deployment assistance',
        'Webhook setup for GitHub, Slack & Jira',
        'Initial graph indexing walkthrough',
      ],
    },
  ];

  // Single full list of verified capabilities grouped into sections
  const capabilityGroups = [
    {
      id: 'graph',
      category: 'Knowledge Graph & Data',
      icon: Database,
      tagColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      description: 'Unified entity graph linking engineers, repositories, commits, pull requests, issues, and tech stacks.',
      features: [
        {
          name: 'GitHub, Slack, and Jira ingestion via webhooks',
          detail: 'Real-time event capture and incremental ingestion pipelines across your code, issue trackers, and team communication.',
        },
        {
          name: 'Real-time knowledge graph (people, repos, commits, PRs, issues, technologies)',
          detail: 'Sub-second Cypher traversal across people, repos, commits, PRs, issues, and technologies with Neo4j Aura.',
        },
        {
          name: 'Cross-provider identity resolution',
          detail: 'Automated canonical merging matching disparate GitHub handles, Slack user IDs, and Jira emails into single Person entities.',
        },
      ],
    },
    {
      id: 'intelligence',
      category: 'Intelligence & Risk',
      icon: Brain,
      tagColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      description: 'Algorithmic fragility detection, key-person risk models, and continuity planning.',
      features: [
        {
          name: 'Bus factor scoring per repository',
          detail: 'Calculates commit concentration and single-maintainer fragility across every repo and core module.',
        },
        {
          name: 'Knowledge risk scoring (6-factor model: ownership, activity, expertise, dependency, documentation, pending work)',
          detail: 'Comprehensive weighted formula evaluating ownership concentration, activity staleness, sole expertise, critical dependents, documentation gaps, and pending work.',
        },
        {
          name: 'PR risk evaluation',
          detail: 'Pre-merge risk radar scoring PR blast radius, author departure risk, touched single-point-of-failure files, and recent incidents.',
        },
        {
          name: 'Departure/offboarding simulation',
          detail: 'Simulates key engineer departures to reveal affected subsystems, unmaintained dependencies, and automated successor recommendations.',
        },
      ],
    },
    {
      id: 'copilot',
      category: 'AI Copilot',
      icon: Sparkles,
      tagColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      description: 'Grounded natural language interface with multi-tool agent graphs and verifiable evidence.',
      features: [
        {
          name: 'Natural language Q&A with evidence citations',
          detail: 'Strict zero-hallucination answers citing exact graph node IDs, commit hashes, and Jira issue links.',
        },
        {
          name: 'Multi-part compound query support',
          detail: 'Decomposes complex engineering inquiries into parallel Graph, Vector, Risk, and SQL lookups with automated synthesis.',
        },
        {
          name: 'Semantic "why" reasoning over Slack/Jira context',
          detail: 'Recovers historical context and architectural decisions mined from Slack threads and Jira discussions.',
        },
      ],
    },
    {
      id: 'dashboard',
      category: 'Dashboard',
      icon: BarChart3,
      tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      description: 'Executive visibility into engineering health, team risk distribution, and technology adoption.',
      features: [
        {
          name: 'Executive health score overview',
          detail: 'Real-time aggregate health telemetry combining active repo risk, SPOF file counts, and overall team resiliency.',
        },
        {
          name: 'Prioritized risk alerts',
          detail: 'Actionable high-priority notifications highlighting repositories with Bus Factor = 0 and critical unassigned modules.',
        },
        {
          name: 'Technology stack & adoption metrics',
          detail: 'Visual catalog of libraries, frameworks, and database dependencies mapped to individual engineer usage.',
        },
        {
          name: 'Team overview with sortable risk scores',
          detail: 'Sortable team roster showing individual knowledge concentration, active repos, and continuity backup status.',
        },
      ],
    },
    {
      id: 'infrastructure',
      category: 'Infrastructure & Control',
      icon: Lock,
      tagColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      description: 'Maximum data sovereignty and privacy with self-hosted private cloud deployment.',
      features: [
        {
          name: 'Self-hosted on your own cloud accounts',
          detail: 'Runs inside your Docker host, AWS VPC, GCP, or Kubernetes cluster under your strict security boundaries.',
        },
        {
          name: 'No vendor lock-in, no data leaves your infrastructure',
          detail: 'Your proprietary source code, tickets, and internal discussions never transit through Cortex servers.',
        },
        {
          name: 'Read-only integrations',
          detail: 'Secure read-only API tokens and webhooks ensure Cortex cannot modify, delete, or alter your production systems.',
        },
      ],
    },
  ];

  // What Costs Money: Provider Free Tier Limits
  const cloudProviders = [
    {
      name: 'Neo4j AuraDB Free',
      role: 'Graph Database (Relationships & Entities)',
      freeAllowance: '1 Free Instance · 200,000 Nodes · 400,000 Relationships',
      overageNote: 'Sufficient for most teams with dozens of repos. If you scale beyond this, Neo4j charges standard Aura rates directly.',
      link: 'https://neo4j.com/cloud/platform/aura-graph-database/',
      icon: Database,
      badge: 'Free Forever Tier',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      name: 'Qdrant Cloud Free',
      role: 'Vector Database (Semantic Search & RAG)',
      freeAllowance: '1 Free Cluster (1GB RAM, 0.5 vCPU) · ~1M Vectors',
      overageNote: 'Covers hundreds of thousands of code chunks and Slack messages. Qdrant bills directly if additional cluster capacity is needed.',
      link: 'https://qdrant.tech/pricing/',
      icon: Server,
      badge: 'Free 1GB Cluster',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      name: 'Groq Cloud Free Tier',
      role: 'Fast-Path LLM Inference (Llama 3 / Qwen)',
      freeAllowance: 'Generous free TPM & RPM (30 req/min · 14,400 req/day)',
      overageNote: 'Fast-path queries route with 0 inference cost. Optional BYOK (OpenAI / Anthropic / local Ollama) is also supported.',
      link: 'https://groq.com/pricing/',
      icon: Cpu,
      badge: 'High RPM Free Tier',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    {
      name: 'PostgreSQL / Docker Host',
      role: 'Metadata Storage & Webhook Ingestion',
      freeAllowance: 'Self-hosted Docker (Local) or Free Cloud DB (Supabase / Neon)',
      overageNote: 'Runs seamlessly on any existing virtual machine, local workstation, or free serverless Postgres tier at ₹0 cost.',
      link: 'https://www.postgresql.org/',
      icon: Terminal,
      badge: '100% Free / Self-Hosted',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    },
  ];

  const filteredGroups = activeCategory === 'all' 
    ? capabilityGroups 
    : capabilityGroups.filter(g => g.id === activeCategory);

  return (
    <section id="pricing" className="py-24 md:py-32 bg-[#06080e] relative overflow-hidden border-t border-slate-800/80 antialiased selection:bg-indigo-500/30 selection:text-white">
      {/* Background Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[300px] bg-cyan-500/5 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ========================================================================= */}
        {/* 1. SECTION HEADER (Exact User Specification) */}
        {/* ========================================================================= */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#0c111e] border border-indigo-500/30 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-5 shadow-lg shadow-indigo-950/20">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Honest &amp; Transparent Model · Early Access</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 font-sans">
            One plan. Everything included.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 font-black">
              ₹0.
            </span>
          </h2>

          <p className="text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Cortex runs on your own cloud infrastructure. We don't charge for the software — you only use free-tier cloud accounts you already control.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#090d16] border border-slate-800">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-200">No License Fees</span>
            </span>
            <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#090d16] border border-slate-800">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-200">No Per-Seat Pricing</span>
            </span>
            <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#090d16] border border-slate-800">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-200">100% BYOC &amp; Private</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. THE MODEL EXPLAINED (3-Part Visual Breakdown) */}
        {/* ========================================================================= */}
        <div className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider mb-2">
              Architecture &amp; Philosophy
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-sans">
              How Does the Free BYOC Model Work?
            </h3>
            <p className="text-sm text-slate-400 mt-2">
              Here is a clear 3-part breakdown of what "free" actually means with Cortex.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {modelPillars.map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={idx}
                  className={`group relative bg-[#090d16]/90 border ${pillar.borderColor} rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-950/30 flex flex-col justify-between backdrop-blur-xl`}
                >
                  {/* Subtle top gradient accent */}
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${pillar.color} rounded-t-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />

                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-xs font-mono font-bold text-slate-500 tracking-widest">
                        PART {pillar.step}
                      </span>
                      <span className="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg bg-[#060911] text-slate-300 border border-slate-800">
                        {pillar.badge}
                      </span>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-[#0c111e] border border-slate-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                      <Icon className={`w-6 h-6 ${pillar.iconColor}`} />
                    </div>

                    <h4 className="text-xl font-bold text-white mb-3 font-sans group-hover:text-indigo-200 transition-colors">
                      "{pillar.title}"
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                      {pillar.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 space-y-2">
                    {pillar.bulletPoints.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-center space-x-2 text-xs font-mono text-slate-400">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. PLAN SUMMARY HERO CARD (Single Tier, Everything Included) */}
        {/* ========================================================================= */}
        <div className="max-w-4xl mx-auto mb-24">
          <div className="relative rounded-3xl bg-gradient-to-b from-[#0d1324] via-[#090d16] to-[#070a12] border-2 border-indigo-500/40 p-8 sm:p-12 shadow-2xl shadow-indigo-950/50 backdrop-blur-2xl overflow-hidden">
            {/* Top decorative glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-slate-800/80">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase mb-3">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Self-Hosted Community Edition</span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-sans">
                  The Full Cortex Platform
                </h3>
                <p className="text-sm text-slate-300 mt-2 max-w-lg">
                  Every feature, every graph engine capability, and every risk model. Deployed on your private infrastructure.
                </p>
              </div>

              {/* Price Display */}
              <div className="text-left md:text-right shrink-0 bg-[#060911] md:bg-transparent p-5 md:p-0 rounded-2xl border md:border-0 border-slate-800">
                <div className="flex items-baseline md:justify-end space-x-2">
                  <span className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 font-sans">
                    ₹0
                  </span>
                  <span className="text-sm font-mono text-slate-400">/ forever</span>
                </div>
                <p className="text-xs font-mono text-emerald-400 font-semibold mt-1">
                  100% Free · No Subscription
                </p>
              </div>
            </div>

            {/* Quick Guarantees Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-8">
              <div className="p-4 rounded-xl bg-[#060911]/80 border border-slate-800/80">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-indigo-400 mb-1">
                  <Server className="w-4 h-4" />
                  <span>Your Infrastructure</span>
                </div>
                <p className="text-xs text-slate-300">
                  Deploy via Docker on your workstation, VM, AWS, or GCP.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#060911]/80 border border-slate-800/80">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-purple-400 mb-1">
                  <Lock className="w-4 h-4" />
                  <span>Zero Code Leaving VPC</span>
                </div>
                <p className="text-xs text-slate-300">
                  Codebase &amp; Slack history are indexed only into your cloud instances.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#060911]/80 border border-slate-800/80">
                <div className="flex items-center space-x-2 text-xs font-mono font-bold text-emerald-400 mb-1">
                  <UserCheck className="w-4 h-4" />
                  <span>Personal Setup</span>
                </div>
                <p className="text-xs text-slate-300">
                  Direct setup guidance with the founder to get up and running.
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono text-slate-400 text-center sm:text-left">
                No credit card &bull; No self-serve friction &bull; Ready in 15 minutes
              </div>

              <button
                onClick={() => onOpenContact('Free BYOC Setup')}
                className="w-full sm:w-auto px-8 py-4 text-sm font-mono font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer border border-indigo-400/30 transform hover:-translate-y-0.5"
              >
                <span>Request Free Setup</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. WHAT'S INCLUDED (Single Full List, No Tiers, Autoli-Style Feature Table) */}
        {/* ========================================================================= */}
        <div className="max-w-5xl mx-auto mb-24">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 text-xs font-mono mb-3">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Platform Capabilities</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-extrabold text-white font-sans">
              What's Included in Your Free Setup
            </h3>
            <p className="text-sm sm:text-base text-slate-400 mt-2">
              Every single capability below is 100% included in the free plan — zero artificial locks or premium tier gating.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 font-mono text-xs">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20 font-bold'
                  : 'bg-[#090d16] text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              All Capabilities ({capabilityGroups.reduce((acc, g) => acc + g.features.length, 0)})
            </button>
            {capabilityGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveCategory(group.id)}
                className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  activeCategory === group.id
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20 font-bold'
                    : 'bg-[#090d16] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {group.category}
              </button>
            ))}
          </div>

          {/* Single-Column Feature Matrix (Autoli-style) */}
          <div className="bg-[#090d16] border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-slate-950/80 border-b border-slate-800 px-6 py-4 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-10 sm:col-span-11">Verified Platform Feature &amp; Description</div>
              <div className="col-span-2 sm:col-span-1 text-center text-emerald-400">Status</div>
            </div>

            {/* Feature Groups */}
            {filteredGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.id} className="border-b border-slate-800/80 last:border-0">
                  {/* Category Header */}
                  <div className="bg-[#0b101c] px-6 py-3.5 border-b border-slate-800/60 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <GroupIcon className="w-4 h-4 text-indigo-400" />
                      <span className="text-sm font-bold text-white font-sans">{group.category}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${group.tagColor}`}>
                        {group.features.length} Features
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                      {group.description}
                    </span>
                  </div>

                  {/* Individual Features List */}
                  {group.features.map((feat, fIdx) => (
                    <div
                      key={fIdx}
                      className="grid grid-cols-12 px-6 py-4 text-xs sm:text-sm border-b border-slate-800/30 last:border-0 hover:bg-slate-800/20 transition-colors items-start gap-4"
                    >
                      <div className="col-span-10 sm:col-span-11 space-y-1">
                        <div className="font-semibold text-slate-100 flex items-center space-x-2">
                          <span>{feat.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-normal">
                          {feat.detail}
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1 flex items-center justify-center pt-1">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. WHAT COSTS MONEY (Transparent Cloud Free Tier Limits Disclosure) */}
        {/* ========================================================================= */}
        <div className="max-w-5xl mx-auto mb-24">
          <div className="p-8 sm:p-10 rounded-3xl bg-[#090d16]/90 border border-slate-800/90 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 mb-8 border-b border-slate-800/80">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase mb-2">
                  <Info className="w-3.5 h-3.5" />
                  <span>Full Transparency Disclosure</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-sans">
                  What Actually Costs Money?
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 max-w-xs text-left md:text-right">
                No hidden fees from Cortex &bull; Direct cloud provider transparency
              </span>
            </div>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8">
              <strong>The only costs are your own cloud provider's charges IF you exceed free tier limits.</strong> Neo4j Aura Free, Qdrant Cloud Free, and Groq's free tier have usage caps; if a workspace grows large enough to exceed them, the cloud provider (not Cortex) would charge standard rates. We link to each provider's exact free tier limits below for 100% transparency. This is honest disclosure, not a hidden fee — we're not charging anything, your cloud provider might eventually.
            </p>

            {/* Provider Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {cloudProviders.map((provider, pIdx) => {
                const ProviderIcon = provider.icon;
                return (
                  <div
                    key={pIdx}
                    className="p-5 rounded-2xl bg-[#060911] border border-slate-800/80 hover:border-indigo-500/30 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <ProviderIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white font-mono">{provider.name}</h4>
                            <span className="text-[10px] text-slate-500 font-mono">{provider.role}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${provider.badgeColor}`}>
                          {provider.badge}
                        </span>
                      </div>

                      <div className="my-3 p-2.5 rounded-lg bg-[#0c111e] border border-slate-800/80 text-xs font-mono text-emerald-400 font-semibold">
                        {provider.freeAllowance}
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed mb-4">
                        {provider.overageNote}
                      </p>
                    </div>

                    <a
                      href={provider.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 text-xs font-mono text-indigo-400 hover:text-indigo-300 hover:underline pt-2 border-t border-slate-800/60"
                    >
                      <span>View official {provider.name.split(' ')[0]} limits</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-slate-500 font-mono text-center sm:text-left flex items-center space-x-2 pt-2">
              <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Cortex does not take any payment or markup on your cloud infrastructure. You maintain direct control over your accounts.</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. FUTURE PRICING NOTE (Honest Early Access Expectation Setting) */}
        {/* ========================================================================= */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#0c111e] border border-indigo-500/20 text-center sm:text-left flex flex-col sm:flex-row items-center gap-5 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="font-bold text-white font-mono uppercase tracking-wider text-xs">
                Early Access &amp; Future Pricing Policy
              </div>
              <p className="text-slate-300">
                Cortex is currently <strong className="text-white">100% free during early access</strong> while we work with real engineering teams. When a paid managed tier or enterprise plan is introduced in the future, all teams will be notified at least <strong className="text-indigo-300">14 days in advance</strong> with complete transparency — no surprise charges, no automatic deductions, and early adopters will be grandfathered into favorable terms.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 7. FINAL CALL TO ACTION */}
        {/* ========================================================================= */}
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-b from-[#0d1324] to-[#070a12] border border-indigo-500/30 rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-indigo-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#060911] border border-indigo-500/30 text-indigo-400 text-xs font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Personal Setup Assistance</span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-sans">
              Ready to deploy Cortex on your infrastructure?
            </h3>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Reach out and I'll personally set up Cortex on your cloud infrastructure. Free forever, self-hosted, and 100% private.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onOpenContact('Free BYOC Setup')}
                className="w-full sm:w-auto px-8 py-4 text-sm font-mono font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 cursor-pointer border border-indigo-400/20 transform hover:-translate-y-0.5"
              >
                <span>Request Free Setup</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>

              <a
                href="#byoc"
                className="w-full sm:w-auto px-6 py-4 text-sm font-mono font-bold text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>View Docker Command</span>
              </a>
            </div>

            <div className="pt-4 text-xs font-mono text-slate-500">
              No credit card required &bull; 100% self-hosted &bull; ₹0 software cost
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

// Helper for gift icon
function GiftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}
