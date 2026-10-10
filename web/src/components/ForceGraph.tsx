import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { GraphNode, GraphEdge } from '../lib/api';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, Search, ArrowRight, Route, X } from 'lucide-react';

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

// ─── Reference Image Color Tokens ──────────────────────────────────────────────
// Person: Blue, Repository: Purple, Technology: Emerald, Commit: Amber, Issue: Red, Pull Request: Orange
const CATEGORY_STYLES: Record<NodeCategory, { color: string; glow: string; label: string }> = {
  PERSON: { color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.45)', label: 'Person' },
  REPOSITORY: { color: '#A855F7', glow: 'rgba(168, 85, 247, 0.45)', label: 'Repository' },
  TECHNOLOGY: { color: '#10B981', glow: 'rgba(16, 185, 129, 0.45)', label: 'Technology' },
  COMMIT: { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.45)', label: 'Commit' },
  ISSUE: { color: '#EF4444', glow: 'rgba(239, 68, 68, 0.45)', label: 'Issue' },
  PULL_REQUEST: { color: '#F97316', glow: 'rgba(249, 115, 22, 0.45)', label: 'Pull Request' },
  FILE: { color: '#64748B', glow: 'rgba(100, 116, 139, 0.35)', label: 'File' },
};

function formatNodeDisplayLabel(name: string): string {
  if (!name) return '';
  if (/^[0-9a-f]{32,40}$/i.test(name)) {
    return name.slice(0, 8);
  }
  if (name.length > 22) {
    return name.slice(0, 20) + '...';
  }
  return name;
}

