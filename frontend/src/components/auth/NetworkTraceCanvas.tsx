import React, { useRef, useEffect, useState, useCallback } from 'react';
import { HardDrives } from '@phosphor-icons/react';

interface NetworkNode {
  id: string;
  name: string;
  role: string;
  ip: string;
  model: string;
  xRatio: number;
  yRatio: number;
  status: 'synced' | 'diverged';
  latency: string;
  bgpPeers: string;
}

interface Packet {
  fromNodeIndex: number;
  toNodeIndex: number;
  progress: number;
  speed: number;
  isVoltage: boolean;
}

interface CliStreamToken {
  text: string;
  type: 'add' | 'del' | 'cmd' | 'sync';
  x: number;
  yRatio: number;
  speed: number;
  opacity: number;
}

const NETWORK_NODES: NetworkNode[] = [
  {
    id: 'cr01',
    name: 'cr01.iad01',
    role: 'Core Edge Router',
    ip: '10.240.0.1',
    model: 'Cisco ASR 9904 (IOS-XR)',
    xRatio: 0.14,
    yRatio: 0.48,
    status: 'synced',
    latency: '0.9ms',
    bgpPeers: '4/4 Established',
  },
  {
    id: 'agg01',
    name: 'agg01.iad01',
    role: 'Aggregation Spine A',
    ip: '10.240.10.1',
    model: 'Cisco Catalyst 9606R',
    xRatio: 0.38,
    yRatio: 0.28,
    status: 'synced',
    latency: '1.2ms',
    bgpPeers: '12/12 Established',
  },
  {
    id: 'agg02',
    name: 'agg02.iad01',
    role: 'Aggregation Spine B',
    ip: '10.240.10.2',
    model: 'Cisco Catalyst 9606R',
    xRatio: 0.38,
    yRatio: 0.70,
    status: 'diverged',
    latency: '1.4ms',
    bgpPeers: '11/12 (1 Reconverging)',
  },
  {
    id: 'leaf01',
    name: 'leaf01.iad01',
    role: 'Access Leaf Cluster',
    ip: '10.240.20.1',
    model: 'Cisco Nexus 93180YC-FX',
    xRatio: 0.64,
    yRatio: 0.32,
    status: 'synced',
    latency: '1.6ms',
    bgpPeers: '8/8 Established',
  },
  {
    id: 'leaf02',
    name: 'leaf02.iad01',
    role: 'Access Leaf Cluster',
    ip: '10.240.20.2',
    model: 'Cisco Nexus 93180YC-FX',
    xRatio: 0.64,
    yRatio: 0.66,
    status: 'synced',
    latency: '1.7ms',
    bgpPeers: '8/8 Established',
  },
  {
    id: 'catchpoint',
    name: 'DriftGuard Trace Node',
    role: 'The Converged Catch-Point',
    ip: '10.240.99.254',
    model: 'Automated Snapshot Validator',
    xRatio: 0.88,
    yRatio: 0.48,
    status: 'synced',
    latency: '0.4ms',
    bgpPeers: 'Fleet Verified',
  },
];

const NETWORK_EDGES: [number, number, boolean][] = [
  [0, 1, false], // cr01 -> agg01 (Pre baseline)
  [0, 2, false], // cr01 -> agg02 (Post divergent)
  [1, 3, false], // agg01 -> leaf01
  [2, 4, false], // agg02 -> leaf02
  [3, 5, true],  // leaf01 -> catchpoint (converging upper)
  [4, 5, true],  // leaf02 -> catchpoint (converging lower)
  [1, 2, false], // Inter-spine crosslink
];

const INITIAL_CLI_TOKENS: Omit<CliStreamToken, 'x'>[] = [
  { text: 'show ip route | include 10.240', type: 'cmd', yRatio: 0.12, speed: 0.55, opacity: 0.4 },
  { text: '+ vlan 104 name PROD_CLUSTER_IAD', type: 'add', yRatio: 0.20, speed: 0.65, opacity: 0.7 },
  { text: '+ 10.240.12.0/24 via 10.240.0.1 Gi0/0/1', type: 'add', yRatio: 0.40, speed: 0.7, opacity: 0.75 },
  { text: 'verify: dual-phase state converged', type: 'sync', yRatio: 0.54, speed: 0.58, opacity: 0.85 },
  { text: '- 10.240.14.0/24 [110/20] via 10.240.0.2', type: 'del', yRatio: 0.60, speed: 0.6, opacity: 0.6 },
  { text: '+ neighbor 10.240.99.1 remote-as 65001', type: 'add', yRatio: 0.80, speed: 0.75, opacity: 0.8 },
  { text: 'show ip bgp summary | include Established', type: 'cmd', yRatio: 0.92, speed: 0.5, opacity: 0.4 },
];

