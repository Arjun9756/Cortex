import React, { useState } from 'react';
import { Sidebar, type NavTab } from './Sidebar';
import { DashboardOverviewPage } from '../pages/DashboardOverviewPage';
import { AIChatPage } from '../pages/AIChatPage';
import { KnowledgeGraphPage } from '../pages/KnowledgeGraphPage';
import { PeoplePage } from '../pages/PeoplePage';
import { BusFactorPage } from '../pages/BusFactorPage';
import { TechnologiesPage } from '../pages/TechnologiesPage';
import { TimelinePage } from '../pages/TimelinePage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { PullRequestsPage } from '../pages/PullRequestsPage';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface DashboardAppProps {
  onGoToLanding: () => void;
}

export const DashboardApp: React.FC<DashboardAppProps> = ({ onGoToLanding }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);

  const handleNavigate = (tab: NavTab, initialQuery?: string) => {
    if (tab === 'chat' && initialQuery) {
      setChatInitialQuery(initialQuery);
    }
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverviewPage onNavigate={handleNavigate} />;
      case 'chat':
        return <AIChatPage initialQuery={chatInitialQuery} />;
      case 'graph':
        return <KnowledgeGraphPage />;
      case 'people':
        return <PeoplePage />;
      case 'bus-factor':
        return <BusFactorPage />;
      case 'technologies':
        return <TechnologiesPage />;
      case 'timeline':
        return <TimelinePage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'pull-requests':
        return <PullRequestsPage />;
      default:
        return <DashboardOverviewPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden">
      {/* Sidebar with top return banner */}
      <div className="flex flex-col h-full shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] w-64 overflow-hidden z-30">
        <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] shrink-0">
          <button
            onClick={onGoToLanding}
            className="cortex-btn-secondary w-full px-3 py-2 text-xs font-medium rounded-md flex items-center justify-center space-x-2 group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Landing Page</span>
          </button>
        </div>

        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
          <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        </div>
      </div>

      {/* Main Content View */}
      <main className="flex-1 overflow-y-auto bg-[var(--bg-app)] relative">
        {/* Top quick banner to switch back or see mode */}
        <div className="sticky top-0 z-40 bg-[var(--bg-panel)]/95 backdrop-blur-sm px-6 py-2 border-b border-b-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-[var(--text-secondary)] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-[var(--text-primary)] font-medium">Cortex Live Platform</span>
            <span className="text-[var(--text-muted)]">|</span>
            <span className="text-[var(--text-secondary)]">Workspace: Cortex Core</span>
          </div>
          <button
            onClick={onGoToLanding}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <span>Landing Page</span>
            <Sparkles className="w-3 h-3 text-[var(--accent-default)]" />
          </button>
        </div>

        {renderContent()}
      </main>
    </div>
  );
};
