import React, { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  opacity: number;
  pulsePhase: number;
}


export const AnimatedGraphBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const colors = [
      'rgba(99, 102, 241, ',   // indigo
      'rgba(139, 92, 246, ',   // purple
      'rgba(236, 72, 153, ',   // pink
      'rgba(59, 130, 246, ',   // blue
      'rgba(6, 182, 212, ',    // cyan
      'rgba(16, 185, 129, ',   // emerald
    ];

    const nodeCount = 35;
    const nodes: Node[] = [];
    const rect = canvas.getBoundingClientRect();

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.4 + 0.15,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    const maxDist = 180;

    const animate = (time: number) => {
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      ctx.clearRect(0, 0, w, h);

      // Update positions
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;

        node.x = Math.max(0, Math.min(w, node.x));
        node.y = Math.max(0, Math.min(h, node.y));
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.12;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const pulse = Math.sin(time * 0.001 + node.pulsePhase) * 0.15 + 0.85;
        const r = node.radius * pulse;
        const opacity = node.opacity * pulse;

        // Glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 8);
        gradient.addColorStop(0, `${node.color}${opacity * 0.5})`);
        gradient.addColorStop(1, `${node.color}0)`);
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 8, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `${node.color}${opacity})`;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ opacity: 0.6 }}
      />
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#06090F]/40 via-transparent to-[#06090F]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#06090F]/60 via-transparent to-[#06090F]/60" />
      
      {/* Mesh gradient blobs */}
      <div className="mesh-gradient w-[600px] h-[600px] bg-indigo-500/20 top-[-200px] left-[-100px]" />
      <div className="mesh-gradient w-[500px] h-[500px] bg-purple-500/15 bottom-[-150px] right-[-100px] animation-delay-500" style={{ animationDelay: '5s' }} />
      <div className="mesh-gradient w-[400px] h-[400px] bg-cyan-500/10 top-[30%] right-[10%]" style={{ animationDelay: '10s' }} />
    </div>
  );
};
