import React, { useEffect, useState } from 'react';
import {
  getDashboardOverview,
  getRepositoryDetails,
  type DashboardOverviewResponse,
  type RiskAlertItem,
  type RepositoryDetails,
} from '../lib/api';
import type { NavTab } from '../components/Sidebar';
import { RISK_THRESHOLDS } from '../constants/riskThresholds';
import { StatCard } from '../components/StatCard';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { RiskGauge } from '../components/RiskGauge';
import { EvidenceChip } from '../components/EvidenceChip';
import { RepoDetailModal } from '../components/RepoDetailModal';
import {
  ShieldAlert,
  Users,
  FolderGit2,
  AlertTriangle,
  RefreshCw,
  Activity,
  ChevronRight,
  ArrowUpDown,
  Cpu,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Database,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DashboardOverviewPageProps {
  onNavigate: (tab: NavTab, initialQuery?: string) => void;
  onSyncUpdated?: (syncedAt: Date) => void;
}

/* ── Custom Dark Tooltip for Recharts ──────────────────────────── */
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0c1225] border border-slate-700/80 rounded-xl px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-lg">
      <p className="text-[11px] font-bold text-slate-300 mb-1.5 uppercase tracking-wider">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-bold text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({
  onNavigate,
  onSyncUpdated,
}) => {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

  // Detail Modal state for Repositories
  const [selectedRepoDetails, setSelectedRepoDetails] = useState<RepositoryDetails | null>(null);
  const [repoLoading, setRepoLoading] = useState<boolean>(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [isRepoModalOpen, setIsRepoModalOpen] = useState<boolean>(false);

  // Team Overview Table Sort state
  const [sortField, setSortField] = useState<'risk' | 'commits' | 'name'>('risk');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const fetchOverview = async (silent: boolean = false) => {
    const startTime = performance.now();
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await getDashboardOverview();
      setData(res);
      const endTime = performance.now();
      setLoadTimeMs(Math.round(endTime - startTime));
      if (onSyncUpdated) {
        onSyncUpdated(new Date());
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Failed to fetch dashboard overview');
      } else {
        console.warn('[DashboardOverview] Periodic poll error:', err?.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleOpenRepoModal = async (repoName: string) => {
    setIsRepoModalOpen(true);
    setRepoLoading(true);
    setRepoError(null);
    setSelectedRepoDetails(null);
    try {
      const details = await getRepositoryDetails(repoName);
      setSelectedRepoDetails(details);
    } catch (err: any) {
      setRepoError(err.message || `Failed to fetch repository details for ${repoName}`);
    } finally {
      setRepoLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview(false);

    // Periodic Polling: poll overview every 30 seconds (auto-sync)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOverview(true);
      }
    }, 30000);

    // Refresh immediately when user returns/focuses the window
    const handleFocus = () => {
      fetchOverview(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleAlertClick = (alert: RiskAlertItem) => {
    if (alert.entityType === 'repo') {
      handleOpenRepoModal(alert.entityName);
    } else if (alert.entityType === 'person') {
      onNavigate('people');
    } else if (alert.entityType === 'tech') {
      onNavigate('technologies');
    } else {
      onNavigate('bus-factor');
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse bg-[#090d16] min-h-screen">
        <div className="h-14 bg-slate-900/80 rounded-2xl border border-slate-800" />
        <div className="h-44 bg-slate-900/80 rounded-2xl border border-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-slate-900/80 rounded-xl border border-slate-800" />
          ))}
        </div>
        <div className="h-64 bg-slate-900/80 rounded-2xl border border-slate-800" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-[#090d16] min-h-screen">
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3 text-rose-300">
            <AlertTriangle className="h-6 w-6 text-rose-400" />
            <div>
              <h4 className="font-semibold text-white">Failed to Load Dashboard Overview</h4>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchOverview(false)}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-xl flex items-center space-x-2 transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const reposList = data.repos || [];
  const peopleList = data.people || [];
  const techList = data.technologies || [];
  const riskAlerts = data.riskAlerts || [];
  const activityTrend = data.activityTrend || [];

  // Honest Cold-Start Empty State when no repositories or team members are indexed yet
  if (reposList.length === 0 && peopleList.length === 0 && techList.length === 0) {
    return (
      <div className="p-8 space-y-6 bg-[var(--bg-app)] min-h-screen">
        <div className="cortex-card p-12 text-center space-y-4 max-w-2xl mx-auto my-12">
          <div className="h-12 w-12 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--accent-default)]">
            <Database className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">No Workspace Data Ingested Yet</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              Cortex has not indexed any repositories, commits, or contributors in this workspace. Connect GitHub, Slack, or Jira webhooks to begin indexing your codebase and computing automated Bus Factor and Knowledge Risk scores.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => fetchOverview(false)}
              className="cortex-btn-secondary px-4 py-2 text-xs rounded-md flex items-center space-x-2 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Check for New Events</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dynamic calculation without fabricated fallbacks (filtering out empty/scaffold repos)
  const activeReposList = reposList.filter((r) => r.status !== 'empty' && r.status !== 'scaffold' && Number(r.risk_score) > 0 && Number(r.bus_factor) > 0);
  const totalActiveRepos = activeReposList.length;
  const avgBusFactor = totalActiveRepos > 0 ? (activeReposList.reduce((a, r) => a + Number(r.bus_factor ?? 1), 0) / totalActiveRepos) : 0;
  const avgKnowledgeRisk = peopleList.length > 0 ? Math.round(peopleList.reduce((a, p) => a + Number(p.risk_score ?? 0), 0) / peopleList.length) : 0;
  const spofRepoCount = activeReposList.filter((r) => Number(r.bus_factor) <= 1).length;
  const spofPct = totalActiveRepos > 0 ? (spofRepoCount / totalActiveRepos) * 100 : 0;
  const busFactorPenalty = Math.max(0, 100 - avgBusFactor * 25);
  const compositeRisk = Math.round(0.35 * avgKnowledgeRisk + 0.35 * spofPct + 0.30 * busFactorPenalty);
  const calculatedHealthScore = Math.max(0, Math.min(100, 100 - compositeRisk));

  const health = data.healthScore || {
    score: calculatedHealthScore,
    grade: calculatedHealthScore >= 85 ? 'A' : calculatedHealthScore >= 70 ? 'B' : calculatedHealthScore >= 50 ? 'C' : 'D',
    statusText: calculatedHealthScore >= 85 ? 'Optimal Health' : calculatedHealthScore >= 70 ? 'Moderate Operational Health' : calculatedHealthScore >= 50 ? 'Elevated Risk Concentration' : 'Critical Action Required',
    statusColor: calculatedHealthScore >= 85 ? 'emerald' : calculatedHealthScore >= 70 ? 'indigo' : calculatedHealthScore >= 50 ? 'amber' : 'rose',
    explanation: `Calculated from ${totalActiveRepos} active repositories (${reposList.length} total) and ${peopleList.length} contributors.`,
    breakdown: {
      avgBusFactor,
      avgKnowledgeRisk,
      spofRepoCount,
      totalRepos: reposList.length,
      activeRepoCount: totalActiveRepos,
    },
  };

  const stats = data.stats || {
    repoCount: reposList.length,
    peopleCount: peopleList.length,
    techCount: techList.length,
    avgBusFactor: Number(health.breakdown.avgBusFactor.toFixed(1)),
    spofRepoCount: health.breakdown.spofRepoCount,
    openHighRiskPrs: 0,
    totalRiskAlertsCount: riskAlerts.length,
  };

  // Sort people list for Team Overview
  const sortedPeople = [...peopleList].sort((a, b) => {
    if (sortField === 'risk') {
      const rA = a.risk_score ?? 0;
      const rB = b.risk_score ?? 0;
      return sortAsc ? rA - rB : rB - rA;
    }
    if (sortField === 'commits') {
      const cA = a.commit_count ?? 0;
      const cB = b.commit_count ?? 0;
      return sortAsc ? cA - cB : cB - cA;
    }
    const nA = a.person_name || '';
    const nB = b.person_name || '';
    return sortAsc ? nA.localeCompare(nB) : nB.localeCompare(nA);
  });

  const toggleSort = (field: 'risk' | 'commits' | 'name') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Health Score Color mappings
  // Health Score Badge styling
  const getHealthBadgeStyle = (score: number) => {
    if (score >= 80) return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
    if (score >= 70) return 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10';
    if (score >= 50) return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
    return 'border-rose-500/40 text-rose-400 bg-rose-500/10';
  };

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[var(--bg-app)] min-h-screen">
      {/* ─── ROW 1: HEADLINE HEALTH SCORE ───────────────────────────────────── */}
      <div className="p-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Headline score visualization */}
          <div className="flex items-center space-x-6">
            <div className="relative flex items-center justify-center shrink-0">
              <div
                className={`w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center ${getHealthBadgeStyle(
                  health.score
                )}`}
              >
                <span className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                  <AnimatedNumber value={health.score} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Grade {health.grade}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center space-x-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  ENGINEERING HEALTH INDEX
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                    health.score >= 80
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : health.score >= 70
                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                      : health.score >= 50
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {health.statusText}
                </span>
              </div>

              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                {health.score >= 80
                  ? 'Your engineering organization is operating with low risk'
                  : health.score >= 70
                  ? 'Moderate risk concentration detected across core services'
                  : 'High ownership concentration requires immediate action'}
              </h2>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
                {health.explanation}
              </p>
            </div>
          </div>

          {/* Metric breakdown summary pills */}
          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] pt-4 lg:pt-0 lg:pl-6 text-xs font-mono">
            <div className="p-2.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-4">
              <span className="text-[var(--text-muted)]">Avg Bus Factor:</span>
              <span className="font-semibold text-cyan-400">
                <AnimatedNumber value={health.breakdown.avgBusFactor} decimals={1} />
              </span>
            </div>
            <div className="p-2.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-4">
              <span className="text-[var(--text-muted)]">Avg Knowledge Risk:</span>
              <span className="font-semibold text-amber-400">
                <AnimatedNumber value={health.breakdown.avgKnowledgeRisk} suffix="%" />
              </span>
            </div>
            <div className="p-2.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-4">
              <span className="text-[var(--text-muted)]">Single Pt of Failure Repos:</span>
              <span className="font-semibold text-rose-400 flex items-center gap-1">
                <AnimatedNumber value={health.breakdown.spofRepoCount} />
                <span className="text-[var(--text-muted)]">/ {health.breakdown.totalRepos}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: KEY STATS STRIP ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Repositories"
          value={stats.repoCount}
          subtext={`${stats.spofRepoCount} bus factor = 1`}
          icon={<FolderGit2 className="h-5 w-5" />}
          accentColor="cyan"
          trend={stats.spofRepoCount > 0 ? { value: `${stats.spofRepoCount} SPOF`, positive: false } : undefined}
          onClick={() => onNavigate('bus-factor')}
        />
        <StatCard
          title="People"
          value={stats.peopleCount}
          subtext={`${peopleList.filter((p) => (p.risk_score ?? 0) >= RISK_THRESHOLDS.HIGH).length} high knowledge risk`}
          icon={<Users className="h-5 w-5" />}
          accentColor="indigo"
          onClick={() => onNavigate('people')}
        />
        <StatCard
          title="Technologies"
          value={stats.techCount}
          subtext={`${data.technologies?.filter((t) => (t.contributor_count ?? 0) === 1).length || 0} single-expert stack`}
          icon={<Cpu className="h-5 w-5" />}
          accentColor="purple"
          onClick={() => onNavigate('technologies')}
        />
        <StatCard
          title="Avg Bus Factor"
          value={stats.avgBusFactor}
          subtext="Target: ≥ 2.0 per repo"
          icon={<ShieldAlert className="h-5 w-5" />}
          accentColor={stats.avgBusFactor <= 1.2 ? 'rose' : 'emerald'}
          trend={{ value: stats.avgBusFactor <= 1.2 ? '⚠ Below Target' : '✓ Healthy', positive: stats.avgBusFactor > 1.2 }}
          onClick={() => onNavigate('bus-factor')}
        />
        <StatCard
          title="Urgent Risk Alerts"
          value={stats.totalRiskAlertsCount}
          subtext="Items requiring action"
          icon={<AlertTriangle className="h-5 w-5" />}
          accentColor={stats.totalRiskAlertsCount > 0 ? 'rose' : 'emerald'}
          trend={stats.totalRiskAlertsCount > 0 ? { value: `${stats.totalRiskAlertsCount} active`, positive: false } : { value: 'Clear', positive: true }}
        />
      </div>

      {/* ─── ROW 3: RISK ALERTS (SURFACE PROBLEMS FIRST) ────────────────────── */}
      <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>Prioritized Risk Alerts ({riskAlerts.length})</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Top organizational risks detected from real ownership and commit data.
            </p>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2.5 py-1 rounded border border-[var(--border-subtle)]">
            Ordered by Severity
          </span>
        </div>

        {riskAlerts.length === 0 ? (
          <div className="p-6 text-center bg-[var(--bg-subtle)] rounded-md border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1.5" />
            No critical risk alerts identified across your organization.
          </div>
        ) : (
          <div className="space-y-2">
            {riskAlerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              const isWarning = alert.severity === 'warning';
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isCritical
                      ? 'border-l-2 border-l-rose-500'
                      : isWarning
                      ? 'border-l-2 border-l-amber-500'
                      : 'border-l-2 border-l-indigo-500'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span
                      className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 border ${
                        isCritical
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : isWarning
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                      }`}
                    >
                      {alert.severity}
                    </span>

                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <EvidenceChip
                          label={alert.entityName}
                          type={alert.entityType}
                          severity={alert.severity}
                          category={alert.category}
                          onClick={() => handleAlertClick(alert)}
                        />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
                        {alert.whyItMatters}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAlertClick(alert)}
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center space-x-1 shrink-0 self-end md:self-center cursor-pointer"
                  >
                    <span>Inspect</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── ROW 4: ACTIVITY TREND CHART ────────────────────────────────────── */}
      <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span>Engineering Activity Trend</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Weekly commits and PR activity aggregated over recent weeks.
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Commits
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Pull Requests
            </span>
          </div>
        </div>

        {activityTrend.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 bg-[var(--bg-subtle)] rounded-md border border-[var(--border-subtle)] text-center">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium block">Total Commits</span>
                <span className="text-base font-bold text-indigo-400">
                  {activityTrend.reduce((sum, w) => sum + (w.commits || 0), 0)}
                </span>
              </div>
              <div className="p-2.5 bg-[var(--bg-subtle)] rounded-md border border-[var(--border-subtle)] text-center">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium block">Total PRs</span>
                <span className="text-base font-bold text-cyan-400">
                  {activityTrend.reduce((sum, w) => sum + (w.prs || 0), 0)}
                </span>
              </div>
              <div className="p-2.5 bg-[var(--bg-subtle)] rounded-md border border-[var(--border-subtle)] text-center">
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-medium block">Trend</span>
                {(() => {
                  const last = activityTrend[activityTrend.length - 1]?.commits || 0;
                  const prev = activityTrend.length > 1 ? activityTrend[activityTrend.length - 2]?.commits || 0 : 0;
                  const trendUp = last >= prev;
                  return (
                    <span className={`text-base font-bold flex items-center justify-center gap-1 ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {prev > 0 ? Math.abs(Math.round(((last - prev) / prev) * 100)) : 0}%
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="h-56 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} axisLine={{ stroke: '#1e293b' }} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} />
                  <Bar dataKey="commits" name="Commits" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="prs" name="Pull Requests" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="h-48 flex items-center justify-center text-[var(--text-muted)] text-xs">
            <div className="text-center space-y-1">
              <BarChart3 className="h-8 w-8 mx-auto text-slate-600" />
              <p>No activity trend data available yet.</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── ROW 5: TEAM OVERVIEW TABLE ─────────────────────────────────────── */}
      <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              <span>Team Overview & Knowledge Risk ({peopleList.length})</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Sortable by knowledge risk score to surface highest-risk key persons first.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <button
              onClick={() => toggleSort('risk')}
              className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer flex items-center space-x-1 ${
                sortField === 'risk'
                  ? 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--accent-border)] font-semibold'
                  : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Risk Score</span>
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => toggleSort('commits')}
              className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer flex items-center space-x-1 ${
                sortField === 'commits'
                  ? 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--accent-border)] font-semibold'
                  : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Commits</span>
              <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="cortex-table">
            <thead>
              <tr>
                <th>Person</th>
                <th>Primary Repos</th>
                <th>Knowledge Risk Score</th>
                <th>Commits</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedPeople.map((person) => {
                const personRepos = Array.isArray(person.repos)
                  ? person.repos
                  : [];
                return (
                  <tr
                    key={person.external_id || person.person_name}
                    className="cursor-pointer"
                    onClick={() => onNavigate('people')}
                  >
                    <td className="font-medium text-[var(--text-primary)]">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-[var(--accent-muted)] border border-[var(--accent-border)] text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {person.person_name?.[0] || 'U'}
                        </div>
                        <div>
                          <span className="block text-xs font-semibold leading-tight">{person.person_name}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono font-normal">ID: {person.external_id}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {personRepos.length > 0 ? personRepos.slice(0, 3).map((r, i) => (
                          <span key={i} className="text-[10px] bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded font-mono">
                            {r}
                          </span>
                        )) : (
                          <span className="text-[var(--text-muted)] text-[10px]">No repos</span>
                        )}
                        {personRepos.length > 3 && (
                          <span className="text-[10px] text-[var(--text-muted)]">+{personRepos.length - 3}</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <RiskGauge
                        score={person.risk_score}
                        size="sm"
                        type="bar"
                        showLabel
                      />
                    </td>

                    <td>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-semibold text-[var(--text-primary)]">{person.commit_count ?? 0}</span>
                      </div>
                    </td>

                    <td className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('people');
                        }}
                        className="px-2.5 py-1 bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Profile</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ROW 6: TECHNOLOGY DISTRIBUTION ────────────────────────────────── */}
      {techList.length > 0 && (
        <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-400" />
                <span>Technology Stack Distribution</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Technology usage across repositories ranked by adoption.
              </p>
            </div>
            <button
              onClick={() => onNavigate('technologies')}
              className="px-2.5 py-1 bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium rounded-md transition-colors inline-flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {techList.slice(0, 9).map((tech, idx) => {
              const maxUsage = Math.max(...techList.map(t => t.usage_percent || 1), 1);
              const pct = Math.round(((tech.usage_percent || 0) / maxUsage) * 100);
              const name = tech.tech_name || tech.technology_name || 'Unknown';
              return (
                <div key={idx} className="p-3 bg-[var(--bg-subtle)] rounded-md border border-[var(--border-subtle)] space-y-1.5 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{name}</span>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      {(tech.contributor_count ?? 0) > 0 && (
                        <span className="text-[var(--text-muted)]">
                          <Users className="h-3 w-3 inline mr-0.5" />{tech.contributor_count}
                        </span>
                      )}
                      <span className="text-indigo-400 font-semibold">{tech.usage_percent}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[var(--bg-panel)] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${Math.max(6, pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span>{tech.repo_count ?? 0} repos</span>
                    {(tech.contributor_count ?? 0) === 1 && (
                      <span className="text-amber-400 font-medium flex items-center gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" /> Single Expert
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Load Time benchmark indicator */}
      {loadTimeMs !== null && (
        <div className="text-center text-[11px] font-mono text-slate-400">
          Dashboard synthesized in <span className="text-emerald-400 font-bold">{loadTimeMs}ms</span> from PostgreSQL metrics cache.
        </div>
      )}

      {/* Deep Inspection Repo Detail Modal */}
      {isRepoModalOpen && (
        <RepoDetailModal
          details={selectedRepoDetails}
          loading={repoLoading}
          error={repoError}
          onClose={() => {
            setIsRepoModalOpen(false);
            setSelectedRepoDetails(null);
            setRepoError(null);
          }}
        />
      )}
    </div>
  );
};
