import { useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  AcademicCapIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './ConceptMapPanel.css';

/* ── constants ─────────────────────────────────────────────────────────────── */

const NODE_COLORS = {
  main: { fill: '#0f766e', glow: 'rgba(15,118,110,0.35)', text: '#f0fdfa', border: '#14b8a6' },
  sub:  { fill: '#0369a1', glow: 'rgba(14,165,233,0.28)', text: '#f0f9ff', border: '#38bdf8' },
  detail: { fill: '#475569', glow: 'rgba(100,116,139,0.2)', text: '#f8fafc', border: '#94a3b8' },
};

const CATEGORY_META = {
  hierarchy:  { color: '#8b5cf6', icon: '🏗️', label: 'Hierarchy' },
  dependency: { color: '#0ea5e9', icon: '🔗', label: 'Dependency' },
  property:   { color: '#22c55e', icon: '✦',  label: 'Property' },
  comparison:  { color: '#f59e0b', icon: '⚖️', label: 'Comparison' },
  process:    { color: '#ef4444', icon: '⚙️', label: 'Process' },
};

const DIFFICULTY_META = {
  beginner:     { color: '#22c55e', label: 'Beginner', pct: 30 },
  intermediate: { color: '#f59e0b', label: 'Intermediate', pct: 60 },
  advanced:     { color: '#ef4444', label: 'Advanced', pct: 90 },
};

const barPalette = ['#0f766e', '#0ea5e9', '#22c55e', '#f59e0b', '#6366f1', '#ef4444'];
const typeOrder = { main: 0, sub: 1, detail: 2 };

/* ── graph layout helpers ──────────────────────────────────────────────────── */

const polarPoint = (cx, cy, radius, angle) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
});

const getRadius = (node) => (node.type === 'main' ? 32 : node.type === 'sub' ? 25 : 18);

