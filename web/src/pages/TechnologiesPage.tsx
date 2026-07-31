import React, { useEffect, useState } from 'react';
import { getTechnologies, type TechnologyMetric } from '../lib/api';
import { Cpu, AlertTriangle, RefreshCw, FolderGit2, Users } from 'lucide-react';

export const TechnologiesPage: React.FC = () => {
  const [technologies, setTechnologies] = useState<TechnologyMetric[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTech = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTechnologies();
      setTechnologies(data.technologies || []);
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
        <div className="h-8 w-64 bg-slate-800 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-slate-900/80 rounded-xl border border-slate-800"></div>
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
              <h4 className="font-semibold text-white">Failed to Load Technology Metrics</h4>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchTech}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-lg flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
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
          <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="h-6 w-6 text-indigo-400" />
            <span>Technology Stack & Adoption Metrics</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Usage density across workspace repositories and contributing engineers.
          </p>
        </div>
        <button
          onClick={fetchTech}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white rounded-lg flex items-center space-x-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {technologies.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Cpu className="h-10 w-10 text-slate-500 mx-auto" />
          <h4 className="text-base font-semibold text-slate-300">No Technology Metrics Indexed Yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Technologies are automatically detected from repository files, commits, and PR events during analytical calculations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technologies.map(tech => {
            const name = tech.tech_name || tech.technology_name || 'Technology';
            return (
              <div
                key={name}
                className="glass-card glass-card-hover p-6 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-white tracking-tight">{name}</h4>
                    <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                      {tech.usage_percent ?? 0}% Usage
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, tech.usage_percent || 0))}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-1">
                    <FolderGit2 className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{tech.repo_count ?? 1} Repos</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{tech.contributor_count ?? 1} Contributors</span>
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
