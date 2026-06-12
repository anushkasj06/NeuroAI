/**
 * AttentionAnalyticsPanel
 *
 * Renders a self-contained attention analytics card.
 * Displays:
 *   - Overall avg attention score + focus %
 *   - Face presence rate & screen focus rate
 *   - Total looking-away duration and face-missing duration
 *   - Per-day chart (sparkline bars)
 *   - Distraction breakdown chips
 *
 * Uses recharts for the daily trend bar chart (already a project dependency).
 *
 * Props:
 *   days        {number}   – analytics window in days (default 7)
 *   compact     {boolean}  – compact single-column layout
 *   className   {string}   – extra Tailwind classes
 */

import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  EyeIcon,
  FaceSmileIcon,
  ComputerDesktopIcon,
  ClockIcon,
  SignalIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useAttentionAnalytics } from '../../hooks/useAttentionAnalytics';

// ── Colour helpers ────────────────────────────────────────────────────────────
function scoreBar(score) {
  if (score >= 75) return '#22c55e';  // green
  if (score >= 45) return '#f59e0b';  // amber
  return '#ef4444';                   // red
}

function formatMs(ms) {
  if (!ms || ms < 1000) return '< 1s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function shortDate(iso) {
  // 'YYYY-MM-DD' → 'Mon DD'
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DISTRACTION_LABELS = {
  face_missing:  '👤 Face missing',
  looking_away:  '👁️ Looking away',
  tab_switch:    '🖥️ Tab switch',
  head_turned:   '↩️ Head turned',
};

// ── Main component ────────────────────────────────────────────────────────────
export default function AttentionAnalyticsPanel({ days = 7, compact = false, className = '' }) {
  const [selectedDays, setSelectedDays] = useState(days);
  const { data, loading, error, refetch } = useAttentionAnalytics(selectedDays);

  const overall = data?.overallSummary;
  const daily   = data?.dailySummaries || [];

  const chartData = daily.map((d) => ({
    date:  shortDate(d.date),
    score: d.avgAttentionScore || 0,
    focus: d.avgFocusPercentage || 0,
  }));

  return (
    <div className={`bg-white border border-slate-100 rounded-2xl shadow-sm p-5 ${className}`}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <EyeIcon className="h-5 w-5 text-indigo-600" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Attention Analytics</h3>
            <p className="text-xs text-slate-400">Last {selectedDays} days</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Day filter */}
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(Number(e.target.value))}
            className="text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <button
            onClick={refetch}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            title="Refresh"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <ArrowPathIcon className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Loading analytics…</span>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="py-6 text-center text-rose-600 text-sm">
          <p>{error}</p>
          <button onClick={refetch} className="mt-2 text-xs underline">Retry</button>
        </div>
      )}

      {/* ── No data ──────────────────────────────────────────────── */}
      {!loading && !error && !overall && (
        <div className="py-8 text-center text-slate-400 text-sm">
          <EyeIcon className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <p>No attention data yet.</p>
          <p className="text-xs mt-1">Start a learning session to begin tracking.</p>
        </div>
      )}

      {/* ── Data ─────────────────────────────────────────────────── */}
      {!loading && !error && overall && (
        <div className="space-y-5">

          {/* KPI row */}
          <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
            <KPITile
              icon={<SignalIcon className="h-4 w-4 text-indigo-600" />}
              label="Avg Attention"
              value={`${overall.avgAttentionScore}%`}
              color={scoreBar(overall.avgAttentionScore)}
            />
            <KPITile
              icon={<EyeIcon className="h-4 w-4 text-sky-600" />}
              label="Avg Focus"
              value={`${overall.avgFocusPercentage}%`}
              color={scoreBar(overall.avgFocusPercentage)}
            />
            <KPITile
              icon={<FaceSmileIcon className="h-4 w-4 text-emerald-600" />}
              label="Face Present"
              value={`${overall.facePresenceRate}%`}
              color={scoreBar(overall.facePresenceRate)}
            />
            <KPITile
              icon={<ComputerDesktopIcon className="h-4 w-4 text-teal-600" />}
              label="Screen Focus"
              value={`${overall.screenFocusRate}%`}
              color={scoreBar(overall.screenFocusRate)}
            />
          </div>

          {/* Duration stats */}
          {!compact && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <DurationChip
                icon={<ClockIcon className="h-3.5 w-3.5" />}
                label="Looking away"
                value={formatMs(overall.totalLookingAwayMs)}
                warn={overall.totalLookingAwayMs > 120_000}
              />
              <DurationChip
                icon={<FaceSmileIcon className="h-3.5 w-3.5" />}
                label="Face missing"
                value={formatMs(overall.totalFaceMissingMs)}
                warn={overall.totalFaceMissingMs > 60_000}
              />
              <DurationChip
                icon={<ComputerDesktopIcon className="h-3.5 w-3.5" />}
                label="Tab switched"
                value={formatMs(overall.totalScreenUnfocusedMs)}
                warn={overall.totalScreenUnfocusedMs > 60_000}
              />
            </div>
          )}

          {/* Daily chart */}
          {chartData.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Daily attention score</p>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', padding: '4px 8px' }}
                    formatter={(v) => [`${v}%`]}
                    labelStyle={{ fontWeight: 600, color: '#334155' }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={scoreBar(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distraction breakdown */}
          {!compact && overall.distractionBreakdown && Object.keys(overall.distractionBreakdown).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Distraction events</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(overall.distractionBreakdown).map(([type, count]) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
                  >
                    {DISTRACTION_LABELS[type] || type}
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white border border-slate-300 text-slate-500 text-[10px] font-bold">
                      {count}×
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Snapshot count */}
          <p className="text-[10px] text-slate-400 text-right">
            {data.totalSnapshots || 0} snapshots · {selectedDays}-day window
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KPITile({ icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function DurationChip({ icon, label, value, warn }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 ${warn ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
      {icon}
      <div>
        <p className="text-[10px] font-medium leading-none">{label}</p>
        <p className="font-bold text-xs mt-0.5">{value}</p>
      </div>
    </div>
  );
}
