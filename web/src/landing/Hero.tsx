import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  Play,
  Lock,
  Calculator,
  CheckCircle2,
  GitBranch,
  MessageSquare,
  Ticket,
  Zap,
  UserCheck,
  Layers,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { AnimatedGraphBackground } from './AnimatedGraphBackground';
import { VideoShowcase } from './VideoShowcase';

interface HeroProps {
  onOpenContact: () => void;
}

/* ── Animated stat counter ── */
const AnimatedCounter: React.FC<{ target: number; suffix?: string; duration?: number }> = ({ 
  target, suffix = '', duration = 1800 
}) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!started) return;
    let start: number;
    let frame: number;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * target));
      if (p < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [started, target, duration]);

  return <span>{count}{suffix}</span>;
};

/* ── Type definition for topology nodes ── */
type ServiceKey = 'payment' | 'notification' | 'auth' | 'inventory';

interface ServiceData {
  id: ServiceKey;
  name: string;
  tier: string;
  busFactor: number;
  status: string;
  statusType: 'critical' | 'warning' | 'healthy' | 'neutral';
  techStack: string;
  owner: string;
  ownerHandle: string;
  ownershipPct: number;
  successor: string;
  successorMatch: string;
  blastRadius: string;
  commitsAnalyzed: number;
  contributors: { name: string; pct: number; color: string }[];
}

const SERVICES: Record<ServiceKey, ServiceData> = {
  payment: {
    id: 'payment',
    name: 'payment-gateway-v2',
    tier: 'Tier-1 Core Service',
    busFactor: 1,
    status: 'Critical SPOF',
    statusType: 'critical',
    techStack: 'TypeScript · Stripe PCI · Fastify',
    owner: 'Devendra Singh',
    ownerHandle: '@devendra-singh',
    ownershipPct: 84,
    successor: 'Vikram Patel',
    successorMatch: '82% code & AST match',
    blastRadius: '2 downstream services (billing, checkout)',
    commitsAnalyzed: 1420,
    contributors: [
      { name: 'Devendra S.', pct: 84, color: '#F43F5E' },
      { name: 'Priya S.', pct: 11, color: '#64748B' },
      { name: 'Vikram P.', pct: 5, color: '#334155' }
    ]
  },
  notification: {
    id: 'notification',
    name: 'notification-worker',
    tier: 'Async Queue Worker',
    busFactor: 1,
    status: 'High SPOF Risk',
    statusType: 'warning',
    techStack: 'TypeScript · BullMQ · Twilio',
    owner: 'Rohan Verma',
    ownerHandle: '@rohanverma',
    ownershipPct: 100,
    successor: 'Vikram Patel',
    successorMatch: '76% AST match',
    blastRadius: '1 downstream queue (core-alerts)',
    commitsAnalyzed: 842,
    contributors: [
      { name: 'Rohan V.', pct: 100, color: '#F59E0B' }
    ]
  },
  auth: {
    id: 'auth',
    name: 'auth-service',
    tier: 'Tier-1 Security',
    busFactor: 3,
    status: 'Resilient Continuity',
    statusType: 'healthy',
    techStack: 'TypeScript · Fastify · JWT PKCE',
    owner: 'Vikram Patel',
    ownerHandle: '@vikrampatel',
    ownershipPct: 42,
    successor: 'Alice Zhang',
    successorMatch: '91% code & AST match',
    blastRadius: '0 unhedged services',
    commitsAnalyzed: 2150,
    contributors: [
      { name: 'Vikram P.', pct: 42, color: '#10B981' },
      { name: 'Alice Z.', pct: 35, color: '#38BDF8' },
      { name: 'Devendra S.', pct: 23, color: '#818CF8' }
    ]
  },
  inventory: {
    id: 'inventory',
    name: 'inventory-api',
    tier: 'Tier-2 Internal Core',
    busFactor: 2,
    status: 'Stable Continuity',
    statusType: 'neutral',
    techStack: 'Go · gRPC · PostgreSQL',
    owner: 'Alice Zhang',
    ownerHandle: '@alicezhang',
    ownershipPct: 54,
    successor: 'Devendra Singh',
    successorMatch: '79% AST match',
    blastRadius: '0 unhedged services',
    commitsAnalyzed: 690,
    contributors: [
      { name: 'Alice Z.', pct: 54, color: '#38BDF8' },
      { name: 'Vikram P.', pct: 46, color: '#10B981' }
    ]
  }
};

