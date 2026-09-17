import React, { useEffect, useState } from 'react';
import {
  getGraphSummary,
  getGraphNodeDetail,
  type GraphNode,
  type GraphEdge,
  type GraphNodeDetail
} from '../lib/api';
import { ForceGraph, getNodeCategory } from '../components/ForceGraph';
import {
  Network,
  Filter,
  RefreshCw,
  AlertTriangle,
  Layers,
  X,
  GitBranch,
  User,
  CheckCircle2,
  AlertOctagon,
  ArrowRight
} from 'lucide-react';

interface KnowledgeGraphPageProps {
  onSyncUpdated?: (date: Date) => void;
  onNavigate?: (tab: string, params?: any) => void;
}

export const KnowledgeGraphPage: React.FC<KnowledgeGraphPageProps> = ({ onSyncUpdated, onNavigate }) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [nodeCount, setNodeCount] = useState<number>(0);
  const [edgeCount, setEdgeCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isCachedSummary, setIsCachedSummary] = useState<boolean>(false);

  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodeDetail, setNodeDetail] = useState<GraphNodeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchGraph = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const res = await getGraphSummary({
        repository: selectedRepo || undefined,
        personExternalId: selectedPerson || undefined,
        limit: limit,
      });
      setNodes(res.nodes || []);
      setEdges(res.edges || []);
      setNodeCount(res.nodeCount || 0);
      setEdgeCount(res.edgeCount || 0);
      setGeneratedAt(res.generated_at || new Date().toISOString());
      setIsCachedSummary(Boolean(res.cached));

      if (onSyncUpdated) {
        onSyncUpdated(new Date());
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Failed to fetch Knowledge Graph summary');
      } else {
        console.warn('[KnowledgeGraph] Background poll error:', err?.message);
      }
    } finally {
      if (!silent) setLoading(false);
      else setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGraph(false);
  }, [selectedRepo, selectedPerson, limit]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchGraph(true);
      }
    }, 60000);

    const handleFocus = () => {
      fetchGraph(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedRepo, selectedPerson, limit]);

  const handleNodeClick = async (node: GraphNode) => {
    setSelectedNode(node);
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const category = getNodeCategory(node);
      const detail = await getGraphNodeDetail(node.id, category.toLowerCase());
      setNodeDetail(detail);
    } catch (err: any) {
      console.error('[KnowledgeGraph] Error loading node detail:', err);
      setDetailError(err?.message || 'Failed to load business details for this node');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectNeighbor = (neighborId: string, neighborType: string) => {
    handleNodeClick({ id: neighborId, name: neighborId, label: neighborType });
  };

  const handleActionClick = (action: { type: string; target: string; label: string; params?: any }) => {
    if (onNavigate && action.target) {
      onNavigate(action.target, action.params);
    } else {
      console.log('[KnowledgeGraph] CTA action triggered:', action);
    }
  };

  const availableRepos = Array.from(
    new Set(nodes.filter(n => getNodeCategory(n) === 'REPOSITORY').map(n => n.name))
  );
  const availablePeople = Array.from(
    new Set(nodes.filter(n => getNodeCategory(n) === 'PERSON').map(n => ({ id: n.externalId || n.id, name: n.name })))
  );

  const timeAgo = (isoString: string | null) => {
    if (!isoString) return '';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.max(1, Math.floor(diffMs / 1000));
      if (diffSec < 60) return diffSec + 's ago';
      const diffMin = Math.floor(diffSec / 60);
      return diffMin + 'm ago';
    } catch {
      return '';
    }
  };

  return (
    <div className="p-8 space-y-6 relative min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="h-6 w-6 text-indigo-400" />
            <span>Risk Knowledge Graph</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Production risk exploration surface powered by precomputed Postgres metrics and high-signal Neo4j relations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div
            title={'Data as of ' + (generatedAt ? new Date(generatedAt).toLocaleTimeString() : 'now') + (isCachedSummary ? ' (cached)' : '')}
            className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium"
          >
            <span className="relative flex h-2 w-2">
              <span className={'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ' + (isRefreshing ? 'bg-indigo-400' : 'bg-emerald-400')} />
              <span className={'relative inline-flex rounded-full h-2 w-2 ' + (isRefreshing ? 'bg-indigo-500' : 'bg-emerald-500')} />
            </span>
            <span>{isRefreshing ? 'Syncing...' : 'Auto-Sync'}</span>
            {generatedAt && (
              <span className="text-slate-400 border-l border-emerald-500/20 pl-1.5 text-[10px]">
                {timeAgo(generatedAt)}
              </span>
            )}
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Nodes: <strong className="text-white">{nodeCount}</strong> | Edges: <strong className="text-white">{edgeCount}</strong>
          </span>
          <button
            onClick={() => fetchGraph(false)}
            disabled={loading || isRefreshing}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white rounded-lg flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={'h-3.5 w-3.5 ' + (isRefreshing || loading ? 'animate-spin text-indigo-400' : '')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium mr-1">
            <Filter className="h-3.5 w-3.5 text-indigo-400" />
            <span>Filter Scope:</span>
          </div>

          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">All Repositories</option>
 {availableRepos.map(repo => (
 <option key={repo} value={repo}>{repo}</option>
 ))}
 </select>

 <select
 value={selectedPerson}
 onChange={(e) => setSelectedPerson(e.target.value)}
 className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors"
 >
 <option value="">All Engineers</option>
            {availablePeople.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value={50}>Top 50 nodes</option>
            <option value={100}>Top 100 nodes</option>
            <option value={150}>Top 150 nodes</option>
            <option value={200}>Top 200 nodes (max)</option>
          </select>
        </div>

        {(selectedRepo || selectedPerson || limit !== 100) && (
          <button
            onClick={() => {
              setSelectedRepo('');
              setSelectedPerson('');
              setLimit(100);
            }}
            className="text-xs text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      <div className="relative flex gap-6">
        <div className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm min-h-[720px] flex flex-col justify-center items-center relative overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-400">Loading risk summary graph...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center space-y-3 max-w-md text-center">
              <AlertTriangle className="h-10 w-10 text-rose-500/80" />
              <h4 className="text-sm font-semibold text-white">Knowledge Graph Unavailable</h4>
              <p className="text-xs text-slate-400">{error}</p>
              <button
                onClick={() => fetchGraph(false)}
                className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs text-white rounded-lg transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-3 max-w-md text-center">
              <Layers className="h-10 w-10 text-slate-600" />
              <h4 className="text-sm font-semibold text-white">No Graph Nodes Match Scope</h4>
              <p className="text-xs text-slate-400">Try clearing active repo or engineer filters above.</p>
            </div>
          ) : (
            <div className="w-full h-full flex-1">
              <ForceGraph nodes={nodes} edges={edges} onNodeClick={handleNodeClick} />
            </div>
          )}
        </div>

        {selectedNode && (
          <aside className="w-96 bg-slate-950/95 border border-slate-800/90 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between shrink-0 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-start justify-between pb-4 border-b border-slate-800/80">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {nodeDetail?.type || getNodeCategory(selectedNode)}
                    </span>
                    {nodeDetail?.cached && (
                      <span className="text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                        instant cache
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-white tracking-tight break-all">
                    {nodeDetail?.name || selectedNode.name || selectedNode.id}
                  </h4>
                </div>
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    setNodeDetail(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-5 overflow-y-auto pr-1 style={{ maxHeight: '560px' }}">
                {loadingDetail ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-2">
                    <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <p className="text-xs text-slate-400">Resolving business risk metrics...</p>
                  </div>
                ) : detailError ? (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                    {detailError}
                  </div>
                ) : nodeDetail?.type === 'REPOSITORY' ? (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-medium block">Status</span>
                        <div className="flex items-center space-x-1.5 mt-1">
                          {nodeDetail.status === 'empty' ? (
                            <span className="inline-flex items-center text-xs font-semibold text-slate-300">
                              <span className="h-2 w-2 rounded-full bg-slate-400 mr-1.5" /> Empty
                            </span>
                          ) : nodeDetail.status === 'fragile' ? (
                            <span className="inline-flex items-center text-xs font-semibold text-rose-400">
                              <AlertOctagon className="h-3.5 w-3.5 mr-1" /> Fragile (SPOF)
                            </span>
                          ) : nodeDetail.status === 'concentrated' ? (
                            <span className="inline-flex items-center text-xs font-semibold text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Concentrated
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Healthy
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-medium block">Bus Factor</span>
                        <div className="text-base font-bold text-white mt-0.5">
                          {Number(nodeDetail.bus_factor || 0).toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Risk Score:</span>
                        <span className="font-semibold text-white">{nodeDetail.risk_score || 0}/100</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Primary Owner:</span>
                        <span className="font-medium text-indigo-300">
                          {nodeDetail.primary_owner || 'Shared / None'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Contributors:</span>
                        <span className="font-medium text-slate-200">{nodeDetail.contributor_count || 0}</span>
                      </div>
                    </div>

                    {nodeDetail.top_contributors && nodeDetail.top_contributors.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-300 block">Top Contributors</span>
                        <div className="space-y-1.5">
                          {nodeDetail.top_contributors.map(c => (
                            <button
                              key={c.id}
                              onClick={() => handleSelectNeighbor(c.id, 'PERSON')}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 text-xs transition-colors cursor-pointer text-left"
                            >
                              <span className="text-slate-200 font-medium flex items-center gap-1.5">
                                <User className="h-3 w-3 text-slate-400" />
                                {c.name}
                              </span>
                              <span className="text-[10px] text-slate-400">{c.commit_count} commits</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {nodeDetail.related_technologies && nodeDetail.related_technologies.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-300 block">Technologies Used</span>
                        <div className="flex flex-wrap gap-1.5">
                          {nodeDetail.related_technologies.map(t => (
                            <button
                              key={t}
                              onClick={() => handleSelectNeighbor(t, 'TECHNOLOGY')}
                              className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : nodeDetail?.type === 'PERSON' ? (
                  <div className="space-y-5">
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400 font-medium">Knowledge Risk Tier</span>
                        <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + (
                          nodeDetail.risk_tier === 'Critical'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : nodeDetail.risk_tier === 'Moderate'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        )}>
                          {nodeDetail.risk_tier} ({nodeDetail.risk_score || 0}/100)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={'h-full ' + (
                            nodeDetail.risk_tier === 'Critical'
                              ? 'bg-rose-500'
                              : nodeDetail.risk_tier === 'Moderate'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          )}
                          style={{ width: Math.min(100, Math.max(5, nodeDetail.risk_score || 0)) + '%' }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                        <span>Total Commits</span>
                        <span className="text-white font-medium">{nodeDetail.commit_count || 0}</span>
                      </div>
                    </div>

                    {nodeDetail.repos && nodeDetail.repos.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-300 block">
                          Associated Repositories ({nodeDetail.repos.length})
                        </span>
                        <div className="space-y-1.5">
                          {nodeDetail.repos.map(r => (
                            <button
                              key={r.name}
                              onClick={() => handleSelectNeighbor(r.name, 'REPOSITORY')}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 text-xs transition-colors cursor-pointer text-left"
                            >
                              <span className="text-slate-200 font-medium flex items-center gap-1.5">
                                <GitBranch className="h-3 w-3 text-slate-400" />
                                {r.name}
                              </span>
                              <span className={'text-[10px] font-medium ' + (
                                r.status === 'fragile' ? 'text-rose-400' : r.status === 'concentrated' ? 'text-amber-400' : 'text-slate-400'
                              )}>
                                {r.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {nodeDetail.top_technologies && nodeDetail.top_technologies.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-300 block">Domain Expertise</span>
                        <div className="flex flex-wrap gap-1.5">
                          {nodeDetail.top_technologies.map((t: any) => {
                            const name = typeof t === 'string' ? t : t?.name;
                            return (
                              <button
                                key={name}
                                onClick={() => handleSelectNeighbor(name, 'TECHNOLOGY')}
                                className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer"
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-medium block">Usage Share</span>
                        <div className="text-base font-bold text-white mt-0.5">
                          {nodeDetail?.usage_percent || 0}%
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 font-medium block">Repos Using</span>
                        <div className="text-base font-bold text-white mt-0.5">
                          {nodeDetail?.repo_count || nodeDetail?.related_repos?.length || 0}
                        </div>
                      </div>
                    </div>

                    {nodeDetail?.top_experts && nodeDetail.top_experts.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-300 block">Internal Experts</span>
                        <div className="space-y-1.5">
                          {nodeDetail.top_experts.map((e: any) => (
                            <button
                              key={e.name}
                              onClick={() => handleSelectNeighbor(e.name, 'PERSON')}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 text-xs transition-colors cursor-pointer text-left"
                            >
                              <span className="text-slate-200 font-medium flex items-center gap-1.5">
                                <User className="h-3 w-3 text-slate-400" />
                                {e.name}
                              </span>
                              <span className="text-[10px] text-indigo-400">{(e.commits || '') + ' contributions'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {nodeDetail?.related_repos && nodeDetail.related_repos.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-300 block">Applied In Repos</span>
                        <div className="flex flex-wrap gap-1.5">
                          {nodeDetail.related_repos.map(r => (
                            <button
                              key={r}
                              onClick={() => handleSelectNeighbor(r, 'REPOSITORY')}
                              className="px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300 hover:bg-blue-500/20 transition-colors cursor-pointer"
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {nodeDetail?.actions && Object.keys(nodeDetail.actions).length > 0 && (
              <div className="pt-4 mt-4 border-t border-slate-800/80 flex flex-col gap-2">
                {Object.entries(nodeDetail.actions).map(([key, action]) => (
                  <button
                    key={key}
                    onClick={() => handleActionClick(action)}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>{action.label}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};