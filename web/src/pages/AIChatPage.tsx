import React, { useState, useRef, useEffect } from 'react';
import { sendChatQuery, type ChatQueryResponse } from '../lib/api';
import { 
  Send, 
  Sparkles, 
  ChevronDown, 
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
  UserCheck
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
      text: 'Hello! I am Cortex, your engineering knowledge intelligence assistant. Ask me about departure impact, knowledge loss risk, commit histories, architectural choices (e.g., why Valkey replaced Redis), or email lookups.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

    setLoadingStep('Planning multi-tool workflow...');
    const stepTimer1 = setTimeout(() => setLoadingStep('Querying Neo4j Graph & Vector Index...'), 2000);
    const stepTimer2 = setTimeout(() => setLoadingStep('Calculating Knowledge Risk & Evidence...'), 5000);
    const stepTimer3 = setTimeout(() => setLoadingStep('Synthesizing structured answer...'), 9000);

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

  const toggleEvidence = (msgId: string) => {
    setExpandedEvidence(prev => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const sampleQueries = [
    'How much Knowledge Loss Will There is arjun kumar leaves how you have calculated that ? what the email of Arjun',
    'why was redis replaced by valkey',
    'what is arjun\'s role and commit count',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-[#090d16]">
      {/* Header Banner */}
      <div className="px-8 py-3 bg-[#0d1322]/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-slate-300 font-medium">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <span>Reasoning Engine: <strong className="text-white">Qwen 3.6 27B + Agentic Multi-Tool Graph Pipeline</strong></span>
        </div>
        <button
          onClick={() => setMessages([messages[0]])}
          className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          const isEvidenceOpen = expandedEvidence[msg.id] !== false; // Open by default if risk result present
          const res = msg.response;
          const kr = res?.knowledgeRiskResult;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-4xl ${isUser ? 'ml-auto' : 'mr-auto'}`}
            >
              {/* Sender Info */}
              <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1 px-1">
                {isUser ? (
                  <>
                    <span>You</span>
                    <User className="h-3.5 w-3.5 text-indigo-400" />
                  </>
                ) : (
                  <>
                    <Bot className="h-3.5 w-3.5 text-purple-400" />
                    <span className="font-semibold text-indigo-300">Cortex Assistant</span>
                  </>
                )}
                <span className="text-[10px] text-slate-500">• {msg.timestamp}</span>
              </div>

              {/* Main Answer Bubble */}
              <div
                className={`p-5 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/20'
                    : 'bg-[#0f172a] border border-slate-800 text-slate-100 rounded-tl-none shadow-xl'
                }`}
              >
                {msg.text}
              </div>

              {/* Dedicated Knowledge Loss Risk Visual Breakdown Card */}
              {!isUser && kr && (
                <div className="mt-4 w-full bg-[#0d1322] border border-indigo-500/30 rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <ShieldAlert className="h-6 w-6 text-rose-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">Knowledge Loss Risk Model — {kr.person}</h4>
                        <p className="text-xs text-slate-400">Calculated Departure Impact Breakdown & Evidence</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-extrabold text-rose-400 block">
                        {Math.round(kr.totalRisk * 100)}%
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Risk Score</span>
                    </div>
                  </div>

                  {/* Risk Components Percentage Bars Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Ownership Concentration', val: Math.round(kr.breakdown.ownership * 10), icon: GitCommit, desc: `${kr.details.ownedItems} owned items` },
                      { label: 'Recent Activity', val: Math.round(kr.breakdown.activity * 10), icon: Clock, desc: `${kr.details.recentActivity} 30d events` },
                      { label: 'Expertise / Unique Skills', val: Math.round(kr.breakdown.expertise * 10), icon: Award, desc: `${kr.details.uniqueSkills} unique skills` },
                      { label: 'Critical Dependencies', val: Math.round(kr.breakdown.dependency * 10), icon: Layers, desc: `${kr.details.criticalDependencies} dependents` },
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-200 flex items-center gap-1.5">
                            <item.icon className="h-3.5 w-3.5 text-indigo-400" />
                            {item.label}
                          </span>
                          <span className="font-bold text-indigo-300">{item.val}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(4, item.val)}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-slate-500 block">{item.desc}</span>
                      </div>
                    ))}
                  </div>

                  {/* Concrete Evidence List */}
                  {kr.evidence.expertise && kr.evidence.expertise.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Concrete Work Items & Single-Contributor Evidence</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {kr.evidence.expertise.map((ev, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800/80 text-xs flex items-center justify-between">
                            <div>
                              <span className="text-indigo-300 font-semibold">{ev.name}</span>
                              <span className="text-[10px] text-slate-500 block">{ev.reason}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                              {ev.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Evidence Chain Accordion */}
              {!isUser && res && (
                <div className="mt-3 w-full bg-[#0d1322] border border-slate-800/80 rounded-xl overflow-hidden text-xs">
                  <button
                    onClick={() => toggleEvidence(msg.id)}
                    className="w-full px-4 py-2.5 bg-slate-900/90 hover:bg-slate-900 flex items-center justify-between text-slate-300 font-medium transition-all"
                  >
                    <div className="flex items-center space-x-2">
                      <Terminal className="h-4 w-4 text-indigo-400" />
                      <span>Evidence Chain & Agent Tool Telemetry ({res.execution?.tools?.length || 0} tools fired)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {res.execution?.tools?.map((tool, i) => (
                        <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {tool}
                        </span>
                      ))}
                      {isEvidenceOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    </div>
                  </button>

                  {isEvidenceOpen && (
                    <div className="p-4 space-y-4 bg-slate-950/90 border-t border-slate-800">
                      {/* Vector Documents */}
                      {res.sources && res.sources.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="font-semibold text-slate-300 flex items-center space-x-1.5 text-[11px] uppercase tracking-wider">
                            <FileText className="h-3.5 w-3.5 text-purple-400" />
                            <span>Semantic Vector Documents ({res.sources.length})</span>
                          </h5>
                          <div className="space-y-2">
                            {res.sources.map((src, i) => (
                              <div key={i} className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px] space-y-1.5">
                                <div className="flex items-center justify-between text-slate-400">
                                  <span className="font-bold text-indigo-300 uppercase">{src.provider || 'GitHub'}</span>
                                  <span>{src.author || 'Author'} • {src.timestamp || ''}</span>
                                </div>
                                <p className="text-slate-200">{src.summary || src.text}</p>
                                {src.eventId && (
                                  <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-mono pt-1">
                                    <span>Event ID: {src.eventId}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Graph Context */}
                      {res.graphContext && res.graphContext.length > 0 && (
                        <div className="space-y-1.5">
                          <h5 className="font-semibold text-slate-300 flex items-center space-x-1.5 text-[11px] uppercase tracking-wider">
                            <Network className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Neo4j Subgraph & Entity Properties</span>
                          </h5>
                          <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-emerald-300 font-mono overflow-x-auto">
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

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-start max-w-2xl mr-auto space-y-2">
            <div className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold">
              <Bot className="h-4 w-4 animate-bounce" />
              <span>Cortex Agent Execution Active...</span>
            </div>
            <div className="glass-card p-4 rounded-2xl rounded-tl-none flex items-center space-x-3 text-xs text-slate-300 border border-indigo-500/30">
              <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
              <span>{loadingStep || 'Processing multi-tool agent graph...'}</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-8 py-2.5 bg-[#0d1322] border-t border-slate-900 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] text-slate-500 font-semibold shrink-0">Sample Queries:</span>
        {sampleQueries.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="text-xs bg-slate-900 hover:bg-indigo-950 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-200 border border-slate-800 px-3 py-1 rounded-full whitespace-nowrap transition-all"
          >
            "{q}"
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-6 bg-[#090d16] border-t border-slate-800/80">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-3"
        >
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ask anything (e.g. 'what is the knowledge risk for arjun kumar', 'why was redis replaced')..."
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
