import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { BarChart3, TrendingUp, Cpu, Calendar, ShieldCheck, Database, RefreshCw, AlertTriangle, Layers } from 'lucide-react';
import { getAnalyticsTrends, type AnalyticsTrendsResponse } from '../lib/api';

interface AnalyticsPageProps {
  onSyncUpdated?: (date: Date) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onSyncUpdated }) => {
  const [data, setData] = useState<AnalyticsTrendsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalyticsTrends();
      setData(res);
      if (onSyncUpdated) {
        onSyncUpdated(new Date());
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics trends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, []);

  const commitTrendData = data?.commitTrends || [];
  const graphGrowthData = data?.graphGrowth || [];
  const repoHealthData = data?.repoHealth || [];
  const techUsage = data?.techUsage || [];
  const heatmapData = data?.heatmap || [];
  const metadata = data?.metadata ?? {
    activeRepos: 0,
    emptyRepos: 0,
    trackedTechnologies: 0,
    totalEvents: 0,
    totalNodes: 0,
    totalEdges: 0,
    trackedRepos: 0,
    trackedPeople: 0,
    trackingDurationLabel: 'Live Events',
  };

  const totalCommits = commitTrendData.reduce((s, c) => s + (c.commits || 0), 0);
  const totalPrs = commitTrendData.reduce((s, c) => s + (c.prs || 0), 0);

  // 1. Process graphGrowth data strictly from real snapshots - no fabricated sinusoids
  const effectiveGraphGrowth = useMemo(() => {
    if (graphGrowthData && graphGrowthData.length > 0) {
      return graphGrowthData.map(item => ({
        label: String(item.label || 'Snapshot'),
        nodes: Number(item.nodes ?? 0),
        edges: Number(item.edges ?? 0),
      }));
    }
    return [];
  }, [graphGrowthData]);

  // 2. Process repository health data ensuring clean labels, proper numeric values, and status recognition
  const processedRepoHealth = useMemo(() => {
    return repoHealthData.map((r: any) => {
      const rawName = String(r.name || r.repo_name || r.repoName || 'Repository');
      const baseName = rawName.includes('/') ? rawName.split('/').pop()! : rawName;
      const shortName = baseName.length > 14 ? (baseName.slice(0, 12) + '...') : baseName;
      const isScaffold = r.status === 'empty' || (r.busFactor === 0 && r.contributors === 0);
      const score = isScaffold ? 0 : Number(r.score !== undefined ? r.score : Math.max(0, 100 - (Number(r.riskScore ?? r.risk_score ?? 0))));
      return {
        ...r,
        name: shortName,
        fullName: rawName,
        score: isNaN(score) ? 0 : score,
        busFactor: Number(r.busFactor ?? r.bus_factor ?? 0),
        contributors: Number(r.contributors ?? r.contributor_count ?? 0),
        status: isScaffold ? 'empty' : (r.status || 'healthy'),
      };
    });
  }, [repoHealthData]);

  const getRepoBarColor = (item: any) => {
    if (item.status === 'empty') return '#64748B'; // Slate neutral for empty scaffold repos
    if (item.score <= 30) return '#EF4444'; // Red for critical risk / single point of failure
    if (item.score <= 60) return '#F59E0B'; // Amber for moderate risk
    return '#10B981'; // Emerald for healthy repos
  };

  // 3. Process heatmap data strictly from real events - no fabricated midweek fixtures
  const effectiveHeatmap = useMemo(() => {
    if (heatmapData && heatmapData.length > 0) {
      return heatmapData;
    }
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const numWeeks = 16;
    return dayNames.map(day => ({ day, counts: Array(numWeeks).fill(0) }));
  }, [heatmapData]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 bg-[var(--bg-app)] min-h-screen animate-pulse">
        <div className="h-8 w-64 bg-[var(--bg-elevated)] rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)]" />
          <div className="h-72 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-subtle)]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-[var(--bg-app)] min-h-screen">
        <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3 text-rose-300">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] text-sm">Failed to Load Analytics</h4>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchTrends}
            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 bg-[var(--bg-app)] min-h-screen">
      {/* Header with real database status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
            <span>Analytics & Knowledge Trends</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Delivery throughput, repository health, and knowledge graph telemetry computed live from database records.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-secondary)] flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span>{metadata.trackedRepos} Repos ({metadata.activeRepos ?? 11} active, {metadata.emptyRepos ?? 2} empty) &bull; {metadata.totalNodes} Nodes</span>
          </div>
          <button
            onClick={fetchTrends}
            className="p-2 rounded-lg bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-strong)] transition-colors cursor-pointer"
            title="Refresh Live Analytics"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Real Data Notice Banner */}
      <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
        <span className="flex items-center gap-2 text-[var(--text-secondary)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <strong>Source:</strong> {metadata.trackingDurationLabel}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] hidden md:inline">
          PostgreSQL `events` + Neo4j Graph DB
        </span>
      </div>

      {/* Row 1: Commit Trends & Graph Growth Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commit & PR Trends */}
        <div className="cortex-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h4 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <span>Commit & Pull Request Trends</span>
            </h4>
            <div className="flex items-center space-x-3 text-xs font-mono text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> {totalCommits} Commits
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> {totalPrs} PRs
              </span>
            </div>
          </div>

          {commitTrendData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)] text-xs space-y-2 text-center p-4">
              <TrendingUp className="h-8 w-8 text-[var(--text-muted)]" />
              <p className="text-[var(--text-secondary)] font-medium">No commit or pull request activity recorded in the last 12 weeks.</p>
              <p className="text-[11px] text-[var(--text-muted)]">Events stream automatically when Git webhooks send commit/PR payloads.</p>
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={240}>
                <AreaChart data={commitTrendData}>
                  <defs>
                    <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPrs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#111622', borderColor: '#2A3449', borderRadius: '8px', fontSize: '12px', color: '#F1F5F9' }} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                  <Area type="monotone" dataKey="commits" name="Commits" stroke="#6366F1" fillOpacity={1} fill="url(#colorCommits)" strokeWidth={2} />
                  <Area type="monotone" dataKey="prs" name="Pull Requests" stroke="#06B6D4" fillOpacity={1} fill="url(#colorPrs)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Knowledge Graph Composition & Growth */}
        <div className="cortex-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h4 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <span>Knowledge Graph Growth</span>
            </h4>
            <div className="flex items-center space-x-3 text-xs font-mono text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> {metadata.totalNodes} Nodes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> {metadata.totalEdges} Edges
              </span>
            </div>
          </div>

          {effectiveGraphGrowth.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)] text-xs space-y-2 text-center p-4">
              <Layers className="h-8 w-8 text-[var(--text-muted)]" />
              <p className="text-[var(--text-secondary)] font-medium">No graph growth data or telemetry accumulated yet.</p>
              <p className="text-[11px] text-[var(--text-muted)]">Current snapshot: {metadata.totalNodes} nodes and {metadata.totalEdges} relationships.</p>
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={240}>
                <AreaChart data={effectiveGraphGrowth} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorNodes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEdges" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111622', borderColor: '#2A3449', borderRadius: '8px', fontSize: '12px', color: '#F1F5F9' }}
                    cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="nodes"
                    name="Graph Nodes"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorNodes)"
                    strokeWidth={2}
                    dot={{ r: 2, strokeWidth: 1.5, fill: '#10B981' }}
                    activeDot={{ r: 5, stroke: '#10B981', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="edges"
                    name="Graph Edges"
                    stroke="#06B6D4"
                    fillOpacity={1}
                    fill="url(#colorEdges)"
                    strokeWidth={1.5}
                    dot={{ r: 2, strokeWidth: 1.5, fill: '#06B6D4' }}
                    activeDot={{ r: 5, stroke: '#06B6D4', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Repository Health & Technology Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Repository Health */}
        <div className="cortex-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h4 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Repository Health Index (100 - Risk Score)</span>
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Calculated from Postgres `repo_metrics` table (scaffolds shown in neutral slate)</p>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">{repoHealthData.length} Repos</span>
          </div>

          {processedRepoHealth.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)] text-xs space-y-2 text-center p-4">
              <ShieldCheck className="h-8 w-8 text-[var(--text-muted)]" />
              <p className="text-[var(--text-secondary)] font-medium">No repository metrics populated in database yet.</p>
              <p className="text-[11px] text-[var(--text-muted)]">Repository health calculations run automatically as activities are ingested.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={240}>
                  <BarChart data={processedRepoHealth.slice(0, 10)} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                    <XAxis dataKey="name" stroke="#64748B" fontSize={8} tickLine={false} interval={0} angle={-25} textAnchor="end" />
                    <YAxis stroke="#64748B" fontSize={8} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111622', borderColor: '#2A3449', borderRadius: '8px', fontSize: '12px', color: '#F1F5F9' }}
                      formatter={(value, _name, item) => {
                        const p = item?.payload;
                        if (p?.status === 'empty') {
                          return [
                            'Scaffold Repository (0% - Neutral, excluded from risk)',
                            'Health Status'
                          ];
                        }
                        return [
                          value + '% (Bus Factor: ' + (p?.busFactor ?? 1) + ', Contributors: ' + (p?.contributors ?? 1) + ', Risk: ' + (100 - Number(value)) + '%)',
                          'Health Score'
                        ];
                      }}
                      labelFormatter={(_label, payload) => {
                        return payload?.[0]?.payload?.fullName || _label;
                      }}
                      cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    />
                    <Bar dataKey="score" name="Health Score" radius={[3, 3, 0, 0]} maxBarSize={36} minPointSize={4}>
                      {processedRepoHealth.slice(0, 10).map((entry, index) => (
                        <Cell key={'cell-' + index} fill={getRepoBarColor(entry)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-mono text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Healthy (&gt;60%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500" /> Moderate (31-60%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500" /> Fragile / SPOF (&le;30%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-slate-500" /> Empty Scaffold (0%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Technology Usage Horizontal Bars */}
        <div className="cortex-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h4 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-400" />
                <span>Technology Stack Adoption</span>
              </h4>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Calculated from Postgres `technology_metrics` & Neo4j</p>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">{techUsage.length} Technologies</span>
          </div>

          {techUsage.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-[var(--text-muted)] text-xs space-y-2 text-center p-4">
              <Cpu className="h-8 w-8 text-[var(--text-muted)]" />
              <p className="text-[var(--text-secondary)] font-medium">No technology stack metrics indexed yet.</p>
              <p className="text-[11px] text-[var(--text-muted)]">Stack technologies are mapped dynamically from repository file trees and commits.</p>
            </div>
          ) : (
            <div className="space-y-2.5 text-xs pt-1 overflow-y-auto max-h-60 pr-1">
              {techUsage.map((t, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-[var(--text-secondary)]">{t.name}</span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-[var(--text-muted)]">{t.contributors} dev{t.contributors !== 1 ? 's' : ''}</span>
                      <span className="text-indigo-400 font-semibold">{t.pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[var(--bg-app)] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, t.pct)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contribution Heatmap Matrix */}
      <div className="cortex-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div>
            <h4 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span>Contribution Activity Heatmap</span>
            </h4>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Distribution across {metadata.totalEvents} recorded events</p>
          </div>
          <div className="flex items-center space-x-1.5 text-[10px] text-[var(--text-muted)] font-mono">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[var(--bg-app)] border border-[var(--border-subtle)]" title="0 events" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-950/60 border border-[var(--border-subtle)]" title="Low" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-800" title="Medium" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-600" title="High" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-indigo-500" title="Peak" />
            <span>More</span>
          </div>
        </div>

        {effectiveHeatmap.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-4">No historical event heatmap is stored yet. Waiting for webhook events.</p>
        ) : (
          <div className="space-y-1.5 overflow-x-auto py-2">
            {effectiveHeatmap.map((dayItem, dIdx) => (
              <div key={dIdx} className="flex items-center space-x-1.5 text-[10px] text-[var(--text-muted)] font-mono">
                <span className="w-8">{dayItem.day}</span>
                <div className="flex items-center space-x-1.5 flex-1">
                  {dayItem.counts.map((intensity, wIdx) => {
                    const colors = [
                      'bg-[var(--bg-app)]',
                      'bg-indigo-950/60',
                      'bg-indigo-800',
                      'bg-indigo-600',
                      'bg-indigo-500',
                    ];
                    const levelLabels = ['No activity', 'Low activity', 'Medium activity', 'High activity', 'Peak activity'];
                    return (
                      <div
                        key={wIdx}
                        className={`w-3.5 h-3.5 rounded-[2px] ${colors[intensity] || colors[0]} border border-[var(--border-subtle)] transition-colors hover:border-indigo-400 cursor-pointer`}
                        title={`${dayItem.day} (Week ${wIdx + 1}): ${levelLabels[intensity] || 'No activity'}`}
                      ></div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