export const ForceGraph: React.FC<ForceGraphProps> = ({ nodes, edges, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Pathfinding state
  const [pathFromId, setPathFromId] = useState<string>('');
  const [pathToId, setPathToId] = useState<string>('');

  // Mouse interaction state
  const isMouseDownRef = useRef<boolean>(false);
  const mouseDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedNodeRef = useRef<SimNode | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const wakeSimulationRef = useRef<() => void>(() => {});

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: nodes.length };
    nodes.forEach(n => {
      const cat = getNodeCategory(n);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  // Filter nodes by category and search
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

  // Convert raw nodes & edges into simulation items
  const { simNodes, simEdges } = useMemo(() => {
    const width = 1200;
    const height = 800;

    const simNodes: SimNode[] = filteredNodes.map((node, i) => {
      const angle = (i / Math.max(1, filteredNodes.length)) * Math.PI * 2;
      const radiusDist = 180 + (i % 5) * 45;
      const cat = getNodeCategory(node);
      const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.TECHNOLOGY;

      let radius = 10;
      if (cat === 'REPOSITORY') radius = 14;
      else if (cat === 'PERSON') radius = 13;
      else if (cat === 'TECHNOLOGY') radius = 11;
      else if (cat === 'COMMIT') radius = 7;
      else if (cat === 'ISSUE') radius = 8;
      else if (cat === 'PULL_REQUEST') radius = 9;

      return {
        ...node,
        category: cat,
        color: style.color,
        glowColor: style.glow,
        x: width / 2 + Math.cos(angle) * radiusDist,
        y: height / 2 + Math.sin(angle) * radiusDist,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius,
      };
    });

    const nodeMap = new Map<string, SimNode>();
    simNodes.forEach(n => {
      if (n.id) nodeMap.set(n.id, n);
      if (n.name && !nodeMap.has(n.name)) nodeMap.set(n.name, n);
      if (n.id) nodeMap.set(n.id.toLowerCase(), n);
      if (n.name) nodeMap.set(n.name.toLowerCase(), n);
    });

    const simEdges = filteredEdges
      .map(edge => {
        const sourceNode = nodeMap.get(edge.source) || nodeMap.get(edge.source.toLowerCase());
        const targetNode = nodeMap.get(edge.target) || nodeMap.get(edge.target.toLowerCase());
        if (sourceNode && targetNode) {
          return { ...edge, sourceNode, targetNode };
        }
        return null;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    return { simNodes, simEdges };
  }, [filteredNodes, filteredEdges]);

  // Shortest path calculation via BFS when pathFromId and pathToId are chosen
  const activePathInfo = useMemo(() => {
    if (!pathFromId || !pathToId || pathFromId === pathToId) return null;

    const adj = new Map<string, string[]>();
    simEdges.forEach(e => {
      if (!adj.has(e.source)) adj.set(e.source, []);
      if (!adj.has(e.target)) adj.set(e.target, []);
      adj.get(e.source)!.push(e.target);
      adj.get(e.target)!.push(e.source);
    });

    const queue: string[] = [pathFromId];
    const visited = new Set<string>([pathFromId]);
    const parent = new Map<string, string>();

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur === pathToId) {
        const path: string[] = [];
        let curr: string | undefined = pathToId;
        while (curr) {
          path.unshift(curr);
          curr = parent.get(curr);
        }
        const edgeKeys = new Set<string>();
        for (let i = 0; i < path.length - 1; i++) {
          edgeKeys.add(`${path[i]}->${path[i + 1]}`);
          edgeKeys.add(`${path[i + 1]}->${path[i]}`);
        }
        return { pathNodes: new Set(path), pathEdges: edgeKeys, hops: path.length - 1 };
      }

      for (const neighbor of adj.get(cur) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          parent.set(neighbor, cur);
          queue.push(neighbor);
        }
      }
    }
    return null;
  }, [pathFromId, pathToId, simEdges]);

  // Connected node IDs for highlighting
  const connectedNodeIds = useMemo(() => {
    if (activePathInfo) {
      return activePathInfo.pathNodes;
    }
    const active = selectedNode || hoveredNode;
    if (!active) return new Set<string>();

    const set = new Set<string>([active.id]);
    simEdges.forEach(e => {
      if (e.source === active.id) set.add(e.target);
      if (e.target === active.id) set.add(e.source);
    });
    return set;
  }, [selectedNode, hoveredNode, simEdges, activePathInfo]);

  // ─── High DPI Canvas Physics & Render Loop ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isRunning = true;
    let kineticEnergy = 100;

    const wakeSimulation = () => {
      kineticEnergy = 100;
      if (!isRunning) {
        isRunning = true;
        animId = requestAnimationFrame(runSimulation);
      }
    };
    wakeSimulationRef.current = wakeSimulation;

    const runSimulation = () => {
      if (!isRunning) return;

      // 1. Organic Spring & Repulsion Physics
      if (kineticEnergy > 0.05 || draggedNodeRef.current) {
        let totalEnergy = 0;

        // Node-to-node repulsion
        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const n1 = simNodes[i];
            const n2 = simNodes[j];
            if (n1 === draggedNodeRef.current || n2 === draggedNodeRef.current) continue;

            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist < 220) {
              const force = ((220 - dist) / dist) * 0.08;
              n1.vx -= dx * force;
              n1.vy -= dy * force;
              n2.vx += dx * force;
              n2.vy += dy * force;
            }
          }
        }

        // Edge spring attraction
        simEdges.forEach(edge => {
          const dx = edge.targetNode.x - edge.sourceNode.x;
          const dy = edge.targetNode.y - edge.sourceNode.y;
          const dist = Math.hypot(dx, dy) || 1;
          const force = (dist - 120) * 0.012;
          if (edge.sourceNode !== draggedNodeRef.current) {
            edge.sourceNode.vx += (dx / dist) * force;
            edge.sourceNode.vy += (dy / dist) * force;
          }
          if (edge.targetNode !== draggedNodeRef.current) {
            edge.targetNode.vx -= (dx / dist) * force;
            edge.targetNode.vy -= (dy / dist) * force;
          }
        });

        // Center gravity & damping
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        simNodes.forEach(node => {
          if (node === draggedNodeRef.current) return;
          node.vx += (centerX - node.x) * 0.0004;
          node.vy += (centerY - node.y) * 0.0004;
          node.x += node.vx;
          node.y += node.vy;
          node.vx *= 0.82;
          node.vy *= 0.82;
          totalEnergy += node.vx * node.vx + node.vy * node.vy;
        });

        kineticEnergy = totalEnergy;
      }

      // 2. Clear Canvas & Deep Obsidian Starfield Gradient
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bgGrad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 40,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.75
      );
      bgGrad.addColorStop(0, '#0E1424');
      bgGrad.addColorStop(0.6, '#080C16');
      bgGrad.addColorStop(1, '#05070D');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Camera Transform: Zoom & Pan around center
      ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      const hasActiveSelection = selectedNode !== null || hoveredNode !== null || Boolean(activePathInfo);

      // 3. Draw Edges
      simEdges.forEach(edge => {
        const isPathEdge = activePathInfo?.pathEdges.has(`${edge.source}->${edge.target}`);
        const isConnectedToActive =
          (selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target)) ||
          (hoveredNode && (hoveredNode.id === edge.source || hoveredNode.id === edge.target));

        ctx.beginPath();
        ctx.moveTo(edge.sourceNode.x, edge.sourceNode.y);
        ctx.lineTo(edge.targetNode.x, edge.targetNode.y);

        if (isPathEdge) {
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2.8;
          ctx.shadowColor = '#38BDF8';
          ctx.shadowBlur = 8;
        } else if (isConnectedToActive) {
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)';
          ctx.lineWidth = 2.0;
          ctx.shadowBlur = 0;
        } else if (hasActiveSelection) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 0.6;
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.lineWidth = 1.0;
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // 4. Draw Nodes
      simNodes.forEach(node => {
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isConnected = connectedNodeIds.has(node.id);
        const isPathNode = activePathInfo?.pathNodes.has(node.id);

        let opacity = 1.0;
        if (hasActiveSelection && !isConnected && !isPathNode) {
          opacity = 0.22;
        }

        ctx.globalAlpha = opacity;

        // Glowing Aura
        const showGlow = isSelected || isHovered || isPathNode;
        if (showGlow) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
          ctx.fillStyle = isPathNode ? 'rgba(56, 189, 248, 0.35)' : node.glowColor;
          ctx.fill();
        }

        // Inner Circle Fill
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = isPathNode ? '#38BDF8' : node.color;
        ctx.fill();

        // Node Crisp Border
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected || isPathNode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = isSelected ? 2.2 : 1.2;
        ctx.stroke();

        // Node Label
        const labelText = formatNodeDisplayLabel(node.name || node.id);
        ctx.font = `500 ${node.category === 'PERSON' || node.category === 'REPOSITORY' ? '12px' : '11px'} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillStyle = isSelected || isHovered || isPathNode ? '#FFFFFF' : 'rgba(241, 245, 249, 0.88)';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 5;
        ctx.fillText(labelText, node.x, node.y + node.radius + 15);
        ctx.shadowBlur = 0;

        ctx.globalAlpha = 1.0;
      });

      ctx.restore();

      // 5. Draw Bottom-Left Minimap HUD
      drawMinimap();

      animId = requestAnimationFrame(runSimulation);
    };

    // Helper to render the live minimap in the corner canvas
    const drawMinimap = () => {
      const minimap = minimapCanvasRef.current;
      if (!minimap) return;
      const mCtx = minimap.getContext('2d');
      if (!mCtx) return;

      mCtx.clearRect(0, 0, minimap.width, minimap.height);
      mCtx.fillStyle = 'rgba(10, 14, 26, 0.88)';
      mCtx.fillRect(0, 0, minimap.width, minimap.height);

      if (simNodes.length === 0) return;

      // Find graph bounding box
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      simNodes.forEach(n => {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      });

      const pad = 80;
      minX -= pad; maxX += pad; minY -= pad; maxY += pad;
      const gWidth = Math.max(100, maxX - minX);
      const gHeight = Math.max(100, maxY - minY);

      const mapScale = Math.min(minimap.width / gWidth, minimap.height / gHeight);
      const offsetX = (minimap.width - gWidth * mapScale) / 2;
      const offsetY = (minimap.height - gHeight * mapScale) / 2;

      // Draw mini dots
      simNodes.forEach(n => {
        const mx = offsetX + (n.x - minX) * mapScale;
        const my = offsetY + (n.y - minY) * mapScale;
        mCtx.beginPath();
        mCtx.arc(mx, my, 2.2, 0, Math.PI * 2);
        mCtx.fillStyle = n.color;
        mCtx.fill();
      });

      // Draw camera viewport box
      const viewLeft = (canvas.width / 2 - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2;
      const viewTop = (canvas.height / 2 - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2;
      const viewWidth = canvas.width / zoom;
      const viewHeight = canvas.height / zoom;

      const vx = offsetX + (viewLeft - minX) * mapScale;
      const vy = offsetY + (viewTop - minY) * mapScale;
      const vw = viewWidth * mapScale;
      const vh = viewHeight * mapScale;

      mCtx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      mCtx.lineWidth = 1.2;
      mCtx.strokeRect(vx, vy, vw, vh);
    };

    runSimulation();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [simNodes, simEdges, zoom, pan, selectedNode, hoveredNode, connectedNodeIds, activePathInfo]);

  // ─── Exact Canvas Screen Coordinate & Click Hit-Testing ─────────────────────
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { mouseX: 0, mouseY: 0, graphX: 0, graphY: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const graphX = (mouseX - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2;
    const graphY = (mouseY - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2;

    return { mouseX, mouseY, graphX, graphY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (hoveredNode) {
      draggedNodeRef.current = hoveredNode;
      isPanningRef.current = false;
      wakeSimulationRef.current();
    } else {
      draggedNodeRef.current = null;
      isPanningRef.current = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { mouseX, mouseY } = getCanvasMousePos(e);

    if (isMouseDownRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;

      if (draggedNodeRef.current) {
        draggedNodeRef.current.x += dx / zoom;
        draggedNodeRef.current.y += dy / zoom;
        draggedNodeRef.current.vx = 0;
        draggedNodeRef.current.vy = 0;
        wakeSimulationRef.current();
      } else {
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      }

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Precise Screen-Space Hit Detection
    // Checks physical pixel distance on screen between mouse and node
    let closestNode: SimNode | null = null;
    let closestDist = Infinity;

    simNodes.forEach(n => {
      const nodeScreenX = (n.x - canvas.width / 2) * zoom + (canvas.width / 2 + pan.x);
      const nodeScreenY = (n.y - canvas.height / 2) * zoom + (canvas.height / 2 + pan.y);
      const dist = Math.hypot(mouseX - nodeScreenX, mouseY - nodeScreenY);

      // Minimum 24px clickable hitbox on screen regardless of zoom
      const effectiveHitRadius = Math.max(24, n.radius * zoom + 8);
      if (dist <= effectiveHitRadius && dist < closestDist) {
        closestDist = dist;
        closestNode = n;
      }
    });

    setHoveredNode(closestNode);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isMouseDownRef.current) {
      const moveDistance = Math.hypot(
        e.clientX - mouseDownPosRef.current.x,
        e.clientY - mouseDownPosRef.current.y
      );

      // Clean Click Detection: Click fired if mouse didn't drag more than 5px
      if (moveDistance < 5) {
        if (hoveredNode) {
          setSelectedNode(hoveredNode);
          if (onNodeClick) onNodeClick(hoveredNode);
        } else {
          setSelectedNode(null);
        }
      }

      isMouseDownRef.current = false;
      draggedNodeRef.current = null;
      isPanningRef.current = false;
    }
  };

  // ─── Non-Passive Wheel Event Listener (Prevents Entire Browser Page Scrolling) ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomFactor = e.deltaY < 0 ? 1.09 : 0.91;
      setZoom(z => Math.max(0.25, Math.min(z * zoomFactor, 3.5)));
      wakeSimulationRef.current();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []);

  // ─── Dynamic Canvas Dimensions based on parent container ─────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;

    const updateSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        const newW = Math.round(rect.width);
        const newH = Math.round(rect.height);
        if (canvas.width !== newW || canvas.height !== newH) {
          canvas.width = newW;
          canvas.height = newH;
          wakeSimulationRef.current();
        }
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, []);

  const categoriesList: { id: string; label: string; color?: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: 'PERSON', label: 'Person', color: CATEGORY_STYLES.PERSON.color },
    { id: 'REPOSITORY', label: 'Repository', color: CATEGORY_STYLES.REPOSITORY.color },
    { id: 'TECHNOLOGY', label: 'Technology', color: CATEGORY_STYLES.TECHNOLOGY.color },
    { id: 'COMMIT', label: 'Commit', color: CATEGORY_STYLES.COMMIT.color },
    { id: 'ISSUE', label: 'Issue', color: CATEGORY_STYLES.ISSUE.color },
    { id: 'PULL_REQUEST', label: 'Pull Request', color: CATEGORY_STYLES.PULL_REQUEST.color },
  ];

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col space-y-3 bg-[#06080F] text-slate-100 p-2 rounded-2xl border border-slate-800/80 shadow-2xl overflow-hidden">
      {/* ─── Top Header Toolbar (Matches User Reference Image) ──────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-[#0B0F1C]/90 rounded-xl border border-slate-800/60 backdrop-blur-md">
        {/* Search Bar */}
        <div className="relative flex items-center min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); wakeSimulationRef.current(); }}
            placeholder="Search nodes..."
            className="w-full bg-[#121829] border border-slate-700/60 focus:border-indigo-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none font-mono transition-colors"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 text-slate-400 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Shortest Path Finding Controls ("Path from... to...") */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded-md border border-cyan-800/40">
            <Route className="w-3.5 h-3.5" />
            <span>Path:</span>
          </div>

          <select
            value={pathFromId}
            onChange={e => setPathFromId(e.target.value)}
            className="bg-[#121829] border border-slate-700/60 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none max-w-[160px] truncate"
          >
            <option value="">Path from...</option>
            {simNodes.map(n => (
              <option key={n.id} value={n.id}>
                {n.name || n.id}
              </option>
            ))}
          </select>

          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

          <select
            value={pathToId}
            onChange={e => setPathToId(e.target.value)}
            className="bg-[#121829] border border-slate-700/60 focus:border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none max-w-[160px] truncate"
          >
            <option value="">to...</option>
            {simNodes.map(n => (
              <option key={n.id} value={n.id}>
                {n.name || n.id}
              </option>
            ))}
          </select>

          {(pathFromId || pathToId) && (
            <button
              onClick={() => { setPathFromId(''); setPathToId(''); }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
              title="Clear path"
            >
              Clear
            </button>
          )}

          {activePathInfo && (
            <span className="text-[11px] text-cyan-400 font-bold px-2 py-0.5 bg-cyan-900/40 rounded border border-cyan-700/50">
              {activePathInfo.hops} hops
            </span>
          )}
        </div>

        {/* View Controls & Fullscreen */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => { setZoom(z => Math.min(z * 1.2, 3.5)); wakeSimulationRef.current(); }}
            className="p-1.5 bg-[#121829] hover:bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setZoom(z => Math.max(z * 0.8, 0.25)); wakeSimulationRef.current(); }}
            className="p-1.5 bg-[#121829] hover:bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
              setSelectedNode(null);
              setPathFromId('');
              setPathToId('');
              wakeSimulationRef.current();
            }}
            className="p-1.5 bg-[#121829] hover:bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Reset View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 bg-[#121829] hover:bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />}
          </button>
        </div>
      </div>

      {/* ─── Category Filter Pills (Exact Color Dots as Reference Image) ──────────── */}
      <div className="flex items-center space-x-2 px-2 overflow-x-auto pb-1 text-xs font-mono">
        {categoriesList.map(cat => {
          const isSelected = filterCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              onClick={() => { setFilterCategory(cat.id); wakeSimulationRef.current(); }}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600/90 text-white font-semibold ring-1 ring-indigo-400 shadow-md'
                  : 'bg-[#101524] text-slate-300 hover:text-white hover:bg-[#161E34] border border-slate-800/80'
              }`}
            >
              {cat.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                  style={{ backgroundColor: cat.color, boxShadow: `0 0 6px ${cat.color}` }}
                />
              )}
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'text-slate-400 bg-slate-800/60'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Graph Canvas Display Container ──────────────────────────────────────── */}
      <div className="relative w-full h-[680px] bg-[#070A14] rounded-xl border border-slate-800/70 overflow-hidden shadow-inner">
        {/* Interactive Canvas */}
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-grab active:cursor-grabbing block"
        />

        {/* ─── Bottom-Left Minimap HUD (Matches Reference Image) ───────────────── */}
        <div className="absolute bottom-3 left-3 z-20 flex flex-col items-start bg-[#0A0E1C]/85 border border-slate-800/90 p-1.5 rounded-xl shadow-2xl backdrop-blur-md pointer-events-auto">
          <div className="text-[9px] font-mono font-semibold uppercase text-slate-400 px-1 mb-1 tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Minimap
          </div>
          <canvas
            ref={minimapCanvasRef}
            width={160}
            height={100}
            className="rounded-lg border border-slate-800/80 cursor-crosshair bg-[#050811]"
            onClick={e => {
              const minimap = minimapCanvasRef.current;
              if (!minimap) return;
              const rect = minimap.getBoundingClientRect();
              const mx = (e.clientX - rect.left) / rect.width;
              const my = (e.clientY - rect.top) / rect.height;
              // Center pan on clicked minimap region
              setPan({
                x: -(mx - 0.5) * 1200 * zoom,
                y: -(my - 0.5) * 800 * zoom,
              });
              wakeSimulationRef.current();
            }}
          />
        </div>

        {/* Selected Node Drawer (Standalone Mode Only) */}
        {!onNodeClick && selectedNode && (
          <div className="absolute bottom-4 right-4 z-20 max-w-sm w-80 bg-[#0E1528]/95 border border-slate-700/80 p-4 rounded-xl shadow-2xl space-y-2.5 backdrop-blur-xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded text-white" style={{ backgroundColor: selectedNode.color }}>
                {selectedNode.category}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm leading-snug tracking-tight">{selectedNode.name || selectedNode.id}</h4>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 break-all">ID: {selectedNode.id}</p>
            </div>

            {selectedNode.status && (
              <p className="text-xs text-slate-300 font-mono">
                Status: <span className="text-indigo-400 font-semibold">{selectedNode.status}</span>
              </p>
            )}

            {selectedNode.email && (
              <p className="text-xs text-blue-400 font-mono flex items-center gap-1.5">
                <span>Email:</span> <span className="text-slate-200 font-medium">{selectedNode.email}</span>
              </p>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Connected: <strong className="text-white">{connectedNodeIds.size - 1} nodes</strong></span>
              <button
                onClick={() => {
                  setPathFromId(selectedNode.id);
                }}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline cursor-pointer"
              >
                Set Path Start
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};