import React, { useEffect, useState } from 'react';
import { getTechnologies, type TechnologyMetric } from '../lib/api';
import { Cpu, AlertTriangle, RefreshCw, FolderGit2, Users } from 'lucide-react';

interface TechnologiesPageProps {
  onSyncUpdated?: (date: Date) => void;
}

export const TechnologiesPage: React.FC<TechnologiesPageProps> = ({ onSyncUpdated }) => {
  const [technologies, setTechnologies] = useState<TechnologyMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-[var(--bg-elevated)] rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-36 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)]"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[var(--accent-default)]" />
            <span>Technology Stack & Adoption Metrics</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Usage density across workspace repositories and contributing engineers.
          </p>
        </div>
        <button
          onClick={fetchTech}
          className="cortex-btn-secondary px-3 py-1.5 text-xs rounded-md flex items-center space-x-1.5 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {technologies.length === 0 ? (
        <div className="cortex-card p-12 text-center space-y-3">
          <Cpu className="h-10 w-10 text-[var(--text-muted)] mx-auto" />
          <h4 className="text-base font-semibold text-[var(--text-primary)]">No Technology Metrics Indexed Yet</h4>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            Technologies are automatically detected from repository files, commits, and PR events during analytical calculations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {technologies.map(tech => {
            const name = tech.tech_name || tech.technology_name || 'Technology';
            const usagePct = tech.usage_percent ?? 0;
            return (
              <div
                key={name}
                className="cortex-card p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">{name}</h4>
                    <span className="text-xs font-mono font-medium text-[var(--accent-default)] bg-[var(--bg-subtle)] border border-[var(--border-subtle)] px-2 py-0.5 rounded">
                      {usagePct}% Usage
                    </span>
                  </div>

                  <div className="w-full bg-[var(--bg-subtle)] h-1.5 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-[var(--accent-default)] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(3, usagePct))}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center space-x-1.5">
                    <FolderGit2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>{tech.repo_count ?? 0} {tech.repo_count === 1 ? 'Repo' : 'Repos'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    <span>{tech.contributor_count ?? 0} {tech.contributor_count === 1 ? 'Contributor' : 'Contributors'}</span>
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
