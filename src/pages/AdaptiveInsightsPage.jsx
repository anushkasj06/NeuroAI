/**
 * AdaptiveInsightsPage  —  /adaptive
 * ====================================
 * Full-page view of the Adaptive Learning Engine results.
 * Shows:
 *   • Summary KPI strip  (readiness / confidence / confusion averages)
 *   • Latest recommendation per topic  (all active records)
 *   • Decision case distribution chart
 *   • Evaluation history list with status management
 */

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  CpuChipIcon,
  ArrowPathIcon,
  ArrowRightCircleIcon,
  PencilSquareIcon,
  AcademicCapIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import {
  useAdaptiveDashboard,
  useAdaptiveHistory,
} from '../hooks/useAdaptiveLearning';
import { adaptive } from '../services/api';
import AdaptiveRecommendationCard from '../components/common/AdaptiveRecommendationCard';

// ── Constants ─────────────────────────────────────────────────────────────────
const CASE_META = {
  advance_topic:       { label: 'Advance',   color: '#22c55e', icon: ArrowRightCircleIcon },
  more_practice:       { label: 'Practice',  color: '#3b82f6', icon: PencilSquareIcon },
  simpler_explanation: { label: 'Simplify',  color: '#f59e0b', icon: AcademicCapIcon },
  change_format:       { label: 'Change fmt',color: '#8b5cf6', icon: ArrowPathIcon },
};

function scoreColor(v) {
  if (v >= 75) return '#22c55e';
  if (v >= 40) return '#f59e0b';
  return '#ef4444';
}

