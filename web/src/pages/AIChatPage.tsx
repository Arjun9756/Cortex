import React, { useState, useRef, useEffect } from 'react';
import { streamChatQuery, type ChatQueryResponse } from '../lib/api';
import {
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
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
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Download,
  CornerDownLeft
} from 'lucide-react';

interface AgentStep {
  step: string;
  timestamp: string;
  node?: string;
  done: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  response?: ChatQueryResponse;
  timestamp: string;
  isStreaming?: boolean;
  agentSteps?: AgentStep[];
  error?: {
    message: string;
    retryQuery?: string;
  };
}

interface AIChatPageProps {
  initialQuery?: string;
  onSyncUpdated?: (date: Date) => void;
}

const STORAGE_KEY = 'cortex_chat_history_v2';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  sender: 'bot',
  text: 'Hello! I am Cortex, your enterprise engineering knowledge intelligence assistant. I am grounded directly in your Neo4j knowledge graph, Git commit history, Slack channels, and Jira issues.\n\nAsk me about key-person departure risks, bus factor SPOFs, repository owners, technology expertise, or architectural decisions.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

// Subcomponent: Syntax-Highlighted Code Block with Copy Button
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'text' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-slate-800 bg-[#080d1a] overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1527] border-b border-slate-800 text-xs font-mono text-slate-400">
        <span className="flex items-center space-x-2 text-indigo-300">
          <Terminal className="h-3.5 w-3.5" />
          <span className="uppercase text-[11px] font-semibold">{language}</span>
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2 py-1 rounded transition-colors text-[11px] cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 font-sans font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="font-sans font-medium">Copy Code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
        <code>{code}</code>
      </pre>
    </div>
  );
};

function renderInlineFormattedText(text: string) {
  // Match bold, code, percentage values, links, and email-like patterns
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\)|\b\d+\.?\d*%\b)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={pIdx} className="font-extrabold text-white bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={pIdx} className="px-1.5 py-0.5 rounded-md bg-[#101728] border border-slate-800 text-indigo-300 font-mono text-xs font-semibold">
          {part.slice(1, -1)}
        </code>
      );
    }
    // Markdown link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={pIdx}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 inline-flex items-center gap-0.5 font-medium transition-colors"
        >
          <span>{linkMatch[1]}</span>
          <ExternalLink className="h-2.5 w-2.5 inline shrink-0" />
        </a>
      );
    }
    // Auto-highlight percentage values
    if (/^\d+\.?\d*%$/.test(part)) {
      const numVal = parseFloat(part);
      const colorClass = numVal >= 70 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        : numVal >= 40 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      return (
        <span key={pIdx} className={`font-bold px-1.5 py-0.5 rounded-md border text-xs ${colorClass}`}>
          {part}
        </span>
      );
    }
    return <span key={pIdx}>{part}</span>;
  });
}

