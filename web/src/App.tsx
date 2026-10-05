import { useState, useEffect } from 'react';
import { LandingPage } from './landing/LandingPage';
import { PricingPage } from './pages/PricingPage';
import { RequestPage } from './pages/RequestPage';
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
import { PullRequestsPage } from './pages/PullRequestsPage';
import { OnboardingPage } from './onboarding/OnboardingPage';

import { isDemoEnabled } from './config';

const STORAGE_VIEW_KEY = 'cortex_current_view';
const STORAGE_TAB_KEY = 'cortex_active_tab';

const VALID_TABS: NavTab[] = [
  'overview',
  'chat',
  'graph',
  'people',
  'bus-factor',
  'technologies',
  'timeline',
  'analytics',
  'pull-requests',
];

export function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard' | 'pricing' | 'request' | 'onboarding'>(() => {
    // 1. Priority to URL parameters or path
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'onboarding' || window.location.pathname === '/onboarding') return 'onboarding';
    if (view === 'request' || window.location.pathname === '/request') return 'request';
    if (view === 'pricing' || window.location.pathname === '/pricing') return 'pricing';
    if ((view === 'dashboard' || window.location.pathname === '/dashboard') && isDemoEnabled) return 'dashboard';
    if (view === 'landing') return 'landing';

    // 2. Fall back to persisted view in localStorage
    try {
      const savedView = localStorage.getItem(STORAGE_VIEW_KEY);
      if (savedView === 'onboarding' || savedView === 'pricing' || savedView === 'request') return savedView;
      if (savedView === 'dashboard' && isDemoEnabled) return 'dashboard';
      if (savedView === 'landing') return 'landing';
    } catch {}

    // Default to Landing Page
    return 'landing';
  });

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as NavTab | null;
    if (tabParam && VALID_TABS.includes(tabParam)) return tabParam;

    try {
      const savedTab = localStorage.getItem(STORAGE_TAB_KEY) as NavTab | null;
      if (savedTab && VALID_TABS.includes(savedTab)) return savedTab;
    } catch {}

    return 'overview';
  });

  // Sync viewMode and activeTab to URL and localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VIEW_KEY, viewMode);
      if (viewMode === 'dashboard') {
        localStorage.setItem(STORAGE_TAB_KEY, activeTab);
      }
    } catch {}

    const url = new URL(window.location.href);
    if (viewMode === 'landing') {
      url.searchParams.delete('view');
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('view', viewMode);
      if (viewMode === 'dashboard') {
        url.searchParams.set('tab', activeTab);
      } else {
        url.searchParams.delete('tab');
      }
    }
    window.history.replaceState(null, '', url.pathname + url.search);
  }, [viewMode, activeTab]);

  // Support browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view === 'onboarding' || view === 'dashboard' || view === 'pricing' || view === 'request') {
        setViewMode(view as any);
      } else {
        setViewMode('landing');
      }

      const tab = params.get('tab') as NavTab | null;
      if (tab && VALID_TABS.includes(tab)) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
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
      case 'pull-requests':
        return 'Pull Requests & Delivery Velocity';
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
      case 'pull-requests':
        return (
          <PullRequestsPage 
            key={refreshKey}
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

  if (viewMode === 'onboarding') {
    return (
      <OnboardingPage 
        onComplete={() => setViewMode('dashboard')}
        onBackToLanding={() => setViewMode('landing')}
      />
    );
  }

  if (viewMode === 'request') {
    return <RequestPage onGoBack={() => setViewMode('landing')} onLaunchDemo={isDemoEnabled ? () => setViewMode('dashboard') : undefined} />;
  }

  if (viewMode === 'pricing') {
    return <PricingPage onGoBack={() => setViewMode('landing')} onLaunchDemo={isDemoEnabled ? () => setViewMode('dashboard') : undefined} />;
  }

  if (viewMode === 'landing') {
    return <LandingPage onLaunchDemo={isDemoEnabled ? () => setViewMode('dashboard') : undefined} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex">
      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          title={getPageTitle(activeTab)} 
          onGoLanding={() => setViewMode('landing')}
          onGoOnboarding={() => setViewMode('onboarding')}
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
