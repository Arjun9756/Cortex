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
  const [timeAgoText, setTimeAgoText] = useState<string>('Live');

  useEffect(() => {
    if (!lastSyncedAt) {
      setTimeAgoText('Live');
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffSec = Math.floor((now - lastSyncedAt.getTime()) / 1000);
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
    const interval = setInterval(updateTimer, 5000);
    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  return (
    <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-8 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center space-x-4">
        {onGoLanding && (
          <button
            onClick={onGoLanding}
            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-xs font-mono text-indigo-300 transition-all cursor-pointer"
          >
            ← Back to Landing Page
          </button>
        )}

        {/* Workspace Pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
          <Database className="h-3.5 w-3.5 text-indigo-400" />
          <span>Workspace: <strong className="text-white font-semibold">Cortex Core</strong></span>
        </div>

        {/* Dynamic Realtime Sync Status Badge */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          isRefreshing 
            ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
        }`}>
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isRefreshing ? 'bg-indigo-400' : 'bg-emerald-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isRefreshing ? 'bg-indigo-500' : 'bg-emerald-500'
            }`}></span>
          </span>
          <span className="font-semibold">{isRefreshing ? 'Syncing...' : 'Realtime Sync'}</span>
          <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-1.5 font-mono">
            {timeAgoText}
          </span>
        </div>

        {/* Manual Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all disabled:opacity-50 cursor-pointer"
            title="Refresh Data Immediately"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        )}
      </div>
    </header>
  );
};
