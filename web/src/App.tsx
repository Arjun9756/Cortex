import { useState } from 'react';
import { isDemoEnabled } from './config';
import { LandingPage } from './landing/LandingPage';
import { Sidebar, type NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { AIChatPage } from './pages/AIChatPage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { PeoplePage } from './pages/PeoplePage';
import { BusFactorPage } from './pages/BusFactorPage';
import { TechnologiesPage } from './pages/TechnologiesPage';
import { TimelinePage } from './pages/TimelinePage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard'>(() => {
    if (!isDemoEnabled) return 'landing';
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'dashboard' ? 'dashboard' : 'landing';
  });
  const [activeTab, setActiveTab] = useState<NavTab>('overview');

  const getPageTitle = (tab: NavTab) => {
    switch (tab) {
      case 'overview':
        return 'Executive Overview';
      case 'chat':
        return 'Cortex AI Chat Assistant';
      case 'graph':
        return 'Knowledge Graph Explorer';
      case 'people':
        return 'People & Departure Risk';
      case 'bus-factor':
        return 'Bus Factor & Vulnerabilities';
      case 'technologies':
        return 'Technologies & Skills';
      case 'timeline':
        return 'Activity Timeline Feed';
      case 'analytics':
        return 'Intelligence & Analytics';
      default:
        return 'Dashboard';
    }
  };

  const renderActivePage = () => {
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

  if (viewMode === 'landing' || !isDemoEnabled) {
    return <LandingPage onLaunchDemo={isDemoEnabled ? () => setViewMode('dashboard') : undefined} />;
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex">
      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={getPageTitle(activeTab)} onGoLanding={() => setViewMode('landing')} />
        <main className="flex-1 overflow-y-auto">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

export default App;
