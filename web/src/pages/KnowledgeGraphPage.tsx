import React, { useEffect, useState } from 'react';
import { getGraphVisualization, type GraphNode, type GraphEdge } from '../lib/api';
import { ForceGraph, getNodeCategory } from '../components/ForceGraph';
import { Network, Filter, RefreshCw, AlertTriangle, Layers } from 'lucide-react';

interface KnowledgeGraphPageProps {
  onSyncUpdated?: (date: Date) => void;
}

export const KnowledgeGraphPage: React.FC<KnowledgeGraphPageProps> = ({ onSyncUpdated }) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [nodeCount, setNodeCount] = useState<number>(0);
  const [edgeCount, setEdgeCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter query parameters
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  const fetchGraph = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const res = await getGraphVisualization({
        repository: selectedRepo || undefined,
        personExternalId: selectedPerson || undefined,
        limit: limit,
      });
      setNodes(res.nodes || []);
      setEdges(res.edges || []);
      setNodeCount(res.nodeCount || 0);
      setEdgeCount(res.edgeCount || 0);
      if (onSyncUpdated) {
        onSyncUpdated(new Date());
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message || 'Failed to fetch Knowledge Graph visualization');
      } else {
        console.warn('[KnowledgeGraph] Background poll error:', err?.message);
      }
    } finally {
      if (!silent) setLoading(false);
      else setIsRefreshing(false);
    }
  };

  // Re-fetch when filter options change
  useEffect(() => {
    fetchGraph(false);
  }, [selectedRepo, selectedPerson, limit]);

  // Periodic auto-refresh every 45s when on Knowledge Graph page
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchGraph(true);
      }
    }, 45000);

    const handleFocus = () => {
      fetchGraph(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedRepo, selectedPerson, limit]);

  // Derive filter dropdown lists from available nodes
  const availableRepos = Array.from(
    new Set(nodes.filter(n => getNodeCategory(n) === 'REPOSITORY').map(n => n.name))
  );
  const availablePeople = Array.from(
    new Set(nodes.filter(n => getNodeCategory(n) === 'PERSON').map(n => ({ id: n.externalId || n.id, name: n.name })))
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Network className="h-6 w-6 text-indigo-400" />
            <span>Interactive Knowledge Graph</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Explore live Neo4j graph nodes and relationships: Engineers, Repositories, Technologies, Commits, PRs, and Issues.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isRefreshing ? 'bg-indigo-400' : 'bg-emerald-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isRefreshing ? 'bg-indigo-500' : 'bg-emerald-500'
              }`}></span>
            </span>
            <span>{isRefreshing ? 'Syncing...' : 'Live Graph'}</span>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Nodes: <strong className="text-white">{nodeCount}</strong> | Edges: <strong className="text-white">{edgeCount}</strong>
          </span>
          <button
            onClick={() => fetchGraph(false)}
            disabled={loading || isRefreshing}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white rounded-lg flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold uppercase tracking-wider">
          <Filter className="h-4 w-4" />
          <span>Graph Filters:</span>
        </div>

        {/* Repository Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-slate-400">Repository:</label>
          <select
            value={selectedRepo}
            onChange={e => setSelectedRepo(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Repositories</option>
            {availableRepos.map(repo => (
              <option key={repo} value={repo}>{repo}</option>
            ))}
          </select>
        </div>

        {/* Person Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-slate-400">Person:</label>
          <select
            value={selectedPerson}
            onChange={e => setSelectedPerson(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Personnel</option>
            {availablePeople.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Limit Slider */}
        <div className="flex items-center space-x-2 ml-auto">
          <label className="text-slate-400">Max Nodes ({limit}):</label>
          <input
            type="range"
            min={20}
            max={200}
            step={10}
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Graph Area */}
      {loading ? (
        <div className="h-[600px] bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center animate-pulse">
          <div className="text-center space-y-2">
            <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading graph subgraph from Neo4j...</p>
          </div>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3 text-rose-300">
            <AlertTriangle className="h-6 w-6 text-rose-400" />
            <div>
              <h4 className="font-semibold text-white">Failed to Load Graph Data</h4>
              <p className="text-xs text-rose-300/80">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchGraph(false)}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 text-xs font-semibold rounded-lg flex items-center space-x-2 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
      ) : nodes.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-3">
          <Layers className="h-10 w-10 text-slate-500 mx-auto" />
          <h4 className="text-base font-semibold text-slate-300">No Graph Nodes Found matching filters</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try resetting your repository or person filters to view the complete knowledge graph.
          </p>
        </div>
      ) : (
        <ForceGraph nodes={nodes} edges={edges} />
      )}
    </div>
  );
};
