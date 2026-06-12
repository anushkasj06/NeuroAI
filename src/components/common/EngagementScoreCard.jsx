/**
 * EngagementScoreCard
 * ===================
 * Displays the composite Learning Engagement Score with component breakdown.
 *
 * Props:
 *   sessionId   {string}   — show engagement for a specific session
 *   mode        {string}   — 'session' | 'user' | 'dashboard' (default 'dashboard')
 *   days        {number}   — for user mode: window in days
 *   subjectSlug {string}   — optional subject filter for user mode
 *   compact     {boolean}  — compact card (no breakdown bars)
 *   className   {string}
 */

import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  SignalIcon,
  EyeIcon,
  FaceSmileIcon,
  BoltIcon,
  ArrowPathIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  useSessionEngagement,
  useUserEngagement,
  useDashboardEngagement,
} from '../../hooks/useEngagementAnalytics';

// ── Colour helpers ────────────────────────────────────────────────────────────
const GRADE_CONFIG = {
  excellent: { label: 'Excellent',  color: '#22c55e', bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700' },
  good:      { label: 'Good',       color: '#3b82f6', bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700'    },
  moderate:  { label: 'Moderate',   color: '#f59e0b', bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700'   },
  low:       { label: 'Low',        color: '#f97316', bg: 'bg-orange-50',   border: 'border-orange-200',  text: 'text-orange-700'  },
  critical:  { label: 'Critical',   color: '#ef4444', bg: 'bg-rose-50',     border: 'border-rose-200',    text: 'text-rose-700'    },
};

const COMPONENT_META = [
  { key: 'attention',   label: 'Attention',         icon: SignalIcon,      weight: '40%', color: '#6366f1' },
  { key: 'presence',    label: 'Face Presence',      icon: FaceSmileIcon,   weight: '30%', color: '#10b981' },
  { key: 'emotion',     label: 'Emotion Stability',  icon: SparklesIcon,    weight: '20%', color: '#f59e0b' },
  { key: 'interaction', label: 'Interaction Rate',   icon: BoltIcon,        weight: '10%', color: '#3b82f6' },
];

function scoreColor(v) {
  if (v >= 85) return '#22c55e';
  if (v >= 70) return '#3b82f6';
  if (v >= 50) return '#f59e0b';
  if (v >= 30) return '#f97316';
  return '#ef4444';
}

// ── Sub-components ────────────────────────────────────────────────────────────
function RadialScore({ score, grade }) {
  const cfg = GRADE_CONFIG[grade] || GRADE_CONFIG.moderate;
  // SVG donut chart
  const r = 36, cx = 44, cy = 44;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={88} height={88} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={cfg.color}
          strokeWidth={10}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ marginTop: '-76px' }}>
        <span className="text-2xl font-black" style={{ color: cfg.color }}>{score}</span>
        <span className="text-[9px] font-bold text-slate-400 -mt-0.5">/ 100</span>
      </div>
      <span className={`mt-1 text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
        {cfg.label}
      </span>
    </div>
  );
}

function ComponentBar({ meta, value }) {
  const { icon: Icon, label, weight, color } = meta;
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-md" style={{ background: `${color}15` }}>
        <Icon className="w-3 h-3" style={{ color }} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-slate-600 font-medium truncate">{label}</span>
          <span className="text-slate-400 text-[10px] ml-1 flex-shrink-0">{weight}</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${value}%`, background: color }}
          />
        </div>
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{value}%</span>
    </div>
  );
}

