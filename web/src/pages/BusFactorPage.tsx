import React, { useEffect, useState, useMemo } from 'react';
import { getBusFactor, getRepositoryDetails, type RepoMetric, type RepositoryDetails } from '../lib/api';
import {
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  Code,
  Layers,
  RefreshCw,
  ArrowRight,
  GitCommit,
  Search,
  Users,
  ShieldCheck
} from 'lucide-react';
import { RepoDetailModal } from '../components/RepoDetailModal';
import { RISK_THRESHOLDS } from '../constants/riskThresholds';

interface BusFactorPageProps {
  onSyncUpdated?: (date: Date) => void;
}

export const BusFactorPage: React.FC<BusFactorPageProps> = ({ onSyncUpdated }) => {
  const [repos, setRepos] = useState<RepoMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'spof' | 'healthy' | 'empty'>('all');

  // Detail Modal state
  const [selectedRepoDetails, setSelectedRepoDetails] = useState<RepositoryDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const fetchBusFactor = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBusFactor();
      setRepos(data.repos || []);
      if (onSyncUpdated) {
        onSyncUpdated(new Date());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Bus Factor data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (repoName: string) => {
    setIsModalOpen(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedRepoDetails(null);
    try {
      const details = await getRepositoryDetails(repoName);
      setSelectedRepoDetails(details);
    } catch (err: any) {
      setDetailsError(err.message || `Failed to fetch details for ${repoName}`);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRepoDetails(null);
    setDetailsError(null);
  };

  useEffect(() => {
    fetchBusFactor();
  }, []);

  // Compute Executive KPI Stats
  const stats = useMemo(() => {
    const totalRepos = repos.length;
    const activeRepos = repos.filter(
      r => r.status !== 'empty' && r.status !== 'scaffold' && (Number(r.bus_factor) > 0 || Number(r.commit_count) > 0)
    );
    const spofRepos = activeRepos.filter(r => Number(r.bus_factor) <= 1);
    const healthyRepos = activeRepos.filter(r => Number(r.bus_factor) >= 2);
    const emptyRepos = repos.filter(
      r => r.status === 'empty' || r.status === 'scaffold' || (Number(r.bus_factor) === 0 && Number(r.commit_count ?? 0) === 0)
    );

    const totalCommits = repos.reduce((sum, r) => sum + Number(r.commit_count ?? 0), 0);
    const avgBusFactor = activeRepos.length > 0
      ? activeRepos.reduce((sum, r) => sum + Number(r.bus_factor ?? 1), 0) / activeRepos.length
      : 0;

    return {
      totalRepos,
      activeReposCount: activeRepos.length,
      spofCount: spofRepos.length,
      healthyCount: healthyRepos.length,
      emptyCount: emptyRepos.length,
      totalCommits,
      avgBusFactor: Number(avgBusFactor.toFixed(1))
    };
  }, [repos]);

  // Filtered and Searched Repositories
  const filteredRepos = useMemo(() => {
    return repos.filter(repo => {
      const isEmpty = repo.status === 'empty' || repo.status === 'scaffold' || (Number(repo.bus_factor) === 0 && Number(repo.commit_count ?? 0) === 0);
      const isSPOF = !isEmpty && Number(repo.bus_factor) <= 1;
      const isHealthy = !isEmpty && Number(repo.bus_factor) >= 2;

      if (filterMode === 'spof' && !isSPOF) return false;
      if (filterMode === 'healthy' && !isHealthy) return false;
      if (filterMode === 'empty' && !isEmpty) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = repo.repo_name.toLowerCase().includes(query);
        const matchesOwner = (repo.primary_owner || '').toLowerCase().includes(query);
        const matchesTech = Array.isArray(repo.technologies) && repo.technologies.some(t => t.toLowerCase().includes(query));
        return matchesName || matchesOwner || matchesTech;
      }

      return true;
    });
  }, [repos, filterMode, searchQuery]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse bg-[var(--bg-app)] min-h-screen">
        <div className="h-6 w-56 bg-[var(--bg-panel)] rounded"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-56 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 bg-[var(--bg-app)] min-h-screen">
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3 text-rose-300">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-[var(--text-primary)]">Failed to Load Bus Factor Metrics</h4>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchBusFactor()}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-md flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[var(--bg-app)] min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <span>Repositories & Single Points of Failure (SPOF)</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
            Executive governance dashboard tracking commit volumes, ownership concentration, and candidate backup coverage.
          </p>
        </div>
        <button
          onClick={() => fetchBusFactor()}
          className="px-3 py-1.5 bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md flex items-center space-x-1.5 cursor-pointer transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* ─── EXECUTIVE KPI SUMMARY STRIP ───────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>Total Repositories</span>
            <Code className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {stats.totalRepos}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            {stats.activeReposCount} active microservices
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>Critical SPOFs</span>
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 tracking-tight flex items-center gap-1.5">
            <span>{stats.spofCount}</span>
            <span className="text-xs font-mono text-rose-300 font-semibold px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30">
              Bus Factor = 1
            </span>
          </div>
          <div className="text-[11px] text-rose-300/80">
            Sole maintainer vulnerabilities
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>Healthy Services</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 tracking-tight flex items-center gap-1.5">
            <span>{stats.healthyCount}</span>
            <span className="text-xs font-mono text-emerald-300 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
              BF ≥ 2.0
            </span>
          </div>
          <div className="text-[11px] text-emerald-300/80">
            Distributed knowledge teams
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>Avg Bus Factor</span>
            <Users className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400 tracking-tight">
            {stats.avgBusFactor}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Target: ≥ 2.0 per repo
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>Total Commits</span>
            <GitCommit className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {stats.totalCommits}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Indexed across repository graph
          </div>
        </div>
      </div>

      {/* ─── CONTROLS: FILTERS & INSTANT SEARCH ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            All Repositories ({stats.totalRepos})
          </button>
          <button
            onClick={() => setFilterMode('spof')}
            className={`px-3 py-1.5 rounded-md border font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
              filterMode === 'spof'
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-rose-300'
            }`}
          >
            <ShieldAlert className="h-3 w-3 text-rose-400" />
            <span>Critical SPOFs ({stats.spofCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('healthy')}
            className={`px-3 py-1.5 rounded-md border font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
              filterMode === 'healthy'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-emerald-300'
            }`}
          >
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            <span>Healthy ({stats.healthyCount})</span>
          </button>
          <button
            onClick={() => setFilterMode('empty')}
            className={`px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
              filterMode === 'empty'
                ? 'bg-slate-700/30 border-slate-600 text-slate-200'
                : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Scaffold / Empty ({stats.emptyCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search repo, owner, or tech..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-panel)] border border-[var(--border-subtle)] focus:border-indigo-500 rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors font-mono"
          />
        </div>
      </div>

      {/* Empty Cold-Start State */}
      {repos.length === 0 ? (
        <div className="p-12 text-center space-y-2.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg">
          <Layers className="h-8 w-8 text-slate-500 mx-auto" />
          <h4 className="text-sm font-semibold text-[var(--text-secondary)]">No Repository Metrics Populated Yet</h4>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Metrics are generated by webhook events and analytics calculations. Once repository activities are indexed, bus factor calculations will appear here.
          </p>
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="p-12 text-center space-y-2.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg">
          <Search className="h-8 w-8 text-slate-500 mx-auto" />
          <h4 className="text-sm font-semibold text-[var(--text-secondary)]">No Repositories Match Filters</h4>
          <p className="text-xs text-[var(--text-muted)]">
            Try adjusting your search query or filter selection above.
          </p>
        </div>
      ) : (
        /* Repository Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRepos.map(repo => {
            const isEmpty = repo.status === 'empty' || repo.status === 'scaffold' || (Number(repo.bus_factor) === 0 && Number(repo.commit_count ?? 0) === 0);
            const isSPOF = !isEmpty && Number(repo.bus_factor) <= 1;
            const risk = Number(repo.risk_score ?? 0);
            const isCritical = risk >= RISK_THRESHOLDS.CRITICAL;
            const isHigh = risk >= RISK_THRESHOLDS.HIGH;
            const technologies = Array.isArray(repo.technologies) ? repo.technologies : [];
            const topContribs = Array.isArray(repo.top_contributors) ? repo.top_contributors : [];

            return (
              <div
                key={repo.external_id || repo.repo_name}
                role="button"
                tabIndex={0}
                aria-label={`Inspect repository details for ${repo.repo_name}`}
                onClick={() => handleOpenDetails(repo.repo_name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenDetails(repo.repo_name);
                  }
                }}
                className={`bg-[var(--bg-panel)] p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3.5 cursor-pointer group hover:bg-[var(--bg-elevated)] ${
                  isEmpty
                    ? 'border-[var(--border-subtle)] opacity-70 hover:opacity-100'
                    : isSPOF
                    ? 'border-rose-500/40 hover:border-rose-500/60 shadow-lg shadow-rose-950/20'
                    : 'border-[var(--border-subtle)] hover:border-indigo-500/40'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header: Bus Factor Badge & Risk Tag */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                      isSPOF 
                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 font-bold' 
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                    }`}>
                      Bus Factor: <strong className={isSPOF ? 'text-rose-400 font-extrabold' : 'text-[var(--text-primary)] font-bold'}>
                        {repo.bus_factor !== undefined && repo.bus_factor !== null ? repo.bus_factor : 'N/A'}
                      </strong>
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        isEmpty
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : isCritical || isSPOF
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : isHigh
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isEmpty ? 'Scaffold / Empty' : isSPOF ? `CRITICAL SPOF • Risk ${risk}%` : `Risk ${risk}%`}
                    </span>
                  </div>

                  {/* Repository Title */}
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center justify-between group-hover:text-indigo-300 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Code className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span className="truncate">{repo.repo_name}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                  </h4>

                  {/* CTO Governance Highlights: Commits & Primary Ownership */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center space-x-2">
                      <GitCommit className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-[var(--text-muted)] block uppercase">Volume</span>
                        <strong className="text-[var(--text-primary)] font-bold">
                          {repo.commit_count ?? 0} {repo.commit_count === 1 ? 'Commit' : 'Commits'}
                        </strong>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center space-x-2">
                      <UserCheck className={`h-3.5 w-3.5 shrink-0 ${isSPOF ? 'text-rose-400' : 'text-amber-400'}`} />
                      <div className="truncate">
                        <span className="text-[10px] text-[var(--text-muted)] block uppercase">Ownership</span>
                        <span className="text-[var(--text-primary)] font-medium truncate block">
                          {repo.primary_owner ? (
                            <>
                              <strong className="font-bold">{repo.primary_owner}</strong>
                              {repo.primary_owner_percentage !== undefined && repo.primary_owner_percentage > 0 && (
                                <span className="text-[10px] text-[var(--text-muted)] ml-1">
                                  ({repo.primary_owner_percentage}%)
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-500">None (Empty)</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tech Stack Pills */}
                  {technologies.length > 0 ? (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                        Tech Stack
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {technologies.slice(0, 4).map((tech, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-indigo-300 border border-[var(--border-subtle)]"
                          >
                            {tech}
                          </span>
                        ))}
                        {technologies.length > 4 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            +{technologies.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  ) : isEmpty ? (
                    <div className="text-[11px] text-slate-500 font-mono italic">
                      Zero commits recorded in this repository.
                    </div>
                  ) : null}

                  {/* Top Contributors Snapshot */}
                  {topContribs.length > 1 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                        Contributors Share
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono text-[var(--text-muted)]">
                        {topContribs.slice(0, 3).map((c, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)]">
                            {c.person}: <strong className="text-[var(--text-secondary)]">{c.percentage}%</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
                  <div className="flex items-center space-x-1.5">
                    <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>
                      <strong className="text-[var(--text-primary)]">{repo.contributor_count ?? 0}</strong>{' '}
                      {repo.contributor_count === 1 ? 'Contributor' : 'Contributors'}
                    </span>
                  </div>
                  <span className="text-[11px] font-sans font-medium text-indigo-400 group-hover:underline flex items-center gap-0.5">
                    <span>Inspect</span>
                    <span>→</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deep Inspection Detail Modal */}
      {isModalOpen && (
        <RepoDetailModal
          details={selectedRepoDetails}
          loading={detailsLoading}
          error={detailsError}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
