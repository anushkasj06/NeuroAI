import { useMemo, useState } from 'react';
import '../materials/ConceptMapPanel.css';

/* ── theme ──────────────────────────────────────────────────────────────── */
const NODE_COLORS = {
  main:   { fill: '#0f766e', glow: 'rgba(15,118,110,0.45)', border: '#14b8a6' },
  sub:    { fill: '#0369a1', glow: 'rgba(14,165,233,0.35)', border: '#38bdf8' },
  detail: { fill: '#475569', glow: 'rgba(100,116,139,0.25)', border: '#94a3b8' },
};

const EDGE_COLORS = ['#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];
const typeOrder = { main: 0, sub: 1, detail: 2 };

/* ── layout helpers ─────────────────────────────────────────────────────── */
const polarPoint = (cx, cy, radius, angle) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
});

const getRadius = (node) => (node.type === 'main' ? 36 : node.type === 'sub' ? 27 : 20);

function useGraphLayout(nodes) {
  return useMemo(() => {
    if (!nodes?.length) return { positions: new Map(), orderedNodes: [] };
    const orderedNodes = [...nodes].sort((a, b) => {
      const typeDiff = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
      return typeDiff !== 0 ? typeDiff : (b.weight || 0) - (a.weight || 0);
    });
    const mainNode = orderedNodes.find((n) => n.type === 'main') || orderedNodes[0];
    const remaining = orderedNodes.filter((n) => n.id !== mainNode.id);
    const subNodes = remaining.filter((n) => n.type === 'sub');
    const detailNodes = remaining.filter((n) => n.type !== 'sub');

    const positions = new Map();
    positions.set(mainNode.id, { x: 500, y: 300 });

    const distribute = (arr, r, offset) => {
      if (!arr.length) return;
      const step = (Math.PI * 2) / arr.length;
      arr.forEach((n, i) => positions.set(n.id, polarPoint(500, 300, r, offset + i * step)));
    };
    distribute(subNodes, 160, -Math.PI / 2);
    distribute(detailNodes, 265, Math.PI / 7);
    return { positions, orderedNodes };
  }, [nodes]);
}

function shortLabel(label, max = 16) {
  if (!label) return '';
  return label.length <= max ? label : `${label.slice(0, max - 1)}…`;
}

function curvePath(sx, sy, tx, ty) {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const off = Math.min(40, len * 0.18);
  const cx = mx + (-dy / len) * off;
  const cy = my + (dx / len) * off;
  return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
}

