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
    <div className="p-8 space-y-6 relative min-h-screen bg-[var(--bg-app)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Network className="h-5 w-5 text-indigo-400" />
            <span>Risk Knowledge Graph</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Production risk exploration surface powered by precomputed Postgres metrics and high-signal Neo4j relations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div
            title={'Data as of ' + (generatedAt ? new Date(generatedAt).toLocaleTimeString() : 'now') + (isCachedSummary ? ' (cached)' : '')}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-mono"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isRefreshing ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Auto-Sync'}</span>
            {generatedAt && (
              <span className="text-[var(--text-muted)] border-l border-[var(--border-subtle)] pl-1.5 text-[10px]">
                {timeAgo(generatedAt)}
              </span>
            )}
          </div>

          <span className="text-xs text-[var(--text-muted)] font-mono">
            Nodes: <strong className="text-[var(--text-primary)]">{nodeCount}</strong> | Edges: <strong className="text-[var(--text-primary)]">{edgeCount}</strong>
          </span>
          <button
            onClick={() => fetchGraph(false)}
            disabled={loading || isRefreshing}
            className="px-3 py-1.5 bg-[var(--bg-panel)] hover:bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-xs text-[var(--text-secondary)] hover:text-white rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={'h-3.5 w-3.5 ' + (isRefreshing || loading ? 'animate-spin text-indigo-400' : '')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="cortex-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs text-[var(--text-muted)] font-medium mr-1">
            <Filter className="h-3.5 w-3.5 text-indigo-400" />
            <span>Scope:</span>
          </div>

          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="bg-[var(--bg-app)] border border-[var(--border-strong)] text-xs text-[var(--text-primary)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">All Repositories</option>
            {availableRepos.map(repo => (
              <option key={repo} value={repo}>{repo}</option>
            ))}
          </select>

          <select
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="bg-[var(--bg-app)] border border-[var(--border-strong)] text-xs text-[var(--text-primary)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="">All Engineers</option>
            {availablePeople.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-[var(--bg-app)] border border-[var(--border-strong)] text-xs text-[var(--text-primary)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors"
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
            className="text-xs text-[var(--text-muted)] hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      <div className="relative flex gap-6">
        <div className="flex-1 cortex-card p-2 min-h-[720px] flex flex-col justify-center items-center relative overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-xs text-[var(--text-muted)]">Loading risk summary graph...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center space-y-3 max-w-md text-center p-6">
              <AlertTriangle className="h-8 w-8 text-rose-400" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Knowledge Graph Unavailable</h4>
              <p className="text-xs text-[var(--text-muted)]">{error}</p>
              <button
                onClick={() => fetchGraph(false)}
                className="mt-2 px-3 py-1.5 cortex-btn-primary text-xs cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-3 max-w-md text-center p-6">
              <Layers className="h-8 w-8 text-[var(--text-muted)]" />
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">No Graph Nodes Match Scope</h4>
              <p className="text-xs text-[var(--text-muted)]">Try clearing active repo or engineer filters above.</p>
            </div>
          ) : (
            <div className="w-full h-full flex-1">
              <ForceGraph nodes={nodes} edges={edges} onNodeClick={handleNodeClick} />
            </div>
          )}
        </div>

        {selectedNode && (
          <aside className="w-96 bg-[var(--bg-panel)] border border-[var(--border-strong)] rounded-xl p-5 shadow-2xl flex flex-col justify-between shrink-0">
            <div>
              <div className="flex items-start justify-between pb-3.5 border-b border-[var(--border-subtle)]">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-indigo-400 border border-[var(--border-subtle)]">
                      {nodeDetail?.type || getNodeCategory(selectedNode)}
                    </span>
                    {nodeDetail?.cached && (
                      <span className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-app)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                        cached
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-[var(--text-primary)] tracking-tight break-all">
                    {nodeDetail?.name || selectedNode.name || selectedNode.id}
                  </h4>
                </div>
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    setNodeDetail(null);
                  }}
                  className="p-1 rounded hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4 overflow-y-auto pr-1">
                {loadingDetail ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-2">
                    <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                    <p className="text-xs text-[var(--text-muted)]">Resolving business risk metrics...</p>
                  </div>
                ) : detailError ? (
                  <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                    {detailError}
                  </div>
                ) : nodeDetail?.type === 'REPOSITORY' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-medium block">Status</span>
                        <div className="flex items-center space-x-1.5 mt-1">
                          {nodeDetail.status === 'empty' ? (
                            <span className="inline-flex items-center text-xs font-semibold text-[var(--status-empty)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-empty)] mr-1.5" /> Empty
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

                      <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-medium block">Bus Factor</span>
                        <div className="text-base font-bold text-[var(--text-primary)] font-mono mt-0.5">
                          {Number(nodeDetail.bus_factor || 0).toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-muted)]">Risk Score:</span>
                        <span className="font-semibold text-[var(--text-primary)] font-mono">{nodeDetail.risk_score || 0}/100</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-muted)]">Primary Owner:</span>
                        <span className="font-medium text-indigo-400">
                          {nodeDetail.primary_owner || 'Shared / None'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-muted)]">Contributors:</span>
                        <span className="font-medium text-[var(--text-secondary)] font-mono">{nodeDetail.contributor_count || 0}</span>
                      </div>
                    </div>

                    {nodeDetail.top_contributors && nodeDetail.top_contributors.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">Top Contributors</span>
                        <div className="space-y-1">
                          {nodeDetail.top_contributors.map(c => (
                            <button
                              key={c.id}
                              onClick={() => handleSelectNeighbor(c.id, 'PERSON')}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs transition-colors cursor-pointer text-left"
                            >
                              <span className="text-[var(--text-primary)] font-medium flex items-center gap-1.5">
                                <User className="h-3 w-3 text-[var(--text-muted)]" />
                                {c.name}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)] font-mono">{c.commit_count} commits</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {nodeDetail.related_technologies && nodeDetail.related_technologies.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">Technologies Used</span>
                        <div className="flex flex-wrap gap-1">
                          {nodeDetail.related_technologies.map(t => (
                            <button
                              key={t}
                              onClick={() => handleSelectNeighbor(t, 'TECHNOLOGY')}
                              className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] hover:border-indigo-500/40 transition-colors cursor-pointer font-mono"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : nodeDetail?.type === 'PERSON' ? (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">Knowledge Risk Tier</span>
                        <span className={'text-xs font-semibold px-2 py-0.5 rounded border ' + (
                          nodeDetail.risk_tier === 'Critical'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : nodeDetail.risk_tier === 'Moderate'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        )}>
                          {nodeDetail.risk_tier} ({nodeDetail.risk_score || 0}/100)
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-app)] rounded-full h-1.5 overflow-hidden">
                        <div
                          className={'h-full rounded-full ' + (
                            nodeDetail.risk_tier === 'Critical'
                              ? 'bg-rose-500'
                              : nodeDetail.risk_tier === 'Moderate'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          )}
                          style={{ width: Math.min(100, Math.max(5, nodeDetail.risk_score || 0)) + '%' }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-[var(--text-muted)] pt-1">
                        <span>Total Commits</span>
                        <span className="text-[var(--text-primary)] font-medium font-mono">{nodeDetail.commit_count || 0}</span>
                      </div>
                    </div>

                    {nodeDetail.repos && nodeDetail.repos.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                          Associated Repositories ({nodeDetail.repos.length})
                        </span>
                        <div className="space-y-1">
                          {nodeDetail.repos.map(r => (
                            <button
                              key={r.name}
                              onClick={() => handleSelectNeighbor(r.name, 'REPOSITORY')}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs transition-colors cursor-pointer text-left"
                            >
                              <span className="text-[var(--text-primary)] font-medium flex items-center gap-1.5 font-mono">
                                <GitBranch className="h-3 w-3 text-[var(--text-muted)]" />
                                {r.name}
                              </span>
                              <span className={'text-[10px] font-medium ' + (
                                r.status === 'fragile' ? 'text-rose-400' : r.status === 'concentrated' ? 'text-amber-400' : 'text-[var(--text-muted)]'
                              )}>
                                {r.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {nodeDetail.top_technologies && nodeDetail.top_technologies.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">Domain Expertise</span>
                        <div className="flex flex-wrap gap-1">
                          {nodeDetail.top_technologies.map((t: any) => {
                            const name = typeof t === 'string' ? t : t?.name;
                            return (
                              <button
                                key={name}
                                onClick={() => handleSelectNeighbor(name, 'TECHNOLOGY')}
                                className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] hover:border-indigo-500/40 transition-colors cursor-pointer font-mono"
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-medium block">Usage Share</span>
                        <div className="text-base font-bold text-[var(--text-primary)] font-mono mt-0.5">
                          {nodeDetail?.usage_percent || 0}%
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                        <span className="text-[10px] text-[var(--text-muted)] font-medium block">Repos Using</span>
                        <div className="text-base font-bold text-[var(--text-primary)] font-mono mt-0.5">
                          {nodeDetail?.repo_count || nodeDetail?.related_repos?.length || 0}
                        </div>
                      </div>
                    </div>

                    {nodeDetail?.top_experts && nodeDetail.top_experts.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">Internal Experts</span>
                        <div className="space-y-1">
                          {nodeDetail.top_experts.map((e: any) => (
                            <button
                              key={e.name}
                              onClick={() => handleSelectNeighbor(e.name, 'PERSON')}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs transition-colors cursor-pointer text-left"
                            >
                              <span className="text-[var(--text-primary)] font-medium flex items-center gap-1.5">
                                <User className="h-3 w-3 text-[var(--text-muted)]" />
                                {e.name}
                              </span>
                              <span className="text-[10px] text-indigo-400 font-mono">{(e.commits || '') + ' contributions'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {nodeDetail?.related_repos && nodeDetail.related_repos.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] block">Applied In Repos</span>
                        <div className="flex flex-wrap gap-1">
                          {nodeDetail.related_repos.map(r => (
                            <button
                              key={r}
                              onClick={() => handleSelectNeighbor(r, 'REPOSITORY')}
                              className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] hover:border-indigo-500/40 transition-colors cursor-pointer font-mono"
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
              <div className="pt-3.5 mt-3.5 border-t border-[var(--border-subtle)] flex flex-col gap-2">
                {Object.entries(nodeDetail.actions).map(([key, action]) => (
                  <button
                    key={key}
                    onClick={() => handleActionClick(action)}
                    className="w-full py-2 px-3 cortex-btn-primary flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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