function useGraphLayout(nodes) {
  return useMemo(() => {
    if (!nodes?.length) return { positions: new Map(), orderedNodes: [] };

    const orderedNodes = [...nodes].sort((a, b) => {
      const typeDiff = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
      return typeDiff !== 0 ? typeDiff : b.weight - a.weight;
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

    distribute(subNodes, 185, -Math.PI / 2);
    distribute(detailNodes, 300, Math.PI / 7);

    return { positions, orderedNodes };
  }, [nodes]);
}

function shortLabel(label, max = 18) {
  if (!label) return '';
  return label.length <= max ? label : `${label.slice(0, max - 2)}…`;
}

function curvePath(sx, sy, tx, ty) {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const off = Math.min(40, len * 0.15);
  const cx = mx + (-dy / len) * off;
  const cy = my + (dx / len) * off;
  return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
}

/* ── component ─────────────────────────────────────────────────────────────── */

export default function ConceptMapPanel({ mapData, loading, error, onRefresh }) {
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);
  const [showLearningPath, setShowLearningPath] = useState(false);

  const nodes = mapData?.nodes || [];
  const edges = mapData?.edges || [];
  const analytics = mapData?.analytics || {};
  const learningPath = mapData?.learningPath || [];
  const { positions, orderedNodes } = useGraphLayout(nodes);

  const activeNode = orderedNodes.find((n) => n.id === activeNodeId) || orderedNodes[0] || null;

  const connectedEdges = useMemo(
    () =>
      activeNode
        ? edges
            .filter((e) => e.from === activeNode.id || e.to === activeNode.id)
            .sort((a, b) => b.strength - a.strength)
        : [],
    [activeNode, edges],
  );

  const topConcepts = analytics.strongestConcepts || [];
  const topLinks = (analytics.strongestLinks || []).map((item, idx) => ({ ...item, index: idx + 1 }));
  const sectionDistribution = analytics.sectionDistribution || [];
  const diff = DIFFICULTY_META[activeNode?.difficulty] || DIFFICULTY_META.beginner;

  /* ── render ──────────────────────────────────────────────────────────────── */

  return (
    <section className="cmap-panel ai-rail">
      {/* header */}
      <div className="ai-panel__header">
        <div className="ai-panel__title">
          <CubeTransparentIcon className="h-5 w-5 text-teal-600" />
          AI Concept Intelligence
        </div>
        <div className="cmap-header-actions">
          {learningPath.length > 0 && (
            <button
              type="button"
              className={`ai-btn ai-btn--ghost ai-btn--compact ${showLearningPath ? 'cmap-lp-active' : ''}`}
              onClick={() => setShowLearningPath((v) => !v)}
            >
              <AcademicCapIcon className="h-4 w-4" />
              Learning path
            </button>
          )}
          <button type="button" onClick={onRefresh} className="ai-btn ai-btn--ghost ai-btn--compact">
            <ArrowPathIcon className="h-4 w-4" />
            Rebuild
          </button>
        </div>
      </div>

      {/* learning path strip */}
      {showLearningPath && learningPath.length > 0 && (
        <div className="cmap-learning-path">
          <span className="cmap-learning-path__label">
            <AcademicCapIcon className="h-4 w-4" /> Recommended study order
          </span>
          <div className="cmap-learning-path__steps">
            {learningPath.map((nodeId, i) => {
              const node = nodes.find((n) => n.id === nodeId);
              if (!node) return null;
              return (
                <button
                  key={nodeId}
                  type="button"
                  className={`cmap-lp-step ${activeNode?.id === nodeId ? 'is-active' : ''}`}
                  onClick={() => setActiveNodeId(nodeId)}
                >
                  <span className="cmap-lp-step__num">{i + 1}</span>
                  <span className="cmap-lp-step__emoji">{node.emoji || '📄'}</span>
                  <span className="cmap-lp-step__label">{shortLabel(node.label, 20)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* states */}
      {loading && (
        <div className="cmap-status cmap-status--loading">
          <div className="cmap-pulse" />
          Generating intelligent concept map…
        </div>
      )}
      {error && !loading && (
        <div className="cmap-status cmap-status--error">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      {!loading && !error && mapData && nodes.length === 0 && (
        <div className="cmap-status cmap-status--error">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>No concepts were extracted from this material yet.</span>
        </div>
      )}

      {/* main grid: graph + inspector */}
      {!loading && !error && mapData && nodes.length > 0 && (
        <div className="cmap-main-grid">
          {/* ── SVG graph ─────────────────────────────────────────────────────── */}
          <div className="cmap-graph-wrap">
            <svg viewBox="0 0 1000 600" role="img" aria-label="Concept map">
              <defs>
                <filter id="glow-main" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="blur" />
                  <feFlood floodColor="#14b8a6" floodOpacity="0.35" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="glow-sub" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
                  <feFlood floodColor="#38bdf8" floodOpacity="0.28" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* edges */}
              {edges.map((edge) => {
                const s = positions.get(edge.from);
                const t = positions.get(edge.to);
                if (!s || !t) return null;
                const connected = !activeNode || edge.from === activeNode.id || edge.to === activeNode.id;
                const isHovered = edge.id === hoveredEdgeId;
                const cat = CATEGORY_META[edge.category] || CATEGORY_META.dependency;
                const mid = { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 };
                const pathD = curvePath(s.x, s.y, t.x, t.y);

                return (
                  <g
                    key={edge.id}
                    className="cmap-edge"
                    onMouseEnter={() => setHoveredEdgeId(edge.id)}
                    onMouseLeave={() => setHoveredEdgeId(null)}
                  >
                    <path d={pathD} stroke={cat.color} strokeWidth={isHovered ? 3.5 : Math.max(1.5, edge.strength / 30)}
                      fill="none" strokeOpacity={connected ? 0.7 : 0.15} strokeLinecap="round" />
                    {/* invisible hit area */}
                    <path d={pathD} stroke="transparent" strokeWidth={16} fill="none" />
                    {/* label tooltip */}
                    {isHovered && edge.label && (
                      <g>
                        <rect x={mid.x - Math.max(50, edge.label.length * 3.8)} y={mid.y - 14}
                          width={Math.max(100, edge.label.length * 7.6)} height={26} rx={8}
                          fill="rgba(15,23,42,0.92)" />
                        <text x={mid.x} y={mid.y + 3} textAnchor="middle" fontSize={11} fontWeight={600}
                          fill="#f8fafc" className="cmap-edge-label-text">
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
                const r = getRadius(node);
                const glowFilter = node.type === 'main' ? 'url(#glow-main)' : node.type === 'sub' ? 'url(#glow-sub)' : undefined;

                return (
                  <g key={node.id} onClick={() => setActiveNodeId(node.id)} className="cmap-node">
                    {/* outer glow ring */}
                    <circle cx={pt.x} cy={pt.y} r={r + (isActive ? 14 : 8)} fill={col.glow}
                      className={isActive ? 'cmap-ring-pulse' : ''} />
                    {/* main circle */}
                    <circle cx={pt.x} cy={pt.y} r={r} fill={col.fill} filter={glowFilter}
                      stroke={isActive ? '#fff' : col.border} strokeWidth={isActive ? 3 : 1.5} />
                    {/* emoji */}
                    <text x={pt.x} y={pt.y - 2} textAnchor="middle" fontSize={r > 24 ? 16 : 13}
                      dominantBaseline="central">{node.emoji || '📄'}</text>
                    {/* label below */}
                    <text x={pt.x} y={pt.y + r + 16} textAnchor="middle" fontSize={node.type === 'main' ? 13 : 11}
                      fontWeight={700} fill="#1e293b" className="cmap-node-label">
                      {shortLabel(node.label)}
                    </text>
                  </g>
                );
              })}
            </svg>
            {/* legend */}
            <div className="cmap-legend">
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <span key={key} className="cmap-legend-item">
                  <span className="cmap-legend-dot" style={{ background: meta.color }} />
                  {meta.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── Inspector panel ────────────────────────────────────────────────── */}
          <aside className="cmap-inspector">
            {activeNode ? (
              <>
                {/* header */}
                <div className="cmap-insp-header">
                  <span className="cmap-insp-emoji">{activeNode.emoji || '📄'}</span>
                  <div>
                    <p className="cmap-insp-kicker">Active concept</p>
                    <h3 className="cmap-insp-title">{activeNode.label}</h3>
                  </div>
                </div>

                {/* badges row */}
                <div className="cmap-insp-badges">
                  <span className="cmap-badge" data-type={activeNode.type}>{activeNode.type}</span>
                  <span className="cmap-badge cmap-badge--diff" style={{ borderColor: diff.color }}>
                    <span className="cmap-badge-dot" style={{ background: diff.color }} />
                    {diff.label}
                  </span>
                  <span className="cmap-badge">Weight {activeNode.weight}</span>
                </div>

                {/* difficulty meter */}
                <div className="cmap-meter">
                  <div className="cmap-meter__bar">
                    <div className="cmap-meter__fill" style={{ width: `${diff.pct}%`, background: diff.color }} />
                  </div>
                </div>

                {/* definition card */}
                {activeNode.definition && (
                  <div className="cmap-card cmap-card--def">
                    <p className="cmap-card__label">📖 Definition</p>
                    <p className="cmap-card__text">{activeNode.definition}</p>
                  </div>
                )}

                {/* example card */}
                {activeNode.example && (
                  <div className="cmap-card cmap-card--example">
                    <p className="cmap-card__label">💡 Example</p>
                    <p className="cmap-card__text">{activeNode.example}</p>
                  </div>
                )}

                {/* key insight card */}
                {activeNode.keyInsight && (
                  <div className="cmap-card cmap-card--insight">
                    <p className="cmap-card__label">
                      <LightBulbIcon className="h-4 w-4" /> Key Insight
                    </p>
                    <p className="cmap-card__text">{activeNode.keyInsight}</p>
                  </div>
                )}

                {/* key facts */}
                {activeNode.keyFacts?.length > 0 && (
                  <div className="cmap-facts">
                    <p className="cmap-card__label">📋 Key Facts</p>
                    <ul>
                      {activeNode.keyFacts.map((fact, i) => (
                        <li key={i}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* connections */}
                <div className="cmap-connections">
                  <p className="cmap-card__label">
                    <ArrowTrendingUpIcon className="h-4 w-4" /> Connections
                  </p>
                  {connectedEdges.length > 0 ? (
                    <div className="cmap-conn-list">
                      {connectedEdges.slice(0, 6).map((edge) => {
                        const otherId = edge.from === activeNode.id ? edge.to : edge.from;
                        const otherNode = orderedNodes.find((n) => n.id === otherId);
                        const cat = CATEGORY_META[edge.category] || CATEGORY_META.dependency;
                        return (
                          <button key={edge.id} type="button" className="cmap-conn"
                            onClick={() => setActiveNodeId(otherId)}>
                            <span className="cmap-conn__left">
                              <span className="cmap-conn__dot" style={{ background: cat.color }} />
                              <span className="cmap-conn__info">
                                <span className="cmap-conn__name">{otherNode?.label || 'Concept'}</span>
                                <span className="cmap-conn__rel">{edge.label}</span>
                              </span>
                            </span>
                            <strong className="cmap-conn__pct">{edge.strength}%</strong>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="cmap-empty">No connections for this concept.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="cmap-empty">Select a concept node to explore.</p>
            )}
          </aside>
        </div>
      )}

      {/* charts */}
      {!loading && !error && mapData && (
        <div className="cmap-charts">
          <div className="cmap-chart-card">
            <p className="cmap-chart-title">Concept Priority</p>
            <div className="cmap-chart-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topConcepts.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="weight" radius={[8, 8, 0, 0]}>
                    {topConcepts.slice(0, 6).map((entry, idx) => (
                      <Cell key={entry.label} fill={barPalette[idx % barPalette.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="cmap-chart-card">
            <p className="cmap-chart-title">Relation Strength Curve</p>
            <div className="cmap-chart-body">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={topLinks}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis dataKey="index" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="strength" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="cmap-chart-card">
            <p className="cmap-chart-title">Reading Load by Section</p>
            <div className="cmap-chart-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sectionDistribution.slice(0, 7)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="section" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="readMinutes" fill="#0ea5e9" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* footer */}
      <div className="cmap-footnote">
        Powered by{' '}
        <strong>
          {!mapData?.model
            ? 'Initializing'
            : mapData.model.usedLLM
            ? 'Groq LLM · Deep concept extraction'
            : 'Fallback lexical mapping'}
        </strong>
        {mapData?.model?.fallbackReason && ` (${mapData.model.fallbackReason})`}
      </div>
    </section>
  );
}
