import React, { useEffect, useState } from 'react';
import { getTimeline, type TimelineEvent } from '../lib/api';
import { History, GitCommit, MessageSquare, AlertCircle, Rocket, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

export const TimelinePage: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTimeline();
      setEvents(data.events || []);
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
        return <GitCommit className="h-4 w-4 text-emerald-400" />;
      case 'slack':
        return <MessageSquare className="h-4 w-4 text-purple-400" />;
      case 'jira':
        return <AlertCircle className="h-4 w-4 text-sky-400" />;
      case 'deploy':
      case 'ci':
        return <Rocket className="h-4 w-4 text-amber-400" />;
      default:
        return <Clock className="h-4 w-4 text-indigo-400" />;
    }
  };

  const getProviderBadgeStyle = (provider: string) => {
    switch (provider?.toLowerCase()) {
      case 'github':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      case 'slack':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
      case 'jira':
        return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
      default:
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-800 rounded-lg"></div>
        <div className="space-y-4">
          {[1, 2, 3, 5].map(i => (
            <div key={i} className="h-20 bg-slate-900/80 rounded-xl border border-slate-800"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3 text-rose-300">
            <AlertTriangle className="h-6 w-6 text-rose-400" />
            <div>
              <h4 className="font-semibold text-white">Failed to Load Timeline</h4>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchTimeline}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-lg flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
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
          <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-indigo-400" />
            <span>Activity Timeline</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Realtime engineering activity feed ingested from GitHub, Slack, and Jira webhooks.
          </p>
        </div>
        <button
          onClick={fetchTimeline}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white rounded-lg flex items-center space-x-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {events.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <History className="h-10 w-10 text-slate-500 mx-auto" />
          <h4 className="text-base font-semibold text-slate-300">No Recent Activity Recorded</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Events will stream into this feed automatically when commits, PRs, messages, or issues arrive via webhooks.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-6">
          {events.map(event => {
            const title = event.title || 'Activity Event';
            const author = event.author || 'System';
            const dateStr = event.date ? new Date(event.date).toLocaleDateString() : (event.created_at ? new Date(event.created_at).toLocaleDateString() : '');
            const repoName = event.repo || '';

            return (
              <div key={event.id} className="relative group">
                <div className="absolute -left-[35px] top-1.5 p-1.5 rounded-full bg-slate-900 border border-slate-700 shadow-md">
                  {getProviderIcon(event.provider)}
                </div>

                <div className="glass-card glass-card-hover p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getProviderBadgeStyle(event.provider)}`}>
                        {event.provider}
                      </span>
                      {event.event_type && (
                        <span className="text-xs font-semibold text-slate-300">{event.event_type}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {dateStr}
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 font-medium leading-relaxed">{title}</p>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>
                      Author: <strong className="text-indigo-300 font-medium">{author}</strong>
                      {repoName && <span className="ml-2 text-[10px] text-cyan-400 font-mono">[{repoName}]</span>}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {event.id}</span>
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
