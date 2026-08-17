import React, { useEffect, useState } from 'react';
import {
  getDashboardOverview,
  type DashboardOverviewResponse,
  type RiskAlertItem,
} from '../lib/api';
import type { NavTab } from '../components/Sidebar';
import { StatCard } from '../components/StatCard';
import { RiskGauge } from '../components/RiskGauge';
import { EvidenceChip } from '../components/EvidenceChip';
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
}) => {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

  // Team Overview Table Sort state
  const [sortField, setSortField] = useState<'risk' | 'commits' | 'name'>('risk');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const fetchOverview = async () => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardOverview();
      setData(res);
      const endTime = performance.now();
      setLoadTimeMs(Math.round(endTime - startTime));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleAlertClick = (alert: RiskAlertItem) => {
    if (alert.entityType === 'person') {
      onNavigate('people');
    } else if (alert.entityType === 'repo') {
      onNavigate('bus-factor');
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
            onClick={fetchOverview}
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

  const health = data.healthScore || {
    score: 80,
    grade: 'B',
    statusText: 'Operational Health',
    statusColor: 'emerald',
    explanation: 'Based on ownership concentration across repositories.',
    breakdown: {
      avgBusFactor: reposList.length > 0 ? (reposList.reduce((a, r) => a + Number(r.bus_factor ?? 1), 0) / reposList.length) : 1,
      avgKnowledgeRisk: peopleList.length > 0 ? Math.round(peopleList.reduce((a, p) => a + Number(p.risk_score ?? 0), 0) / peopleList.length) : 0,
      spofRepoCount: reposList.filter((r) => Number(r.bus_factor) <= 1).length,
      totalRepos: reposList.length,
    },
  };

  const stats = data.stats || {
    repoCount: reposList.length,
    peopleCount: peopleList.length,
    techCount: techList.length,
    avgBusFactor: Number(health.breakdown.avgBusFactor.toFixed(1)),
    openHighRiskPrs: health.breakdown.spofRepoCount,
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
  const getHealthBadgeStyle = (score: number) => {
    if (score >= 80) return 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400';
    if (score >= 70) return 'from-indigo-500/20 to-cyan-500/10 border-indigo-500/30 text-indigo-300';
    if (score >= 50) return 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400';
    return 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-400';
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#090d16] min-h-screen">
      {/* ─── ROW 1: HEADLINE HEALTH SCORE ───────────────────────────────────── */}
      <div className="glass-card p-6 md:p-8 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-950 to-indigo-950/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Headline score visualization */}
          <div className="flex items-center space-x-6">
            <div className="relative flex items-center justify-center shrink-0">
              <div
                className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center shadow-2xl bg-gradient-to-b ${getHealthBadgeStyle(
                  health.score
                )}`}
              >
                <span className="text-4xl font-black tracking-tight text-white">
                  {health.score}
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Grade {health.grade}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-w-xl">
              <div className="flex items-center space-x-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  ENGINEERING HEALTH INDEX
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
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

              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                {health.score >= 80
                  ? 'Your engineering organization is operating with low risk'
                  : health.score >= 70
                  ? 'Moderate risk concentration detected across core services'
                  : 'High ownership concentration requires immediate action'}
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {health.explanation}
              </p>
            </div>
          </div>

          {/* Metric breakdown summary pills */}
          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
              <span className="text-slate-400">Avg Bus Factor:</span>
              <span className="font-bold text-cyan-400">{health.breakdown.avgBusFactor}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
              <span className="text-slate-400">Avg Knowledge Risk:</span>
              <span className="font-bold text-amber-400">{health.breakdown.avgKnowledgeRisk}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
              <span className="text-slate-400">Single Pt of Failure Repos:</span>
              <span className="font-bold text-rose-400">
                {health.breakdown.spofRepoCount} / {health.breakdown.totalRepos}
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
          subtext={`${health.breakdown.spofRepoCount} bus factor = 1`}
          icon={<FolderGit2 className="h-5 w-5" />}
          accentColor="cyan"
          trend={health.breakdown.spofRepoCount > 0 ? { value: `${health.breakdown.spofRepoCount} SPOF`, positive: false } : undefined}
          onClick={() => onNavigate('bus-factor')}
        />
        <StatCard
          title="People"
          value={stats.peopleCount}
          subtext={`${peopleList.filter((p) => (p.risk_score ?? 0) >= 60).length} high knowledge risk`}
          icon={<Users className="h-5 w-5" />}
          accentColor="indigo"
          onClick={() => onNavigate('people')}
        />
        <StatCard
          title="Technologies"
          value={stats.techCount}
          subtext={`${data.technologies?.filter((t) => (t.contributor_count ?? 1) === 1).length || 0} single-expert stack`}
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
      <div className="glass-card p-6 space-y-4 border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              <span>Prioritized Risk Alerts ({riskAlerts.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Top organizational risks detected from real ownership and commit data.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            Ordered by Severity & Risk Score
          </span>
        </div>

        {riskAlerts.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400 text-xs">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            No critical risk alerts identified across your organization.
          </div>
        ) : (
          <div className="space-y-3">
            {riskAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex items-start space-x-3.5">
                  <span
                    className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shrink-0 border ${
                      alert.severity === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : alert.severity === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    }`}
                  >
                    {alert.severity}
                  </span>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <EvidenceChip
                        label={alert.entityName}
                        type={alert.entityType}
                        severity={alert.severity}
                        category={alert.category}
                        onClick={() => handleAlertClick(alert)}
                      />
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-mono">
                      {alert.whyItMatters}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleAlertClick(alert)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 shrink-0 self-end md:self-center cursor-pointer"
                >
                  <span>View details</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── ROW 4: ACTIVITY TREND CHART ────────────────────────────────────── */}
      <div className="glass-card p-6 space-y-4 border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              <span>Engineering Activity Trend</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Weekly commits and PR activity aggregated over recent weeks.
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Commits
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Pull Requests
            </span>
          </div>
        </div>

        {activityTrend.length > 0 ? (
          <>
            {/* Summary mini stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Total Commits</span>
                <span className="text-lg font-extrabold text-indigo-400">
                  {activityTrend.reduce((sum, w) => sum + (w.commits || 0), 0)}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Total PRs</span>
                <span className="text-lg font-extrabold text-cyan-400">
                  {activityTrend.reduce((sum, w) => sum + (w.prs || 0), 0)}
                </span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Trend</span>
                {(() => {
                  const last = activityTrend[activityTrend.length - 1]?.commits || 0;
                  const prev = activityTrend.length > 1 ? activityTrend[activityTrend.length - 2]?.commits || 0 : 0;
                  const trendUp = last >= prev;
                  return (
                    <span className={`text-lg font-extrabold flex items-center justify-center gap-1 ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trendUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {prev > 0 ? Math.abs(Math.round(((last - prev) / prev) * 100)) : 0}%
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityTrend} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} />
                  <Bar dataKey="commits" name="Commits" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="prs" name="Pull Requests" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
            <div className="text-center space-y-2">
              <BarChart3 className="h-10 w-10 mx-auto text-slate-600" />
              <p>No activity trend data available yet.</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── ROW 5: TEAM OVERVIEW TABLE ─────────────────────────────────────── */}
      <div className="glass-card p-6 space-y-4 border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <span>Team Overview & Knowledge Risk ({peopleList.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sortable by knowledge risk score to surface highest-risk key persons first.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <button
              onClick={() => toggleSort('risk')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center space-x-1 ${
                sortField === 'risk'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <span>Risk Score</span>
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => toggleSort('commits')}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center space-x-1 ${
                sortField === 'commits'
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <span>Commits</span>
              <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                <th className="py-3 px-4">Person</th>
                <th className="py-3 px-4">Primary Repos</th>
                <th className="py-3 px-4">Knowledge Risk Score</th>
                <th className="py-3 px-4">Commits</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedPeople.map((person) => {
                const personRepos = Array.isArray(person.repos)
                  ? person.repos
                  : [];
                return (
                  <tr
                    key={person.external_id || person.person_name}
                    className="hover:bg-slate-900/60 transition-colors group cursor-pointer"
                    onClick={() => onNavigate('people')}
                  >
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 flex items-center justify-center font-bold text-white text-xs shrink-0">
                          <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
                            {person.person_name?.[0] || 'U'}
                          </div>
                        </div>
                        <div>
                          <span className="block">{person.person_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono font-normal">ID: {person.external_id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {personRepos.length > 0 ? personRepos.slice(0, 3).map((r, i) => (
                          <span key={i} className="text-[10px] bg-slate-800/80 text-cyan-300 border border-slate-700/60 px-2 py-0.5 rounded-md font-mono">
                            {r}
                          </span>
                        )) : (
                          <span className="text-slate-500 text-[10px]">No repos</span>
                        )}
                        {personRepos.length > 3 && (
                          <span className="text-[10px] text-slate-500">+{personRepos.length - 3}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <RiskGauge
                        score={person.risk_score}
                        size="sm"
                        type="bar"
                        showLabel
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">{person.commit_count ?? 0}</span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400"
                            style={{ width: `${Math.min(100, ((person.commit_count ?? 0) / Math.max(...peopleList.map(p => p.commit_count ?? 1), 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('people');
                        }}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1.5 ml-auto"
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
        <div className="glass-card p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Cpu className="h-5 w-5 text-purple-400" />
                <span>Technology Stack Distribution</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Technology usage across repositories ranked by adoption.
              </p>
            </div>
            <button
              onClick={() => onNavigate('technologies')}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {techList.slice(0, 9).map((tech, idx) => {
              const maxUsage = Math.max(...techList.map(t => t.usage_percent || 1), 1);
              const pct = Math.round(((tech.usage_percent || 0) / maxUsage) * 100);
              const name = tech.tech_name || tech.technology_name || 'Unknown';
              const colors = [
                'from-indigo-500 to-purple-500',
                'from-cyan-500 to-blue-500',
                'from-emerald-500 to-teal-500',
                'from-amber-500 to-orange-500',
                'from-rose-500 to-pink-500',
                'from-violet-500 to-fuchsia-500',
                'from-sky-500 to-indigo-500',
                'from-lime-500 to-emerald-500',
                'from-orange-500 to-red-500',
              ];
              return (
                <div key={idx} className="p-3.5 bg-slate-950/50 rounded-xl border border-slate-800/60 space-y-2 group hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{name}</span>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      {(tech.contributor_count ?? 0) > 0 && (
                        <span className="text-slate-500">
                          <Users className="h-3 w-3 inline mr-0.5" />{tech.contributor_count}
                        </span>
                      )}
                      <span className="text-indigo-400 font-bold">{tech.usage_percent}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${colors[idx % colors.length]} transition-all duration-700`}
                      style={{ width: `${Math.max(6, pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{tech.repo_count ?? 0} repos</span>
                    {(tech.contributor_count ?? 0) === 1 && (
                      <span className="text-rose-400 font-semibold flex items-center gap-0.5">
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
    </div>
  );
};
