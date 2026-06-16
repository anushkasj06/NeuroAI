/**
 * AdaptiveSessionResult
 * =====================
 * Displayed in AITeacherSession after a session completes.
 * Triggers the evaluation pipeline, then shows the recommendation + scores.
 *
 * Props:
 *   session    {object}   – completed LearningSession object (has _id, subjectSlug, etc.)
 *   report     {object}   – ProgressReport returned by completeSession
 *   className  {string}
 */

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CpuChipIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useAdaptiveEvaluator } from '../../hooks/useAdaptiveLearning';
import AdaptiveRecommendationCard from './AdaptiveRecommendationCard';

export default function AdaptiveSessionResult({ session, report, className = '' }) {
  const { evaluate, apply, dismiss, loading, result, error } = useAdaptiveEvaluator();
  const triggered = useRef(false);

  // Auto-trigger once when session + report are both available
  useEffect(() => {
    if (!session?._id || !report || triggered.current) return;
    triggered.current = true;

    evaluate({
      sessionId:    session._id,
      subjectSlug:  session.subjectSlug,
      subject:      session.subject,
      topic:        session.topic,
      subtopic:     session.subtopic || '',
      triggerEvent: 'session_completed',
      // Pass quiz accuracy directly so the engine has it immediately
      quizMarks:    report.quizAccuracy ?? 0,
    }).catch(() => {}); // failures are non-fatal
  }, [session, report, evaluate]);

  return (
    <div className={`bg-white border border-slate-100 rounded-2xl shadow-sm p-5 ${className}`}>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="h-9 w-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
          <CpuChipIcon className="h-5 w-5 text-violet-600" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Adaptive Recommendation</h3>
          <p className="text-xs text-slate-400">Engine evaluated your session signals</p>
        </div>
      </div>

      {/* Computing */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">Analysing signals…</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Evaluation unavailable</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {!loading && !error && result && (
        <div className="space-y-3">
          <AdaptiveRecommendationCard
            record={result}
            onApply={apply}
            onDismiss={dismiss}
          />

          {/* Score summary strip */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <ScoreChip label="Readiness"  value={result.scores?.readinessScore}  />
            <ScoreChip label="Confidence" value={result.scores?.confidenceScore} />
            <ScoreChip label="Confusion"  value={result.scores?.confusionScore}  invert />
          </div>

          {/* Applied confirmation */}
          {result.status === 'applied' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
              <CheckCircleIcon className="h-4 w-4" />
              Recommendation applied — good luck!
            </div>
          )}
        </div>
      )}

      {/* Waiting for trigger */}
      {!loading && !error && !result && !triggered.current && (
        <p className="text-xs text-slate-400 text-center py-4">
          Evaluation will run once the session completes.
        </p>
      )}
    </div>
  );
}

function ScoreChip({ label, value, invert = false }) {
  const v = Math.round(value ?? 0);
  // For confusion: high is bad → colour inverted
  let color = 'text-slate-700 bg-slate-50 border-slate-200';
  if (!invert) {
    if (v >= 75) color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    else if (v >= 40) color = 'text-amber-700 bg-amber-50 border-amber-200';
    else color = 'text-rose-700 bg-rose-50 border-rose-200';
  } else {
    if (v >= 60) color = 'text-rose-700 bg-rose-50 border-rose-200';
    else if (v >= 35) color = 'text-amber-700 bg-amber-50 border-amber-200';
    else color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  }
  return (
    <div className={`flex flex-col items-center rounded-xl border px-2 py-2 ${color}`}>
      <span className="text-lg font-black">{v}%</span>
      <span className="text-[10px] font-semibold mt-0.5">{label}</span>
    </div>
  );
}
