import React, { useEffect, useState } from 'react';
import { RefreshCw, Database } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastSyncedAt?: Date | null;
  onGoLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle = 'Engineering Intelligence & Single Points of Knowledge',
  onRefresh,
  isRefreshing = false,
  lastSyncedAt,
  onGoLanding
}) => {
  const [timeAgoText, setTimeAgoText] = useState<string>('Just now');
  const [isStale, setIsStale] = useState<boolean>(false);

  useEffect(() => {
    if (!lastSyncedAt) {
      setTimeAgoText('Sync pending');
      setIsStale(false);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - lastSyncedAt.getTime()) / 1000));
      // Softer visual state when last successful sync is older than 2 minutes
      setIsStale(diffSec >= 120);

      if (diffSec < 5) {
        setTimeAgoText('Just now');
      } else if (diffSec < 60) {
        setTimeAgoText(`${diffSec}s ago`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        setTimeAgoText(`${diffMin}m ago`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 2000);
    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  const getBadgeStyle = () => {
    if (isRefreshing) {
      return {
        container: 'bg-[var(--accent-muted)] border-[var(--accent-border)] text-indigo-300',
        dotColor: 'bg-indigo-400',
      };
    }
    if (isStale) {
      return {
        container: 'bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-muted)]',
        dotColor: 'bg-slate-500',
      };
    }
    return {
      container: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      dotColor: 'bg-emerald-400',
    };
  };

  const badgeStyle = getBadgeStyle();

  return (
    <header className="sticky top-0 z-20 bg-[var(--bg-app)] border-b border-[var(--border-subtle)] px-6 py-3 flex items-center justify-between">
      <div>
        <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
      </div>

      <div className="flex items-center space-x-3">
        {onGoLanding && (
          <button
            onClick={onGoLanding}
            className="px-2.5 py-1 rounded-md bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            ← Landing Page
          </button>
        )}

        {/* Workspace Pill */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
          <Database className="h-3.5 w-3.5 text-indigo-400" />
          <span>Workspace: <strong className="text-[var(--text-primary)] font-medium">Cortex Core</strong></span>
        </div>

        {/* Honest Auto-Sync Status Badge */}
        <div 
          title={lastSyncedAt ? `Auto-sync active · Last synced ${timeAgoText}` : 'Auto-sync active'}
          className={`flex items-center space-x-2 px-2.5 py-1 rounded-md text-xs font-medium border ${badgeStyle.container}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dotColor}`}></span>
          <span className="font-medium">{isRefreshing ? 'Syncing...' : 'Auto-Sync'}</span>
          <span className="text-[10px] text-[var(--text-muted)] border-l border-[var(--border-subtle)] pl-1.5 font-mono">
            {timeAgoText}
          </span>
        </div>

        {/* Manual Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-md bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Data Immediately"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        )}
      </div>
    </header>
  );
};
