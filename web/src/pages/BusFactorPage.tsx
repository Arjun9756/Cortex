import React, { useEffect, useState } from 'react';
import { getBusFactor, getRepositoryDetails, type RepoMetric, type RepositoryDetails } from '../lib/api';
import { ShieldAlert, AlertTriangle, UserCheck, Code, Layers, RefreshCw, ArrowRight } from 'lucide-react';
import { RepoDetailModal } from '../components/RepoDetailModal';

import { RISK_THRESHOLDS } from '../constants/riskThresholds';

interface BusFactorPageProps {
  onSyncUpdated?: (date: Date) => void;
}

export const BusFactorPage: React.FC<BusFactorPageProps> = ({ onSyncUpdated }) => {
  const [repos, setRepos] = useState<RepoMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse bg-[var(--bg-app)] min-h-screen">
        <div className="h-6 w-56 bg-[var(--bg-panel)] rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <span>Bus Factor & Repository Vulnerability</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Repositories ranked by single point of failure risk. Click any repository card to inspect maintainers and candidate backups.
          </p>
        </div>
        <button
          onClick={() => fetchBusFactor()}
          className="px-2.5 py-1 bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md flex items-center space-x-1.5 cursor-pointer transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Empty Cold-Start State */}
      {repos.length === 0 ? (
        <div className="p-10 text-center space-y-2.5 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg">
          <Layers className="h-8 w-8 text-slate-500 mx-auto" />
          <h4 className="text-sm font-semibold text-[var(--text-secondary)]">No Repository Metrics Populated Yet</h4>
          <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
            Metrics are generated by the nightly cron worker or webhook events. Once repository activities are indexed, bus factor calculations will appear here.
          </p>
        </div>
      ) : (
        /* Repository Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.map(repo => {
            const isEmpty = repo.status === 'empty' || repo.status === 'scaffold' || (Number(repo.bus_factor) === 0 && Number(repo.risk_score) === 0);
            const isSPOF = !isEmpty && Number(repo.bus_factor) <= 1;
            const risk = Number(repo.risk_score ?? 0);
            const isCritical = risk >= RISK_THRESHOLDS.CRITICAL;
            const isHigh = risk >= RISK_THRESHOLDS.HIGH;

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
                className={`bg-[var(--bg-panel)] p-4 rounded-lg border transition-colors flex flex-col justify-between space-y-3 cursor-pointer group hover:bg-[var(--bg-elevated)] ${
                  isEmpty
                    ? 'border-[var(--border-subtle)]'
                    : isSPOF
                    ? 'border-rose-500/30 hover:border-rose-500/50'
                    : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      Bus Factor: <strong className="text-[var(--text-primary)] font-bold">{repo.bus_factor !== undefined && repo.bus_factor !== null ? repo.bus_factor : 'N/A'}</strong>
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        isEmpty
                          ? 'bg-[var(--status-empty-bg)] text-[var(--status-empty)] border-[var(--status-empty-border)]'
                          : isCritical || isSPOF
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : isHigh
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isEmpty ? 'Scaffold / Empty' : `Risk ${risk}%`}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[var(--text-primary)] mt-2.5 flex items-center justify-between group-hover:text-indigo-300 transition-colors">
                    <div className="flex items-center space-x-2">
                      <Code className="h-4 w-4 text-indigo-400" />
                      <span>{repo.repo_name}</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </h4>

                  {isEmpty ? (
                    <div className="flex items-center space-x-1.5 text-xs text-[var(--text-muted)] mt-1.5">
                      <Layers className="h-3.5 w-3.5 text-slate-500" />
                      <span>No commits / scaffold repository</span>
                    </div>
                  ) : repo.primary_owner ? (
                    <div className="flex items-center space-x-1.5 text-xs text-[var(--text-secondary)] mt-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                      <span>Primary: <strong className="text-[var(--text-primary)] font-medium">{repo.primary_owner}</strong></span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-xs text-[var(--text-muted)] mt-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                      <span>Single maintainer codebase</span>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
                  <span>Contributors: <strong className="text-[var(--text-primary)]">{repo.contributor_count ?? 0}</strong></span>
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
