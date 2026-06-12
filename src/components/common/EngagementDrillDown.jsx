/**
 * EngagementDrillDown
 * ===================
 * Full-detail panel shown after a session completes.
 * Displays all four component scores, emotion distribution,
 * attention timeline, and interaction count.
 *
 * Props:
 *   sessionId  {string}  — required
 *   className  {string}
 */

import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  SignalIcon,
  EyeIcon,
  FaceSmileIcon,
  BoltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useSessionEngagement } from '../../hooks/useEngagementAnalytics';

// ── Colour map ────────────────────────────────────────────────────────────────
const EMOTION_COLORS = {
  engaged:    '#22c55e',
  happy:      '#6ee7b7',
  neutral:    '#94a3b8',
  confused:   '#f59e0b',
  frustrated: '#ef4444',
  sad:        '#60a5fa',
};

function formatMs(ms) {
  if (!ms || ms < 1000) return '< 1s';
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return '< 1 min';
  return `${mins} min${mins !== 1 ? 's' : ''}`;
}

const GRADE_COLOR = {
  excellent: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  good:      'text-blue-600 bg-blue-50 border-blue-200',
  moderate:  'text-amber-600 bg-amber-50 border-amber-200',
  low:       'text-orange-600 bg-orange-50 border-orange-200',
  critical:  'text-rose-600 bg-rose-50 border-rose-200',
};

// ── Sub-components ────────────────────────────────────────────────────────────
function StatBlock({ icon: Icon, label, value, sub, color = '#6366f1' }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
      <span className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EngagementDrillDown({ sessionId, className = '' }) {
  const { data, loading, error, refetch } = useSessionEngagement(sessionId, false);
  const m = data?.metrics;

  if (loading) {
    return (
      <div className={`bg-white border border-slate-100 rounded-2xl p-5 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-40" />
          <div className="h-24 bg-slate-100 rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !m) {
    return (
      <div className={`bg-white border border-slate-100 rounded-2xl p-5 text-center text-slate-400 ${className}`}>
        <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        <p className="text-sm">{error || 'No engagement data for this session.'}</p>
        <button onClick={refetch} className="mt-2 text-xs text-indigo-600 underline">Retry</button>
      </div>
    );
  }

  // Radar chart data
  const radarData = [
    { subject: 'Attention',   value: Math.round(m.attentionComponent) },
    { subject: 'Presence',    value: Math.round(m.presenceComponent) },
    { subject: 'Emotion',     value: Math.round(m.emotionStabilityComponent) },
    { subject: 'Interaction', value: Math.round(m.interactionComponent) },
  ];

  // Emotion distribution bars
  const emoEntries = Object.entries(m.emotionDistribution || {})
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  const gradeClass = GRADE_COLOR[m.engagementGrade] || GRADE_COLOR.moderate;

  return (
    <div className={`bg-white border border-slate-100 rounded-2xl p-5 space-y-5 ${className}`}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Engagement Breakdown</h3>
          <p className="text-xs text-slate-400 mt-0.5">{m.subject} · {m.topic}</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${gradeClass}`}>
          {m.engagementGrade}
        </span>
      </div>

      {/* Composite score */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-gradient-to-r from-indigo-50 to-slate-50">
        <div className="text-center">
          <p className="text-4xl font-black text-indigo-600">{m.engagementScore}</p>
          <p className="text-[10px] text-slate-400 font-semibold">/ 100</p>
        </div>
        <div className="flex-1 space-y-1.5">
          <ComponentRow label="Attention (40%)"   value={m.attentionComponent}        color="#6366f1" />
          <ComponentRow label="Presence (30%)"    value={m.presenceComponent}         color="#10b981" />
          <ComponentRow label="Emotion (20%)"     value={m.emotionStabilityComponent} color="#f59e0b" />
          <ComponentRow label="Interaction (10%)" value={m.interactionComponent}      color="#3b82f6" />
        </div>
      </div>

      {/* Radar chart */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-1">Component radar</p>
        <ResponsiveContainer width="100%" height={160}>
          <RadarChart data={radarData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
            <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ fontSize: 11 }} />
            <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatBlock icon={ClockIcon}      label="Session duration"  value={formatDuration(m.sessionDurationMs)} color="#6366f1" />
        <StatBlock icon={BoltIcon}       label="Interactions"      value={m.interactionEventCount || 0} sub={`${(m.activeInteractionMinutes || 0).toFixed(1)} active mins`} color="#3b82f6" />
        <StatBlock icon={EyeIcon}        label="Face missing"      value={formatMs(m.totalFaceMissingMs)} sub={`${m.facePresenceRate || 0}% present`} color="#10b981" />
        <StatBlock icon={SignalIcon}     label="Avg attention"     value={`${m.avgAttentionScore || 0}%`} sub={`${m.screenFocusRate || 0}% screen-focused`} color="#6366f1" />
      </div>

      {/* Emotion distribution */}
      {emoEntries.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Emotion distribution</p>
          <div className="space-y-1.5">
            {emoEntries.map(([emo, val]) => (
              <div key={emo} className="flex items-center gap-2 text-xs">
                <span className="w-20 capitalize font-medium text-slate-600">{emo}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.round(val * 100)}%`, background: EMOTION_COLORS[emo] || '#94a3b8' }}
                  />
                </div>
                <span className="w-8 text-right font-bold text-slate-500">{Math.round(val * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distraction note */}
      {m.distractionCount > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            <span className="font-bold">{m.distractionCount} distraction event{m.distractionCount !== 1 ? 's' : ''}</span>{' '}
            detected · {formatMs(m.totalLookingAwayMs)} looking away
          </p>
        </div>
      )}
    </div>
  );
}

function ComponentRow({ label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      <span className="text-slate-500 w-28 truncate">{label}</span>
      <div className="flex-1 h-1 bg-white/60 rounded-full overflow-hidden border border-slate-200">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.round(value)}%`, background: color }} />
      </div>
      <span className="font-bold text-slate-600 w-7 text-right">{Math.round(value)}</span>
    </div>
  );
}