/* ── Interactive Enterprise Knowledge Graph & Topology Console ── */
const EnterpriseGraphConsole: React.FC = () => {
  const [selectedService, setSelectedService] = useState<ServiceKey>('payment');
  const [filterMode, setFilterMode] = useState<'all' | 'spof' | 'healthy'>('all');

  const active = SERVICES[selectedService];

  // Helper for badge styling
  const getBadgeStyle = (type: ServiceData['statusType']) => {
    switch (type) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/25';
      case 'warning':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/25';
      case 'healthy':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
      case 'neutral':
      default:
        return 'bg-sky-500/10 text-sky-300 border-sky-500/25';
    }
  };

  return (
    <div className="browser-chrome shadow-2xl border border-white/[0.08] bg-[#0A0E17] rounded-2xl overflow-hidden backdrop-blur-xl">
      {/* Console Header Bar */}
      <div className="browser-header justify-between px-4 py-3 bg-[#070A11] border-b border-white/[0.06]">
        <div className="flex items-center space-x-2">
          <span className="browser-dot bg-[#EF4444]/80" />
          <span className="browser-dot bg-[#F59E0B]/80" />
          <span className="browser-dot bg-[#10B981]/80" />
        </div>

        {/* URL / Path Pill */}
        <div className="flex items-center space-x-2 px-3 py-1 bg-[#0E131E] border border-white/[0.04] rounded-md text-[11px] font-mono text-slate-300">
          <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate">cortex.internal / topology / bus-factor-matrix</span>
        </div>

        {/* VPC Tag */}
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>VPC Air-Gapped</span>
        </div>
      </div>

      {/* Main Console Canvas & Inspector */}
      <div className="p-4 sm:p-5 space-y-4">
        
        {/* Navigation & Filter Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.04] flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-300 font-semibold text-[11px]">Knowledge Topology:</span>
          </div>

          <div className="flex space-x-1 p-0.5 rounded-lg bg-[#0E131E] border border-white/[0.04] text-[10px]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                filterMode === 'all'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Services (4)
            </button>
            <button
              onClick={() => setFilterMode('spof')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                filterMode === 'spof'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SPOF Alerts (2)
            </button>
            <button
              onClick={() => setFilterMode('healthy')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                filterMode === 'healthy'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Resilient (2)
            </button>
          </div>
        </div>

        {/* Visual Living Service Graph Canvas */}
        <div className="relative h-48 rounded-xl bg-[#06080D] border border-white/[0.04] overflow-hidden p-2 select-none">
          {/* Subtle Grid blueprint background */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
              backgroundSize: '16px 16px'
            }}
          />

          <svg viewBox="0 0 400 180" className="w-full h-full">
            <defs>
              <linearGradient id="edgeIndigo" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#818CF8" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="edgeRose" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="edgeEmerald" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Ingress Gateway Node at top center */}
            <g>
              <rect x="155" y="8" width="90" height="22" rx="4" fill="#0F172A" stroke="#334155" strokeWidth="1" />
              <text x="200" y="22" textAnchor="middle" fill="#94A3B8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                api-gateway (kong)
              </text>
            </g>

            {/* Connecting Edges from Ingress to Services */}
            <path d="M 175 30 L 95 62" fill="none" stroke="url(#edgeEmerald)" strokeWidth="1.2" strokeDasharray="3 3" />
            <path d="M 200 30 L 200 62" fill="none" stroke="url(#edgeRose)" strokeWidth="1.4" />
            <path d="M 225 30 L 305 62" fill="none" stroke="url(#edgeIndigo)" strokeWidth="1.2" strokeDasharray="3 3" />

            {/* Cross-service connecting Edges */}
            <path d="M 140 78 L 155 78" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
            <path d="M 245 78 L 260 78" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
            <path d="M 200 95 L 200 130" fill="none" stroke="#334155" strokeWidth="1.2" />

            {/* Protocol badges on edges */}
            <text x="130" y="48" fill="#64748B" fontSize="6" fontFamily="monospace">mTLS</text>
            <text x="204" y="48" fill="#F43F5E" fontSize="6" fontFamily="monospace" fontWeight="bold">gRPC</text>
            <text x="270" y="48" fill="#64748B" fontSize="6" fontFamily="monospace">BullMQ</text>

            {/* ── Node 1: auth-service (Left) ── */}
            <g 
              className="cursor-pointer transition-all" 
              onClick={() => setSelectedService('auth')}
              opacity={filterMode === 'spof' ? 0.35 : 1}
            >
              <rect 
                x="50" y="62" width="90" height="34" rx="6" 
                fill={selectedService === 'auth' ? '#0D1A1E' : '#0B0F17'} 
                stroke={selectedService === 'auth' ? '#10B981' : '#1E293B'} 
                strokeWidth={selectedService === 'auth' ? '1.5' : '1'} 
              />
              <circle cx="62" cy="74" r="3" fill="#10B981" />
              <text x="70" y="76" fill="#F8FAFC" fontSize="7.5" fontFamily="monospace" fontWeight="bold">auth-service</text>
              <text x="70" y="87" fill="#64748B" fontSize="6" fontFamily="monospace">BF: 3 · Resilient</text>
              <text x="128" y="76" textAnchor="end" fill="#10B981" fontSize="6.5" fontFamily="monospace">42%</text>
            </g>

            {/* ── Node 2: payment-gateway-v2 (Center - High Risk SPOF) ── */}
            <g 
              className="cursor-pointer transition-all" 
              onClick={() => setSelectedService('payment')}
              opacity={filterMode === 'healthy' ? 0.35 : 1}
            >
              <rect 
                x="155" y="62" width="90" height="34" rx="6" 
                fill={selectedService === 'payment' ? '#1D0E14' : '#0F121C'} 
                stroke={selectedService === 'payment' ? '#F43F5E' : '#334155'} 
                strokeWidth={selectedService === 'payment' ? '1.5' : '1'} 
              />
              <circle cx="167" cy="74" r="3" fill="#F43F5E" />
              <text x="175" y="76" fill="#F8FAFC" fontSize="7.5" fontFamily="monospace" fontWeight="bold">payment-gw-v2</text>
              <text x="175" y="87" fill="#F43F5E" fontSize="6" fontFamily="monospace" fontWeight="bold">BF: 1 · SPOF</text>
              <text x="233" y="76" textAnchor="end" fill="#F43F5E" fontSize="6.5" fontFamily="monospace">84%</text>
            </g>

            {/* ── Node 3: notification-worker (Right) ── */}
            <g 
              className="cursor-pointer transition-all" 
              onClick={() => setSelectedService('notification')}
              opacity={filterMode === 'healthy' ? 0.35 : 1}
            >
              <rect 
                x="260" y="62" width="90" height="34" rx="6" 
                fill={selectedService === 'notification' ? '#1E140D' : '#0B0F17'} 
                stroke={selectedService === 'notification' ? '#F59E0B' : '#1E293B'} 
                strokeWidth={selectedService === 'notification' ? '1.5' : '1'} 
              />
              <circle cx="272" cy="74" r="3" fill="#F59E0B" />
              <text x="280" y="76" fill="#F8FAFC" fontSize="7.5" fontFamily="monospace" fontWeight="bold">notif-worker</text>
              <text x="280" y="87" fill="#F59E0B" fontSize="6" fontFamily="monospace" fontWeight="bold">BF: 1 · Risk</text>
              <text x="338" y="76" textAnchor="end" fill="#F59E0B" fontSize="6.5" fontFamily="monospace">100%</text>
            </g>

            {/* ── Node 4: inventory-api (Bottom Center) ── */}
            <g 
              className="cursor-pointer transition-all" 
              onClick={() => setSelectedService('inventory')}
              opacity={filterMode === 'spof' ? 0.35 : 1}
            >
              <rect 
                x="155" y="130" width="90" height="32" rx="6" 
                fill={selectedService === 'inventory' ? '#0E1726' : '#0B0F17'} 
                stroke={selectedService === 'inventory' ? '#38BDF8' : '#1E293B'} 
                strokeWidth={selectedService === 'inventory' ? '1.5' : '1'} 
              />
              <circle cx="167" cy="142" r="3" fill="#38BDF8" />
              <text x="175" y="144" fill="#F8FAFC" fontSize="7.5" fontFamily="monospace" fontWeight="bold">inventory-api</text>
              <text x="175" y="153" fill="#64748B" fontSize="6" fontFamily="monospace">BF: 2 · Stable</text>
              <text x="233" y="144" textAnchor="end" fill="#38BDF8" fontSize="6.5" fontFamily="monospace">54%</text>
            </g>

            {/* Database & Queue Nodes (Peripheral) */}
            <g opacity="0.75">
              <rect x="55" y="132" width="78" height="22" rx="4" fill="#080C14" stroke="#1E293B" strokeWidth="0.8" />
              <text x="94" y="146" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace">postgres-iam</text>
              <path d="M 95 96 L 95 132" fill="none" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="2 2" />
            </g>
            <g opacity="0.75">
              <rect x="268" y="132" width="78" height="22" rx="4" fill="#080C14" stroke="#1E293B" strokeWidth="0.8" />
              <text x="307" y="146" textAnchor="middle" fill="#64748B" fontSize="6.5" fontFamily="monospace">redis-events</text>
              <path d="M 305 96 L 305 132" fill="none" stroke="#1E293B" strokeWidth="0.8" strokeDasharray="2 2" />
            </g>
          </svg>
        </div>

        {/* Selected Node Telemetry & Succession Inspector */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#0D121C] border border-white/[0.06] space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-white font-bold flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold">{active.name}</span>
                <span className="text-[10px] text-slate-400 font-normal">({active.tier})</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Primary Maintainer: <span className="text-slate-200 font-semibold">{active.owner}</span> ({active.ownerHandle})
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] px-2.5 py-1 rounded border font-semibold ${getBadgeStyle(active.statusType)}`}>
                {active.status} (Bus Factor: {active.busFactor})
              </span>
            </div>
          </div>

          {/* Ownership Breakdown Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Commit Authorship Dispersion (180-Day Recency-Decayed)</span>
              <span className="text-indigo-400 font-semibold">{active.ownershipPct}% concentrated</span>
            </div>
            <div className="h-2 w-full rounded bg-[#070A10] flex overflow-hidden p-0.5 border border-white/[0.04]">
              {active.contributors.map((c) => (
                <div 
                  key={c.name}
                  className="h-full rounded-xs"
                  style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                  title={`${c.name}: ${c.pct}%`}
                />
              ))}
            </div>
            <div className="flex items-center space-x-4 text-[9px] text-slate-400 pt-0.5">
              {active.contributors.map((c) => (
                <div key={c.name} className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span>{c.name} ({c.pct}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Successor Recommendation & Blast Radius Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[10px]">
            <div className="p-2.5 rounded-lg bg-[#070A10] border border-white/[0.04]">
              <div className="text-slate-400 flex items-center space-x-1 font-semibold">
                <UserCheck className="w-3 h-3 text-emerald-400" />
                <span>RECOMMENDED SUCCESSOR</span>
              </div>
              <div className="text-slate-200 font-bold mt-1">
                {active.successor} <span className="text-emerald-400 font-normal">({active.successorMatch})</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#070A10] border border-white/[0.04]">
              <div className="text-slate-400 flex items-center space-x-1 font-semibold">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>SIMULATED BLAST RADIUS</span>
              </div>
              <div className="text-slate-200 mt-1 truncate">
                {active.blastRadius}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Micro-Metrics Strip */}
        <div className="grid grid-cols-3 gap-2 font-mono text-center pt-1">
          <div className="p-2 rounded-lg bg-[#070A10] border border-white/[0.04]">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">COMPACTED COMMITS</div>
            <div className="text-xs font-bold text-white"><AnimatedCounter target={1420} suffix=" Commits" /></div>
          </div>
          <div className="p-2 rounded-lg bg-[#070A10] border border-white/[0.04]">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">CRITICAL SPOFs</div>
            <div className="text-xs font-bold text-rose-400"><AnimatedCounter target={2} suffix=" Services" /></div>
          </div>
          <div className="p-2 rounded-lg bg-[#070A10] border border-white/[0.04]">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider">CODE EGRESS</div>
            <div className="text-xs font-bold text-emerald-400">0 Bytes (Air-Gapped)</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export const Hero: React.FC<HeroProps> = ({ onOpenContact }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-[#06090F] antialiased">
      {/* Background graph mesh */}
      <AnimatedGraphBackground />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 py-14 sm:py-18 lg:py-20 w-full">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* ─── Left Column: Copy (7 cols on lg) ─── */}
          <div className={`lg:col-span-7 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono mb-5">
              <Zap className="w-3 h-3 text-indigo-400" />
              <span className="font-medium tracking-wide">Self-Hosted Knowledge Graph for Engineering Teams</span>
            </div>

            {/* Headline — Static, clean, high-contrast, no shifting animations */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] font-bold tracking-tight leading-[1.12] font-sans">
              <span className="text-white">Engineering knowledge,</span>
              <br />
              <span className="text-indigo-400">decoupled from key engineers.</span>
            </h1>

            {/* Subcopy */}
            <p className="mt-5 text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-xl font-sans">
              When senior developers leave, critical system context disappears. Cortex ingests 
              GitHub, Slack, and Jira into a private, self-hosted knowledge graph to quantify bus factors, 
              simulate departure blast radius, and ground architectural inquiries in verifiable commit history.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                onClick={onOpenContact}
                className="group px-6 py-3.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:-translate-y-0.5"
              >
                <span>Book a 30-Min Architecture Walkthrough</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('proof');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3.5 text-sm font-semibold text-slate-200 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer backdrop-blur-sm"
              >
                <Play className="w-4 h-4 text-indigo-400" />
                <span>See Product Proof</span>
              </button>
            </div>

            {/* Trust Chips */}
            <div className="mt-7 flex flex-wrap items-center gap-2.5 text-xs font-mono text-slate-400">
              <span className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Self-hosted in your VPC</span>
              </span>
              <span className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <Calculator className="w-3.5 h-3.5 text-purple-400" />
                <span>Deterministic formulas</span>
              </span>
              <span className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero code egress</span>
              </span>
            </div>
          </div>

          {/* ─── Right Column: High-End Interactive Topology & Succession Console (5 cols on lg) ─── */}
          <div className={`lg:col-span-5 transition-all duration-700 delay-150 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <EnterpriseGraphConsole />
          </div>
        </div>

        {/* ─── Integration Strip ─── */}
        <div className={`mt-12 pt-6 border-t border-white/[0.06] text-center transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-4">
            Continuous ingestion from your production engineering tools
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12">
            <div className="flex items-center space-x-2.5 text-slate-300 group cursor-default">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-white">GitHub</div>
                <div className="text-[10px] text-slate-400 font-mono">&amp; GitHub Enterprise</div>
              </div>
            </div>
            <div className="flex items-center space-x-2.5 text-slate-300 group cursor-default">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400/80" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-white">Slack</div>
                <div className="text-[10px] text-slate-400 font-mono">Engineering channels</div>
              </div>
            </div>
            <div className="flex items-center space-x-2.5 text-slate-300 group cursor-default">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <Ticket className="w-3.5 h-3.5 text-indigo-400/80" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-white">Jira</div>
                <div className="text-[10px] text-slate-400 font-mono">Issues &amp; Epics</div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Product Video Showcase ─── */}
        <div className={`mt-10 sm:mt-12 max-w-5xl mx-auto transition-all duration-700 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <VideoShowcase
            src="/Cortex.mp4"
            poster="/cortex-video-poster.jpg"
            title="Cortex Product Walkthrough"
            subtitle="Autonomous Knowledge Graph · Ingesting GitHub, Slack & Jira"
          />
        </div>
      </div>
    </section>
  );
};
