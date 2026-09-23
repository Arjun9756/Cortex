import React, { useState, useEffect, useMemo } from 'react';
import {
  GitPullRequest,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  SlidersHorizontal,
  Bot,
  Layers,
  ArrowUpDown,
  FileCode2,
  Plus,
  Minus,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  getPrMetrics,
  getBusFactor,
  type PrMetricsReport,
  type RepoMetric
} from '../lib/api';
import { OutlierPrModal } from '../components/OutlierPrModal';

export const PullRequestsPage: React.FC = () => {
  // Filters
  const [selectedDays, setSelectedDays] = useState<number>(90);
  const [selectedRepo, setSelectedRepo] = useState<string>('ALL');
  const [includeBots, setIncludeBots] = useState<boolean>(false);

  // Data & State
  const [headlineMetrics, setHeadlineMetrics] = useState<PrMetricsReport | null>(null);
  const [repoBreakdown, setRepoBreakdown] = useState<PrMetricsReport[]>([]);
  const [availableRepos, setAvailableRepos] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Outlier Modal
  const [isOutlierModalOpen, setIsOutlierModalOpen] = useState<boolean>(false);

  // Table Sorting
  const [sortField, setSortField] = useState<string>('mergedHumanPrs');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load available repositories list once
  useEffect(() => {
    async function loadRepos() {
      try {
        const res = await getBusFactor();
        if (res.repos && res.repos.length > 0) {
          const names = res.repos
            .filter((r: RepoMetric) => r.status !== 'empty' && r.status !== 'scaffold')
            .map((r: RepoMetric) => r.repo_name);
          setAvailableRepos(names);
        }
      } catch (err) {
        console.warn('Could not load repo list for filter dropdown:', err);
      }
    }
    loadRepos();
  }, []);

  // Fetch PR metrics from backend API
  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPrMetrics({
        repo: selectedRepo === 'ALL' ? undefined : selectedRepo,
        days: selectedDays === 0 ? undefined : selectedDays,
        includeBots,
        breakdown: selectedRepo === 'ALL',
      });

      if (res.status && res.metrics) {
        setHeadlineMetrics(res.metrics);
        setRepoBreakdown(res.repoBreakdown || []);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err: any) {
      console.error('Failed to fetch PR metrics:', err);
      setError(err?.message || 'Failed to fetch pull request delivery metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [selectedDays, selectedRepo, includeBots]);

  // Distribution chart data
  const distributionData = useMemo(() => {
    if (!headlineMetrics) return [];
    const stats = headlineMetrics.reviewCycleTime.wallClockHours;
    return [
      { name: 'Min', hours: stats.min, label: 'Minimum' },
      { name: 'p25', hours: stats.p25, label: '25th Percentile (IQR Low)' },
      { name: 'Median (p50)', hours: stats.median, label: 'Headline Median', isHeadline: true },
      { name: 'p75', hours: stats.p75, label: '75th Percentile (IQR High)' },
      { name: 'p90', hours: stats.p90, label: '90th Percentile' },
      { name: 'Max', hours: stats.max, label: 'Maximum' },
    ];
  }, [headlineMetrics]);

  // Sorted per-repository breakdown
  const sortedRepoBreakdown = useMemo(() => {
    if (!repoBreakdown || repoBreakdown.length === 0) return [];
    return [...repoBreakdown].sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'repoName':
          valA = a.repoName || '';
          valB = b.repoName || '';
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'cycleTime':
          valA = a.reviewCycleTime.headlineHours;
          valB = b.reviewCycleTime.headlineHours;
          break;
        case 'leadTime':
          valA = a.totalLeadTime.headlineHours;
          valB = b.totalLeadTime.headlineHours;
          break;
        case 'mergedHumanPrs':
          valA = a.counts.mergedHumanPrs;
          valB = b.counts.mergedHumanPrs;
          break;
        case 'staleOutliers':
          valA = a.counts.staleOutliersCount;
          valB = b.counts.staleOutliersCount;
          break;
        case 'additions':
          valA = a.sizeContext.totalAdditions;
          valB = b.sizeContext.totalAdditions;
          break;
        case 'deletions':
          valA = a.sizeContext.totalDeletions;
          valB = b.sizeContext.totalDeletions;
          break;
        case 'files':
          valA = a.sizeContext.totalFilesChanged;
          valB = b.sizeContext.totalFilesChanged;
          break;
        case 'avgLines':
          valA = a.sizeContext.averageLinesPerPr;
          valB = b.sizeContext.averageLinesPerPr;
          break;
        default:
          valA = a.counts.mergedHumanPrs;
          valB = b.counts.mergedHumanPrs;
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [repoBreakdown, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // ─── Loading Skeleton State ──────────────────────────────────────────
  if (loading && !headlineMetrics) {
    return (
      <div className="p-8 space-y-6 bg-[var(--bg-app)] min-h-screen animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-[var(--bg-elevated)] rounded-md" />
            <div className="h-4 w-96 bg-[var(--bg-elevated)] rounded-md" />
          </div>
          <div className="h-9 w-48 bg-[var(--bg-elevated)] rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]" />
          ))}
        </div>
        <div className="h-72 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]" />
        <div className="h-64 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]" />
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────
  if (error && !headlineMetrics) {
    return (
      <div className="p-8 bg-[var(--bg-app)] min-h-screen">
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto text-center mt-16">
          <div className="p-3 bg-rose-500/20 rounded-full text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Failed to Load Pull Request Metrics
          </h3>
          <p className="text-xs text-rose-300/80 leading-relaxed">{error}</p>
          <button
            onClick={fetchMetrics}
            className="cortex-btn-primary flex items-center space-x-2 text-xs font-semibold px-4 py-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const counts = headlineMetrics?.counts || {
    totalEvaluated: 0,
    mergedHumanPrs: 0,
    mergedBotPrs: 0,
    openPrs: 0,
    closedUnmergedPrs: 0,
    staleOutliersCount: 0,
  };

  const isSmallSample = headlineMetrics?.dataCompleteness === 'partial';

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-[var(--bg-app)] min-h-screen">
      {/* ─── Header & Title ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                Pull Requests & Delivery Velocity
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Deterministic review cycle times and lead times grounded in PostgreSQL events.
              </p>
            </div>
          </div>
        </div>

        {/* ─── Filter Bar ────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2.5 bg-[var(--bg-panel)] p-1.5 border border-[var(--border-subtle)] rounded-lg shadow-xs">
          {/* Timeframe selector */}
          <div className="flex items-center space-x-1 text-xs">
            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)] ml-1.5" />
            <select
              value={selectedDays}
              onChange={e => setSelectedDays(Number(e.target.value))}
              className="bg-[var(--bg-app)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-md px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>All time (365d)</option>
            </select>
          </div>

          {/* Repository selector */}
          <div className="flex items-center space-x-1 text-xs">
            <Layers className="w-3.5 h-3.5 text-[var(--text-muted)] ml-1" />
            <select
              value={selectedRepo}
              onChange={e => setSelectedRepo(e.target.value)}
              className="bg-[var(--bg-app)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-md px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="ALL">All Repositories</option>
              {availableRepos.map(repo => (
                <option key={repo} value={repo}>
                  {repo}
                </option>
              ))}
            </select>
          </div>

          {/* Include Bots toggle */}
          <label className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[var(--bg-app)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeBots}
              onChange={e => setIncludeBots(e.target.checked)}
              className="rounded border-[var(--border-strong)] text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span className="text-[11px]">Include Bots</span>
          </label>

          {/* Refresh button */}
          <button
            onClick={fetchMetrics}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-md transition-colors cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── Incomplete Sample Caveat Banner (if sampleSize < 5) ───── */}
      {isSmallSample && headlineMetrics && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Small Sample Size ({headlineMetrics.sampleSize} PRs):</strong>{' '}
              {headlineMetrics.warning || 'Fewer than 5 merged PRs evaluated. Displayed medians reflect limited history rather than a statistically stabilized distribution.'}
            </span>
          </div>
          <span className="cortex-badge badge-moderate text-[10px] uppercase font-semibold tracking-wider">
            Partial Data
          </span>
        </div>
      )}

      {/* ─── Suspect Bot Activity Warning (if >5% suspect volume) ───── */}
      {headlineMetrics?.botActivity?.warning && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/25 rounded-lg flex items-center space-x-2.5 text-xs text-indigo-200">
          <Bot className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{headlineMetrics.botActivity.warning}</span>
        </div>
      )}

      {/* ─── 1. Summary Cards (Top Row) ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Review Cycle Time */}
        <div className="cortex-card p-5 space-y-3 relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Review Cycle Time
            </span>
            <div className="relative group/tip cursor-help">
              <Info className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-indigo-400 transition-colors" />
              <div className="absolute right-0 top-6 z-50 hidden group-hover/tip:block w-72 p-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg shadow-xl text-[11px] text-[var(--text-secondary)] leading-relaxed pointer-events-none">
                <strong className="text-[var(--text-primary)] block mb-1">PR Review Cycle Time</strong>
                Total elapsed calendar wall-clock duration from when a PR is marked ready-for-review until it is merged, excluding extreme outliers (&gt;30 days). Continuous 24/7 calendar hours.
              </div>
            </div>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {headlineMetrics ? `${headlineMetrics.reviewCycleTime.headlineHours}h` : '0h'}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)] font-mono">
              Median (Wall-Clock)
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono">
            <span>p90: {headlineMetrics?.reviewCycleTime.wallClockHours.p90 ?? 0}h</span>
            <span>IQR: {headlineMetrics ? (Math.round((headlineMetrics.reviewCycleTime.wallClockHours.p75 - headlineMetrics.reviewCycleTime.wallClockHours.p25) * 10) / 10) : 0}h</span>
          </div>
        </div>

        {/* Card 2: Total Lead Time */}
        <div className="cortex-card p-5 space-y-3 relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Total Lead Time
            </span>
            <div className="relative group/tip cursor-help">
              <Info className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-indigo-400 transition-colors" />
              <div className="absolute right-0 top-6 z-50 hidden group-hover/tip:block w-72 p-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg shadow-xl text-[11px] text-[var(--text-secondary)] leading-relaxed pointer-events-none">
                <strong className="text-[var(--text-primary)] block mb-1">PR Total Lead Time</strong>
                Total elapsed calendar wall-clock duration from initial PR opening (including any draft phase) to merge.
              </div>
            </div>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {headlineMetrics ? `${headlineMetrics.totalLeadTime.headlineHours}h` : '0h'}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)] font-mono">
              Median (Wall-Clock)
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono">
            <span>p90: {headlineMetrics?.totalLeadTime.wallClockHours.p90 ?? 0}h</span>
            <span>Avg: {headlineMetrics?.totalLeadTime.wallClockHours.average ?? 0}h</span>
          </div>
        </div>

        {/* Card 3: PRs Merged */}
        <div className="cortex-card p-5 space-y-3 relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              PRs Merged
            </span>
            <div className="relative group/tip cursor-help">
              <Info className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-indigo-400 transition-colors" />
              <div className="absolute right-0 top-6 z-50 hidden group-hover/tip:block w-72 p-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg shadow-xl text-[11px] text-[var(--text-secondary)] leading-relaxed pointer-events-none">
                <strong className="text-[var(--text-primary)] block mb-1">Pull Request Count</strong>
                The count of merged pull requests authored by a contributor or merged into a repository. Squash-merged PRs count as exactly 1. Excludes open, drafts, closed unmerged, and bot PRs.
              </div>
            </div>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {counts.mergedHumanPrs}
            </span>
            <span className="text-xs font-medium text-emerald-400 font-mono">
              Standard Merged
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono">
            <span>Evaluated: {counts.totalEvaluated}</span>
            <span>Open: {counts.openPrs}</span>
          </div>
        </div>

        {/* Card 4: Stale / Outlier PRs (>30d) - CLICKABLE */}
        <button
          onClick={() => setIsOutlierModalOpen(true)}
          className="cortex-card p-5 space-y-3 relative text-left hover:border-amber-500/50 transition-all cursor-pointer group focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <span>Stale Outliers (&gt;30d)</span>
            </span>
            <span className="text-[10px] text-amber-400 font-medium px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
              Click to View &rarr;
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
              {counts.staleOutliersCount}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)] font-mono">
              PRs &gt; 30 Days
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono">
            <span>Segregated from median</span>
            <span className="text-amber-400 font-medium group-hover:underline">Inspect list</span>
          </div>
        </button>
      </div>

      {/* ─── 2. Distribution View (Percentiles Chart) ──────────────── */}
      <div className="cortex-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Review Cycle Time Statistical Distribution (p25 / p50 / p75 / p90)</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Continuous wall-clock hours distribution for standard merged pull requests.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-[var(--text-secondary)]">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
              <span>Headline Median: <strong>{headlineMetrics?.reviewCycleTime.headlineHours ?? 0}h</strong></span>
            </span>
          </div>
        </div>

        {distributionData.every(d => d.hours === 0) ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-[var(--text-muted)] text-xs">
            <Clock className="w-8 h-8 opacity-40" />
            <p className="font-medium text-[var(--text-secondary)]">No merged pull requests available in this timeframe.</p>
            <p className="text-[11px]">When pull requests merge, wall-clock cycle time percentiles will populate automatically.</p>
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <XAxis
                  dataKey="name"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  unit="h"
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-strong)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value: any, _name: any, item: any) => [
                    `${value} wall-clock hours`,
                    item.payload.label || 'Duration',
                  ]}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {distributionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isHeadline ? '#6366F1' : '#3B82F6'}
                      opacity={entry.isHeadline ? 1 : 0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Backend Trendline Note Callout */}
        <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
          <span>
            ℹ️ <strong>Trend Line Status:</strong> Time-bucketed weekly historical progression is a planned analytics backend aggregation. Cortex renders grounded event snapshots without client-side interpolation.
          </span>
        </div>
      </div>

      {/* ─── 3. Per-Repository Breakdown & Size Context Table ───────── */}
      <div className="cortex-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Per-Repository Delivery & Size Context Breakdown</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Codebase module cycle times paired with multi-dimensional change size context.
            </p>
          </div>

          <span className="text-xs font-mono text-[var(--text-muted)]">
            {sortedRepoBreakdown.length} Repositories Evaluated
          </span>
        </div>

        {/* Mandatory Anti-Productivity Qualification Banner */}
        <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg flex items-center space-x-2.5 text-xs text-[var(--text-secondary)]">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-mono text-[11px] leading-relaxed">
            <strong>Notice:</strong> Engineering Activity — not a measure of individual productivity. Lines of code and files touched reflect repository module scope, not engineer output or impact.
          </span>
        </div>

        {sortedRepoBreakdown.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-[var(--text-muted)] text-xs">
            <Layers className="w-8 h-8 opacity-40" />
            <p className="font-medium text-[var(--text-secondary)]">
              {selectedRepo !== 'ALL'
                ? `Showing aggregate view for ${selectedRepo}. Select "All Repositories" to inspect multi-repository comparison.`
                : 'No repository-level PR breakdown available.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-lg">
            <table className="cortex-table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('repoName')}
                    className="cursor-pointer hover:text-[var(--text-primary)] select-none"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Repository</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('cycleTime')}
                    className="cursor-pointer hover:text-[var(--text-primary)] select-none text-right"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Cycle Time (p50)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('leadTime')}
                    className="cursor-pointer hover:text-[var(--text-primary)] select-none text-right"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Lead Time (p50)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('mergedHumanPrs')}
                    className="cursor-pointer hover:text-[var(--text-primary)] select-none text-right"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>PRs Merged</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('staleOutliers')}
                    className="cursor-pointer hover:text-[var(--text-primary)] select-none text-right"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Stale (&gt;30d)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('additions')}
                    className="cursor-pointer hover:text-[var(--text-primary)] select-none text-right"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Lines Added (+)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('deletions')}
                    className="cursor-pointer hover:text-[var(--text-primary)] select-none text-right"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Lines Deleted (-)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('files')}
                    className="cursor-pointer hover:text-[var(--text-primary)] select-none text-right"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Files Changed</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th>Sample Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedRepoBreakdown.map((r) => {
                  const isPartial = r.dataCompleteness === 'partial';
                  return (
                    <tr key={r.repoName || 'unknown'}>
                      <td className="font-semibold text-[var(--text-primary)] font-mono text-xs">
                        {r.repoName}
                      </td>
                      <td className="text-right font-mono text-xs text-[var(--text-primary)]">
                        {isPartial ? (
                          <span className="text-[var(--text-muted)] italic" title="Sample size <5 PRs">
                            {r.reviewCycleTime.headlineHours}h*
                          </span>
                        ) : (
                          `${r.reviewCycleTime.headlineHours}h`
                        )}
                      </td>
                      <td className="text-right font-mono text-xs text-[var(--text-secondary)]">
                        {r.totalLeadTime.headlineHours}h
                      </td>
                      <td className="text-right font-mono text-xs font-semibold text-[var(--text-primary)]">
                        {r.counts.mergedHumanPrs}
                      </td>
                      <td className="text-right font-mono text-xs">
                        {r.counts.staleOutliersCount > 0 ? (
                          <span className="text-amber-400 font-semibold">
                            {r.counts.staleOutliersCount}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">0</span>
                        )}
                      </td>
                      <td className="text-right font-mono text-xs text-emerald-400">
                        +{r.sizeContext.totalAdditions.toLocaleString()}
                      </td>
                      <td className="text-right font-mono text-xs text-rose-400">
                        -{r.sizeContext.totalDeletions.toLocaleString()}
                      </td>
                      <td className="text-right font-mono text-xs text-[var(--text-secondary)]">
                        {r.sizeContext.totalFilesChanged.toLocaleString()}
                      </td>
                      <td>
                        {isPartial ? (
                          <span
                            className="cortex-badge badge-moderate text-[10px]"
                            title="Sample size <5 merged PRs"
                          >
                            Small Sample ({r.sampleSize})
                          </span>
                        ) : (
                          <span className="cortex-badge badge-healthy text-[10px]">
                            Complete ({r.sampleSize})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 4. Noise & Bot Transparency Footnote ──────────────────── */}
      <div className="p-4 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-muted)] font-mono">
        <div className="flex items-center space-x-2">
          <Bot className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
          <span>
            <strong>Noise Filtering:</strong> {counts.mergedBotPrs} automated bot PR{counts.mergedBotPrs === 1 ? '' : 's'} excluded from headline stats.
          </span>
        </div>
        <div className="flex items-center space-x-4 text-[11px]">
          <span>Closed unmerged: {counts.closedUnmergedPrs}</span>
          <span>Open PRs: {counts.openPrs}</span>
          <span>Total evaluated: {counts.totalEvaluated}</span>
        </div>
      </div>

      {/* ─── Outlier Modal Dialog ──────────────────────────────────── */}
      <OutlierPrModal
        isOpen={isOutlierModalOpen}
        onClose={() => setIsOutlierModalOpen(false)}
        outliers={headlineMetrics?.staleOutliers || []}
        repoName={selectedRepo === 'ALL' ? undefined : selectedRepo}
      />
    </div>
  );
};
