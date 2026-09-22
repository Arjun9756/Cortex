import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { GraphNode, GraphEdge } from '../lib/api';
import { ZoomIn, ZoomOut, Maximize2, Search, Sparkles, Move } from 'lucide-react';
import { RISK_THRESHOLDS } from '../constants/riskThresholds';

interface ForceGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
}

export type NodeCategory = 'PERSON' | 'REPOSITORY' | 'TECHNOLOGY' | 'COMMIT' | 'ISSUE' | 'PULL_REQUEST' | 'FILE';

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  category: NodeCategory;
  color: string;
  glowColor: string;
}

// ─── Node Category Classifier ──────────────────────────────────────────────────

export function getNodeCategory(node: Partial<GraphNode> & { type?: string; labels?: string[] }): NodeCategory {
  const rawType = (node.label || node.type || (Array.isArray(node.labels) ? node.labels[0] : '') || '').toString().toUpperCase();

  if (rawType.includes('PERSON') || rawType.includes('USER') || rawType.includes('AUTHOR')) return 'PERSON';
  if (rawType.includes('REPO') || rawType.includes('SERVICE')) return 'REPOSITORY';
  if (rawType.includes('TECH') || rawType.includes('FRAMEWORK') || rawType.includes('LANG') || rawType.includes('TOOL')) return 'TECHNOLOGY';
  if (rawType.includes('COMMIT') || rawType.includes('SHA') || rawType.includes('HASH')) return 'COMMIT';
  if (rawType.includes('ISSUE') || rawType.includes('BUG') || rawType.includes('TICKET') || rawType.includes('CVE')) return 'ISSUE';
  if (rawType.includes('PULL') || rawType.includes('PR') || rawType.includes('MERGE')) return 'PULL_REQUEST';
  if (rawType.includes('FILE') || rawType.includes('PATH')) return 'FILE';

  // Name / ID Fallback Heuristics
  const name = (node.name || node.id || '').toString().toUpperCase();
  if (name.startsWith('AUTH-') || name.startsWith('BILL-') || name.startsWith('GRAPH-') || name.startsWith('NOTIF-') || name.startsWith('WEB-') || name.startsWith('VEC-') || name.startsWith('INFRA-') || name.startsWith('CVE-') || name.startsWith('CORTEX-')) return 'ISSUE';
  if (/^[0-9a-f]{24,40}$/i.test(name)) return 'COMMIT';
  if (name.includes('SERVICE') || name.includes('CORTEX') || name.includes('HUB') || name.includes('ENGINE') || name.includes('WEB-DASHBOARD') || name.includes('INFRA-K8S')) return 'REPOSITORY';
  if (['REDIS', 'VALKEY', 'PGBOUNCER', 'SUPAVISOR', 'CYPHER', 'RS256', 'D3', 'QDRANT', 'NEO4J', 'POSTGRESQL', 'KUBERNETES', 'FORCEGRAPH', 'TWILIO', 'STRIPE', 'OAUTH2', 'PKCE', 'KEYCLOAK'].includes(name)) return 'TECHNOLOGY';
  if (name.includes(' ') && !name.includes('/') && !name.includes('.TS')) return 'PERSON';

  return 'TECHNOLOGY';
}

const CATEGORY_STYLES: Record<NodeCategory, { color: string; glow: string; label: string }> = {
  PERSON: { color: '#10B981', glow: 'rgba(16, 185, 129, 0.2)', label: 'Person' },
  REPOSITORY: { color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.2)', label: 'Repository' },
  TECHNOLOGY: { color: '#818CF8', glow: 'rgba(129, 140, 248, 0.2)', label: 'Technology' },
  COMMIT: { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.2)', label: 'Commit' },
  ISSUE: { color: '#EF4444', glow: 'rgba(239, 68, 68, 0.2)', label: 'Issue' },
  PULL_REQUEST: { color: '#06B6D4', glow: 'rgba(6, 182, 212, 0.2)', label: 'Pull Request' },
  FILE: { color: '#64748B', glow: 'rgba(100, 116, 139, 0.2)', label: 'File' },
};

function formatNodeDisplayLabel(name: string): string {
  if (!name) return '';
  if (/^[0-9a-f]{32,40}$/i.test(name)) {
    return name.slice(0, 8) + '...';
  }
  if (name.length > 24) {
    return name.slice(0, 21) + '...';
  }
  return name;
}

