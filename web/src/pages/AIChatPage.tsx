import React, { useState, useRef, useEffect } from 'react';
import { sendChatQuery, type ChatQueryResponse } from '../lib/api';
import { 
  Send, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  ChevronRight, 
  FileText, 
  Network, 
  ShieldAlert, 
  Terminal, 
  Bot, 
  User, 
  RefreshCw,
  GitCommit,
  Layers,
  Award,
  Clock,
  UserCheck,
  Zap,
  Cpu,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ArrowUpRight,
  MessageSquare
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  response?: ChatQueryResponse;
  timestamp: string;
}

export const AIChatPage: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am Cortex, your engineering knowledge intelligence assistant. Ask me about departure risk impact, knowledge loss scores, commit histories, tech stack expertise, or architectural decisions.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [expandedDetails, setExpandedDetails] = useState<Record<string, 'risk' | 'chain' | 'sources' | 'graph' | null>>({});

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMsgRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea height dynamically based on content (compact 44px up to 120px max)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const calculatedH = textareaRef.current.scrollHeight;
      const targetH = Math.min(Math.max(calculatedH, 44), 120);
      textareaRef.current.style.height = `${targetH}px`;
    }
  }, [query]);

  // Scroll immediately to newly added message (User Question on Enter, then Bot Answer on response)
  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => {
        lastMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    }
  }, [messages]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || query;
    if (!textToSend.trim() || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setQuery('');
    setLoading(true);

    setLoadingStep('Evaluating Intent Router & Fast-Path Rules...');
    const stepTimer1 = setTimeout(() => setLoadingStep('Executing Multi-Tool Parallel Agent Graph...'), 1500);
    const stepTimer2 = setTimeout(() => setLoadingStep('Computing Knowledge Risk & Gathering Subgraph Evidence...'), 3500);
    const stepTimer3 = setTimeout(() => setLoadingStep('Synthesizing verified natural language response...'), 6000);

    try {
      const response = await sendChatQuery(userMsg.text);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.answer || 'No answer generated.',
        response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: `Sorry, an error occurred while processing your request: ${err.message || 'Server error'}. Ensure backend is running on port 3000.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setLoading(false);
      setLoadingStep('');
    }
  };

  const toggleTab = (msgId: string, tab: 'risk' | 'chain' | 'sources' | 'graph') => {
    setExpandedDetails(prev => ({
      ...prev,
      [msgId]: prev[msgId] === tab ? null : tab,
    }));
  };

  // Compact starter prompts shown ONLY on empty welcome state inside chat
  const starterPrompts = [
    { title: '🚨 Departure Risk', desc: 'What breaks if Vikram Patel leaves the team?' },
    { title: '⚡ Compound Query', desc: 'What is Sarah Chen\'s email and knowledge risk?' },
    { title: '🏗️ Architectural Choice', desc: 'Why did we switch to BullMQ for queues?' },
    { title: '💻 Tech Stack', desc: 'What technologies does Elena Rostova use?' },
  ];

  const getToolBadgeColor = (tool: string) => {
    switch (tool) {
      case 'knowledge_risk':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'graph_search':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'vector_search':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'sql_search':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    }
  };

  const getSeverityBadge = (score: number) => {
    if (score >= 70) {
      return { label: 'CRITICAL RISK', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40', stroke: '#f43f5e' };
    }
    if (score >= 40) {
      return { label: 'MODERATE RISK', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', stroke: '#f59e0b' };
    }
    return { label: 'LOW RISK', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', stroke: '#10b981' };
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-65px)] bg-[#060a12] font-sans antialiased text-slate-100">
      {/* Absolute Fixed Clear Chat Button at Top Right */}
      <button
        onClick={() => setMessages([messages[0]])}
        className="absolute top-3.5 right-6 z-30 text-xs text-slate-400 hover:text-white bg-[#090f1d]/90 hover:bg-slate-800 border border-slate-800/80 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-lg backdrop-blur-md"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>Clear Chat</span>
      </button>

      {/* Main Full-Height Messages Feed */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 md:p-10 pt-12 space-y-6">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          const isLastMsg = index === messages.length - 1;
          const res = msg.response;
          const krRaw = res?.knowledgeRiskResult;
          const krList = Array.isArray(krRaw) ? krRaw : (krRaw ? [krRaw] : []);

          // Evidence panel is CLOSED BY DEFAULT (null) until user explicitly clicks a tab
          const activeTab = expandedDetails[msg.id] || null;

          return (
            <div
              key={msg.id}
              ref={isLastMsg ? lastMsgRef : null}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-4xl ${isUser ? 'ml-auto' : 'mr-auto'} w-full scroll-mt-6`}
            >
              {/* Message Sender Tag */}
              <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1.5 px-1">
                {isUser ? (
                  <>
                    <span className="font-semibold text-slate-300">You</span>
                    <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      <User className="h-3 w-3" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      <Bot className="h-3 w-3" />
                    </div>
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
                      Cortex Assistant
                    </span>
                  </>
                )}
                <span className="text-[10px] text-slate-500">• {msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`p-5 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-tr-none shadow-lg shadow-indigo-600/20 border border-indigo-400/20'
                    : 'bg-[#0b1120] border border-slate-800 text-slate-100 rounded-tl-none shadow-xl backdrop-blur-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>

              {/* Welcome State Cards (Shown ONLY when chat just started) */}
              {!isUser && msg.id === 'welcome' && messages.length === 1 && (
                <div className="mt-6 w-full max-w-3xl space-y-3 animate-in fade-in duration-500">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Try these sample queries to explore:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {starterPrompts.map((p, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleSend(p.desc)}
                        className="p-4 bg-[#090f1d] hover:bg-[#0e172c] border border-slate-800/80 hover:border-indigo-500/40 rounded-xl text-left transition-all duration-200 group flex items-start justify-between shadow-sm"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 block">{p.title}</span>
                          <span className="text-xs text-slate-400 block font-mono">"{p.desc}"</span>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Telemetry & Visual Evidence Component (Bot Responses Only) */}
              {!isUser && res && (
                <div className="mt-3 w-full bg-[#090e1a] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl animate-in fade-in duration-300">
                  {/* Navigation Tab Bar */}
                  <div className={`flex items-center justify-between bg-[#0d1527] px-2 overflow-x-auto ${activeTab ? 'border-b border-slate-800/80' : ''}`}>
                    <div className="flex items-center space-x-1">
                      {krList.length > 0 && (
                        <button
                          onClick={() => toggleTab(msg.id, 'risk')}
                          className={`px-4 py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
                            activeTab === 'risk'
                              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                              : 'border-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>Knowledge Risk Model</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {krList.length} Person{krList.length > 1 ? 's' : ''}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleTab(msg.id, 'chain')}
                        className={`px-4 py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
                          activeTab === 'chain'
                            ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Terminal className="h-3.5 w-3.5" />
                        <span>Execution Chain & Tools</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {res.execution?.tools?.length || 0} Tools
                        </span>
                      </button>

                      {res.sources && res.sources.length > 0 && (
                        <button
                          onClick={() => toggleTab(msg.id, 'sources')}
                          className={`px-4 py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
                            activeTab === 'sources'
                              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                              : 'border-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Vector Sources</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {res.sources.length} Docs
                          </span>
                        </button>
                      )}

                      {res.graphContext && res.graphContext.length > 0 && (
                        <button
                          onClick={() => toggleTab(msg.id, 'graph')}
                          className={`px-4 py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
                            activeTab === 'graph'
                              ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                              : 'border-transparent text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Network className="h-3.5 w-3.5" />
                          <span>Neo4j Graph Context</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 font-mono px-3 shrink-0">
                      <span className="hidden sm:inline">{activeTab ? 'Click to collapse' : 'Click to view evidence'}</span>
                      {activeTab ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-indigo-400" />}
                    </div>
                  </div>

                  {/* Tab Body Contents (ONLY rendered when activeTab is open) */}
                  {activeTab && (
                    <div className="p-6 border-t border-slate-800/60 animate-in fade-in duration-200">
                      {/* TAB 1: Animated Knowledge Loss Risk Gauges & Breakdown */}
                      {activeTab === 'risk' && krList.length > 0 && (
                        <div className="space-y-6">
                          {krList.map((kr, krIdx) => {
                            if (!kr || !kr.breakdown) return null;
                            const b = kr.breakdown || {};
                            const details = kr.details || {};
                            const evidence = kr.evidence || {};
                            const totalPct = Math.round((kr.totalRisk ?? 0) * 100);
                            const severity = getSeverityBadge(totalPct);

                            // Circular SVG Gauge math
                            const radius = 42;
                            const circumference = 2 * Math.PI * radius;
                            const strokeDashoffset = circumference - (totalPct / 100) * circumference;

                            return (
                              <div
                                key={krIdx}
                                className="bg-[#0b1222] border border-slate-800/80 rounded-xl p-6 space-y-6 shadow-xl"
                              >
                                {/* Top Profile & Circular Gauge Header */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
                                  <div className="flex items-center space-x-4">
                                    <div className="relative">
                                      <svg className="w-24 h-24 transform -rotate-90">
                                        <circle
                                          cx="48"
                                          cy="48"
                                          r={radius}
                                          className="text-slate-900"
                                          strokeWidth="8"
                                          stroke="currentColor"
                                          fill="transparent"
                                        />
                                        <circle
                                          cx="48"
                                          cy="48"
                                          r={radius}
                                          strokeWidth="8"
                                          stroke={severity.stroke}
                                          strokeDasharray={circumference}
                                          strokeDashoffset={strokeDashoffset}
                                          strokeLinecap="round"
                                          fill="transparent"
                                          className="transition-all duration-1000 ease-out"
                                        />
                                      </svg>
                                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className="text-xl font-extrabold text-white">{totalPct}%</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">RISK</span>
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <h4 className="font-bold text-lg text-white">{kr.person}</h4>
                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${severity.bg}`}>
                                          {severity.label}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-400">
                                        6-Factor Weighted Departure Loss Risk Score & Concrete Codebase Evidence
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-3 text-center w-full sm:w-auto">
                                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                                      <span className="text-xs text-slate-400 block">Owned Items</span>
                                      <span className="text-sm font-bold text-indigo-400">{details.ownedItems ?? 0}</span>
                                    </div>
                                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                                      <span className="text-xs text-slate-400 block">Dependents</span>
                                      <span className="text-sm font-bold text-purple-400">{details.criticalDependencies ?? 0}</span>
                                    </div>
                                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                                      <span className="text-xs text-slate-400 block">Sole Skills</span>
                                      <span className="text-sm font-bold text-rose-400">{details.uniqueSkills ?? 0}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 6 Weighted Risk Factor Progress Bars */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {[
                                    { label: 'Ownership Concentration', val: Math.round((b.ownership ?? 0) * 10), weight: '30%', icon: GitCommit, desc: `${details.ownedItems ?? 0} codebase commits/files owned` },
                                    { label: 'Critical Dependents', val: Math.round((b.dependency ?? 0) * 10), weight: '20%', icon: Layers, desc: `${details.criticalDependencies ?? 0} dependent components` },
                                    { label: 'Activity Staleness Risk', val: Math.round((b.activity ?? 0) * 10), weight: '15%', icon: Clock, desc: `${details.recentActivity ?? 0} events in last 30 days` },
                                    { label: 'Documentation Gaps', val: Math.round((b.documentation ?? 0) * 10), weight: '15%', icon: FileCode, desc: `${details.documentationGaps ?? 0} undocumented items` },
                                    { label: 'Sole-Contributor Expertise', val: Math.round((b.expertise ?? 0) * 10), weight: '10%', icon: Award, desc: `${details.uniqueSkills ?? 0} sole-maintained items` },
                                    { label: 'Assigned Pending Work', val: Math.round((b.pendingWork ?? 0) * 10), weight: '10%', icon: AlertCircle, desc: `${details.assignedWork ?? 0} assigned open issues` },
                                  ].map((item, idx) => (
                                    <div key={idx} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-slate-200 flex items-center gap-2">
                                          <item.icon className="h-4 w-4 text-indigo-400" />
                                          {item.label}
                                          <span className="text-[10px] font-normal text-slate-500">({item.weight} weight)</span>
                                        </span>
                                        <span className="font-extrabold text-indigo-300">{item.val}%</span>
                                      </div>
                                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                                        <div
                                          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 h-full rounded-full transition-all duration-700 ease-out"
                                          style={{ width: `${Math.max(3, item.val)}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-[11px] text-slate-500 block">{item.desc}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Concrete Work & Single Contributor Items */}
                                {evidence.expertise && evidence.expertise.length > 0 && (
                                  <div className="pt-3 space-y-3">
                                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                                      <UserCheck className="h-4 w-4 text-emerald-400" />
                                      <span>Single-Contributor Codebase Evidence</span>
                                    </h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      {evidence.expertise.map((ev: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                                          <div>
                                            <span className="text-indigo-300 font-semibold">{ev.name}</span>
                                            <span className="text-[11px] text-slate-400 block">{ev.reason}</span>
                                          </div>
                                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0 ml-2 uppercase">
                                            {ev.type}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* TAB 2: Agent Execution Chain & Tools Telemetry Timeline */}
                      {activeTab === 'chain' && (
                        <div className="space-y-6">
                          <div className="p-4 bg-[#0b1222] border border-indigo-500/30 rounded-xl flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                <Zap className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm">Execution Telemetry & Routing Path</h4>
                                <p className="text-xs text-slate-400">
                                  {res.execution?.tools?.length === 1 
                                    ? 'Fast-Path Rule Router Matched (~0.1ms Latency, 0 Token Cost)'
                                    : 'LLM Agent Multi-Tool Decomposed Execution Chain'}
                                </p>
                              </div>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {res.execution?.tools?.length || 0} Tool Call{res.execution?.tools?.length !== 1 ? 's' : ''} Executed
                            </span>
                          </div>

                          {/* Interactive Execution Flow Sequence */}
                          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                            {/* Step 1: Query Input */}
                            <div className="relative flex items-start space-x-4">
                              <div className="absolute -left-6 p-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                                <Search className="h-3 w-3" />
                              </div>
                              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs w-full">
                                <span className="font-bold text-slate-400 uppercase text-[10px] block">Step 1: User Query Received</span>
                                <span className="text-slate-200 font-mono">"{msg.text}"</span>
                              </div>
                            </div>

                            {/* Step 2: Tools Fired */}
                            {res.execution?.tools?.map((tool, idx) => (
                              <div key={idx} className="relative flex items-start space-x-4">
                                <div className="absolute -left-6 p-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
                                  <Cpu className="h-3 w-3" />
                                </div>
                                <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 text-xs w-full space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-bold text-slate-400 uppercase text-[10px]">Step {idx + 2}: Tool Invoked</span>
                                      <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${getToolBadgeColor(tool)}`}>
                                        {tool}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">Status: SUCCESS (200)</span>
                                  </div>

                                  {tool === 'graph_search' && (
                                    <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                                      <div>Action: <span className="text-emerald-400">{res.execution.graphAction || 'describeEntity'}</span></div>
                                      <div>Entities: <span className="text-indigo-300">{JSON.stringify(res.execution.graphEntities || [])}</span></div>
                                      {res.execution.graphTarget && <div>Target Label: <span className="text-purple-300">{res.execution.graphTarget}</span></div>}
                                    </div>
                                  )}

                                  {tool === 'vector_search' && res.execution.vectorQuery && (
                                    <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono">
                                      Sub-Question Embedded: <span className="text-purple-300">"{res.execution.vectorQuery}"</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Step 3: Synthesis */}
                            <div className="relative flex items-start space-x-4">
                              <div className="absolute -left-6 p-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                              </div>
                              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs w-full">
                                <span className="font-bold text-slate-400 uppercase text-[10px] block">Final Step: Answer Synthesized</span>
                                <span className="text-slate-300">Evidence assembled and passed to reasoning LLM for natural language response.</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: Semantic Vector Sources */}
                      {activeTab === 'sources' && res.sources && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <h5 className="font-semibold text-slate-200 text-xs flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-purple-400" />
                              <span>Qdrant Hybrid Vector Documents ({res.sources.length})</span>
                            </h5>
                            <span className="text-[10px] text-slate-500">Collection: cortex_events</span>
                          </div>

                          <div className="space-y-3">
                            {res.sources.map((src, i) => (
                              <div key={i} className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 text-xs space-y-2">
                                <div className="flex items-center justify-between text-slate-400">
                                  <span className="font-bold text-purple-300 uppercase bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                    {src.provider || 'GitHub'}
                                  </span>
                                  <span className="text-[11px]">{src.author || 'Author'} • {src.timestamp || ''}</span>
                                </div>
                                <p className="text-slate-200 leading-relaxed font-sans">{src.summary || src.text}</p>
                                {src.eventId && (
                                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono pt-1">
                                    <span>Event ID: {src.eventId}</span>
                                    {src.channel && <span>• Channel: #{src.channel}</span>}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TAB 4: Neo4j Graph Subgraph */}
                      {activeTab === 'graph' && res.graphContext && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <h5 className="font-semibold text-slate-200 text-xs flex items-center space-x-2">
                              <Network className="h-4 w-4 text-emerald-400" />
                              <span>Neo4j Graph Database Subgraph & Relationships</span>
                            </h5>
                          </div>
                          <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-emerald-400 font-mono overflow-x-auto">
                            {JSON.stringify(res.graphContext, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Active Agent Loading Animation State */}
        {loading && (
          <div className="flex flex-col items-start max-w-2xl mr-auto space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold">
              <div className="p-1 rounded-full bg-indigo-500/20 border border-indigo-500/40">
                <Bot className="h-4 w-4 animate-bounce" />
              </div>
              <span>Cortex Multi-Tool Agent Execution Active</span>
            </div>

            <div className="bg-[#0b1120] p-4 rounded-2xl rounded-tl-none flex items-center space-x-3 text-xs text-slate-300 border border-indigo-500/30 shadow-xl">
              <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
              <span className="font-medium text-slate-200">{loadingStep || 'Processing multi-tool agent graph...'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Docked Clean Input Bar */}
      <div className="p-4 bg-[#060a12] border-t border-slate-800/80 shadow-2xl">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-4xl mx-auto flex items-end space-x-3"
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask anything (e.g. 'what breaks if Vikram Patel leaves', 'what is Sarah Chen\'s email and knowledge risk')..."
              disabled={loading}
              rows={1}
              style={{ height: '44px', maxHeight: '120px' }}
              className="w-full bg-[#0b1120] border border-slate-800/90 focus:border-indigo-500/80 rounded-xl pl-4 pr-14 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner resize-none overflow-y-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-800"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 text-xs font-medium bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 disabled:opacity-50 transition-all flex items-center space-x-2 shrink-0 h-[44px]"
          >
            <Send className="h-4 w-4" />
            <span>Send Query</span>
          </button>
        </form>
      </div>
    </div>
  );
};