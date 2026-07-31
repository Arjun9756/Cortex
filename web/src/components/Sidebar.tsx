import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquareCode, 
  Network, 
  Users, 
  ShieldAlert, 
  Cpu, 
  History,
  BarChart3,
  Activity,
  FolderGit2
} from 'lucide-react';

export type NavTab = 
  | 'overview' 
  | 'chat' 
  | 'graph' 
  | 'people' 
  | 'bus-factor' 
  | 'technologies' 
  | 'timeline'
  | 'analytics';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const sections: Array<{
    title: string;
    items: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }>;
  }> = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'chat', label: 'AI Chat', icon: MessageSquareCode, badge: 'Agentic' },
        { id: 'graph', label: 'Knowledge Graph', icon: Network },
      ],
    },
    {
      title: 'ENTITIES',
      items: [
        { id: 'bus-factor', label: 'Repositories', icon: FolderGit2 },
        { id: 'people', label: 'People', icon: Users },
        { id: 'technologies', label: 'Technologies', icon: Cpu },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { id: 'people', label: 'Knowledge Risk', icon: ShieldAlert },
        { id: 'bus-factor', label: 'Bus Factor', icon: ShieldAlert },
        { id: 'timeline', label: 'Timeline', icon: History },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#070a12] border-r border-slate-800/80 flex flex-col h-screen sticky top-0 z-30 select-none backdrop-blur-md">
      {/* Brand Header matching Reference Images */}
      <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full bg-[#070a12] rounded-[10px] flex items-center justify-center">
              <Activity className="h-5 w-5 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1">
              Cortex
            </h1>
          </div>
        </div>
      </div>

      {/* Grouped Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {section.title}
            </div>
            {section.items.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`${item.id}-${idx}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
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
      <div className="p-4 border-t border-slate-800/80 bg-[#05080f]">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-slate-300 font-medium">Backend Live</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5">Port 3000 • LangGraph Pipeline</p>
      </div>
    </aside>
  );
};