export const NetworkTraceCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const packetsRef = useRef<Packet[]>([]);
  const cliTokensRef = useRef<CliStreamToken[]>([]);

  useEffect(() => {
    // Initialize packets
    const packets: Packet[] = [];
    NETWORK_EDGES.forEach(([from, to, isConverged], idx) => {
      packets.push({
        fromNodeIndex: from,
        toNodeIndex: to,
        progress: (idx * 0.14) % 1,
        speed: 0.005 + Math.random() * 0.003,
        isVoltage: isConverged,
      });
      packets.push({
        fromNodeIndex: from,
        toNodeIndex: to,
        progress: ((idx * 0.14) + 0.5) % 1,
        speed: 0.004 + Math.random() * 0.003,
        isVoltage: isConverged,
      });
    });
    packetsRef.current = packets;

    // Initialize CLI stream tokens with staggered offsets
    cliTokensRef.current = INITIAL_CLI_TOKENS.map((token, idx) => ({
      ...token,
      x: idx * 120 - 50,
    }));
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    let found: NetworkNode | null = null;
    const hitRadius = 26;

    for (const node of NETWORK_NODES) {
      const nx = node.xRatio * width;
      const ny = node.yRatio * height;
      const dist = Math.hypot(mouseX - nx, mouseY - ny);

      if (dist <= hitRadius) {
        found = node;
        setTooltipPos({ x: nx, y: ny });
        break;
      }
    }

    setHoveredNode(found);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.02;

      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Ambient Catch-Point Radial Glow (no hard borders)
      const catchNode = NETWORK_NODES[5];
      const cx = catchNode.xRatio * width;
      const cy = catchNode.yRatio * height;
      const auraGradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, 160);
      auraGradient.addColorStop(0, 'rgba(200, 255, 0, 0.14)');
      auraGradient.addColorStop(0.4, 'rgba(200, 255, 0, 0.03)');
      auraGradient.addColorStop(1, 'rgba(200, 255, 0, 0)');
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 160, 0, Math.PI * 2);
      ctx.fill();

      // Left ambient pulse glow
      const leftGlow = ctx.createRadialGradient(width * 0.14, height * 0.48, 2, width * 0.14, height * 0.48, 140);
      leftGlow.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
      leftGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = leftGlow;
      ctx.beginPath();
      ctx.arc(width * 0.14, height * 0.48, 140, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Streaming CLI Syntax Diff Tokens
      cliTokensRef.current.forEach((token) => {
        token.x += token.speed;

        // Wrap around smoothly
        if (token.x > width + 280) {
          token.x = -260;
        }

        const ty = token.yRatio * height;

        // Compute edge fade (alpha dissolves at left and right boundaries)
        let alpha = token.opacity;
        if (token.x < 120) {
          alpha *= Math.max(0, token.x / 120);
        } else if (token.x > width - 120) {
          alpha *= Math.max(0, (width - token.x) / 120);
        }

        if (alpha <= 0.01) return;

        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';

        if (token.type === 'add') {
          ctx.fillStyle = `rgba(200, 255, 0, ${alpha})`;
          ctx.fillText(token.text, token.x, ty);
        } else if (token.type === 'del') {
          ctx.fillStyle = `rgba(244, 63, 94, ${alpha * 0.75})`;
          ctx.fillText(token.text, token.x, ty);
        } else if (token.type === 'sync') {
          ctx.fillStyle = `rgba(200, 255, 0, ${alpha * 0.9})`;
          ctx.fillText(`✓ ${token.text}`, token.x, ty);
        } else {
          ctx.fillStyle = `rgba(161, 161, 170, ${alpha * 0.65})`;
          ctx.fillText(token.text, token.x, ty);
        }
      });

      // 3. Draw Topology Network Edges
      NETWORK_EDGES.forEach(([fromIdx, toIdx, isConverged]) => {
        const from = NETWORK_NODES[fromIdx];
        const to = NETWORK_NODES[toIdx];

        const x1 = from.xRatio * width;
        const y1 = from.yRatio * height;
        const x2 = to.xRatio * width;
        const y2 = to.yRatio * height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);

        if (isConverged) {
          // Signature Converged Trace curve
          const midX = (x1 + x2) / 2;
          ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);
          ctx.strokeStyle = 'rgba(200, 255, 0, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Soft ambient glow trace
          ctx.strokeStyle = 'rgba(200, 255, 0, 0.12)';
          ctx.lineWidth = 7;
          ctx.stroke();
        } else {
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = 'rgba(113, 113, 122, 0.24)';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      });

      // 4. Draw Moving Signal Packets
      packetsRef.current.forEach((pkt) => {
        pkt.progress += pkt.speed;
        if (pkt.progress >= 1) {
          pkt.progress = 0;
        }

        const from = NETWORK_NODES[pkt.fromNodeIndex];
        const to = NETWORK_NODES[pkt.toNodeIndex];
        const x1 = from.xRatio * width;
        const y1 = from.yRatio * height;
        const x2 = to.xRatio * width;
        const y2 = to.yRatio * height;

        let px: number;
        let py: number;

        if (pkt.isVoltage) {
          const t = pkt.progress;
          const midX = (x1 + x2) / 2;
          const u = 1 - t;
          px = u * u * u * x1 + 3 * u * u * t * midX + 3 * u * t * t * midX + t * t * t * x2;
          py = u * u * u * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y2;
        } else {
          px = x1 + (x2 - x1) * pkt.progress;
          py = y1 + (y2 - y1) * pkt.progress;
        }

        ctx.beginPath();
        ctx.arc(px, py, pkt.isVoltage ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = pkt.isVoltage ? '#c8ff00' : 'rgba(161, 161, 170, 0.65)';
        if (pkt.isVoltage) {
          ctx.shadowColor = '#c8ff00';
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 5. Draw Floating Topology Nodes
      NETWORK_NODES.forEach((node) => {
        const nx = node.xRatio * width;
        const ny = node.yRatio * height;
        const isCatchPoint = node.id === 'catchpoint';
        const isSelected = hoveredNode?.id === node.id;

        // Node Halo
        ctx.beginPath();
        const baseRadius = isCatchPoint ? 10 : 7;
        const radius = isSelected ? baseRadius + 3 : baseRadius;
        ctx.arc(nx, ny, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = isCatchPoint
          ? 'rgba(200, 255, 0, 0.2)'
          : isSelected
          ? 'rgba(255, 255, 255, 0.12)'
          : 'rgba(30, 41, 59, 0.5)';
        ctx.fill();

        // Node Ring
        ctx.beginPath();
        ctx.arc(nx, ny, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#020617'; // slate-950 base
        ctx.fill();
        ctx.lineWidth = isCatchPoint ? 2.5 : 1.8;
        ctx.strokeStyle = isCatchPoint
          ? '#c8ff00'
          : isSelected
          ? '#f8fafc'
          : node.status === 'diverged'
          ? 'rgba(245, 158, 11, 0.85)' // Amber-500
          : 'rgba(148, 163, 184, 0.5)';
        ctx.stroke();

        // Core Center Dot
        ctx.beginPath();
        ctx.arc(nx, ny, isCatchPoint ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isCatchPoint
          ? '#c8ff00'
          : node.status === 'diverged'
          ? '#f59e0b'
          : '#94a3b8';
        ctx.fill();

        // Device Hostname Label with backdrop pill
        ctx.font = '10px "JetBrains Mono", monospace';
        const labelText = node.name;
        const textWidth = ctx.measureText(labelText).width;
        const pillX = nx - textWidth / 2 - 4;
        const pillY = ny + radius + 6;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, textWidth + 8, 14, 3);
        ctx.fill();

        ctx.fillStyle = isCatchPoint ? '#c8ff00' : 'rgba(226, 232, 240, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, nx, pillY + 11);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [hoveredNode]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-80 xl:h-96 bg-transparent select-none"
    >
      {/* HTML5 Canvas with native background blending */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* Interactive Hover Telemetry Card */}
      {hoveredNode && (
        <div
          style={{
            left: `${Math.min(
              Math.max(tooltipPos.x, 140),
              containerRef.current?.clientWidth ? containerRef.current.clientWidth - 140 : 200
            )}px`,
            top: `${Math.max(tooltipPos.y - 125, 15)}px`,
          }}
          className="absolute -translate-x-1/2 z-30 pointer-events-none w-64 p-3.5 rounded-xl bg-slate-900/95 border border-slate-800 shadow-2xl backdrop-blur-md space-y-2 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between border-b border-slate-800 pb-2">
            <div>
              <div className="font-mono text-xs font-bold text-white flex items-center gap-1.5">
                <HardDrives className="w-3.5 h-3.5 text-[#c8ff00]" weight="bold" />
                {hoveredNode.name}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{hoveredNode.role}</div>
            </div>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                hoveredNode.status === 'synced'
                  ? 'bg-[#c8ff00]/15 text-[#c8ff00] border border-[#c8ff00]/30'
                  : 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
              }`}
            >
              {hoveredNode.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-400">
            <div>
              <span className="text-slate-500 block">IP address</span>
              <span className="text-slate-200">{hoveredNode.ip}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Round-trip</span>
              <span className="text-slate-200">{hoveredNode.latency}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Hardware / OS</span>
              <span className="text-slate-300 truncate block">{hoveredNode.model}</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px]">
              <span className="text-slate-500">BGP peering</span>
              <span className="text-[#c8ff00]">{hoveredNode.bgpPeers}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
