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
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-md border border-[var(--border-subtle)] bg-[var(--bg-app)]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-mono uppercase tracking-wider text-[10px] border-b border-[var(--border-subtle)]">
                <tr>
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="px-3.5 py-2.5 font-semibold border-r border-[var(--border-subtle)] last:border-0 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[var(--text-primary)]">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-[var(--border-subtle)] last:border-0 transition-colors hover:bg-[var(--bg-elevated)]">
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
          <h3 key={`header-${i}`} className="text-sm font-bold text-[var(--text-primary)] tracking-tight pt-3.5 pb-1.5 border-b border-[var(--border-subtle)] flex items-center space-x-2">
            <span className="w-1 h-4 bg-indigo-500 rounded-full" />
            <span>{headerText}</span>
          </h3>
        );
      } else if (hashCount === 2) {
        elements.push(
          <h4 key={`header-${i}`} className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider pt-2.5 pb-1 flex items-center space-x-2">
            <span className="w-0.5 h-3 bg-indigo-500/60 rounded-full" />
            <span>{headerText}</span>
          </h4>
        );
      } else {
        elements.push(
          <h5 key={`header-${i}`} className="text-xs font-semibold text-[var(--text-secondary)] tracking-wider pt-2 pb-1 flex items-center space-x-1.5">
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
        <div key={`quote-${i}`} className="my-2.5 p-3.5 rounded-lg bg-[var(--bg-subtle)] border-l-2 border-indigo-500 text-[var(--text-secondary)] text-xs space-y-1">
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
    <div className="relative flex flex-col h-[calc(100vh-65px)] bg-[var(--bg-app)] font-sans antialiased text-[var(--text-primary)]">
      {/* Top Action Utility Bar */}
      <div className="absolute top-3.5 right-6 z-30 flex items-center space-x-2">
        <button
          onClick={handleExportTranscript}
          className="text-xs text-[var(--text-secondary)] hover:text-white bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-strong)] px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
          title="Download full chat session transcript as Markdown"
        >
          <Download className="h-3.5 w-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Export .md</span>
        </button>

        <button
          onClick={handleCopyTranscript}
          className="text-xs text-[var(--text-secondary)] hover:text-white bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-strong)] px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
          title="Copy session transcript to clipboard"
        >
          {copiedTranscript ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
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
          className="text-xs text-[var(--text-secondary)] hover:text-rose-300 bg-[var(--bg-panel)] hover:bg-rose-950/30 border border-[var(--border-strong)] hover:border-rose-500/40 px-2.5 py-1 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
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
              <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)] mb-1.5 px-1">
                {isUser ? (
                  <>
                    <span className="font-semibold text-[var(--text-secondary)]">You</span>
                    <div className="h-5 w-5 rounded bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] flex items-center justify-center font-semibold text-[10px]">
                      U
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-5 w-5 rounded bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-indigo-400 flex items-center justify-center">
                      <Bot className="h-3 w-3" />
                    </div>
                    <span className="font-semibold text-xs text-[var(--text-primary)]">
                      Cortex Intelligence Agent
                    </span>
                    {msg.isStreaming && (
                      <span className="flex items-center space-x-1.5 text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin text-indigo-400" />
                        <span>streaming</span>
                      </span>
                    )}
                  </>
                )}
                <span className="text-[10px] text-[var(--text-muted)]">&bull; {msg.timestamp}</span>
              </div>

              {/* Collapsible Agent Reasoning Steps (Bot Messages) */}
              {!isUser && hasReasoningSteps && (
                <div className="mb-2 w-full max-w-2xl">
                  <button
                    onClick={() => toggleReasoning(msg.id)}
                    className="flex items-center space-x-2 text-xs text-[var(--text-secondary)] hover:text-white bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Reasoning Trace ({msg.agentSteps?.length} steps)</span>
                    {reasoningOpen ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                  </button>

                  {reasoningOpen && (
                    <div className="mt-2 p-3 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg space-y-1.5 text-xs animate-in fade-in">
                      {msg.agentSteps?.map((step, sIdx) => (
                        <div key={sIdx} className="flex items-center space-x-2 text-[var(--text-secondary)]">
                          {step.done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin shrink-0" />
                          )}
                          <span className={`font-mono text-xs ${step.done ? 'text-[var(--text-secondary)]' : 'text-indigo-300 font-semibold'}`}>
                            {step.step}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] ml-auto font-mono">{step.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message Bubble or Error Card */}
              {msg.error ? (
                <div className="w-full bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text-primary)]">Agent Execution Error</h4>
                        <p className="text-xs text-rose-300/90 mt-0.5">{msg.error.message}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                      Failed
                    </span>
                  </div>

                  {msg.error.retryQuery && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-500/20">
                      <button
                        onClick={() => handleSend(msg.error!.retryQuery!)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-semibold text-rose-100 flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Retry</span>
                      </button>

                      <button
                        onClick={() => {
                          setQuery(msg.error!.retryQuery!);
                          textareaRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-panel)] border border-[var(--border-strong)] text-xs font-medium text-[var(--text-secondary)] flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <CornerDownLeft className="h-3.5 w-3.5" />
                        <span>Edit Query</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`p-4 rounded-xl text-sm leading-relaxed ${isUser
                      ? 'bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded-tr-none shadow-sm max-w-2xl'
                      : 'bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-none shadow-sm w-full'
                    }`}
                >
                  <div className="space-y-2">
                    {msg.text && msg.text.trim() ? (
                      renderFormattedMessageContent(msg.text, msg.isStreaming)
                    ) : (
                      <div className="flex items-center space-x-2 text-indigo-400 text-xs py-1">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Synthesizing response from verified evidence...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Grounded Source Citations Pill Bar (Bot Messages with grounded sources) */}
              {!isUser && res && ((res.sources && res.sources.length > 0) || (res.structuredEvidence && res.structuredEvidence.length > 0)) && (
                <div className="mt-2.5 w-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-semibold text-[var(--text-secondary)]">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Grounded Knowledge Sources</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {res.sources?.length || res.structuredEvidence?.length || 0} Sources
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {res.sources?.slice(0, 4).map((src: any, sIdx: number) => {
                      const provider = src.provider?.toLowerCase() || 'github';
                      return (
                        <div
                          key={sIdx}
                          onClick={() => toggleTab(msg.id, 'sources')}
                          className="flex items-center space-x-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:border-indigo-500/40 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer group"
                        >
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-mono">
                            {provider}
                          </span>
                          <span className="text-[var(--text-secondary)] group-hover:text-white font-mono text-[11px] truncate max-w-[200px]">
                            {src.eventId || src.repository || src.channel ? `#${src.channel || src.repository || src.eventId}` : (src.summary || 'Citation')}
                          </span>
                          <ExternalLink className="h-3 w-3 text-[var(--text-muted)] group-hover:text-indigo-400" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Welcome State Cards (Shown ONLY when chat just started) */}
              {!isUser && msg.id === 'welcome' && messages.length === 1 && (
                <div className="mt-6 w-full max-w-3xl space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center space-x-2 text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--accent-default)]" />
                    <span>Suggested Starter Intelligence Prompts:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {starterPrompts.map((p, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleSend(p.desc)}
                        className="p-3.5 bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-lg text-left transition-colors duration-150 group flex items-start justify-between cursor-pointer"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-indigo-300 block">{p.title}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--accent-default)] border border-[var(--border-subtle)]">
                              {p.badge}
                            </span>
                          </div>
                          <span className="text-xs text-[var(--text-secondary)] block font-mono">"{p.desc}"</span>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--accent-default)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Telemetry & Visual Evidence Component (Bot Responses Only) */}
              {!isUser && res && (
                <div className="mt-3 w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg overflow-hidden animate-in fade-in duration-200">
                  {/* Navigation Tab Bar */}
                  <div className={`flex items-center justify-between bg-[var(--bg-subtle)] px-2 overflow-x-auto ${activeTab ? 'border-b border-[var(--border-subtle)]' : ''}`}>
                    <div className="flex items-center space-x-1">
                      {krList.length > 0 && (
                        <button
                          onClick={() => toggleTab(msg.id, 'risk')}
                          className={`px-3.5 py-2.5 text-xs font-medium flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${activeTab === 'risk'
                              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>Knowledge Risk Model</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {krList.length} Person{krList.length > 1 ? 's' : ''}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleTab(msg.id, 'chain')}
                        className={`px-3.5 py-2.5 text-xs font-medium flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${activeTab === 'chain'
                            ? 'border-[var(--accent-default)] text-[var(--text-primary)] bg-[var(--bg-elevated)]'
                            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                      >
                        <Terminal className="h-3.5 w-3.5" />
                        <span>Execution Chain & Tools</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-mono">
                          {res.execution?.tools?.length || 0} Tools
                        </span>
                      </button>

                      {res.sources && res.sources.length > 0 && (
                        <button
                          onClick={() => toggleTab(msg.id, 'sources')}
                          className={`px-3.5 py-2.5 text-xs font-medium flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${activeTab === 'sources'
                              ? 'border-[var(--accent-default)] text-[var(--text-primary)] bg-[var(--bg-elevated)]'
                              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Vector Sources</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] font-mono">
                            {res.sources.length} Docs
                          </span>
                        </button>
                      )}

                      {res.graphContext && res.graphContext.length > 0 && (
                        <button
                          onClick={() => toggleTab(msg.id, 'graph')}
                          className={`px-3.5 py-2.5 text-xs font-medium flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${activeTab === 'graph'
                              ? 'border-[var(--accent-default)] text-[var(--text-primary)] bg-[var(--bg-elevated)]'
                              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                          <Network className="h-3.5 w-3.5" />
                          <span>Neo4j Graph Context</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] text-[var(--text-muted)] font-mono px-3 shrink-0">
                      <span className="hidden sm:inline">{activeTab ? 'Collapse' : 'Inspect telemetry'}</span>
                      {activeTab ? <ChevronUp className="h-3.5 w-3.5 text-[var(--text-secondary)]" /> : <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />}
                    </div>
                  </div>

                  {/* Tab Body Contents */}
                  {activeTab && (
                    <div className="p-5 border-t border-[var(--border-subtle)] animate-in fade-in duration-150">
                      {/* TAB 1: Animated Knowledge Loss Risk Gauges & Breakdown */}
                      {activeTab === 'risk' && krList.length > 0 && (
                        <div className="space-y-4">
                          {krList.map((kr, krIdx) => {
                            if (!kr || !kr.breakdown) return null;
                            const b = kr.breakdown || {};
                            const details = kr.details || {};
                            const evidence = kr.evidence || {};
                            const totalPct = Math.round((kr.totalRisk ?? 0) * 100);
                            const severity = getSeverityBadge(totalPct);

                            const radius = 40;
                            const circumference = 2 * Math.PI * radius;
                            const strokeDashoffset = circumference - (totalPct / 100) * circumference;

                            return (
                              <div
                                key={krIdx}
                                className="bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg p-5 space-y-5"
                              >
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-5 pb-5 border-b border-[var(--border-subtle)]">
                                  <div className="flex items-center space-x-4">
                                    <div className="relative">
                                      <svg className="w-20 h-20 transform -rotate-90">
                                        <circle
                                          cx="40"
                                          cy="40"
                                          r={radius}
                                          className="text-[var(--border-subtle)]"
                                          strokeWidth="6"
                                          stroke="currentColor"
                                          fill="transparent"
                                        />
                                        <circle
                                          cx="40"
                                          cy="40"
                                          r={radius}
                                          strokeWidth="6"
                                          stroke={severity.stroke}
                                          strokeDasharray={circumference}
                                          strokeDashoffset={strokeDashoffset}
                                          strokeLinecap="round"
                                          fill="transparent"
                                          className="transition-all duration-700 ease-out"
                                        />
                                      </svg>
                                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <span className="text-lg font-bold text-[var(--text-primary)]">{totalPct}%</span>
                                        <span className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">RISK</span>
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <h4 className="font-semibold text-base text-[var(--text-primary)]">{kr.person}</h4>
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${severity.bg}`}>
                                          {severity.label}
                                        </span>
                                      </div>
                                      <p className="text-xs text-[var(--text-secondary)]">
                                        6-Factor Weighted Departure Loss Risk Score & Codebase Evidence
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2.5 text-center w-full sm:w-auto">
                                    <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border-subtle)]">
                                      <span className="text-[11px] text-[var(--text-muted)] block">Owned Items</span>
                                      <span className="text-xs font-semibold text-[var(--text-primary)]">{details.ownedItems ?? 0}</span>
                                    </div>
                                    <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border-subtle)]">
                                      <span className="text-[11px] text-[var(--text-muted)] block">Dependents</span>
                                      <span className="text-xs font-semibold text-[var(--text-primary)]">{details.criticalDependencies ?? 0}</span>
                                    </div>
                                    <div className="p-2 bg-[var(--bg-elevated)] rounded border border-[var(--border-subtle)]">
                                      <span className="text-[11px] text-[var(--text-muted)] block">Sole Skills</span>
                                      <span className="text-xs font-semibold text-[var(--text-primary)]">{details.uniqueSkills ?? 0}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {[
                                    { label: 'Ownership Concentration', val: Math.round((b.ownership ?? 0) * 10), weight: '30%', icon: GitCommit, desc: `${details.ownedItems ?? 0} codebase commits/files owned` },
                                    { label: 'Critical Dependents', val: Math.round((b.dependency ?? 0) * 10), weight: '20%', icon: Layers, desc: `${details.criticalDependencies ?? 0} dependent components` },
                                    { label: 'Activity Staleness Risk', val: Math.round((b.activity ?? 0) * 10), weight: '15%', icon: Clock, desc: `${details.recentActivity ?? 0} events in last 30 days` },
                                    { label: 'Documentation Gaps', val: Math.round((b.documentation ?? 0) * 10), weight: '15%', icon: FileCode, desc: `${details.documentationGaps ?? 0} undocumented items` },
                                    { label: 'Sole-Contributor Expertise', val: Math.round((b.expertise ?? 0) * 10), weight: '10%', icon: Award, desc: `${details.uniqueSkills ?? 0} sole-maintained items` },
                                    { label: 'Assigned Pending Work', val: Math.round((b.pendingWork ?? 0) * 10), weight: '10%', icon: AlertCircle, desc: `${details.assignedWork ?? 0} assigned open issues` },
                                  ].map((item, idx) => (
                                    <div key={idx} className="p-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)] space-y-1.5">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                                          <item.icon className="h-3.5 w-3.5 text-[var(--accent-default)]" />
                                          {item.label}
                                          <span className="text-[10px] text-[var(--text-muted)] font-mono">({item.weight})</span>
                                        </span>
                                        <span className="font-semibold text-[var(--text-primary)] font-mono">{item.val}%</span>
                                      </div>
                                      <div className="w-full bg-[var(--bg-app)] h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className="bg-[var(--accent-default)] h-full rounded-full transition-all duration-500 ease-out"
                                          style={{ width: `${Math.max(2, item.val)}%` }}
                                        />
                                      </div>
                                      <span className="text-[11px] text-[var(--text-muted)] block">{item.desc}</span>
                                    </div>
                                  ))}
                                </div>

                                {evidence.expertise && evidence.expertise.length > 0 && (
                                  <div className="pt-2 space-y-2.5">
                                    <h5 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center space-x-2">
                                      <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                                      <span>Single-Contributor Codebase Evidence</span>
                                    </h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {evidence.expertise.map((ev: any, idx: number) => (
                                        <div key={idx} className="p-2.5 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)] text-xs flex items-center justify-between">
                                          <div>
                                            <span className="text-[var(--text-primary)] font-medium">{ev.name}</span>
                                            <span className="text-[11px] text-[var(--text-muted)] block">{ev.reason}</span>
                                          </div>
                                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0 ml-2 uppercase">
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
                        <div className="space-y-4">
                          <div className="p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-1.5 rounded bg-[var(--bg-elevated)] text-[var(--accent-default)] border border-[var(--border-subtle)]">
                                <Zap className="h-4 w-4" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-[var(--text-primary)] text-xs">Execution Telemetry & Routing Path</h4>
                                <p className="text-[11px] text-[var(--text-muted)]">
                                  {res.execution?.tools?.length === 0
                                    ? 'Direct LLM Knowledge Synthesis'
                                    : res.execution?.tools?.length === 1
                                    ? `LLM Agent Single-Tool Execution (${res.execution.tools[0]})`
                                    : 'LLM Agent Multi-Tool Decomposed Execution Chain'}
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                              {res.execution?.tools?.length || 0} Tool Call{res.execution?.tools?.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-[var(--border-subtle)]">
                            {/* Step 1: Query Input */}
                            <div className="relative flex items-start space-x-3">
                              <div className="absolute -left-6 p-1 rounded-full bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                                <Search className="h-3 w-3" />
                              </div>
                              <div className="p-3 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)] text-xs w-full">
                                <span className="font-semibold text-[var(--text-muted)] uppercase text-[10px] block">Step 1: User Query Received</span>
                                <span className="text-[var(--text-secondary)] font-mono">
                                  "{res.query || res.execution?.query || messages.slice(0, messages.findIndex(m => m.id === msg.id)).reverse().find(m => m.sender === 'user')?.text || 'Query'}"
                                </span>
                              </div>
                            </div>

                            {/* Step 2: Tools Fired */}
                            {res.execution?.tools?.map((tool, idx) => (
                              <div key={idx} className="relative flex items-start space-x-3">
                                <div className="absolute -left-6 p-1 rounded-full bg-[var(--bg-app)] border border-[var(--border-strong)] text-[var(--accent-default)]">
                                  <Cpu className="h-3 w-3" />
                                </div>
                                <div className="p-3 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)] text-xs w-full space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-[var(--text-muted)] uppercase text-[10px]">Step {idx + 2}: Tool Invoked</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${getToolBadgeColor(tool)}`}>
                                        {tool}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                                      <Check className="h-3 w-3" />
                                      <span>COMPLETED</span>
                                    </span>
                                  </div>

                                  {tool === 'graph_search' && (
                                    <div className="text-[11px] text-[var(--text-secondary)] space-y-1 bg-[var(--bg-app)] p-2.5 rounded border border-[var(--border-subtle)] font-mono">
                                      <div>Action: <span className="text-emerald-400">{res.execution.graphAction || 'describeEntity'}</span></div>
                                      <div>Entities: <span className="text-indigo-300">{JSON.stringify(res.execution.graphEntities || [])}</span></div>
                                      {res.execution.graphTarget && <div>Target Label: <span className="text-slate-300">{res.execution.graphTarget}</span></div>}
                                    </div>
                                  )}

                                  {tool === 'vector_search' && res.execution.vectorQuery && (
                                    <div className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg-app)] p-2.5 rounded border border-[var(--border-subtle)] font-mono">
                                      Sub-Question Embedded: <span className="text-indigo-300">"{res.execution.vectorQuery}"</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Step 3: Synthesis */}
                            <div className="relative flex items-start space-x-3">
                              <div className="absolute -left-6 p-1 rounded-full bg-[var(--bg-app)] border border-emerald-500/40 text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                              </div>
                              <div className="p-3 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)] text-xs w-full">
                                <span className="font-semibold text-[var(--text-muted)] uppercase text-[10px] block">Final Step: Answer Synthesized</span>
                                <span className="text-[var(--text-secondary)]">Grounded evidence consolidated from graph and vector collections and synthesized into enterprise report.</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: Semantic Vector Sources */}
                      {activeTab === 'sources' && res.sources && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                            <h5 className="font-semibold text-[var(--text-secondary)] text-xs flex items-center space-x-2">
                              <FileText className="h-3.5 w-3.5 text-[var(--accent-default)]" />
                              <span>Qdrant Hybrid Vector Documents ({res.sources.length})</span>
                            </h5>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">Collection: cortex_events</span>
                          </div>

                          <div className="space-y-2">
                            {res.sources.map((src, i) => (
                              <div key={i} className="p-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)] text-xs space-y-1.5">
                                <div className="flex items-center justify-between text-[var(--text-muted)]">
                                  <span className="font-mono text-[10px] font-semibold uppercase bg-[var(--bg-subtle)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                                    {src.provider || 'GitHub'}
                                  </span>
                                  <span className="text-[11px] font-mono">{src.author || 'Author'} • {src.timestamp || ''}</span>
                                </div>
                                <p className="text-[var(--text-secondary)] leading-relaxed font-sans">{src.summary || src.text}</p>
                                {src.eventId && (
                                  <div className="flex items-center space-x-2 text-[10px] text-[var(--text-muted)] font-mono pt-0.5">
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
                          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                            <h5 className="font-semibold text-[var(--text-secondary)] text-xs flex items-center space-x-2">
                              <Network className="h-3.5 w-3.5 text-[var(--accent-default)]" />
                              <span>Neo4j Graph Database Subgraph & Relationships</span>
                            </h5>
                          </div>
                          <pre className="p-3.5 bg-[var(--bg-app)] rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-mono overflow-x-auto">
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
          <div className="flex flex-col items-start max-w-2xl mr-auto space-y-2.5 animate-in fade-in duration-200 w-full">
            <div className="flex items-center space-x-2 text-xs text-[var(--text-secondary)] font-medium px-1">
              <div className="p-1 rounded bg-[var(--bg-elevated)] text-[var(--accent-default)] border border-[var(--border-subtle)]">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-[var(--text-primary)]">
                Cortex Intelligence Agent
              </span>
              <span className="flex items-center space-x-1.5 text-[11px] text-[var(--text-muted)] font-mono bg-[var(--bg-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent-default)]" />
                <span>Reasoning across knowledge graph...</span>
              </span>
            </div>

            <div className="bg-[var(--bg-panel)] p-4 rounded-lg rounded-tl-none space-y-3 text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] w-full">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center space-x-2 text-xs font-semibold text-[var(--text-primary)]">
                  <RefreshCw className="h-3.5 w-3.5 text-[var(--accent-default)] animate-spin" />
                  <span>Multi-Agent LangGraph Pipeline Active</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">STREAMING</span>
              </div>

              <div className="space-y-1.5">
                {currentSteps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-center space-x-2">
                    {step.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 text-[var(--accent-default)] animate-spin shrink-0" />
                    )}
                    <span className={`font-mono ${step.done ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)] font-medium'}`}>
                      {step.step}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] ml-auto font-mono">{step.timestamp}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 space-y-1.5 border-t border-[var(--border-subtle)]">
                <div className="h-2 bg-[var(--bg-elevated)] rounded-full animate-pulse w-3/4" />
                <div className="h-2 bg-[var(--bg-elevated)] rounded-full animate-pulse w-5/6" />
                <div className="h-2 bg-[var(--bg-elevated)] rounded-full animate-pulse w-1/2" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Docked Multi-Line Input Bar */}
      <div className="p-4 bg-[var(--bg-panel)] border-t border-[var(--border-subtle)]">
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
                placeholder="Ask Cortex about codebase knowledge, SPOF, risk, or dependencies..."
                disabled={loading}
                rows={1}
                style={{ height: '44px', minHeight: '44px', maxHeight: '160px' }}
                className={`w-full bg-[var(--bg-app)] border border-[var(--border-strong)] focus:border-[var(--border-focus)] focus:ring-1 focus:ring-[var(--border-focus)] rounded-md pl-3.5 ${query ? 'pr-16' : 'pr-3.5'} py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors resize-none leading-relaxed overflow-hidden scrollbar-thin scrollbar-thumb-slate-800`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-medium bg-[var(--bg-elevated)] hover:bg-[var(--bg-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!query.trim() || loading}
              className="cortex-btn-primary px-5 py-2.5 text-xs font-semibold rounded-md disabled:opacity-50 transition-colors flex items-center space-x-2 shrink-0 h-[44px] cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Reasoning...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
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