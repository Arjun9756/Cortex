import React, { useEffect, useState } from 'react';
import { getTimeline, type TimelineEvent } from '../lib/api';
import { History, GitCommit, MessageSquare, AlertCircle, Rocket, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

interface TimelinePageProps {
  onSyncUpdated?: (date: Date) => void;
}

export const TimelinePage: React.FC<TimelinePageProps> = ({ onSyncUpdated }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTimeline();
      setEvents(data.events || []);
      if (onSyncUpdated) {
        onSyncUpdated(new Date());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch timeline events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  const getProviderIcon = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'github':
        return <GitCommit className="h-3.5 w-3.5 text-emerald-400" />;
      case 'slack':
        return <MessageSquare className="h-3.5 w-3.5 text-[var(--accent-default)]" />;
      case 'jira':
        return <AlertCircle className="h-3.5 w-3.5 text-sky-400" />;
      case 'deploy':
      case 'ci':
        return <Rocket className="h-3.5 w-3.5 text-amber-400" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />;
    }
  };

  const getProviderBadgeStyle = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'github':
        return 'bg-[var(--bg-subtle)] text-emerald-400 border-emerald-500/30';
      case 'slack':
        return 'bg-[var(--bg-subtle)] text-[var(--accent-default)] border-[var(--border-subtle)]';
      case 'jira':
        return 'bg-[var(--bg-subtle)] text-sky-400 border-sky-500/30';
      default:
        return 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-[var(--bg-elevated)] rounded"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3 text-rose-300">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] text-sm">Failed to Load Timeline</h4>
              <p className="text-xs text-rose-300/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchTimeline}
            className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-xs font-medium rounded-md flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <History className="h-5 w-5 text-[var(--accent-default)]" />
            <span>Activity Timeline</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Automated engineering activity feed ingested from GitHub, Slack, and Jira webhooks.
          </p>
        </div>
        <button
          onClick={fetchTimeline}
          className="cortex-btn-secondary px-3 py-1.5 text-xs rounded-md flex items-center space-x-1.5 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {events.length === 0 ? (
        <div className="cortex-card p-12 text-center space-y-3">
          <History className="h-10 w-10 text-[var(--text-muted)] mx-auto" />
          <h4 className="text-base font-semibold text-[var(--text-primary)]">No Recent Activity Recorded</h4>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            Events will stream into this feed automatically when commits, PRs, messages, or issues arrive via webhooks.
          </p>
        </div>
      ) : (
        <div className="relative border-l border-[var(--border-subtle)] ml-3 pl-6 space-y-4">
          {events.map(event => {
            const title = event.title || 'Activity Event';
            const author = event.author || 'System';
            const dateStr = event.date ? new Date(event.date).toLocaleDateString() : (event.created_at ? new Date(event.created_at).toLocaleDateString() : '');
            const repoName = event.repo || '';

            return (
              <div key={event.id} className="relative group">
                <div className="absolute -left-[33px] top-2 p-1 rounded-full bg-[var(--bg-app)] border border-[var(--border-strong)]">
                  {getProviderIcon(event.provider)}
                </div>

                <div className="cortex-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getProviderBadgeStyle(event.provider)}`}>
                        {event.provider}
                      </span>
                      {event.event_type && (
                        <span className="text-xs font-medium text-[var(--text-secondary)]">{event.event_type}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {dateStr}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">{title}</p>

                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-1">
                    <span>
                      Author: <strong className="text-[var(--text-primary)] font-medium">{author}</strong>
                      {repoName && <span className="ml-2 text-[11px] text-[var(--accent-default)] font-mono">[{repoName}]</span>}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">ID: {event.id}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