export const ForceGraph: React.FC<ForceGraphProps> = ({ nodes, edges, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const isMouseDownRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedNodeRef = useRef<SimNode | null>(null);
  const isPanningRef = useRef<boolean>(false);

  // Category counts for legend badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: nodes.length };
    nodes.forEach(n => {
      const cat = getNodeCategory(n);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  // Filter nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      const cat = getNodeCategory(n);
      const matchesSearch =
        !searchTerm ||
        (n.name && n.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (n.id && n.id.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterCategory === 'ALL' || cat === filterCategory;
      return matchesSearch && matchesType;
    });
  }, [nodes, searchTerm, filterCategory]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  // Convert raw nodes & edges into force simulation items
  const { simNodes, simEdges } = useMemo(() => {
    const width = 1100;
    const height = 750;

    const simNodes: SimNode[] = filteredNodes.map((node, i) => {
      const angle = (i / Math.max(1, filteredNodes.length)) * Math.PI * 2;
      const radiusDist = 180 + Math.random() * 160;
      const cat = getNodeCategory(node);
      const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.TECHNOLOGY;

      let radius = 9;
      let nodeColor = style.color;
      let glowColor = style.glow;

      if (cat === 'REPOSITORY') {
        const repoStatus = String(node.status || '').toLowerCase();
        const busFactor = Number(node.bus_factor || 0);
        const riskScore = Number(node.risk_score || 0);

        if (repoStatus === 'empty') {
          nodeColor = '#64748B'; // Neutral Slate for empty/scaffold repo
          glowColor = 'rgba(100, 116, 139, 0.2)';
          radius = 11;
        } else if (repoStatus === 'fragile' || (busFactor <= 1 && riskScore >= RISK_THRESHOLDS.CRITICAL)) {
          nodeColor = '#EF4444'; // Red (critical risk / SPOF)
          glowColor = 'rgba(239, 68, 68, 0.25)';
          radius = 15;
        } else if (repoStatus === 'concentrated' || riskScore >= RISK_THRESHOLDS.HIGH) {
          nodeColor = '#F59E0B'; // Amber (concentrated risk)
          glowColor = 'rgba(245, 158, 11, 0.25)';
          radius = 13;
        } else {
          nodeColor = '#10B981'; // Emerald (healthy)
          glowColor = 'rgba(16, 185, 129, 0.2)';
          radius = 12;
        }
      } else if (cat === 'PERSON') {
        const riskScore = Number(node.risk_score || 0);
        const commits = Number(node.commit_count || 0);
        if (riskScore >= RISK_THRESHOLDS.CRITICAL) {
          nodeColor = '#EF4444'; // Critical Knowledge Risk
          glowColor = 'rgba(239, 68, 68, 0.25)';
        } else if (riskScore >= RISK_THRESHOLDS.HIGH) {
          nodeColor = '#F97316'; // High Knowledge Risk
          glowColor = 'rgba(249, 115, 22, 0.25)';
        } else if (riskScore >= RISK_THRESHOLDS.MODERATE) {
          nodeColor = '#F59E0B'; // Moderate Knowledge Risk
          glowColor = 'rgba(245, 158, 11, 0.25)';
        } else {
          nodeColor = '#10B981'; // Low Knowledge Risk
          glowColor = 'rgba(16, 185, 129, 0.2)';
        }
        radius = Math.min(20, Math.max(11, 11 + Math.log10(commits + 1) * 2.8));
      } else if (cat === 'TECHNOLOGY') {
        const usage = Number(node.usage_percent || 0);
        radius = Math.min(16, Math.max(9, 9 + Math.round(usage / 18)));
        nodeColor = '#818CF8';
        glowColor = 'rgba(129, 140, 248, 0.2)';
      } else if (cat === 'COMMIT') {
        radius = 6;
      } else if (cat === 'ISSUE') {
        radius = 8;
      }

      return {
        ...node,
        category: cat,
        color: nodeColor,
        glowColor: glowColor,
        x: width / 2 + Math.cos(angle) * radiusDist,
        y: height / 2 + Math.sin(angle) * radiusDist,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius,
      };
    });

    const nodeMap = new Map(simNodes.map(n => [n.id, n]));

    const simEdges = filteredEdges
      .map(edge => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (sourceNode && targetNode) {
          return { ...edge, sourceNode, targetNode };
        }
        return null;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    return { simNodes, simEdges };
  }, [filteredNodes, filteredEdges]);

  // Connected node IDs calculation
  const connectedNodeIds = useMemo(() => {
    const active = selectedNode || hoveredNode;
    if (!active) return new Set<string>();

    const set = new Set<string>([active.id]);
    simEdges.forEach(e => {
      if (e.source === active.id) set.add(e.target);
      if (e.target === active.id) set.add(e.source);
    });
    return set;
  }, [selectedNode, hoveredNode, simEdges]);

  // Canvas Physics & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let iterations = 0;

    const runSimulation = () => {
      if (iterations < 250) {
        // Repulsion
        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const n1 = simNodes[i];
            const n2 = simNodes[j];
            if (n1 === draggedNodeRef.current || n2 === draggedNodeRef.current) continue;

            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 200) {
              const force = ((200 - dist) / dist) * 0.1;
              n1.vx -= dx * force;
              n1.vy -= dy * force;
              n2.vx += dx * force;
              n2.vy += dy * force;
            }
          }
        }

        // Edge attraction
        simEdges.forEach(edge => {
          const dx = edge.targetNode.x - edge.sourceNode.x;
          const dy = edge.targetNode.y - edge.sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 130) * 0.015;
          if (edge.sourceNode !== draggedNodeRef.current) {
            edge.sourceNode.vx += (dx / dist) * force;
            edge.sourceNode.vy += (dy / dist) * force;
          }
          if (edge.targetNode !== draggedNodeRef.current) {
            edge.targetNode.vx -= (dx / dist) * force;
            edge.targetNode.vy -= (dy / dist) * force;
          }
        });

        // Center gravity
        simNodes.forEach(node => {
          if (node === draggedNodeRef.current) return;
          node.vx += (550 - node.x) * 0.0005;
          node.vy += (375 - node.y) * 0.0005;
          node.x += node.vx;
          node.y += node.vy;
          node.vx *= 0.78;
          node.vy *= 0.78;
        });

        iterations++;
      }

      // Render Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0B0F17';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      const hasActiveSelection = selectedNode !== null || hoveredNode !== null;

      // Draw Edges
      simEdges.forEach(edge => {
        const isConnectedToActive =
          (selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target)) ||
          (hoveredNode && (hoveredNode.id === edge.source || hoveredNode.id === edge.target));

        ctx.beginPath();
        ctx.moveTo(edge.sourceNode.x, edge.sourceNode.y);
        ctx.lineTo(edge.targetNode.x, edge.targetNode.y);

        if (isConnectedToActive) {
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)';
          ctx.lineWidth = 2.0;
        } else if (hasActiveSelection) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 0.5;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1.0;
        }
        ctx.stroke();

        // Relation label on high zoom or selection
        const relationLabel = edge.type || edge.label || '';
        if (isConnectedToActive && relationLabel && zoom >= 0.8) {
          const midX = (edge.sourceNode.x + edge.targetNode.x) / 2;
          const midY = (edge.sourceNode.y + edge.targetNode.y) / 2;
          ctx.font = '9px monospace';
          ctx.fillStyle = '#818CF8';
          ctx.textAlign = 'center';
          ctx.fillText(relationLabel, midX, midY - 4);
        }
      });

      // Draw Nodes
      simNodes.forEach(node => {
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isConnected = connectedNodeIds.has(node.id);

        let opacity = 1.0;
        if (hasActiveSelection && !isConnected) {
          opacity = 0.22;
        }

        ctx.globalAlpha = opacity;

        // Subtle glow aura on hover or selection only
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 4, 0, Math.PI * 2);
          ctx.fillStyle = node.glowColor;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? '#FFFFFF' : '#1E2638';
        ctx.lineWidth = isSelected ? 2.0 : 1.2;
        ctx.stroke();

        // Node Label
        const labelText = formatNodeDisplayLabel(node.name || node.id);
        ctx.font = `500 ${node.category === 'PERSON' || node.category === 'REPOSITORY' ? '12px' : '11px'} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = isSelected || isHovered ? '#FFFFFF' : 'rgba(241, 245, 249, 0.85)';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(labelText, node.x, node.y + node.radius + 14);
        ctx.shadowBlur = 0;

        ctx.globalAlpha = 1.0;
      });

      ctx.restore();

      animId = requestAnimationFrame(runSimulation);
    };

    runSimulation();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [simNodes, simEdges, zoom, pan, selectedNode, hoveredNode, connectedNodeIds]);

  // Smooth Mouse Panning, Node Dragging & Wheel Zooming
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (hoveredNode) {
      draggedNodeRef.current = hoveredNode;
      isPanningRef.current = false;
      setSelectedNode(hoveredNode);
      if (onNodeClick) onNodeClick(hoveredNode);
    } else {
      draggedNodeRef.current = null;
      isPanningRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const graphX = (mx - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2;
    const graphY = (my - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2;

    if (isMouseDownRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;

      if (draggedNodeRef.current) {
        draggedNodeRef.current.x += dx / zoom;
        draggedNodeRef.current.y += dy / zoom;
        draggedNodeRef.current.vx = 0;
        draggedNodeRef.current.vy = 0;
      } else {
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      }

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Hover detection
    const found = simNodes.find(n => {
      const dX = n.x - graphX;
      const dY = n.y - graphY;
      return Math.sqrt(dX * dX + dY * dY) <= n.radius + 8;
    });

    setHoveredNode(found || null);
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    draggedNodeRef.current = null;
    isPanningRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(z => Math.max(0.3, Math.min(z * zoomFactor, 3.0)));
  };

  const categoriesList: { id: string; label: string; color?: string }[] = [
    { id: 'ALL', label: 'All Nodes' },
    { id: 'PERSON', label: 'Person', color: CATEGORY_STYLES.PERSON.color },
    { id: 'REPOSITORY', label: 'Repository', color: CATEGORY_STYLES.REPOSITORY.color },
    { id: 'TECHNOLOGY', label: 'Technology', color: CATEGORY_STYLES.TECHNOLOGY.color },
    { id: 'COMMIT', label: 'Commit', color: CATEGORY_STYLES.COMMIT.color },
    { id: 'ISSUE', label: 'Issue', color: CATEGORY_STYLES.ISSUE.color },
    { id: 'PULL_REQUEST', label: 'Pull Request', color: CATEGORY_STYLES.PULL_REQUEST.color },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Clean Toolbar ABOVE Canvas Container */}
      <div className="cortex-card p-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Node Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categoriesList.map(cat => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = filterCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)]'
                }`}
              >
                {cat.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1 py-0.2 rounded ${isSelected ? 'bg-white/20 text-white' : 'text-[var(--text-muted)]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar & Pan / Zoom Help */}
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search nodes..."
              className="bg-[var(--bg-app)] border border-[var(--border-strong)] focus:border-indigo-500 rounded-lg pl-8 pr-2.5 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none w-40 font-mono transition-colors"
            />
          </div>

          <div className="flex items-center space-x-1 bg-[var(--bg-app)] p-0.5 rounded-lg border border-[var(--border-strong)]">
            <button onClick={() => setZoom(z => Math.min(z * 1.2, 3.0))} className="p-1 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer" title="Zoom In">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setZoom(z => Math.max(z * 0.8, 0.3))} className="p-1 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer" title="Zoom Out">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedNode(null); setSearchTerm(''); setFilterCategory('ALL'); }} className="p-1 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer" title="Reset Graph View">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container Box */}
      <div ref={containerRef} className="relative w-full h-[650px] bg-[#0B0F17] rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-inner">
        {/* Floating Pan & Drag Instructions Badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[var(--bg-panel)]/90 border border-[var(--border-subtle)] text-[var(--text-muted)] text-[11px] font-mono pointer-events-none backdrop-blur-md">
          <Move className="w-3 h-3 text-indigo-400" />
          <span>Drag to pan | Scroll to zoom</span>
        </div>

        {/* Interactive Canvas */}
        <canvas
          ref={canvasRef}
          width={1100}
          height={750}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        />

        {/* Selected Node Drawer */}
        {selectedNode && (
          <div className="absolute bottom-4 right-4 z-20 max-w-sm bg-[var(--bg-panel)] border border-[var(--border-strong)] p-4 rounded-xl shadow-2xl space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded text-white" style={{ backgroundColor: selectedNode.color }}>
                {selectedNode.category}
              </span>
              <button onClick={() => setSelectedNode(null)} className="text-xs text-[var(--text-muted)] hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-[var(--bg-elevated)]">✕</button>
            </div>

            <div>
              <h4 className="font-bold text-[var(--text-primary)] text-sm leading-snug tracking-tight">{selectedNode.name || selectedNode.id}</h4>
              <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5 break-all">ID: {selectedNode.id}</p>
            </div>

            {selectedNode.email && (
              <p className="text-xs text-indigo-400 font-mono flex items-center gap-1.5">
                <span>Email:</span> <span className="text-[var(--text-primary)] font-medium">{selectedNode.email}</span>
              </p>
            )}

            {selectedNode.role && (
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Role: <span className="text-[var(--text-secondary)]">{selectedNode.role}</span>
              </p>
            )}

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
              <span>Connected Edges: <strong className="text-[var(--text-primary)]">{connectedNodeIds.size - 1}</strong></span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Connected
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