function SparklineChart({ sparkline }) {
  if (!sparkline?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={48}>
      <BarChart data={sparkline} barCategoryGap="25%">
        <XAxis dataKey="date" hide />
        <YAxis domain={[0, 100]} hide />
        <Tooltip
          contentStyle={{ fontSize: 10, borderRadius: 6, border: '1px solid #e2e8f0', padding: '3px 7px' }}
          formatter={(v) => [`${v}%`, 'Engagement']}
          labelStyle={{ fontWeight: 600, color: '#334155', fontSize: 10 }}
        />
        <Bar dataKey="score" radius={[3, 3, 0, 0]}>
          {sparkline.map((entry, i) => (
            <Cell key={i} fill={scoreColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EngagementScoreCard({
  sessionId,
  mode = 'dashboard',
  days = 30,
  subjectSlug,
  compact = false,
  className = '',
}) {
  // Pick the right hook
  const sessionHook   = useSessionEngagement(sessionId, false);
  const userHook      = useUserEngagement(days, subjectSlug);
  const dashboardHook = useDashboardEngagement();

  const hookMap  = { session: sessionHook, user: userHook, dashboard: dashboardHook };
  const { data, loading, error, refetch } = hookMap[mode] || dashboardHook;

  // Normalise data shape regardless of mode
  let score = 0, grade = 'moderate', components = null, sparkline = [], hasData = false;

  if (data) {
    if (mode === 'session') {
      const m = data.metrics;
      score      = m?.engagementScore ?? 0;
      grade      = m?.engagementGrade ?? 'moderate';
      components = m ? {
        attention:   m.attentionComponent,
        presence:    m.presenceComponent,
        emotion:     m.emotionStabilityComponent,
        interaction: m.interactionComponent,
      } : null;
      hasData = !!m;
    } else if (mode === 'user') {
      score      = data.summary?.overallEngagement ?? 0;
      grade      = data.summary?.overallGrade ?? 'moderate';
      components = data.summary?.componentAverages ?? null;
      sparkline  = data.summary?.trend ?? [];
      hasData    = (data.summary?.sessionCount ?? 0) > 0;
    } else {
      // dashboard
      score      = data.latestScore ?? 0;
      grade      = data.latestGrade ?? 'moderate';
      components = data.componentAverages ?? null;
      sparkline  = data.sparkline ?? [];
      hasData    = data.hasData ?? false;
    }
  }

  const cfg = GRADE_CONFIG[grade] || GRADE_CONFIG.moderate;

  return (
    <div className={`bg-white border border-slate-100 rounded-2xl shadow-sm ${compact ? 'p-4' : 'p-5'} ${className}`}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <SparklesIcon className="h-5 w-5 text-indigo-600" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Engagement Score</h3>
            <p className="text-xs text-slate-400">
              {mode === 'session' ? 'This session' : mode === 'user' ? `Last ${days} days` : 'Last 7 days'}
            </p>
          </div>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          title="Refresh"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Computing…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="py-6 text-center text-rose-600 text-sm">
          <p>{error}</p>
          <button onClick={refetch} className="mt-2 text-xs underline">Retry</button>
        </div>
      )}

      {/* No data */}
      {!loading && !error && !hasData && (
        <div className="py-8 text-center text-slate-400 text-sm">
          <SparklesIcon className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <p>No engagement data yet.</p>
          <p className="text-xs mt-1">Complete a session to see your score.</p>
        </div>
      )}

      {/* Data */}
      {!loading && !error && hasData && (
        <div className="space-y-4">

          {/* Score display */}
          <div className="relative flex justify-center">
            <RadialScore score={score} grade={grade} />
          </div>

          {/* Component breakdown */}
          {!compact && components && (
            <div className="space-y-2.5 pt-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Score breakdown</p>
              {COMPONENT_META.map((meta) => (
                <ComponentBar
                  key={meta.key}
                  meta={meta}
                  value={Math.round(components[meta.key] ?? 0)}
                />
              ))}
            </div>
          )}

          {/* Sparkline */}
          {!compact && sparkline.length > 1 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Recent trend</p>
              <SparklineChart sparkline={sparkline} />
            </div>
          )}

          {/* Grade pill footer */}
          <div className={`flex items-center justify-between rounded-xl px-3 py-2 border ${cfg.bg} ${cfg.border}`}>
            <span className={`text-xs font-semibold ${cfg.text}`}>
              {cfg.label} engagement
            </span>
            <span className={`text-xs font-bold ${cfg.text}`}>{score}/100</span>
          </div>
        </div>
      )}
    </div>
  );
}
