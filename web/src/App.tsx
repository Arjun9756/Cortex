import { useState } from 'react';
import { LandingPage } from './landing/LandingPage';
import { PricingPage } from './pages/PricingPage';
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
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard' | 'pricing'>(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'pricing' || window.location.pathname === '/pricing') return 'pricing';
    if (view === 'dashboard' || window.location.pathname === '/dashboard') return 'dashboard';
    // Default to Landing Page
    return 'landing';
  });
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setLastSyncedAt(new Date());
    setTimeout(() => setIsRefreshing(false), 800);
  };

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
        return (
          <DashboardOverviewPage 
            key={refreshKey}
            onNavigate={setActiveTab} 
            onSyncUpdated={(date) => setLastSyncedAt(date)}
          />
        );
      case 'chat':
        return (
          <AIChatPage 
            onSyncUpdated={(date) => setLastSyncedAt(date)}
          />
        );
      case 'graph':
        return (
          <KnowledgeGraphPage 
            key={refreshKey} 
            onSyncUpdated={(date) => setLastSyncedAt(date)}
          />
        );
      case 'people':
        return (
          <PeoplePage 
            key={refreshKey} 
            onSyncUpdated={(date) => setLastSyncedAt(date)}
          />
        );
      case 'bus-factor':
        return (
          <BusFactorPage 
            key={refreshKey} 
            onSyncUpdated={(date) => setLastSyncedAt(date)}
          />
        );
      case 'technologies':
        return (
          <TechnologiesPage 
            key={refreshKey} 
            onSyncUpdated={(date) => setLastSyncedAt(date)}
          />
        );
      case 'timeline':
        return (
          <TimelinePage 
            key={refreshKey} 
            onSyncUpdated={(date) => setLastSyncedAt(date)}
          />
        );
      case 'analytics':
        return (
          <AnalyticsPage 
            key={refreshKey} 
            onSyncUpdated={(date) => setLastSyncedAt(date)}
          />
        );
      default:
        return (
          <DashboardOverviewPage 
            key={refreshKey}
            onNavigate={setActiveTab} 
            onSyncUpdated={(date) => setLastSyncedAt(date)}
          />
        );
    }
  };

  if (viewMode === 'pricing') {
    return <PricingPage onGoBack={() => setViewMode('landing')} onLaunchDemo={() => setViewMode('dashboard')} />;
  }

  if (viewMode === 'landing') {
    return <LandingPage onLaunchDemo={() => setViewMode('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex">
      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title={getPageTitle(activeTab)} 
          onGoLanding={() => setViewMode('landing')}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          lastSyncedAt={lastSyncedAt}
        />
        <main className="flex-1 overflow-y-auto">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

export default App;
