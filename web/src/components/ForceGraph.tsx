import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { GraphNode, GraphEdge } from '../lib/api';
import { ZoomIn, ZoomOut, Maximize2, Search } from 'lucide-react';

interface ForceGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export const ForceGraph: React.FC<ForceGraphProps> = ({ nodes, edges, onNodeClick }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Reference design color palette (Image 3)
  const getNodeColor = (label: string): string => {
    switch (label?.toUpperCase()) {
      case 'PERSON':
        return '#10b981'; // Vibrant Green
      case 'REPOSITORY':
        return '#3b82f6'; // Bright Blue
      case 'TECHNOLOGY':
        return '#a855f7'; // Purple
      case 'COMMIT':
        return '#f59e0b'; // Gold / Amber
      case 'ISSUE':
        return '#ef4444'; // Red
      case 'PULL_REQUEST':
        return '#f97316'; // Orange
      case 'FILE':
        return '#64748b'; // Slate
      default:
        return '#64748b';
    }
  };

  // Helper to truncate long labels (e.g. commit hashes or long issue titles)
  const formatNodeLabel = (name: string): string => {
    if (!name) return '';
    if (name.length > 20) {
      if (name.match(/^[0-9a-f]{32,40}$/i)) {
        return name.slice(0, 8) + '...';
      }
      return name.slice(0, 18) + '...';
    }
    return name;
  };

  // Filter nodes based on search & active node type filter
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      const matchesSearch = !searchTerm || n.name?.toLowerCase().includes(searchTerm.toLowerCase()) || n.id?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || n.label?.toUpperCase() === filterType;
      return matchesSearch && matchesType;
    });
  }, [nodes, searchTerm, filterType]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [edges, filteredNodeIds]);

  // Convert raw nodes & edges into force-simulated items
  const { simNodes, simEdges } = useMemo(() => {
    const width = 1000;
    const height = 700;

    const simNodes: SimNode[] = filteredNodes.map((node, i) => {
      const angle = (i / Math.max(1, filteredNodes.length)) * Math.PI * 2;
      const radiusDist = 180 + Math.random() * 120;
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * radiusDist,
        y: height / 2 + Math.sin(angle) * radiusDist,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: node.label === 'PERSON' ? 9 : node.label === 'REPOSITORY' ? 10 : 7,
        color: getNodeColor(node.label),
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

  // Physics loop & Rendering on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let iterations = 0;

    const runSimulation = () => {
      if (iterations < 180) {
        // Repulsion between node pairs
        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const n1 = simNodes[i];
            const n2 = simNodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            if (dist < 160) {
              const force = (160 - dist) / dist * 0.08;
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
          const force = (dist - 100) * 0.015;
          edge.sourceNode.vx += (dx / dist) * force;
          edge.sourceNode.vy += (dy / dist) * force;
          edge.targetNode.vx -= (dx / dist) * force;
          edge.targetNode.vy -= (dy / dist) * force;
        });

        // Center gravity
        simNodes.forEach(node => {
          node.vx += (500 - node.x) * 0.0005;
          node.vy += (350 - node.y) * 0.0005;
          node.x += node.vx;
          node.y += node.vy;
          node.vx *= 0.82;
          node.vy *= 0.82;
        });

        iterations++;
      }

      // Draw dark background matching screenshot (#0b0e17)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0b0e17';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Render Edges with delicate lines (Image 3 style)
      simEdges.forEach(edge => {
        const isHighlighted =
          selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target);

        ctx.beginPath();
        ctx.moveTo(edge.sourceNode.x, edge.sourceNode.y);
        ctx.lineTo(edge.targetNode.x, edge.targetNode.y);
        ctx.strokeStyle = isHighlighted ? 'rgba(168, 85, 247, 0.7)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = isHighlighted ? 1.5 : 0.8;
        ctx.stroke();
      });

      // Render Nodes with glow & small clean typography
      simNodes.forEach(node => {
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;

        // Glow ring on selection/hover
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
          ctx.fillStyle = isSelected ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.15)';
          ctx.fill();
        }

        // Inner solid node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Node Label (Clean sans-serif text matching Image 3)
        const labelText = formatNodeLabel(node.name || node.id);
        ctx.font = `11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = isSelected || isHovered ? '#ffffff' : 'rgba(226, 232, 240, 0.85)';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(labelText, node.x, node.y + node.radius + 12);
        ctx.shadowBlur = 0;
      });

      ctx.restore();

      animId = requestAnimationFrame(runSimulation);
    };

    runSimulation();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [simNodes, simEdges, zoom, pan, selectedNode, hoveredNode]);

  // Handle interaction
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const graphX = (mx - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2;
    const graphY = (my - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2;

    const found = simNodes.find(n => {
      const dx = n.x - graphX;
      const dy = n.y - graphY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    setHoveredNode(found || null);
  };

  const handleCanvasClick = () => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
      if (onNodeClick) onNodeClick(hoveredNode);
    } else {
      setSelectedNode(null);
    }
  };

  const nodeTypes = [
    { id: 'ALL', label: 'All Nodes' },
    { id: 'PERSON', label: 'Person', color: '#10b981' },
    { id: 'REPOSITORY', label: 'Repository', color: '#3b82f6' },
    { id: 'TECHNOLOGY', label: 'Technology', color: '#a855f7' },
    { id: 'COMMIT', label: 'Commit', color: '#f59e0b' },
    { id: 'ISSUE', label: 'Issue', color: '#ef4444' },
    { id: 'PULL_REQUEST', label: 'Pull Request', color: '#f97316' },
  ];

  return (
    <div ref={containerRef} className="relative w-full h-[680px] bg-[#090d16] rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col justify-between shadow-2xl">
      {/* Top Bar matching Image 3: Node Type Legend + Search Input */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 bg-[#0f172a]/90 border border-slate-800/90 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-xl">
        {/* Node Type Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto">
          {nodeTypes.map(t => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                filterType === t.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }}></span>}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Search */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search nodes..."
              className="bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none w-44"
            />
          </div>

          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button onClick={() => setZoom(z => Math.min(z + 0.2, 2.5))} className="p-1 hover:bg-slate-800 rounded text-slate-300">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="p-1 hover:bg-slate-800 rounded text-slate-300">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedNode(null); setSearchTerm(''); setFilterType('ALL'); }} className="p-1 hover:bg-slate-800 rounded text-slate-300">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1000}
        height={700}
        onMouseMove={handleCanvasMouseMove}
        onClick={handleCanvasClick}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Bottom Minimap Box matching Image 3 */}
      <div className="absolute bottom-4 left-4 z-10 hidden md:flex items-center justify-center w-36 h-24 bg-[#0d1322]/90 border border-slate-800/90 rounded-lg p-1.5 shadow-xl backdrop-blur-md">
        <div className="relative w-full h-full border border-slate-800/60 rounded flex items-center justify-center overflow-hidden">
          <div className="w-10 h-8 border border-indigo-500/60 rounded bg-indigo-500/10"></div>
          <span className="absolute bottom-1 right-1 text-[9px] font-mono text-slate-500">Minimap</span>
        </div>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-10 max-w-sm bg-[#0d1322]/95 border border-indigo-500/40 backdrop-blur-md p-4 rounded-xl shadow-2xl space-y-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded text-white" style={{ backgroundColor: selectedNode.color }}>
              {selectedNode.label}
            </span>
            <button onClick={() => setSelectedNode(null)} className="text-xs text-slate-500 hover:text-white">✕</button>
          </div>
          <h4 className="font-bold text-white text-sm leading-tight">{selectedNode.name || selectedNode.id}</h4>
          <p className="text-[11px] text-slate-400 font-mono">ID: {selectedNode.id}</p>
          {selectedNode.email && <p className="text-xs text-indigo-300">Email: {selectedNode.email}</p>}
          {selectedNode.role && <p className="text-xs text-slate-300">Role: {selectedNode.role}</p>}
        </div>
      )}
    </div>
  );
};
