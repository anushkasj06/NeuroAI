import { useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
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

const NODE_COLORS = {
  main: { fill: '#0f766e', ring: 'rgba(15,118,110,0.22)', text: '#f8fafc' },
  sub: { fill: '#0ea5e9', ring: 'rgba(14,165,233,0.2)', text: '#f8fafc' },
  detail: { fill: '#e2e8f0', ring: 'rgba(148,163,184,0.22)', text: '#0f172a' },
};

const barPalette = ['#0f766e', '#0ea5e9', '#22c55e', '#f59e0b', '#6366f1', '#ef4444'];

const typeOrder = { main: 0, sub: 1, detail: 2 };

const getFontSize = (weight) => (weight >= 85 ? 13 : weight >= 60 ? 12 : 11);
const getRadius = (node) => (node.type === 'main' ? 26 : node.type === 'sub' ? 21 : 16);

const polarPoint = (cx, cy, radius, angle) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
});

function useGraphLayout(nodes) {
  return useMemo(() => {
    if (!nodes?.length) return { positions: new Map(), orderedNodes: [] };

    const orderedNodes = [...nodes].sort((a, b) => {
      const typeDiff = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
      if (typeDiff !== 0) return typeDiff;
      return b.weight - a.weight;
    });

    const mainNode = orderedNodes.find((node) => node.type === 'main') || orderedNodes[0];
    const remaining = orderedNodes.filter((node) => node.id !== mainNode.id);
    const subNodes = remaining.filter((node) => node.type === 'sub');
    const detailNodes = remaining.filter((node) => node.type !== 'sub');

    const positions = new Map();
    positions.set(mainNode.id, { x: 500, y: 310 });

    const distribute = (collection, radius, offset) => {
      if (!collection.length) return;
      const step = (Math.PI * 2) / collection.length;
      collection.forEach((node, index) => {
        const point = polarPoint(500, 310, radius, offset + (index * step));
        positions.set(node.id, point);
      });
    };

    distribute(subNodes, 180, -Math.PI / 2);
    distribute(detailNodes, 290, Math.PI / 8);

    return { positions, orderedNodes };
  }, [nodes]);
}

function shortLabel(label, max = 22) {
  if (!label) return '';
  return label.length <= max ? label : `${label.slice(0, max - 3)}...`;
}

