import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquareCode, 
  Network, 
  Users, 
  Cpu, 
  History,
  BarChart3,
  FolderGit2,
  GitPullRequest
} from 'lucide-react';
import { CortexLogo } from './CortexLogo';

export type NavTab = 
  | 'overview' 
  | 'chat' 
  | 'graph' 
  | 'people' 
  | 'bus-factor' 
  | 'technologies' 
  | 'timeline'
  | 'analytics'
  | 'pull-requests';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const sections: Array<{
    title: string;
    items: Array<{
      id: NavTab;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: string;
      badgeVariant?: 'primary' | 'secondary' | 'live';
      isSecondaryTool?: boolean;
    }>;
  }> = [
    {
      title: 'CORE WORKSPACE',
      items: [
        { id: 'overview', label: 'Executive Dashboard', icon: LayoutDashboard, badge: 'Auto-Sync', badgeVariant: 'live' },
        { id: 'graph', label: 'Knowledge Graph', icon: Network, badge: 'Neo4j', badgeVariant: 'primary' },
      ],
    },
    {
      title: 'CODEBASE ENTITIES',
      items: [
        { id: 'bus-factor', label: 'Repositories & SPOF', icon: FolderGit2 },
        { id: 'people', label: 'People & Departure', icon: Users },
        { id: 'technologies', label: 'Technologies & Stack', icon: Cpu },
      ],
    },
    {
      title: 'RISK & INTELLIGENCE',
      items: [
        { id: 'pull-requests', label: 'Pull Requests & Delivery', icon: GitPullRequest, badge: 'New', badgeVariant: 'primary' },
        { id: 'timeline', label: 'Activity Timeline', icon: History },
        { id: 'analytics', label: 'Intelligence Metrics', icon: BarChart3 },
      ],
    },
    {
      title: 'AI COPILOT & TOOLS',
      items: [
        { 
          id: 'chat', 
          label: 'AI Knowledge Chat', 
          icon: MessageSquareCode, 
          badge: 'Agentic Tool', 
          badgeVariant: 'secondary',
          isSecondaryTool: true 
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[var(--bg-panel)] border-r border-[var(--border-subtle)] flex flex-col h-screen sticky top-0 z-30 select-none shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <CortexLogo className="w-8 h-8" />
          <div>
            <h1 className="font-bold text-sm text-[var(--text-primary)] tracking-tight leading-tight">
              Cortex
            </h1>
            <p className="text-[10px] text-[var(--text-muted)] font-mono">Engineering Intelligence</p>
          </div>
        </div>
      </div>

      {/* Grouped Navigation List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-0.5">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {section.title}
            </div>
            {section.items.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent-muted)] text-[var(--text-primary)] border border-[var(--accent-border)] font-semibold'
                      : item.isSecondaryTool
                      ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Icon className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                      isActive 
                        ? 'text-indigo-400' 
                        : 'text-[var(--text-muted)]'
                    }`} />
                    <span className="whitespace-nowrap truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`shrink-0 ml-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap ${
                      item.badgeVariant === 'live'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : item.badgeVariant === 'secondary'
                        ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                        : 'bg-[var(--accent-muted)] text-indigo-300 border-[var(--accent-border)]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* System Status Footer */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-xs text-[var(--text-secondary)] font-medium">Backend Connected</span>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">Port 3000 • LangGraph Pipeline</p>
      </div>
    </aside>
  );
};
