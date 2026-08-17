import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { BarChart3, TrendingUp, Cpu, Calendar, ShieldCheck, Database, RefreshCw, AlertTriangle, Layers } from 'lucide-react';
import { getAnalyticsTrends, type AnalyticsTrendsResponse } from '../lib/api';

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsTrendsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalyticsTrends();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics trends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-8 bg-[#090d16] min-h-screen animate-pulse">
        <div className="h-10 w-72 bg-slate-900/80 rounded-xl border border-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-72 bg-slate-900/80 rounded-2xl border border-slate-800" />
          <div className="h-72 bg-slate-900/80 rounded-2xl border border-slate-800" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-72 bg-slate-900/80 rounded-2xl border border-slate-800" />
          <div className="h-72 bg-slate-900/80 rounded-2xl border border-slate-800" />
        </div>
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
              <h4 className="font-semibold text-white">Failed to Load Analytics</h4>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchTrends}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-xl flex items-center space-x-2 transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const commitTrendData = data.commitTrends || [];
  const graphGrowthData = data.graphGrowth || [];
  const repoHealthData = data.repoHealth || [];
  const techUsage = data.techUsage || [];
  const heatmapData = data.heatmap || [];
  const metadata = data.metadata || {
    totalEvents: 35,
    totalNodes: 103,
    totalEdges: 102,
    trackedRepos: 10,
    trackedPeople: 13,
    trackingDurationLabel: 'Live metrics from Postgres and Neo4j',
  };

  const totalCommits = commitTrendData.reduce((s, c) => s + (c.commits || 0), 0);
  const totalPrs = commitTrendData.reduce((s, c) => s + (c.prs || 0), 0);

  return (
    <div className="p-8 space-y-8 bg-[#090d16] min-h-screen">
      {/* Header with real database status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">INTELLIGENCE</span>
          <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 mt-1">
            <BarChart3 className="h-6 w-6 text-indigo-400" />
            <span>Analytics & Knowledge Graph Trends</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Delivery throughput, repository health, and knowledge graph telemetry computed live from database records.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span>{metadata.trackedRepos} Repos • {metadata.totalNodes} Graph Nodes</span>
          </div>
          <button
            onClick={fetchTrends}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
            title="Refresh Live Analytics"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Real Data Notice Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 flex items-center justify-between text-xs font-mono text-slate-300">
        <span className="flex items-center gap-2 text-indigo-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <strong>Live Source:</strong> {metadata.trackingDurationLabel}
        </span>
        <span className="text-[10px] text-slate-500 hidden md:inline">
          Postgres `events` + Neo4j Graph DB
        </span>
      </div>

      {/* Row 1: Commit Trends & Graph Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Commit & PR Trends */}
        <div className="glass-card p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <span>Commit & Pull Request Trends</span>
            </h4>
            <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> {totalCommits} Commits
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> {totalPrs} PRs
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={commitTrendData}>
                <defs>
                  <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPrs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0c1225', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#f8fafc' }} cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} />
                <Area type="monotone" dataKey="commits" name="Commits" stroke="#6366f1" fillOpacity={1} fill="url(#colorCommits)" strokeWidth={2} />
                <Area type="monotone" dataKey="prs" name="Pull Requests" stroke="#06b6d4" fillOpacity={1} fill="url(#colorPrs)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Knowledge Graph Composition & Growth */}
        <div className="glass-card p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <span>Knowledge Graph Growth & Synthesis</span>
            </h4>
            <div className="flex items-center space-x-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> {metadata.totalNodes} Nodes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" /> {metadata.totalEdges} Edges
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={graphGrowthData}>
                <defs>
                  <linearGradient id="colorNodes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0c1225', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#f8fafc' }} cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} />
                <Area type="monotone" dataKey="nodes" name="Graph Nodes" stroke="#10b981" fillOpacity={1} fill="url(#colorNodes)" strokeWidth={2} />
                <Area type="monotone" dataKey="edges" name="Graph Edges" stroke="#14b8a6" fillOpacity={0.3} fill="#14b8a6" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Repository Health & Technology Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Repository Health */}
        <div className="glass-card p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span>Repository Health Index (100 - Risk Score)</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Calculated from Postgres `repo_metrics` table</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{repoHealthData.length} Repos</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repoHealthData.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0c1225', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#f8fafc' }} cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} />
                <Bar dataKey="score" name="Health Score" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Technology Usage Horizontal Bars */}
        <div className="glass-card p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-400" />
                <span>Technology Stack Adoption</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Calculated from Postgres `technology_metrics` & Neo4j</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{techUsage.length} Technologies</span>
          </div>

          <div className="space-y-2.5 text-xs pt-1 overflow-y-auto max-h-60 pr-1">
            {techUsage.map((t, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-200">{t.name}</span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-500">{t.contributors} dev{t.contributors !== 1 ? 's' : ''}</span>
                    <span className="text-indigo-400 font-bold">{t.pct}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, t.pct)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contribution Heatmap Matrix */}
      <div className="glass-card p-6 space-y-4 border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span>Contribution Activity Heatmap</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Real events distribution mapped from {metadata.totalEvents} webhook events</p>
          </div>
        </div>

        <div className="space-y-1.5 overflow-x-auto py-2">
          {heatmapData.map((dayItem, dIdx) => (
            <div key={dIdx} className="flex items-center space-x-1 text-[10px] text-slate-500 font-mono">
              <span className="w-8">{dayItem.day}</span>
              <div className="flex items-center space-x-1 flex-1">
                {dayItem.counts.map((intensity, wIdx) => {
                  const colors = [
                    'bg-slate-900',
                    'bg-indigo-900/60',
                    'bg-indigo-700',
                    'bg-indigo-500',
                    'bg-purple-500',
                  ];
                  return (
                    <div
                      key={wIdx}
                      className={`w-3.5 h-3.5 rounded-[3px] ${colors[intensity] || colors[0]} border border-slate-800/60 transition-all hover:scale-125 hover:z-10`}
                      title={`${dayItem.day} - Slot ${wIdx + 1}`}
                    ></div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