export default function ConceptMapPanel({
  mapData,
  loading,
  error,
  onRefresh,
}) {
  const [activeNodeId, setActiveNodeId] = useState(null);
  const nodes = mapData?.nodes || [];
  const edges = mapData?.edges || [];
  const analytics = mapData?.analytics || {};
  const { positions, orderedNodes } = useGraphLayout(nodes);

  const activeNode = orderedNodes.find((node) => node.id === activeNodeId) || orderedNodes[0] || null;
  const connectedEdges = useMemo(
    () =>
      activeNode
        ? edges
            .filter((edge) => edge.from === activeNode.id || edge.to === activeNode.id)
            .sort((a, b) => b.strength - a.strength)
        : [],
    [activeNode, edges]
  );

  const topConcepts = analytics.strongestConcepts || [];
  const topLinks = (analytics.strongestLinks || []).map((item, idx) => ({
    ...item,
    index: idx + 1,
  }));
  const sectionDistribution = analytics.sectionDistribution || [];

  return (
    <section className="materials-map-panel ai-rail">
      <div className="ai-panel__header">
        <div className="ai-panel__title">
          <CubeTransparentIcon className="h-5 w-5 text-teal-600" />
          Vector Concept Mapping
        </div>
        <button type="button" onClick={onRefresh} className="ai-btn ai-btn--ghost ai-btn--compact">
          <ArrowPathIcon className="h-4 w-4" />
          Rebuild map
        </button>
      </div>

      {loading && (
        <div className="materials-map-loading">
          <div className="materials-map-loading__dot" />
          Building semantic map with all-MiniLM-L6-v2...
        </div>
      )}

      {error && !loading && (
        <div className="materials-map-error">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && mapData && nodes.length === 0 && (
        <div className="materials-map-error">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>No concepts were extracted from this material yet.</span>
        </div>
      )}

      {!loading && !error && mapData && nodes.length > 0 && (
        <div className="materials-map-grid">
          <div className="materials-map-graph">
            <svg viewBox="0 0 1000 620" role="img" aria-label="Interactive concept map">
              <defs>
                <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(15,118,110,0.55)" />
                  <stop offset="100%" stopColor="rgba(14,165,233,0.7)" />
                </linearGradient>
              </defs>

              {edges.map((edge) => {
                const source = positions.get(edge.from);
                const target = positions.get(edge.to);
                if (!source || !target) return null;

                const isConnectedToActive = !activeNode
                  || edge.from === activeNode.id
                  || edge.to === activeNode.id;

                return (
                  <line
                    key={edge.id}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="url(#edgeGradient)"
                    strokeWidth={Math.max(1.2, edge.strength / 28)}
                    strokeOpacity={isConnectedToActive ? 0.8 : 0.2}
                    strokeLinecap="round"
                  />
                );
              })}

              {orderedNodes.map((node) => {
                const point = positions.get(node.id);
                if (!point) return null;
                const colors = NODE_COLORS[node.type] || NODE_COLORS.detail;
                const isActive = node.id === activeNode?.id;

                return (
                  <g key={node.id} onClick={() => setActiveNodeId(node.id)} className="materials-node">
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={getRadius(node) + (isActive ? 10 : 6)}
                      fill={colors.ring}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={getRadius(node)}
                      fill={colors.fill}
                      stroke={isActive ? '#f8fafc' : 'rgba(248,250,252,0.35)'}
                      strokeWidth={isActive ? 3 : 1.5}
                    />
                    <text
                      x={point.x}
                      y={point.y + 4}
                      textAnchor="middle"
                      fontSize={getFontSize(node.weight)}
                      fontWeight={700}
                      fill={colors.text}
                    >
                      {shortLabel(node.label)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <aside className="materials-map-inspector">
            {activeNode ? (
              <>
                <p className="materials-map-inspector__kicker">Active concept</p>
                <h3>{activeNode.label}</h3>
                <div className="materials-map-inspector__badges">
                  <span className="materials-map-badge">{activeNode.type}</span>
                  <span className="materials-map-badge">Weight {activeNode.weight}</span>
                </div>
                <p className="materials-map-inspector__hint">
                  Click another node to trace how ideas connect through the module.
                </p>
                <div className="materials-map-links">
                  {connectedEdges.length > 0 ? (
                    connectedEdges.slice(0, 6).map((edge) => {
                      const otherId = edge.from === activeNode.id ? edge.to : edge.from;
                      const otherNode = orderedNodes.find((node) => node.id === otherId);
                      return (
                        <button
                          key={edge.id}
                          type="button"
                          className="materials-map-link"
                          onClick={() => setActiveNodeId(otherId)}
                        >
                          <span>{otherNode?.label || 'Related concept'}</span>
                          <strong>{edge.strength}%</strong>
                        </button>
                      );
                    })
                  ) : (
                    <p className="materials-map-empty">No strong relation edges yet for this node.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="materials-map-empty">No concept selected.</p>
            )}
          </aside>
        </div>
      )}

      {!loading && !error && mapData && (
        <div className="materials-map-charts">
          <div className="materials-chart-card">
            <p className="materials-chart-title">Concept Priority</p>
            <div className="materials-chart-body">
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

          <div className="materials-chart-card">
            <p className="materials-chart-title">Relation Strength Curve</p>
            <div className="materials-chart-body">
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

          <div className="materials-chart-card">
            <p className="materials-chart-title">Reading Load by Section</p>
            <div className="materials-chart-body">
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

      <div className="materials-map-footnote">
        Semantic engine:{' '}
        <strong>
          {!mapData?.model
            ? 'Initializing'
            : mapData.model.usedEmbeddings
            ? 'all-MiniLM-L6-v2 embeddings'
            : 'Fallback lexical mapping'}
        </strong>
        {mapData?.model?.fallbackReason && ` (${mapData.model.fallbackReason})`}
      </div>
    </section>
  );
}
