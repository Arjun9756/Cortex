import React, { useEffect, useState, useMemo } from 'react';
import { getTechnologies, type TechnologyMetric } from '../lib/api';
import {
  Cpu,
  AlertTriangle,
  RefreshCw,
  FolderGit2,
  Users,
  Search,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface TechnologiesPageProps {
  onSyncUpdated?: (date: Date) => void;
}

export const TechnologiesPage: React.FC<TechnologiesPageProps> = ({ onSyncUpdated }) => {
  const [technologies, setTechnologies] = useState<TechnologyMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'high-adoption' | 'single-expert' | 'multi-repo'>('all');

  const fetchTech = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTechnologies();
      setTechnologies(data.technologies || []);
      if (onSyncUpdated) {
        onSyncUpdated(new Date());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch technologies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTech();
  }, []);

  // Compute Summary KPIs
  const stats = useMemo(() => {
    const totalTech = technologies.length;
    const singleExpertCount = technologies.filter(t => (t.contributor_count ?? 0) === 1).length;
    const multiRepoCount = technologies.filter(t => (t.repo_count ?? 0) >= 3).length;
    const highAdoptionCount = technologies.filter(t => (t.usage_percent ?? 0) >= 30).length;

    // Unique repos across all tech
    const allRepoNames = new Set<string>();
    technologies.forEach(t => {
      if (Array.isArray(t.repos)) {
        t.repos.forEach(r => allRepoNames.add(r));
      }
    });

    return {
      totalTech,
      singleExpertCount,
      multiRepoCount,
      highAdoptionCount,
      uniqueReposCovered: allRepoNames.size
    };
  }, [technologies]);

  // Filtered & Searched Technologies
  const filteredTech = useMemo(() => {
    return technologies.filter(tech => {
      const name = (tech.tech_name || tech.technology_name || '').toLowerCase();
      const repos = Array.isArray(tech.repos) ? tech.repos : [];
      const usage = tech.usage_percent ?? 0;
      const contribs = tech.contributor_count ?? 0;
      const repoCount = tech.repo_count ?? 0;

      if (filterMode === 'high-adoption' && usage < 30) return false;
      if (filterMode === 'single-expert' && contribs !== 1) return false;
      if (filterMode === 'multi-repo' && repoCount < 3) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = name.includes(query);
        const matchesRepo = repos.some(r => r.toLowerCase().includes(query));
        return matchesName || matchesRepo;
      }

      return true;
    });
  }, [technologies, filterMode, searchQuery]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse bg-[var(--bg-app)] min-h-screen">
        <div className="h-6 w-64 bg-[var(--bg-panel)] rounded"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 bg-[var(--bg-app)] min-h-screen">
        <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-3 text-rose-300">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] text-sm">Failed to Load Technology Metrics</h4>
              <p className="text-xs text-rose-300/80 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchTech}
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
    <div className="p-6 md:p-8 space-y-6 bg-[var(--bg-app)] min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[var(--accent-default)]" />
            <span>Technology Stack & Adoption Metrics</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
            Direct codebase usage density, multi-repo footprint, and contributing engineers across the organization.
          </p>
        </div>
        <button
          onClick={fetchTech}
          className="cortex-btn-secondary px-3 py-1.5 text-xs rounded-md flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* ─── SUMMARY KPI CARDS ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>Total Technologies</span>
            <Cpu className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {stats.totalTech}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Identified across codebase
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>Repos With Tech Data</span>
            <FolderGit2 className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400 tracking-tight">
            {stats.uniqueReposCovered}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Active repositories linked
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>High Adoption Core (≥30%)</span>
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">
            {stats.highAdoptionCount}
          </div>
          <div className="text-[11px] text-emerald-300/80">
            Widespread enterprise standards
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
            <span>Single-Expert Risk</span>
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 tracking-tight flex items-center gap-1.5">
            <span>{stats.singleExpertCount}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
              1 Expert
            </span>
          </div>
          <div className="text-[11px] text-amber-300/80">
            Knowledge concentration risk
          </div>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            All Tech ({stats.totalTech})
          </button>
          <button
            onClick={() => setFilterMode('high-adoption')}
            className={`px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
              filterMode === 'high-adoption'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-emerald-300'
            }`}
          >
            High Adoption ({stats.highAdoptionCount})
          </button>
          <button
            onClick={() => setFilterMode('single-expert')}
            className={`px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
              filterMode === 'single-expert'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-amber-300'
            }`}
          >
            Single-Expert ({stats.singleExpertCount})
          </button>
          <button
            onClick={() => setFilterMode('multi-repo')}
            className={`px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
              filterMode === 'multi-repo'
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                : 'bg-[var(--bg-panel)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-purple-300'
            }`}
          >
            Multi-Repo ({stats.multiRepoCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search technology or repo name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-panel)] border border-[var(--border-subtle)] focus:border-indigo-500 rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors font-mono"
          />
        </div>
      </div>

      {/* Technology Cards Grid */}
      {technologies.length === 0 ? (
        <div className="cortex-card p-12 text-center space-y-3">
          <Cpu className="h-10 w-10 text-[var(--text-muted)] mx-auto" />
          <h4 className="text-base font-semibold text-[var(--text-primary)]">No Technology Metrics Indexed Yet</h4>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            Technologies are automatically detected from repository files, commits, and PR events during analytical calculations.
          </p>
        </div>
      ) : filteredTech.length === 0 ? (
        <div className="cortex-card p-12 text-center space-y-2">
          <Search className="h-8 w-8 text-slate-500 mx-auto" />
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">No Technologies Match Filters</h4>
          <p className="text-xs text-[var(--text-muted)]">
            Try adjusting your search query or filter selection above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTech.map(tech => {
            const name = tech.tech_name || tech.technology_name || 'Technology';
            const usagePct = Number(tech.usage_percent ?? 0);
            const repoCount = Number(tech.repo_count ?? 0);
            const contribCount = Number(tech.contributor_count ?? 0);
            const repos = Array.isArray(tech.repos) ? tech.repos : [];
            const isSingleExpert = contribCount === 1;

            return (
              <div
                key={name}
                className="cortex-card p-4 flex flex-col justify-between space-y-3.5 hover:border-indigo-500/40 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[var(--text-primary)] tracking-tight truncate">
                      {name}
                    </h4>
                    <span className="text-xs font-mono font-medium text-cyan-400 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-2 py-0.5 rounded shrink-0">
                      {usagePct}% Usage
                    </span>
                  </div>

                  {/* Usage Meter */}
                  <div className="w-full bg-[var(--bg-subtle)] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        usagePct >= 40
                          ? 'bg-emerald-500'
                          : usagePct >= 20
                          ? 'bg-indigo-500'
                          : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(4, usagePct))}%` }}
                    />
                  </div>

                  {/* Single Expert Vulnerability Tag */}
                  {isSingleExpert && (
                    <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center space-x-1.5 text-[11px] text-amber-300">
                      <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                      <span>Single maintainer knowledge concentration</span>
                    </div>
                  )}

                  {/* Associated Repositories Badges */}
                  {repos.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                        Used in Repositories ({repos.length})
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {repos.slice(0, 3).map((r, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] truncate max-w-[180px]"
                            title={r}
                          >
                            {r.split('/').pop() || r}
                          </span>
                        ))}
                        {repos.length > 3 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            +{repos.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer with Real Repo & Contributor Counts */}
                <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)] font-mono">
                  <div className="flex items-center space-x-1.5">
                    <FolderGit2 className="h-3.5 w-3.5 text-cyan-400" />
                    <span>
                      <strong className="text-[var(--text-primary)]">{repoCount}</strong> {repoCount === 1 ? 'Repo' : 'Repos'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-400" />
                    <span>
                      <strong className="text-[var(--text-primary)]">{contribCount}</strong> {contribCount === 1 ? 'Contributor' : 'Contributors'}
                    </span>
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
