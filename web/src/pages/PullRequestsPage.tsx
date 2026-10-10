import React, { useState, useEffect, useMemo } from 'react';
import {
  GitPullRequest,
  Clock,
  AlertTriangle,
  RefreshCw,
  Info,
  Bot,
  Layers,
  ArrowUpDown,
  AlertCircle,
  ChevronLeft,
  ChevronRight
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
  type RepoMetric,
  type EvaluatedPrItem
} from '../lib/api';
import { OutlierPrModal } from '../components/OutlierPrModal';

export function formatPrDuration(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '—';
  if (hours <= 0) return '0h';
  if (hours < 0.1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return `${mins}m (${hours.toFixed(2)}h)`;
  }
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m (${hours.toFixed(1)}h)`;
  }
  return `${Math.round(hours * 10) / 10}h`;
}

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

  // Table Sorting & Pagination
  const [sortField, setSortField] = useState<string>('mergedHumanPrs');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Load available repositories list once
  useEffect(() => {
    async function loadRepos() {
      try {
        const res = await getBusFactor();
        if (res.repos && res.repos.length > 0) {
          const names = res.repos.map((r: RepoMetric) => r.repo_name).filter(Boolean);
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
        if (res.repoBreakdown && res.repoBreakdown.length > 0) {
          const breakdownNames = res.repoBreakdown.map((r: any) => r.repoName).filter(Boolean);
          setAvailableRepos(prev => [...new Set([...prev, ...breakdownNames])]);
        }
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
    setCurrentPage(1);
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
              {headlineMetrics ? formatPrDuration(headlineMetrics.reviewCycleTime.headlineHours) : '0h'}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)] font-mono">
              Median (Wall-Clock)
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono">
            <span>p90: {headlineMetrics ? formatPrDuration(headlineMetrics.reviewCycleTime.wallClockHours.p90) : '0h'}</span>
            <span>IQR: {headlineMetrics ? formatPrDuration(headlineMetrics.reviewCycleTime.wallClockHours.p75 - headlineMetrics.reviewCycleTime.wallClockHours.p25) : '0h'}</span>
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
              {headlineMetrics ? formatPrDuration(headlineMetrics.totalLeadTime.headlineHours) : '0h'}
            </span>
            <span className="text-xs font-medium text-[var(--text-muted)] font-mono">
              Median (Wall-Clock)
            </span>
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono">
            <span>p90: {headlineMetrics ? formatPrDuration(headlineMetrics.totalLeadTime.wallClockHours.p90) : '0h'}</span>
            <span>Avg: {headlineMetrics ? formatPrDuration(headlineMetrics.totalLeadTime.wallClockHours.average) : '0h'}</span>
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
              <span>Headline Median: <strong>{formatPrDuration(headlineMetrics?.reviewCycleTime.headlineHours)}</strong></span>
            </span>
          </div>
        </div>

        {counts.mergedHumanPrs === 0 && (!includeBots || counts.mergedBotPrs === 0) ? (
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
                    `${formatPrDuration(Number(value))}`,
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
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span><strong>Trend Line Status:</strong> Time-bucketed weekly historical progression is a planned analytics backend aggregation. Cortex renders grounded event snapshots without client-side interpolation.</span>
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
                            {formatPrDuration(r.reviewCycleTime.headlineHours)}*
                          </span>
                        ) : (
                          formatPrDuration(r.reviewCycleTime.headlineHours)
                        )}
                      </td>
                      <td className="text-right font-mono text-xs text-[var(--text-secondary)]">
                        {formatPrDuration(r.totalLeadTime.headlineHours)}
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

      {/* ─── 4. Evaluated Pull Requests Activity Log ───────────────── */}
      <div className="cortex-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center space-x-2">
              <GitPullRequest className="w-4 h-4 text-indigo-400" />
              <span>Evaluated Pull Requests Activity Log</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Live audit trail of all pull requests evaluated across active repositories.
            </p>
          </div>

          <span className="text-xs font-mono text-[var(--text-muted)]">
            {(headlineMetrics?.evaluatedPrs || []).length} Pull Requests Logged
          </span>
        </div>

        {(() => {
          const allPrs = headlineMetrics?.evaluatedPrs || [];
          const totalItems = allPrs.length;
          const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
          const startIndex = (currentPage - 1) * pageSize;
          const paginatedPrs = allPrs.slice(startIndex, startIndex + pageSize);

          if (totalItems === 0) {
            return (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-[var(--text-muted)] text-xs">
                <GitPullRequest className="w-8 h-8 opacity-40" />
                <p className="font-medium text-[var(--text-secondary)]">No pull requests evaluated in this timeframe.</p>
                <p className="text-[11px]">Open or merge a pull request on a connected repository to see it tracked here in real time.</p>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-lg">
                <table className="cortex-table">
                  <thead>
                    <tr>
                      <th>PR # &amp; Title</th>
                      <th>Repository</th>
                      <th>Author</th>
                      <th>Merged By</th>
                      <th>Reviewers</th>
                      <th>State</th>
                      <th className="text-right">Review Cycle Time</th>
                      <th className="text-right">Total Lead Time</th>
                      <th className="text-right">Changes</th>
                      <th>Created At</th>
                      <th>Merged / Closed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPrs.map((pr: EvaluatedPrItem) => {
                      const stateBadge = pr.state === 'merged' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : pr.state === 'open'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20';

                      const formatTimestamp = (iso: string | null | undefined) => {
                        if (!iso) return '—';
                        const d = new Date(iso);
                        return isNaN(d.getTime()) ? '—' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      };

                      return (
                        <tr key={pr.prId || `${pr.repoName}#${pr.number}`}>
                          <td>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-indigo-400">#{pr.number}</span>
                              <span className="font-medium text-xs text-[var(--text-primary)] max-w-xs truncate" title={pr.title}>
                                {pr.title}
                              </span>
                              {pr.isDraft && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                  Draft
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="font-mono text-xs text-[var(--text-secondary)]">
                            {pr.repoName}
                          </td>
                          <td className="text-xs text-[var(--text-secondary)]">
                            <div className="flex flex-col">
                              <div className="flex items-center space-x-1">
                                <span className="font-mono font-medium text-[var(--text-primary)]">{pr.author}</span>
                                {pr.isBot && <span className="text-[10px] text-amber-400 font-semibold">[BOT]</span>}
                              </div>
                              {pr.authorEmail && (
                                <span className="text-[10px] font-mono text-[var(--text-muted)] truncate max-w-[140px]" title={pr.authorEmail}>
                                  {pr.authorEmail}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-xs text-[var(--text-secondary)]">
                            {pr.state === 'merged' && (pr.mergedBy || pr.mergerEmail) ? (
                              <div className="flex flex-col">
                                <span className="font-mono text-[var(--text-primary)]">{pr.mergedBy || 'Merger'}</span>
                                {pr.mergerEmail && (
                                  <span className="text-[10px] font-mono text-[var(--text-muted)] truncate max-w-[140px]" title={pr.mergerEmail}>
                                    {pr.mergerEmail}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)] font-mono">—</span>
                            )}
                          </td>
                          <td className="text-xs text-[var(--text-secondary)]">
                            {pr.reviewers && pr.reviewers.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[180px]">
                                {pr.reviewers.map((rev, rIdx) => (
                                  <span
                                    key={rIdx}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700"
                                    title={rev.email ? `${rev.name} <${rev.email}>` : rev.name}
                                  >
                                    {rev.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)] font-mono text-[11px]">None assigned</span>
                            )}
                          </td>
                          <td>
                            <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border ${stateBadge}`}>
                              {pr.state}
                            </span>
                          </td>
                          <td className="text-right font-mono text-xs font-semibold text-[var(--text-primary)]">
                            {pr.state === 'merged' ? formatPrDuration(pr.reviewTimeWallClockHours) : '—'}
                          </td>
                          <td className="text-right font-mono text-xs text-[var(--text-secondary)]">
                            {pr.state === 'merged' ? formatPrDuration(pr.totalLeadTimeHours) : '—'}
                          </td>
                          <td className="text-right font-mono text-xs">
                            <span className="text-emerald-400">+{pr.additions}</span>
                            <span className="text-[var(--text-muted)] mx-1">/</span>
                            <span className="text-rose-400">-{pr.deletions}</span>
                          </td>
                          <td className="font-mono text-xs text-[var(--text-muted)]">
                            {formatTimestamp(pr.createdAt)}
                          </td>
                          <td className="font-mono text-xs text-[var(--text-muted)]">
                            {formatTimestamp(pr.mergedAt || pr.closedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                  <div className="flex items-center space-x-3">
                    <span>
                      Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, totalItems)}</strong> of <strong>{totalItems}</strong> pull requests
                    </span>
                    <span className="text-slate-600">|</span>
                    <label className="flex items-center space-x-1.5">
                      <span>Per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded px-2 py-0.5 text-xs text-[var(--text-primary)] focus:outline-none"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="px-2.5 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--border-subtle)] transition-colors flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    <span className="font-mono text-xs text-[var(--text-secondary)] px-2">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className="px-2.5 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--border-subtle)] transition-colors flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ─── 5. Noise & Bot Transparency Footnote ──────────────────── */}
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