// ── KPI tile ──────────────────────────────────────────────────────────────────
function KpiTile({ label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col items-center">
      <span className="text-3xl font-black" style={{ color }}>{value}%</span>
      <span className="text-xs text-slate-500 font-medium mt-1 text-center">{label}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdaptiveInsightsPage() {
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus,  setFilterStatus]  = useState('active');

  const {
    data: dashData,
    loading: dashLoading,
    refetch: refetchDash,
  } = useAdaptiveDashboard();

  const {
    data: histData,
    loading: histLoading,
    refetch: refetchHist,
  } = useAdaptiveHistory(filterSubject || null, 40);

  const dashRecords = dashData?.records ?? [];
  const histRecords = (histData?.records ?? []).filter(
    (r) => !filterStatus || r.status === filterStatus
  );

  // Compute averages from history
  const avgReadiness  = histRecords.length ? Math.round(histRecords.reduce((s, r) => s + (r.scores?.readinessScore  ?? 0), 0) / histRecords.length) : 0;
  const avgConfidence = histRecords.length ? Math.round(histRecords.reduce((s, r) => s + (r.scores?.confidenceScore ?? 0), 0) / histRecords.length) : 0;
  const avgConfusion  = histRecords.length ? Math.round(histRecords.reduce((s, r) => s + (r.scores?.confusionScore  ?? 0), 0) / histRecords.length) : 0;

  // Decision case distribution for chart
  const caseCounts = { advance_topic: 0, more_practice: 0, simpler_explanation: 0, change_format: 0 };
  for (const r of histRecords) {
    if (r.decisionCase in caseCounts) caseCounts[r.decisionCase]++;
  }
  const chartData = Object.entries(caseCounts).map(([key, count]) => ({
    name:  CASE_META[key]?.label ?? key,
    count,
    color: CASE_META[key]?.color ?? '#94a3b8',
  }));

  // Unique subjects for filter
  const allSubjects = [...new Set(histRecords.map((r) => r.subjectSlug).filter(Boolean))];

  const handleApply = useCallback(async (recordId) => {
    try { await adaptive.apply(recordId); refetchDash(); refetchHist(); } catch {}
  }, [refetchDash, refetchHist]);

  const handleDismiss = useCallback(async (recordId) => {
    try { await adaptive.dismiss(recordId); refetchDash(); refetchHist(); } catch {}
  }, [refetchDash, refetchHist]);

  const isLoading = dashLoading || histLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-8 w-8 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center">
                <CpuChipIcon className="h-4 w-4 text-violet-600" />
              </span>
              <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Adaptive Engine</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Learning Insights</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Readiness · Confidence · Confusion scores across all topics
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { refetchDash(); refetchHist(); }}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              to="/progress"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
            >
              View Progress
            </Link>
          </div>
        </div>

        {/* ── KPI strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiTile label="Avg Readiness"  value={avgReadiness}  color={scoreColor(avgReadiness)} />
          <KpiTile label="Avg Confidence" value={avgConfidence} color={scoreColor(avgConfidence)} />
          <KpiTile label="Avg Confusion"  value={avgConfusion}
            color={avgConfusion >= 60 ? '#ef4444' : avgConfusion >= 35 ? '#f59e0b' : '#22c55e'} />
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col items-center">
            <span className="text-3xl font-black text-violet-600">{histRecords.length}</span>
            <span className="text-xs text-slate-500 font-medium mt-1">Evaluations</span>
          </div>
        </div>

        {/* ── Decision distribution chart ───────────────────────────── */}
        {histRecords.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-3">Decision case distribution</p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v) => [v, 'evaluations']}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Active recommendations (per topic) ───────────────────── */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            Active recommendations
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({dashRecords.length} topic{dashRecords.length !== 1 ? 's' : ''})
            </span>
          </h2>
          {dashLoading && (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading…</span>
            </div>
          )}
          {!dashLoading && dashRecords.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
              <CpuChipIcon className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No active recommendations.</p>
              <p className="text-xs mt-1">Complete a learning session to generate insights.</p>
              <Link to="/ai-teacher" className="inline-block mt-4 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium">
                Start a session
              </Link>
            </div>
          )}
          {!dashLoading && dashRecords.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4">
              {dashRecords.map((rec) => (
                <AdaptiveRecommendationCard
                  key={rec._id}
                  record={rec}
                  onApply={handleApply}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── History ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <h2 className="text-base font-semibold text-slate-800">
              Evaluation history
            </h2>
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <FunnelIcon className="h-4 w-4 text-slate-400" />
              {/* Subject filter */}
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                <option value="">All subjects</option>
                {allSubjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="applied">Applied</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>

          {histLoading && (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading history…</span>
            </div>
          )}

          {!histLoading && histRecords.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
              <p className="text-sm">No records match the current filter.</p>
            </div>
          )}

          {!histLoading && histRecords.length > 0 && (
            <div className="space-y-3">
              {histRecords.map((rec) => (
                <HistoryRow
                  key={rec._id}
                  record={rec}
                  onApply={handleApply}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Compact history row ───────────────────────────────────────────────────────
function HistoryRow({ record, onApply, onDismiss }) {
  const meta    = CASE_META[record.decisionCase] || CASE_META.more_practice;
  const CaseIcon = meta.icon;
  const scr     = record.scores || {};
  const isActive = record.status === 'active';

  return (
    <div className={`bg-white border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-4 transition-opacity ${record.status !== 'active' ? 'opacity-60' : ''}`}>
      {/* Case icon */}
      <span
        className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center"
        style={{ background: `${meta.color}15` }}
      >
        <CaseIcon className="h-4 w-4" style={{ color: meta.color }} />
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {record.topic}
          {record.subtopic ? <span className="text-slate-400 font-normal"> › {record.subtopic}</span> : null}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {record.subject || record.subjectSlug}
          {' · '}
          {new Date(record.evaluatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          {' · '}
          <span className="font-semibold capitalize">{record.triggerEvent?.replace(/_/g, ' ')}</span>
        </p>
      </div>

      {/* Score pills */}
      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        {[
          { label: 'R', value: Math.round(scr.readinessScore  ?? 0), invert: false },
          { label: 'C', value: Math.round(scr.confidenceScore ?? 0), invert: false },
          { label: '⚠', value: Math.round(scr.confusionScore  ?? 0), invert: true  },
        ].map(({ label, value, invert }) => {
          let color = 'bg-slate-100 text-slate-600';
          if (!invert) {
            if (value >= 75) color = 'bg-emerald-100 text-emerald-700';
            else if (value >= 40) color = 'bg-amber-100 text-amber-700';
            else color = 'bg-rose-100 text-rose-700';
          } else {
            if (value >= 60) color = 'bg-rose-100 text-rose-700';
            else if (value >= 35) color = 'bg-amber-100 text-amber-700';
            else color = 'bg-emerald-100 text-emerald-700';
          }
          return (
            <span key={label} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${color}`}>
              {label} {value}%
            </span>
          );
        })}
      </div>

      {/* Status + action */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {record.status !== 'active' ? (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
            record.status === 'applied'   ? 'bg-emerald-100 text-emerald-700' :
            record.status === 'dismissed' ? 'bg-slate-100 text-slate-500' :
            'bg-gray-100 text-gray-500'
          }`}>
            {record.status}
          </span>
        ) : (
          <>
            {record.recommendation?.actionRoute && (
              <Link
                to={record.recommendation.actionRoute}
                onClick={() => onApply(record._id)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-700"
              >
                {record.recommendation.actionLabel || 'Go'}
              </Link>
            )}
            <button
              onClick={() => onDismiss(record._id)}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-medium"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}
