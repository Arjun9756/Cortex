import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { BarChart3, TrendingUp, Cpu, Calendar, ShieldCheck } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const commitTrendData = [
    { month: 'Oct', commits: 400, prs: 200 },
    { month: 'Nov', commits: 520, prs: 240 },
    { month: 'Dec', commits: 480, prs: 220 },
    { month: 'Jan', commits: 650, prs: 310 },
    { month: 'Feb', commits: 590, prs: 280 },
    { month: 'Mar', commits: 720, prs: 360 },
  ];

  const graphGrowthData = [
    { month: 'Oct', nodes: 32000, edges: 12000 },
    { month: 'Nov', nodes: 45000, edges: 18000 },
    { month: 'Dec', nodes: 58000, edges: 22000 },
    { month: 'Jan', nodes: 76000, edges: 29000 },
    { month: 'Feb', nodes: 84000, edges: 32000 },
    { month: 'Mar', nodes: 95000, edges: 38000 },
  ];

  const repoHealthData = [
    { name: 'cortex-core', score: 92 },
    { name: 'cache-layer', score: 68 },
    { name: 'vector-index', score: 85 },
    { name: 'cortex-web', score: 90 },
    { name: 'infra-platform', score: 74 },
    { name: 'deploy-bot', score: 88 },
  ];

  const techUsage = [
    { name: 'TypeScript', pct: 95 },
    { name: 'PostgreSQL', pct: 90 },
    { name: 'React', pct: 88 },
    { name: 'Kubernetes', pct: 82 },
    { name: 'Redis', pct: 78 },
    { name: 'Go', pct: 72 },
    { name: 'Valkey', pct: 65 },
    { name: 'pgvector', pct: 58 },
    { name: 'Terraform', pct: 50 },
    { name: 'Python', pct: 45 },
  ];

  return (
    <div className="p-8 space-y-8 bg-[#090d16] min-h-screen">
      {/* Title */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">INTELLIGENCE</span>
        <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 mt-1">
          <BarChart3 className="h-6 w-6 text-indigo-400" />
          <span>Analytics & Knowledge Graph Trends</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Delivery throughput, repository health, and knowledge graph growth across the last six months.
        </p>
      </div>

      {/* Row 1: Commit Trends & Graph Growth Charts matching Image 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Commit & PR Trends */}
        <div className="glass-card p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              Commit, PR and issue trends
            </h4>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={commitTrendData}>
                <defs>
                  <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="commits" stroke="#6366f1" fillOpacity={1} fill="url(#colorCommits)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Knowledge Graph Growth */}
        <div className="glass-card p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Knowledge graph growth
            </h4>
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
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="nodes" stroke="#10b981" fillOpacity={1} fill="url(#colorNodes)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Repository Health & Technology Usage matching Image 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Repository Health */}
        <div className="glass-card p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              Repository health
            </h4>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repoHealthData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="score" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Technology Usage Horizontal Bars */}
        <div className="glass-card p-6 space-y-4 border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-400" />
              Technology usage
            </h4>
          </div>

          <div className="space-y-2 text-xs pt-1 overflow-y-auto max-h-60">
            {techUsage.map((t, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-300">{t.name}</span>
                  <span className="text-indigo-400 font-bold">{t.pct}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${t.pct}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contribution Heatmap Matrix matching Image 4 */}
      <div className="glass-card p-6 space-y-4 border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            Contribution activity heatmap
          </h4>
        </div>

        <div className="space-y-1.5 overflow-x-auto py-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dIdx) => (
            <div key={dIdx} className="flex items-center space-x-1 text-[10px] text-slate-500 font-mono">
              <span className="w-8">{day}</span>
              <div className="flex items-center space-x-1 flex-1">
                {Array.from({ length: 32 }).map((_, wIdx) => {
                  const intensity = (dIdx * 3 + wIdx * 7) % 5;
                  const colors = ['bg-slate-900', 'bg-indigo-900/60', 'bg-indigo-700', 'bg-indigo-500', 'bg-purple-500'];
                  return (
                    <div
                      key={wIdx}
                      className={`w-3.5 h-3.5 rounded-[3px] ${colors[intensity]} border border-slate-800/60 transition-all hover:scale-125 hover:z-10`}
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
