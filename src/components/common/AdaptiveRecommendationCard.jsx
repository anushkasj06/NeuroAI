/**
 * AdaptiveRecommendationCard
 * ==========================
 * Renders a single AdaptiveLearningRecord recommendation.
 * Shows the decision case, all three scores, the recommended action,
 * and Apply / Dismiss buttons.
 *
 * Props:
 *   record     {object}   – AdaptiveLearningRecord document
 *   onApply    {function} – (recordId) => void
 *   onDismiss  {function} – (recordId) => void
 *   compact    {boolean}  – condensed layout (no score bars)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightCircleIcon,
  PencilSquareIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  XMarkIcon,
  SignalIcon,
  EyeIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';

// ── Config maps ───────────────────────────────────────────────────────────────
const CASE_CONFIG = {
  advance_topic: {
    label:  'Advance topic',
    icon:   ArrowRightCircleIcon,
    color:  '#22c55e',
    bg:     'bg-emerald-50',
    border: 'border-emerald-200',
    text:   'text-emerald-700',
    pill:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  more_practice: {
    label:  'More practice',
    icon:   PencilSquareIcon,
    color:  '#3b82f6',
    bg:     'bg-blue-50',
    border: 'border-blue-200',
    text:   'text-blue-700',
    pill:   'bg-blue-100 text-blue-700 border-blue-200',
  },
  simpler_explanation: {
    label:  'Simplify',
    icon:   AcademicCapIcon,
    color:  '#f59e0b',
    bg:     'bg-amber-50',
    border: 'border-amber-200',
    text:   'text-amber-700',
    pill:   'bg-amber-100 text-amber-700 border-amber-200',
  },
  change_format: {
    label:  'Change format',
    icon:   ArrowPathIcon,
    color:  '#8b5cf6',
    bg:     'bg-violet-50',
    border: 'border-violet-200',
    text:   'text-violet-700',
    pill:   'bg-violet-100 text-violet-700 border-violet-200',
  },
};

const PRIORITY_DOT = {
  urgent: 'bg-rose-500',
  high:   'bg-amber-500',
  medium: 'bg-blue-400',
  low:    'bg-slate-300',
};

function scoreColor(v) {
  if (v >= 75) return '#22c55e';
  if (v >= 40) return '#f59e0b';
  return '#ef4444';
}

function ScoreBar({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <span className="w-16 text-slate-500 font-medium">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="w-8 text-right font-bold text-slate-600">{value}%</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdaptiveRecommendationCard({
  record,
  onApply,
  onDismiss,
  compact = false,
}) {
  if (!record) return null;

  const cfg = CASE_CONFIG[record.decisionCase] || CASE_CONFIG.more_practice;
  const CaseIcon = cfg.icon;
  const rec  = record.recommendation || {};
  const scr  = record.scores || {};
  const pri  = rec.priority || 'medium';

  const readiness  = Math.round(scr.readinessScore  ?? 0);
  const confidence = Math.round(scr.confidenceScore ?? 0);
  const confusion  = Math.round(scr.confusionScore  ?? 0);

  const isApplied   = record.status === 'applied';
  const isDismissed = record.status === 'dismissed';
  const isExpired   = record.status === 'expired';
  const inactive    = isApplied || isDismissed || isExpired;

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200 ${cfg.bg} ${cfg.border} ${
        inactive ? 'opacity-50' : ''
      }`}
    >
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Case icon */}
          <span
            className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center mt-0.5"
            style={{ background: `${cfg.color}18` }}
          >
            <CaseIcon className="h-4 w-4" style={{ color: cfg.color }} />
          </span>

          <div className="min-w-0">
            {/* Decision case pill */}
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.pill} mb-1`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[pri]}`} />
              {cfg.label}
            </span>

            {/* Title */}
            <p className={`text-sm font-semibold leading-snug ${cfg.text} truncate`}>
              {rec.title || record.topic}
            </p>

            {/* Subject · Topic */}
            <p className="text-[10px] text-slate-400 mt-0.5">
              {record.subject || record.subjectSlug} · {record.topic}
              {record.subtopic ? ` › ${record.subtopic}` : ''}
            </p>
          </div>
        </div>

        {/* Dismiss button */}
        {!inactive && onDismiss && (
          <button
            onClick={() => onDismiss(record._id)}
            className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
            title="Dismiss"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}

        {/* Applied badge */}
        {isApplied && (
          <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCircleIcon className="h-3 w-3" />
            Applied
          </span>
        )}
      </div>

      {/* ── Message ────────────────────────────────────────────────────── */}
      <p className="text-xs text-slate-600 leading-relaxed mb-3">
        {rec.message}
      </p>

      {/* ── Score bars (hidden in compact mode) ─────────────────────────── */}
      {!compact && (
        <div className="space-y-1.5 mb-3 p-2.5 bg-white/70 rounded-xl border border-white">
          <ScoreBar icon={SignalIcon}    label="Readiness"  value={readiness}  color={scoreColor(readiness)} />
          <ScoreBar icon={BoltIcon}      label="Confidence" value={confidence} color={scoreColor(confidence)} />
          <ScoreBar icon={EyeIcon}       label="Confusion"  value={confusion}  color={confusion >= 60 ? '#ef4444' : confusion >= 40 ? '#f59e0b' : '#22c55e'} />
        </div>
      )}

      {/* ── Suggested parameters ─────────────────────────────────────────── */}
      {!compact && (rec.suggestedMode || rec.suggestedDifficulty) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {rec.suggestedMode && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
              📐 {rec.suggestedMode} mode
            </span>
          )}
          {rec.suggestedDifficulty && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
              🎯 {rec.suggestedDifficulty} difficulty
            </span>
          )}
          {rec.suggestedNextTopic && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 max-w-[160px] truncate">
              ➡ {rec.suggestedNextTopic}
            </span>
          )}
        </div>
      )}

      {/* ── Action button ────────────────────────────────────────────────── */}
      {!inactive && rec.actionRoute && (
        <div className="flex items-center gap-2">
          <Link
            to={rec.actionRoute}
            onClick={() => onApply && onApply(record._id)}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-semibold text-white transition-colors"
            style={{ background: cfg.color }}
          >
            <FaceSmileIcon className="h-3.5 w-3.5" />
            {rec.actionLabel || 'Take action'}
          </Link>
        </div>
      )}

      {/* Reasoning (tooltip-style, collapsed by default) */}
      {!compact && rec.reasoning && (
        <details className="mt-2">
          <summary className="text-[10px] text-slate-400 cursor-pointer hover:text-slate-600 select-none">
            Why this recommendation?
          </summary>
          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{rec.reasoning}</p>
        </details>
      )}
    </div>
  );
}