function renderFormattedMessageContent(text: string, isStreaming?: boolean) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Detect Code Block (```lang ... ```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'code';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      elements.push(
        <CodeBlock key={`code-${i}`} code={codeLines.join('\n')} language={lang} />
      );
      continue;
    }

    // 2. Detect Markdown Table block (lines starting with '|')
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      const dataRows = tableLines.filter(row => !row.match(/^\|[\s\-:|]+\|$/));
      if (dataRows.length > 0) {
        const headerCells = dataRows[0].split('|').slice(1, -1).map(c => c.trim());
        const bodyRows = dataRows.slice(1).map(row => row.split('|').slice(1, -1).map(c => c.trim()));

        elements.push(
          <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-xl border border-slate-700/60 bg-[#070c18] shadow-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gradient-to-r from-[#0f172a] to-[#131b2e] text-indigo-300 font-mono uppercase tracking-wider text-[10px] border-b-2 border-indigo-500/20">
                <tr>
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="px-4 py-3 font-bold border-r border-slate-800/40 last:border-0 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className={`border-b border-slate-800/30 transition-colors hover:bg-indigo-500/5 ${rIdx % 2 === 0 ? 'bg-slate-950/30' : 'bg-slate-900/20'}`}>
                    {row.map((cell, cIdx) => {
                      const isPercent = /^\d+\.?\d*%$/.test(cell.replace(/[*`]/g, '').trim());
                      const isNumber = /^\d+\.?\d*$/.test(cell.replace(/[*`]/g, '').trim());
                      return (
                        <td key={cIdx} className={`px-4 py-2.5 border-r border-slate-800/20 last:border-0 ${isPercent || isNumber ? 'font-mono font-semibold' : 'font-sans'}`}>
                          {renderInlineFormattedText(cell)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 3. Handle horizontal rule (--- or ___ or ***)
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      elements.push(
        <div key={`hr-${i}`} className="my-4 border-t border-slate-700/50 relative">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 px-3 bg-[#0b1120]">
            <span className="text-slate-600 text-xs">• • •</span>
          </div>
        </div>
      );
      i++;
      continue;
    }

    // 4. Handle empty line
    if (!trimmed) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // 5. Handle Header lines (# Header, ## Subheader)
    if (trimmed.startsWith('#')) {
      const hashCount = (trimmed.match(/^#+/) || [''])[0].length;
      const headerText = trimmed.replace(/^#+\s*/, '');

      if (hashCount === 1) {
        elements.push(
          <h3 key={`header-${i}`} className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300 uppercase font-mono tracking-wider pt-4 pb-2 border-b border-indigo-500/20 flex items-center space-x-2">
            <span className="w-1 h-5 bg-indigo-500 rounded-full" />
            <span>{headerText}</span>
          </h3>
        );
      } else if (hashCount === 2) {
        elements.push(
          <h4 key={`header-${i}`} className="text-sm font-extrabold text-indigo-300 uppercase font-mono tracking-wider pt-3 pb-1.5 border-b border-slate-800/60 flex items-center space-x-2">
            <span className="w-0.5 h-4 bg-indigo-500/60 rounded-full" />
            <span>{headerText}</span>
          </h4>
        );
      } else {
        elements.push(
          <h5 key={`header-${i}`} className="text-xs font-bold text-slate-300 uppercase tracking-wider pt-2 pb-1 flex items-center space-x-1.5">
            <span className="text-indigo-400">›</span>
            <span>{headerText}</span>
          </h5>
        );
      }
      i++;
      continue;
    }

    // 6. Handle blockquotes / callouts (> text)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      elements.push(
        <div key={`quote-${i}`} className="my-3 p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border-l-4 border-indigo-500 text-indigo-200 text-xs font-semibold backdrop-blur-sm shadow-inner space-y-1">
          {quoteLines.map((ql, qi) => (
            <div key={qi}>{renderInlineFormattedText(ql)}</div>
          ))}
        </div>
      );
      continue;
    }

    // 7. Handle numbered list items (1. item, 2. item)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      const num = numberedMatch[1];
      const itemText = numberedMatch[2];
      elements.push(
        <div key={`numbered-${i}`} className="pl-2 my-1 flex items-start gap-3">
          <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
            {num}
          </span>
          <div className="flex-1 text-slate-200">{renderInlineFormattedText(itemText)}</div>
        </div>
      );
      i++;
      continue;
    }

    // 8. Handle key: value pairs (like "Risk Score: 45%")
    const kvMatch = trimmed.match(/^([A-Z][A-Za-z\s&]+):\s+(.+)/);
    if (kvMatch && !trimmed.startsWith('*') && !trimmed.startsWith('-') && kvMatch[1].length < 40) {
      const key = kvMatch[1].trim();
      const val = kvMatch[2].trim();
      elements.push(
        <div key={`kv-${i}`} className="my-1 flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium whitespace-nowrap">{key}:</span>
          <span className="font-semibold text-white">{renderInlineFormattedText(val)}</span>
        </div>
      );
      i++;
      continue;
    }

    // 9. Handle bullet points (- item or * item)
    const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ');
    const lineText = isBullet ? trimmed.slice(2) : trimmed;

    if (isBullet) {
      const bulletKV = lineText.match(/^\*\*([^*]+)\*\*\s*[:–-]\s*(.*)/);
      if (bulletKV) {
        elements.push(
          <div key={`bkv-${i}`} className="pl-4 my-1.5 flex items-start gap-2.5 group">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0 group-hover:bg-indigo-300 transition-colors" />
            <div>
              <span className="font-bold text-white">{bulletKV[1]}</span>
              <span className="text-slate-300 ml-1.5">{renderInlineFormattedText(bulletKV[2])}</span>
            </div>
          </div>
        );
      } else {
        elements.push(
          <div key={`line-${i}`} className="pl-4 relative my-1 flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/70 mt-1.5 shrink-0" />
            <span className="text-slate-200">{renderInlineFormattedText(lineText)}</span>
          </div>
        );
      }
    } else {
      elements.push(
        <div key={`line-${i}`} className="my-0.5">
          {renderInlineFormattedText(lineText)}
        </div>
      );
    }
    i++;
  }

  // If currently streaming, append glowing typing cursor at the end
  if (isStreaming) {
    elements.push(
      <span
        key="streaming-cursor"
        className="inline-block w-2 h-4 ml-1.5 bg-indigo-400 animate-pulse rounded-sm align-middle shadow-md shadow-indigo-500/50"
      />
    );
  }

  return elements;
}

export const AIChatPage: React.FC<AIChatPageProps> = ({ initialQuery, onSyncUpdated }) => {
  const [query, setQuery] = useState<string>(initialQuery || '');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached chat history:', e);
    }
    return [INITIAL_WELCOME_MESSAGE];
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [currentSteps, setCurrentSteps] = useState<AgentStep[]>([]);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, 'risk' | 'chain' | 'sources' | 'graph' | null>>({});
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const lastMsgRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync with localStorage
  useEffect(() => {
    try {
      const cleanMessages = messages.map(m => ({ ...m, isStreaming: false }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanMessages));
    } catch (e) {
      console.warn('Failed to store chat messages:', e);
    }
  }, [messages]);

  // Dynamic textarea height resizing
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const calculatedH = textareaRef.current.scrollHeight;
      const targetH = Math.min(Math.max(calculatedH, 48), 160);
      textareaRef.current.style.height = `${targetH}px`;
      textareaRef.current.style.overflowY = calculatedH > 160 ? 'auto' : 'hidden';
    }
  }, [query]);

  // Smooth auto-scroll during streaming
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, currentSteps, loading]);

  // Auto-send query if passed via initialQuery
  const autoQuerySent = useRef<boolean>(false);
  useEffect(() => {
    if (initialQuery && !autoQuerySent.current) {
      autoQuerySent.current = true;
      handleSend(initialQuery);
    }
  }, [initialQuery]);

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

    const initialStep: AgentStep = {
      step: 'Evaluating dynamic tool selection & decomposed goal plan...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      done: false,
    };
    setCurrentSteps([initialStep]);

    const botMsgId = `bot-${Date.now()}`;
    setStreamingMsgId(botMsgId);
    let accumulatedText = '';

    try {
      await streamChatQuery(
        userMsg.text,
        // onChunk: token-by-token streaming
        (chunkText) => {
          accumulatedText += chunkText;
          setMessages(prev => {
            const exists = prev.some(m => m.id === botMsgId);
            if (exists) {
              return prev.map(m => m.id === botMsgId ? { ...m, text: accumulatedText, isStreaming: true } : m);
            }
            return [
              ...prev,
              {
                id: botMsgId,
                sender: 'bot',
                text: accumulatedText,
                isStreaming: true,
                agentSteps: currentSteps,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
            ];
          });
        },
        // onDone: stream finished with final telemetry payload
        (response) => {
          if (onSyncUpdated) onSyncUpdated(new Date());

          setMessages(prev => {
            const exists = prev.some(m => m.id === botMsgId);
            const finalMsg: ChatMessage = {
              id: botMsgId,
              sender: 'bot',
              text: response.answer || accumulatedText || 'No answer generated.',
              response,
              isStreaming: false,
              agentSteps: currentSteps.map(s => ({ ...s, done: true })),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            if (exists) {
              return prev.map(m => m.id === botMsgId ? finalMsg : m);
            }
            return [...prev, finalMsg];
          });
          setStreamingMsgId(null);
          setLoading(false);
        },
        // onError: graceful failure handling with Retry
        (err) => {
          const errorMsg: ChatMessage = {
            id: `err-${Date.now()}`,
            sender: 'bot',
            text: '',
            error: {
              message: err?.message || 'Intelligence agent execution encountered an unexpected error. Verify that the backend server is reachable on port 3000.',
              retryQuery: userMsg.text,
            },
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages(prev => [...prev.filter(m => m.id !== botMsgId), errorMsg]);
          setStreamingMsgId(null);
          setLoading(false);
        },
        // onStatus: real-time LangGraph multi-step progress
        (stepText) => {
          setCurrentSteps(prev => {
            const updated = prev.map(s => ({ ...s, done: true }));
            return [
              ...updated,
              {
                step: stepText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                done: false,
              }
            ];
          });
        }
      );
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: '',
        error: {
          message: err?.message || 'Intelligence agent execution encountered an unexpected error. Verify that the backend server is reachable on port 3000.',
          retryQuery: userMsg.text,
        },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev.filter(m => m.id !== botMsgId), errorMsg]);
      setStreamingMsgId(null);
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    localStorage.removeItem(STORAGE_KEY);
    setCurrentSteps([]);
    setExpandedDetails({});
  };

  const handleExportTranscript = () => {
    const mdContent = messages.map(m => {
      const role = m.sender === 'user' ? '### 👤 User' : '### 🤖 Cortex Assistant';
      const body = m.error ? `**Error:** ${m.error.message}` : m.text;
      return `${role} (${m.timestamp})\n\n${body}\n\n---\n`;
    }).join('\n');

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cortex-intelligence-transcript-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyTranscript = () => {
    const textTranscript = messages.map(m => {
      const role = m.sender === 'user' ? 'User' : 'Cortex Assistant';
      const body = m.error ? `[Error: ${m.error.message}]` : m.text;
      return `[${m.timestamp}] ${role}:\n${body}\n`;
    }).join('\n---\n\n');

    navigator.clipboard.writeText(textTranscript);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const toggleTab = (msgId: string, tab: 'risk' | 'chain' | 'sources' | 'graph') => {
    setExpandedDetails(prev => ({
      ...prev,
      [msgId]: prev[msgId] === tab ? null : tab,
    }));
  };

  const toggleReasoning = (msgId: string) => {
    setExpandedReasoning(prev => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Enterprise starter prompts organized by knowledge pillar
  const starterPrompts = [
    {
      category: '🚨 Departure & Key-Person Risk',
      title: 'Departure Simulation: Vikram Patel',
      desc: 'What breaks if Vikram Patel leaves',
      badge: 'High Impact',
    },
    {
      category: '🛡️ Bus Factor & SPOFs',
      title: 'Identify Single Points of Failure',
      desc: 'Which repository has higher risk',
      badge: 'Audit',
    },
    {
      category: '🏗️ Architecture & Ownership',
      title: 'Codebase Ownership & Stack',
      desc: 'Which repos does Vikram Patel work in',
      badge: 'Ownership',
    },
    {
      category: '👥 People & Team Verification',
      title: 'Maintainer Profile & Verified Role',
      desc: 'What is the email and role of Sarah Chen',
      badge: 'Identity',
    },
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
      {/* Top Action Utility Bar */}
      <div className="absolute top-3.5 right-6 z-30 flex items-center space-x-2">
        <button
          onClick={handleExportTranscript}
          className="text-xs text-slate-400 hover:text-white bg-[#090f1d]/90 hover:bg-slate-800 border border-slate-800/80 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-md backdrop-blur-md cursor-pointer"
          title="Download full chat session transcript as Markdown"
        >
          <Download className="h-3.5 w-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Export .md</span>
        </button>

        <button
          onClick={handleCopyTranscript}
          className="text-xs text-slate-400 hover:text-white bg-[#090f1d]/90 hover:bg-slate-800 border border-slate-800/80 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-md backdrop-blur-md cursor-pointer"
          title="Copy session transcript to clipboard"
        >
          {copiedTranscript ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copy Text</span>
            </>
          )}
        </button>

        <button
          onClick={handleClearChat}
          className="text-xs text-slate-400 hover:text-rose-300 bg-[#090f1d]/90 hover:bg-rose-950/40 border border-slate-800/80 hover:border-rose-500/40 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-md backdrop-blur-md cursor-pointer"
          title="Clear all messages in this conversation"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* Main Messages Feed */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-10 pt-12 space-y-6">
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          const isLastMsg = index === messages.length - 1;
          const res = msg.response;
          const krRaw = res?.knowledgeRiskResult;
          const krList = Array.isArray(krRaw) ? krRaw : (krRaw ? [krRaw] : []);
          const activeTab = expandedDetails[msg.id] || null;
          const reasoningOpen = expandedReasoning[msg.id] !== undefined ? expandedReasoning[msg.id] : (msg.isStreaming || false);
          const hasReasoningSteps = (msg.agentSteps && msg.agentSteps.length > 0);

          return (
            <div
              key={msg.id}
              ref={isLastMsg ? lastMsgRef : null}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-4xl ${isUser ? 'ml-auto' : 'mr-auto'} w-full scroll-mt-6`}
            >
              {/* Message Header Tag */}
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
                      Cortex Intelligence Agent
                    </span>
                    {msg.isStreaming && (
                      <span className="flex items-center space-x-1.5 text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/30 animate-pulse">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin text-indigo-400" />
                        <span>streaming answer</span>
                      </span>
                    )}
                  </>
                )}
                <span className="text-[10px] text-slate-500">• {msg.timestamp}</span>
              </div>

              {/* Collapsible Agent Reasoning Steps (Bot Messages) */}
              {!isUser && hasReasoningSteps && (
                <div className="mb-2 w-full max-w-2xl">
                  <button
                    onClick={() => toggleReasoning(msg.id)}
                    className="flex items-center space-x-2 text-xs text-indigo-400 hover:text-indigo-300 bg-[#090f1d] hover:bg-slate-900 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    <span>Agent Reasoning Trace ({msg.agentSteps?.length} steps)</span>
                    {msg.isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />}
                    {reasoningOpen ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                  </button>

                  {reasoningOpen && (
                    <div className="mt-2 p-3.5 bg-[#090f1d] border border-indigo-500/20 rounded-xl space-y-2 text-xs animate-in fade-in duration-200">
                      {msg.agentSteps?.map((step, sIdx) => (
                        <div key={sIdx} className="flex items-center space-x-2.5 text-slate-300">
                          {step.done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin shrink-0" />
                          )}
                          <span className={`font-mono text-xs ${step.done ? 'text-slate-300' : 'text-indigo-200 font-semibold'}`}>
                            {step.step}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-auto font-mono">{step.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message Bubble or Error Card */}
              {msg.error ? (
                <div className="w-full bg-[#18090f] border border-rose-500/40 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Agent Execution Error</h4>
                        <p className="text-xs text-rose-300/90 mt-0.5">{msg.error.message}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                      Failed
                    </span>
                  </div>

                  {msg.error.retryQuery && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/20">
                      <button
                        onClick={() => handleSend(msg.error!.retryQuery!)}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-500/25 hover:bg-rose-500/35 border border-rose-500/40 text-xs font-semibold text-rose-100 flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Retry Question</span>
                      </button>

                      <button
                        onClick={() => {
                          setQuery(msg.error!.retryQuery!);
                          textareaRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 flex items-center space-x-1.5 transition-all cursor-pointer"
                      >
                        <CornerDownLeft className="h-3.5 w-3.5" />
                        <span>Edit in Input</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`p-5 rounded-2xl text-sm leading-relaxed ${isUser
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-tr-none shadow-lg shadow-indigo-600/20 border border-indigo-400/20'
                      : 'bg-[#0b1120] border border-slate-800 text-slate-100 rounded-tl-none shadow-xl backdrop-blur-md'
                    }`}
                >
                  <div className="space-y-2">
                    {msg.text && msg.text.trim() ? (
                      renderFormattedMessageContent(msg.text, msg.isStreaming)
                    ) : (
                      <div className="flex items-center space-x-3 text-indigo-300 text-xs py-1">
                        <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" />
                        <span>Synthesizing verified response from graph evidence...</span>
                        <span className="flex space-x-1.5 ml-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Grounded Source Citations Pill Bar (Bot Messages with grounded sources) */}
              {!isUser && res && ((res.sources && res.sources.length > 0) || (res.structuredEvidence && res.structuredEvidence.length > 0)) && (
                <div className="mt-3 w-full bg-[#080d1a] border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Grounded Knowledge Sources & Evidence</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {res.sources?.length || res.structuredEvidence?.length || 0} Grounded Artifacts
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {res.sources?.slice(0, 4).map((src: any, sIdx: number) => {
                      const provider = src.provider?.toLowerCase() || 'github';
                      return (
                        <div
                          key={sIdx}
                          onClick={() => toggleTab(msg.id, 'sources')}
                          className="flex items-center space-x-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer group"
                        >
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                            provider === 'github' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : provider === 'slack' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          }`}>
                            {provider}
                          </span>
                          <span className="text-slate-300 group-hover:text-white font-mono text-[11px] truncate max-w-[200px]">
                            {src.eventId || src.repository || src.channel ? `#${src.channel || src.repository || src.eventId}` : (src.summary || 'Citation')}
                          </span>
                          <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-indigo-400" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Welcome State Cards (Shown ONLY when chat just started) */}
              {!isUser && msg.id === 'welcome' && messages.length === 1 && (
                <div className="mt-6 w-full max-w-3xl space-y-4 animate-in fade-in duration-500">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Suggested Starter Intelligence Prompts:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {starterPrompts.map((p, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleSend(p.desc)}
                        className="p-4 bg-[#090f1d] hover:bg-[#0e172c] border border-slate-800/80 hover:border-indigo-500/40 rounded-xl text-left transition-all duration-200 group flex items-start justify-between shadow-sm cursor-pointer"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 block">{p.title}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              {p.badge}
                            </span>
                          </div>
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
                          className={`px-4 py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${activeTab === 'risk'
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
                        className={`px-4 py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${activeTab === 'chain'
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
                          className={`px-4 py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${activeTab === 'sources'
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
                          className={`px-4 py-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${activeTab === 'graph'
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
                      <span className="hidden sm:inline">{activeTab ? 'Click to collapse' : 'Click to inspect telemetry'}</span>
                      {activeTab ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-indigo-400" />}
                    </div>
                  </div>

                  {/* Tab Body Contents */}
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

                            const radius = 42;
                            const circumference = 2 * Math.PI * radius;
                            const strokeDashoffset = circumference - (totalPct / 100) * circumference;

                            return (
                              <div
                                key={krIdx}
                                className="bg-[#0b1222] border border-slate-800/80 rounded-xl p-6 space-y-6 shadow-xl"
                              >
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
                                  {res.execution?.tools?.length === 0
                                    ? 'Direct LLM Knowledge Synthesis'
                                    : res.execution?.tools?.length === 1
                                    ? `LLM Agent Single-Tool Execution (${res.execution.tools[0]})`
                                    : 'LLM Agent Multi-Tool Decomposed Execution Chain'}
                                </p>
                              </div>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {res.execution?.tools?.length || 0} Tool Call{res.execution?.tools?.length !== 1 ? 's' : ''} Executed
                            </span>
                          </div>

                          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                            {/* Step 1: Query Input */}
                            <div className="relative flex items-start space-x-4">
                              <div className="absolute -left-6 p-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                                <Search className="h-3 w-3" />
                              </div>
                              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs w-full">
                                <span className="font-bold text-slate-400 uppercase text-[10px] block">Step 1: User Query Received</span>
                                <span className="text-slate-200 font-mono">
                                  "{res.query || res.execution?.query || messages.slice(0, messages.findIndex(m => m.id === msg.id)).reverse().find(m => m.sender === 'user')?.text || 'Query'}"
                                </span>
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
                                    <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                                      <Check className="h-3 w-3" />
                                      <span>COMPLETED</span>
                                    </span>
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
                                <span className="text-slate-300">Grounded evidence consolidated from graph and vector collections and synthesized into enterprise report.</span>
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
                                    {src.repository && <span>• Repo: {src.repository}</span>}
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

        {/* Loading / Agent Active Progress Indicator (shown whenever waiting for first tokens) */}
        {loading && (!streamingMsgId || !messages.some(m => m.id === streamingMsgId && m.text && m.text.trim().length > 0)) && (
          <div className="flex flex-col items-start max-w-2xl mr-auto space-y-3 animate-in fade-in duration-300 w-full">
            <div className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold px-1">
              <div className="p-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Bot className="h-4 w-4 animate-bounce" />
              </div>
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-300">
                Cortex Intelligence Agent
              </span>
              <span className="flex items-center space-x-1.5 text-[11px] text-indigo-400 font-mono bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span>Reasoning across knowledge graph...</span>
              </span>
            </div>

            <div className="bg-[#0b1120] p-5 rounded-2xl rounded-tl-none space-y-3.5 text-xs text-slate-300 border border-indigo-500/30 shadow-2xl backdrop-blur-md w-full">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-300">
                  <Sparkles className="h-4 w-4 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>Multi-Agent LangGraph Pipeline Active</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>

              <div className="space-y-2">
                {currentSteps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-center space-x-2.5">
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin shrink-0" />
                    )}
                    <span className={`font-mono ${step.done ? 'text-slate-400' : 'text-indigo-200 font-semibold'}`}>
                      {step.step}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-auto font-mono">{step.timestamp}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 space-y-2 border-t border-slate-800/60">
                <div className="h-3 bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-indigo-500/20 rounded-full animate-pulse w-3/4" />
                <div className="h-3 bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-indigo-500/15 rounded-full animate-pulse w-5/6" style={{ animationDelay: '200ms' }} />
                <div className="h-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 rounded-full animate-pulse w-1/2" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Docked Multi-Line Input Bar */}
      <div className="p-4 bg-[#060a12] border-t border-slate-800/80 shadow-2xl">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-4xl mx-auto flex flex-col space-y-2"
        >
          <div className="flex items-end space-x-3">
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
                placeholder="Write a message..."
                disabled={loading}
                rows={1}
                style={{ height: '48px', minHeight: '48px', maxHeight: '160px' }}
                className={`w-full bg-[#0b1120] border border-slate-800/90 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 rounded-xl pl-4 ${query ? 'pr-16' : 'pr-4'} py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner resize-none leading-relaxed overflow-hidden scrollbar-thin scrollbar-thumb-slate-800`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 text-xs font-medium bg-slate-900/80 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-800 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 disabled:opacity-50 transition-all flex items-center space-x-2 shrink-0 h-[48px] cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-200" />
                  <span>Reasoning...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};