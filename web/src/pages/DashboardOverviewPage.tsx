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
  Sparkles,
  Search,
  Activity,
  ChevronRight,
  Zap,
  ArrowUpDown,
  Cpu,
  CheckCircle2,
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

export const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({
  onNavigate,
}) => {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

  // Search Bar State (Quick Ask)
  const [quickQuery, setQuickQuery] = useState<string>('');

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

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      onNavigate('chat', quickQuery.trim());
    }
  };

  const handlePromptClick = (promptText: string) => {
    onNavigate('chat', promptText);
  };

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
      {/* ─── ROW 6: QUICK ASK BAR (Prominently pinned at top) ───────────────── */}
      <div className="glass-card p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <form onSubmit={handleQuickSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-indigo-400" />
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Ask Cortex anything about your engineering org (e.g. 'What breaks if Dave R. leaves?')..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-cyan-300" />
            <span>Ask Cortex</span>
          </button>
        </form>

        {/* Quick prompt suggestions */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span className="font-semibold text-indigo-400 flex items-center gap-1">
            <Zap className="h-3 w-3" /> Quick queries:
          </span>
          {[
            'What breaks if Dave R. leaves?',
            'Which repositories have bus factor = 1?',
            'Show high risk PRs across the team',
          ].map((promptText, i) => (
            <button
              key={i}
              onClick={() => handlePromptClick(promptText)}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer font-mono"
            >
              {promptText}
            </button>
          ))}
        </div>
      </div>

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
          onClick={() => onNavigate('bus-factor')}
        />
        <StatCard
          title="Urgent Risk Alerts"
          value={stats.totalRiskAlertsCount}
          subtext="Items requiring action"
          icon={<AlertTriangle className="h-5 w-5" />}
          accentColor={stats.totalRiskAlertsCount > 0 ? 'rose' : 'emerald'}
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

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityTrend} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Bar dataKey="commits" name="Commits" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="prs" name="Pull Requests" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
                const reposList = Array.isArray(person.repos)
                  ? person.repos.join(', ')
                  : 'Core Services';
                return (
                  <tr
                    key={person.external_id || person.person_name}
                    className="hover:bg-slate-900/60 transition-colors group cursor-pointer"
                    onClick={() => onNavigate('people')}
                  >
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                        {person.person_name?.[0] || 'U'}
                      </div>
                      <span>{person.person_name}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate font-mono">
                      {reposList}
                    </td>

                    <td className="py-3.5 px-4">
                      <RiskGauge
                        score={person.risk_score}
                        size="sm"
                        type="dot"
                        showLabel
                      />
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                      {person.commit_count ?? 0}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('people');
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg transition-all"
                      >
                        Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Load Time benchmark indicator */}
      {loadTimeMs !== null && (
        <div className="text-center text-[11px] font-mono text-slate-400">
          Dashboard synthesized in <span className="text-emerald-400 font-bold">{loadTimeMs}ms</span> from PostgreSQL metrics cache.
        </div>
      )}
    </div>
  );
};
