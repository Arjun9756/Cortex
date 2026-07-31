import React, { useEffect, useState } from 'react';
import { getDashboardOverview, getTimeline, getFindings, type DashboardOverviewResponse, type TimelineEvent, type Finding } from '../lib/api';
import type { NavTab } from '../components/Sidebar';
import {
  ShieldAlert,
  Users,
  FolderGit2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  GitCommit,
  GitPullRequest,
  AlertCircle,
  Rocket,
  MessageSquare,
  Clock,
  CheckCircle,
  Zap,
  ChevronRight
} from 'lucide-react';

interface DashboardOverviewPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, tl, fd] = await Promise.all([
        getDashboardOverview(),
        getTimeline().catch(() => ({ events: [] })),
        getFindings().catch(() => ({ findings: [] })),
      ]);
      setData(res);
      setTimelineEvents(tl.events || []);
      setFindings(fd.findings || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
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
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'slack':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'jira':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      default:
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    }
  };

  const getSeverityStyles = (severity: Finding['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          dot: 'bg-rose-500 shadow-rose-500/50',
          border: 'border-rose-500/30 hover:border-rose-500/50',
          bg: 'bg-rose-500/5 hover:bg-rose-500/10',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          label: 'CRITICAL',
        };
      case 'warning':
        return {
          dot: 'bg-amber-500 shadow-amber-500/50',
          border: 'border-amber-500/30 hover:border-amber-500/50',
          bg: 'bg-amber-500/5 hover:bg-amber-500/10',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          label: 'WARNING',
        };
      case 'info':
      default:
        return {
          dot: 'bg-sky-500 shadow-sky-500/50',
          border: 'border-sky-500/30 hover:border-sky-500/50',
          bg: 'bg-sky-500/5 hover:bg-sky-500/10',
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          label: 'INFO',
        };
    }
  };

  const handleFindingClick = (finding: Finding) => {
    if (finding.relatedEntityType === 'person') {
      onNavigate('people');
    } else if (finding.relatedEntityType === 'repo') {
      onNavigate('bus-factor');
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-32 bg-slate-900/80 rounded-2xl border border-slate-800"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-28 bg-slate-900/80 rounded-xl border border-slate-800"></div>
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
              <h4 className="font-semibold text-white">Failed to Load Dashboard</h4>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchOverview}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-lg flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const liveRepos = data?.repos || [];
  const livePeople = data?.people || [];

  return (
    <div className="p-8 space-y-8 bg-[#090d16] min-h-screen">
      {/* Hero Banner */}
      <div className="glass-card p-8 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="space-y-2 max-w-2xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
            WORKSPACE • CORTEX LABS
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Your engineering organisation, understood
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Cortex fuses GitHub, Jira, Slack, Neo4j PostgreSQL and your vector index into a single reasoning surface — with evidence for every answer.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onNavigate('chat')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Ask Cortex</span>
          </button>
          <button
            onClick={() => onNavigate('graph')}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl transition-all flex items-center space-x-2"
          >
            <FolderGit2 className="h-4 w-4 text-cyan-400" />
            <span>Open graph</span>
          </button>
        </div>
      </div>

      {/* ─── Today's Findings ──────────────────────────────────────── */}
      <div className="glass-card p-6 space-y-4 border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h4 className="font-bold text-white text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            Today's Findings
          </h4>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {findings.length} {findings.length === 1 ? 'finding' : 'findings'}
          </span>
        </div>

        {findings.length === 0 ? (
          <div className="flex items-center justify-center py-6 space-x-3">
            <div className="p-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">No critical findings</p>
              <p className="text-xs text-slate-400">Your knowledge distribution looks healthy</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {findings.map((finding, idx) => {
              const styles = getSeverityStyles(finding.severity);
              return (
                <button
                  key={idx}
                  onClick={() => handleFindingClick(finding)}
                  className={`w-full text-left p-4 rounded-xl border ${styles.border} ${styles.bg} transition-all group cursor-pointer`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shadow-lg ${styles.dot} shrink-0`}></div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-white">{finding.title}</span>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${styles.badge}`}>
                            {styles.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{finding.description}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 6 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Knowledge Risk */}
        <div className="glass-card p-5 space-y-3 border-slate-800/90 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>KNOWLEDGE RISK</span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">
              {data?.workspace?.knowledge_risk_avg ?? 0}%
            </span>
          </div>
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${data?.workspace?.knowledge_risk_avg ?? 0}%` }}></div>
          </div>
        </div>

        {/* Bus Factor */}
        <div className="glass-card p-5 space-y-3 border-slate-800/90 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>BUS FACTOR</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">
              {Number(data?.workspace?.bus_factor_avg ?? 0).toFixed(1)}
            </span>
          </div>
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, Number(data?.workspace?.bus_factor_avg ?? 0) * 20)}%` }}></div>
          </div>
        </div>

        {/* Repositories */}
        <div className="glass-card p-5 space-y-3 border-slate-800/90 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>REPOSITORIES</span>
            <FolderGit2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {data?.workspace?.repo_count ?? liveRepos.length}
          </div>
          <p className="text-[11px] text-slate-500">Tracked in codebase</p>
        </div>

        {/* Contributors */}
        <div className="glass-card p-5 space-y-3 border-slate-800/90 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>CONTRIBUTORS</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {data?.workspace?.contributor_count ?? livePeople.length}
          </div>
          <p className="text-[11px] text-slate-500">Indexed in graph</p>
        </div>

        {/* Open Issues */}
        <div className="glass-card p-5 space-y-3 border-slate-800/90 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>OPEN ISSUES</span>
            <AlertCircle className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {data?.workspace?.open_issues_count ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">Across all repositories</p>
        </div>

        {/* Open PRs */}
        <div className="glass-card p-5 space-y-3 border-slate-800/90 relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>OPEN PRS</span>
            <GitPullRequest className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {data?.workspace?.open_prs_count ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">Awaiting review</p>
        </div>
      </div>

      {/* Two Main Cards Row: Repositories at risk vs Single points of knowledge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Repositories at risk */}
        <div className="lg:col-span-2 glass-card p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h4 className="font-bold text-white text-base flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-indigo-400" />
              Repositories at risk
            </h4>
            <button
              onClick={() => onNavigate('bus-factor')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
            >
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {liveRepos.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No repository metrics recorded in DB yet.</p>
          ) : (
            <div className="space-y-3">
              {liveRepos.map(repo => (
                <div key={repo.external_id || repo.repo_name} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{repo.repo_name}</span>
                      {repo.primary_owner && (
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400">
                          Owner: {repo.primary_owner}
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        bus factor {repo.bus_factor}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-rose-400">{repo.risk_score}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full"
                      style={{ width: `${repo.risk_score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Single points of knowledge */}
        <div className="glass-card p-6 space-y-4 border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h4 className="font-bold text-white text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" />
                Single points of knowledge
              </h4>
            </div>

            {livePeople.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No person metrics recorded in DB yet.</p>
            ) : (
              <div className="space-y-4 mt-4">
                {livePeople.map((p, idx) => {
                  const name = p?.person_name || p?.external_id || 'Engineer';
                  const initial = name.charAt(0).toUpperCase();
                  const risk = p?.risk_score ?? 0;
                  return (
                    <div key={p?.external_id || idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-md">
                          {initial}
                        </div>
                        <div>
                          <h5 className="font-bold text-white">{name}</h5>
                          <p className="text-[10px] text-slate-400">{p?.commit_count ?? 0} commits</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-400">{risk}%</span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: `${risk}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('people')}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white rounded-xl transition-all mt-4"
          >
            Run risk simulation
          </button>
        </div>
      </div>

      {/* Recent activity timeline feed from real DB */}
      <div className="glass-card p-6 space-y-4 border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h4 className="font-bold text-white text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Recent activity
          </h4>
          <button
            onClick={() => onNavigate('timeline')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1"
          >
            <span>Full timeline</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {timelineEvents.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No recent activity events recorded in DB.</p>
        ) : (
          <div className="space-y-3 text-xs">
            {timelineEvents.slice(0, 5).map(event => {
              const title = event.title || 'Activity Event';
              const author = event.author || 'System';
              const dateStr = event.date ? new Date(event.date).toLocaleDateString() : (event.created_at ? new Date(event.created_at).toLocaleDateString() : '');
              const repoName = event.repo || '';

              return (
                <div key={event.id} className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-all">
                  <div className="flex items-start space-x-3">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 mt-0.5">
                      {getProviderIcon(event.provider)}
                    </div>
                    <div>
                      <h5 className="font-bold text-white">{title}</h5>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Author: <strong className="text-slate-300">{author}</strong>
                        {repoName && <span className="ml-2 text-[10px] text-indigo-400 font-mono">[{repoName}]</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getProviderBadgeStyle(event.provider)}`}>
                      {event.provider}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      {dateStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
