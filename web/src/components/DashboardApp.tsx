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
import { ArrowLeft, Sparkles } from 'lucide-react';

interface DashboardAppProps {
  onGoToLanding: () => void;
}

export const DashboardApp: React.FC<DashboardAppProps> = ({ onGoToLanding }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverviewPage onNavigate={setActiveTab} />;
      case 'chat':
        return <AIChatPage />;
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
      default:
        return <DashboardOverviewPage onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#090d16] text-[#F5F5F7] overflow-hidden">
      {/* Sidebar with top return banner */}
      <div className="flex flex-col h-full shrink-0 border-r border-slate-800 bg-[#070a12] w-64 overflow-hidden z-30">
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/80 shrink-0">
          <button
            onClick={onGoToLanding}
            className="w-full px-3 py-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 hover:from-blue-600/30 hover:to-indigo-600/30 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-mono font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 group cursor-pointer shadow-sm"
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
      <main className="flex-1 overflow-y-auto bg-[#090d16] relative">
        {/* Top quick banner to switch back or see mode */}
        <div className="sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-md px-6 py-2 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-semibold">Cortex Live Platform Demo</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Workspace: Cortex Core</span>
          </div>
          <button
            onClick={onGoToLanding}
            className="text-xs text-slate-400 hover:text-white font-mono flex items-center space-x-1 transition-colors"
          >
            <span>Landing Page</span>
            <Sparkles className="w-3 h-3 text-blue-400" />
          </button>
        </div>

        {renderContent()}
      </main>
    </div>
  );
};
