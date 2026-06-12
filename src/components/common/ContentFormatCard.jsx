/**
 * ContentFormatCard
 * =================
 * Renders a single ContentFormatRecommendation document.
 * Shows the recommended format with ranked alternatives, input signals,
 * adaptation note, and Apply / Dismiss actions.
 *
 * Props:
 *   record     {object}   – ContentFormatRecommendation document
 *   onApply    {function} – (recordId) => void
 *   onDismiss  {function} – (recordId) => void
 *   compact    {boolean}  – hide ranked alternatives (default false)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  PlayCircleIcon,
  DocumentTextIcon,
  PhotoIcon,
  RectangleStackIcon,
  QuestionMarkCircleIcon,
  CodeBracketIcon,
  CheckCircleIcon,
  XMarkIcon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// ── Format config ─────────────────────────────────────────────────────────────
const FORMAT_CONFIG = {
  video: {
    label: 'Video',
    icon:  PlayCircleIcon,
    color: '#ef4444',
    bg:    'bg-red-50',
    border:'border-red-200',
    text:  'text-red-700',
    pill:  'bg-red-100 text-red-700 border-red-200',
    emoji: '🎬',
  },
  pdf: {
    label: 'PDF / Notes',
    icon:  DocumentTextIcon,
    color: '#3b82f6',
    bg:    'bg-blue-50',
    border:'border-blue-200',
    text:  'text-blue-700',
    pill:  'bg-blue-100 text-blue-700 border-blue-200',
    emoji: '📄',
  },
  infographic: {
    label: 'Infographic',
    icon:  PhotoIcon,
    color: '#8b5cf6',
    bg:    'bg-violet-50',
    border:'border-violet-200',
    text:  'text-violet-700',
    pill:  'bg-violet-100 text-violet-700 border-violet-200',
    emoji: '🖼️',
  },
  flashcards: {
    label: 'Flashcards',
    icon:  RectangleStackIcon,
    color: '#f59e0b',
    bg:    'bg-amber-50',
    border:'border-amber-200',
    text:  'text-amber-700',
    pill:  'bg-amber-100 text-amber-700 border-amber-200',
    emoji: '🃏',
  },
  interactive_quiz: {
    label: 'Interactive Quiz',
    icon:  QuestionMarkCircleIcon,
    color: '#10b981',
    bg:    'bg-emerald-50',
    border:'border-emerald-200',
    text:  'text-emerald-700',
    pill:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    emoji: '🧩',
  },
  coding_practice: {
    label: 'Coding Practice',
    icon:  CodeBracketIcon,
    color: '#0ea5e9',
    bg:    'bg-sky-50',
    border:'border-sky-200',
    text:  'text-sky-700',
    pill:  'bg-sky-100 text-sky-700 border-sky-200',
    emoji: '💻',
  },
};

function scoreBar(score) {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-rose-400';
}

// Build the action link for the recommended format
function buildActionLink(record) {
  const { subjectSlug, topic, subtopic, recommendedFormat } = record;
  const base = `/ai-teacher?subject=${subjectSlug}&topic=${encodeURIComponent(topic)}${subtopic ? `&subtopic=${encodeURIComponent(subtopic)}` : ''}`;
  switch (recommendedFormat) {
    case 'video':            return `/materials`;
    case 'pdf':              return `/materials`;
    case 'infographic':      return `/materials`;
    case 'flashcards':       return `${base}&mode=reading`;
    case 'interactive_quiz': return `${base}&mode=interactive`;
    case 'coding_practice':  return `${base}&mode=interactive`;
    default:                 return base;
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ContentFormatCard({ record, onApply, onDismiss, compact = false }) {
  if (!record) return null;

  const cfg       = FORMAT_CONFIG[record.recommendedFormat] || FORMAT_CONFIG.pdf;
  const FmtIcon   = cfg.icon;
  const inactive  = record.status !== 'active';
  const inp       = record.inputs || {};
  const actionLink = buildActionLink(record);

  return (
    <div className={`rounded-2xl border p-4 transition-all duration-200 ${cfg.bg} ${cfg.border} ${inactive ? 'opacity-55' : ''}`}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center mt-0.5 text-lg"
            style={{ background: `${cfg.color}18` }}
            title={cfg.label}
          >
            {cfg.emoji}
          </span>
          <div className="min-w-0">
            <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.pill} mb-1`}>
              <SparklesIcon className="h-2.5 w-2.5 mr-1" />
              {cfg.label}
            </span>
            <p className={`text-sm font-semibold ${cfg.text} leading-snug truncate`}>
              {record.topic}
              {record.subtopic ? <span className="font-normal opacity-70"> › {record.subtopic}</span> : null}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {record.subject || record.subjectSlug}
            </p>
          </div>
        </div>

        {/* Dismiss button */}
        {!inactive && onDismiss && (
          <button
            onClick={() => onDismiss(record._id)}
            className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200/70 hover:text-slate-600 transition-colors"
            title="Dismiss"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}

        {record.status === 'applied' && (
          <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <CheckCircleIcon className="h-3 w-3" /> Applied
          </span>
        )}
      </div>

      {/* ── Adaptation note ─────────────────────────────────────────────── */}
      <p className="text-xs text-slate-600 leading-relaxed mb-3">
        {record.adaptationNote || record.primaryReasoning}
      </p>

      {/* ── Input signal chips ──────────────────────────────────────────── */}
      {!compact && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <SignalChip label="Confusion"   value={Math.round(inp.confusionScore   ?? 0)} invert />
          <SignalChip label="Engagement"  value={Math.round(inp.engagementScore  ?? 50)} />
          <SignalChip label="Success"     value={Math.round(inp.historicalSuccess ?? 50)} />
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500">
            🎓 {inp.learningStyle?.replace(' Learner', '') || '—'}
          </span>
        </div>
      )}

      {/* ── Ranked alternatives ──────────────────────────────────────────── */}
      {!compact && record.rankedFormats?.length > 0 && (
        <div className="mb-3 p-2.5 bg-white/70 rounded-xl border border-white">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Format ranking
          </p>
          <div className="space-y-1.5">
            {record.rankedFormats.slice(0, 4).map((f) => {
              const fc = FORMAT_CONFIG[f.format] || FORMAT_CONFIG.pdf;
              return (
                <div key={f.format} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-slate-400 font-bold text-[10px]">#{f.rank}</span>
                  <span className="text-slate-600 font-medium w-28 truncate">{fc.emoji} {fc.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${scoreBar(f.score)}`}
                      style={{ width: `${f.score}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-bold text-slate-500">{f.score}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Fallback format chip ─────────────────────────────────────────── */}
      {!compact && record.fallbackFormat && record.fallbackFormat !== record.recommendedFormat && (
        <p className="text-[10px] text-slate-400 mb-3">
          Fallback: <span className="font-semibold text-slate-500">
            {FORMAT_CONFIG[record.fallbackFormat]?.emoji} {FORMAT_CONFIG[record.fallbackFormat]?.label}
          </span>
        </p>
      )}

      {/* ── Action button ────────────────────────────────────────────────── */}
      {!inactive && (
        <Link
          to={actionLink}
          onClick={() => onApply && onApply(record._id)}
          className="flex items-center justify-center gap-1.5 h-8 w-full rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: cfg.color }}
        >
          <FmtIcon className="h-3.5 w-3.5" />
          Start with {cfg.label}
        </Link>
      )}
    </div>
  );
}

// ── Signal chip sub-component ─────────────────────────────────────────────────
function SignalChip({ label, value, invert = false }) {
  let cls = 'bg-white border-slate-200 text-slate-600';
  if (!invert) {
    if (value >= 70) cls = 'bg-emerald-50 border-emerald-200 text-emerald-700';
    else if (value >= 40) cls = 'bg-amber-50 border-amber-200 text-amber-700';
    else cls = 'bg-rose-50 border-rose-200 text-rose-700';
  } else {
    // invert: high value is BAD (e.g. confusion)
    if (value >= 60) cls = 'bg-rose-50 border-rose-200 text-rose-700';
    else if (value >= 35) cls = 'bg-amber-50 border-amber-200 text-amber-700';
    else cls = 'bg-emerald-50 border-emerald-200 text-emerald-700';
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}: {value}%
    </span>
  );
}