/* ── component ──────────────────────────────────────────────────────────── */
export default function KnowledgeGraphViewer({ nodes = [], edges = [], className = '' }) {
  const [activeNodeId, setActiveNodeId] = useState(null);
  const { positions, orderedNodes } = useGraphLayout(nodes);
  const activeNode = orderedNodes.find((n) => n.id === activeNodeId) || null;

  const connectedEdges = useMemo(() => {
    if (!activeNode) return [];
    return edges.filter((e) => e.from === activeNode.id || e.to === activeNode.id);
  }, [activeNode, edges]);

  if (!nodes.length) return null;

  const TYPE_LABELS = { main: 'Core Concept', sub: 'Sub-Concept', detail: 'Detail' };

  return (
    <div className={`${className}`} style={{ borderRadius: '0.75rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', minHeight: 420 }}>
        {/* SVG Graph */}
        <div style={{
          flex: activeNode ? '1 1 0%' : '1 1 100%',
          background: 'linear-gradient(145deg, #020617, #0f172a)',
          position: 'relative',
          transition: 'flex 0.3s ease',
        }}>
          <svg viewBox="0 0 1000 600" role="img" aria-label="Concept map" style={{ width: '100%', height: '100%', display: 'block' }}>
            <defs>
              <filter id="kg-glow-main" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="blur" />
                <feFlood floodColor="#14b8a6" floodOpacity="0.5" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="kg-glow-sub" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="blur" />
                <feFlood floodColor="#38bdf8" floodOpacity="0.35" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="shadow" />
                <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <radialGradient id="kg-bg-grad" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="rgba(14,165,233,0.06)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <circle cx="500" cy="300" r="350" fill="url(#kg-bg-grad)" />

            {/* edges */}
            {edges.map((edge, idx) => {
              const s = positions.get(edge.from);
              const t = positions.get(edge.to);
              if (!s || !t) return null;
              const isConnected = activeNode && (edge.from === activeNode.id || edge.to === activeNode.id);
              const color = EDGE_COLORS[idx % EDGE_COLORS.length];
              const pathD = curvePath(s.x, s.y, t.x, t.y);
              const mid = { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 };

              return (
                <g key={edge.id || `${edge.from}-${edge.to}`}>
                  {isConnected && (
                    <path d={pathD} stroke={color} strokeWidth={6} fill="none" strokeOpacity={0.15} strokeLinecap="round" />
                  )}
                  <path d={pathD} stroke={color} strokeWidth={isConnected ? 2.5 : 1.2}
                    fill="none" strokeOpacity={activeNode ? (isConnected ? 0.85 : 0.12) : 0.5} strokeLinecap="round"
                    strokeDasharray={isConnected ? 'none' : '6 4'} />
                  {edge.label && (
                    <g style={{ opacity: activeNode ? (isConnected ? 1 : 0.2) : 0.7 }}>
                      <rect x={mid.x - Math.max(36, edge.label.length * 3.2)} y={mid.y - 11}
                        width={Math.max(72, edge.label.length * 6.4)} height={22} rx={6}
                        fill="rgba(15,23,42,0.88)" stroke={color} strokeWidth={0.5} strokeOpacity={0.3} />
                      <text x={mid.x} y={mid.y + 3} textAnchor="middle" fontSize={9} fontWeight={500} fill="#94a3b8">
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* nodes */}
            {orderedNodes.map((node) => {
              const pt = positions.get(node.id);
              if (!pt) return null;
              const col = NODE_COLORS[node.type] || NODE_COLORS.detail;
              const isActive = node.id === activeNode?.id;
              const isConnected = activeNode && connectedEdges.some((e) => e.from === node.id || e.to === node.id);
              const dimmed = activeNode && !isActive && !isConnected;
              const r = getRadius(node);
              const glowFilter = node.type === 'main' ? 'url(#kg-glow-main)' : node.type === 'sub' ? 'url(#kg-glow-sub)' : undefined;

              return (
                <g key={node.id} onClick={() => setActiveNodeId(isActive ? null : node.id)} style={{ cursor: 'pointer', opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.3s' }}>
                  {isActive && (
                    <circle cx={pt.x} cy={pt.y} r={r + 18} fill="none" stroke={col.border} strokeWidth={2} strokeOpacity={0.5} className="cmap-ring-pulse" />
                  )}
                  <circle cx={pt.x} cy={pt.y} r={r + (isActive ? 12 : 6)} fill={col.glow} />
                  <circle cx={pt.x} cy={pt.y} r={r} fill={col.fill} filter={glowFilter}
                    stroke={isActive ? '#fff' : col.border} strokeWidth={isActive ? 3 : 1.5} />
                  <text x={pt.x} y={pt.y + 1} textAnchor="middle" fontSize={r > 24 ? 15 : 12}
                    fontWeight={800} fill="#fff" dominantBaseline="central" style={{ fontFamily: 'Sora, sans-serif', letterSpacing: '-0.02em' }}>
                    {(node.label || '?').charAt(0).toUpperCase()}
                  </text>
                  <text x={pt.x} y={pt.y + r + 18} textAnchor="middle" fontSize={node.type === 'main' ? 13 : 11}
                    fontWeight={700} fill="#e2e8f0" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                    {shortLabel(node.label)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* legend */}
          <div style={{ position: 'absolute', bottom: 8, left: 12, display: 'flex', gap: 12, fontSize: 10, color: '#64748b' }}>
            {[['#14b8a6', 'Core'], ['#38bdf8', 'Sub-concept'], ['#94a3b8', 'Detail']].map(([c, l]) => (
              <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
              </span>
            ))}
            <span style={{ marginLeft: 8, fontStyle: 'italic' }}>Click a node to explore</span>
          </div>
        </div>

        {/* Detail Panel — fills full height */}
        {activeNode && (
          <div style={{
            width: 340, flexShrink: 0,
            background: '#0f172a', borderLeft: '1px solid rgba(148,163,184,0.15)',
            padding: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}>
            {/* Header */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: NODE_COLORS[activeNode.type]?.border || '#94a3b8',
                  }}>
                    {TYPE_LABELS[activeNode.type] || 'Concept'}
                  </span>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginTop: 4, lineHeight: 1.3 }}>
                    {activeNode.label}
                  </h3>
                </div>
                <button onClick={() => setActiveNodeId(null)} style={{
                  color: '#64748b', fontSize: 20, background: 'rgba(148,163,184,0.1)',
                  border: 'none', cursor: 'pointer', lineHeight: 1, width: 28, height: 28,
                  borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
              </div>
            </div>

            {/* Content sections */}
            <div style={{ padding: '16px 20px', flex: 1 }}>
              {/* Definition */}
              {activeNode.definition && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Definition</p>
                  <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{activeNode.definition}</p>
                </div>
              )}

              {/* Key Insight */}
              {activeNode.keyInsight && (
                <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Key Insight</p>
                  <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>{activeNode.keyInsight}</p>
                </div>
              )}

              {/* Example */}
              {activeNode.example && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Example</p>
                  <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, fontStyle: 'italic' }}>{activeNode.example}</p>
                </div>
              )}

              {/* Key Facts */}
              {activeNode.keyFacts?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Key Facts</p>
                  {activeNode.keyFacts.map((fact, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6,
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: 4, background: 'rgba(14,165,233,0.12)',
                        color: '#38bdf8', fontSize: 10, fontWeight: 700, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                      }}>{i + 1}</span>
                      <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>{fact}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Connections */}
              {connectedEdges.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Connections</p>
                  {connectedEdges.map((edge, idx) => {
                    const otherId = edge.from === activeNode.id ? edge.to : edge.from;
                    const otherNode = orderedNodes.find((n) => n.id === otherId);
                    return (
                      <button key={edge.id || idx} onClick={() => setActiveNodeId(otherId)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                        padding: '8px 10px', marginBottom: 4, borderRadius: 8,
                        background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.1)',
                        color: '#e2e8f0', fontSize: 12, cursor: 'pointer', transition: 'background 0.2s',
                      }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(148,163,184,0.15)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(148,163,184,0.06)')}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: EDGE_COLORS[idx % EDGE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600 }}>{otherNode?.label || 'Concept'}</span>
                          {edge.label && <span style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{edge.label}</span>}
                        </span>
                        <span style={{ fontSize: 10, color: '#475569' }}>→</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer badge */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(148,163,184,0.08)', display: 'flex', gap: 6 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                background: NODE_COLORS[activeNode.type]?.fill || '#475569', color: '#fff',
              }}>{TYPE_LABELS[activeNode.type] || 'Concept'}</span>
              {activeNode.difficulty && (
                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, background: 'rgba(148,163,184,0.12)', color: '#94a3b8' }}>
                  {activeNode.difficulty}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
