/**
 * SecureAssessmentWrapper
 * =======================
 * Wraps any test/quiz content with the full security enforcement layer.
 *
 * Features rendered:
 *   • Security status bar (top of screen)
 *   • Animated warning toast (per violation)
 *   • Fullscreen re-entry prompt (when not fullscreen)
 *   • Disqualification overlay (when threshold reached)
 *   • Violation counter in status bar
 *
 * Props:
 *   secure     {object}   — result of useSecureAssessment()
 *   children   {node}     — the test UI to wrap
 *   onForceSubmit {fn}    — called when disqualification triggers auto-submit
 */

import React, { useEffect, useRef } from 'react';
import {
  ShieldExclamationIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  clean:         { label: 'Secure',        color: 'bg-emerald-600',  text: 'text-emerald-700', bg: 'bg-emerald-50',  icon: ShieldCheckIcon },
  warned:        { label: 'Warning',       color: 'bg-amber-500',    text: 'text-amber-700',   bg: 'bg-amber-50',    icon: ExclamationTriangleIcon },
  suspicious:    { label: 'Suspicious',    color: 'bg-orange-600',   text: 'text-orange-700',  bg: 'bg-orange-50',   icon: ShieldExclamationIcon },
  disqualified:  { label: 'Disqualified',  color: 'bg-rose-600',     text: 'text-rose-700',    bg: 'bg-rose-50',     icon: NoSymbolIcon },
};

const VIOLATION_ICONS = {
  fullscreen_exit:   '⛶',
  tab_switch:        '🔄',
  window_blur:       '👁️',
  visibility_change: '📋',
  copy_paste:        '📋',
  right_click:       '🖱️',
};

export default function SecureAssessmentWrapper({ secure, children, onForceSubmit }) {
  const {
    isFullscreen, violations, proctorStatus,
    warningMessage, showWarning, disqualified,
    requestFullscreen, dismissWarning,
  } = secure;

  const prevDisqualified = useRef(false);

  // Auto-submit when disqualified
  useEffect(() => {
    if (disqualified && !prevDisqualified.current && onForceSubmit) {
      prevDisqualified.current = true;
      const t = setTimeout(() => onForceSubmit(), 3000);
      return () => clearTimeout(t);
    }
  }, [disqualified, onForceSubmit]);

  const cfg = STATUS_CONFIG[proctorStatus] || STATUS_CONFIG.clean;
  const StatusIcon = cfg.icon;
  const total = violations.length;

  return (
    <div className="relative min-h-screen" style={{ userSelect: 'none' }}>

      {/* ── Security status bar ─────────────────────────────────────────── */}
      <div className={`sticky top-0 z-50 w-full ${cfg.color} text-white px-3 py-2 flex items-center justify-between text-xs font-semibold shadow-md`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <StatusIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">Secure — {cfg.label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1">
            <span>Violations:</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 font-bold">{total}/5</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <ArrowsPointingOutIcon className="h-3 w-3" />
            <span>{isFullscreen ? 'FS' : 'Win'}</span>
          </div>
        </div>
      </div>

      {/* ── Violation warning toast ──────────────────────────────────────── */}
      {showWarning && warningMessage && (
        <div
          className={`fixed top-12 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-50 rounded-xl border shadow-xl px-3 py-2.5 flex items-start gap-2 ${cfg.bg} border-current ${cfg.text}`}
        >
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs">Security Alert</p>
            <p className="text-[11px] mt-0.5 leading-relaxed">{warningMessage}</p>
          </div>
          <button onClick={dismissWarning} className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center hover:bg-black/10">
            <XMarkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Not-fullscreen overlay ───────────────────────────────────────── */}
      {!isFullscreen && !disqualified && (
        <div className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <ArrowsPointingOutIcon className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Fullscreen required</h2>
            <p className="text-xs text-slate-500">This assessment must be taken in fullscreen mode.</p>
            <button onClick={requestFullscreen}
              className="w-full h-10 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors">
              Enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* ── Disqualification overlay ─────────────────────────────────────── */}
      {disqualified && (
        <div className="fixed inset-0 z-50 bg-rose-900/90 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
              <NoSymbolIcon className="h-7 w-7 text-rose-600" />
            </div>
            <h2 className="text-lg font-bold text-rose-700">Assessment Flagged</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multiple security violations were detected. The test will be submitted automatically in 3 seconds.
            </p>
            <div className="space-y-1 text-left max-h-32 overflow-y-auto">
              {violations.slice(-4).map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-1.5">
                  <span>{VIOLATION_ICONS[v.type] || '⚠'}</span>
                  <span className="font-medium capitalize truncate">{v.type.replace(/_/g, ' ')}</span>
                  <span className="ml-auto text-[10px]">{new Date(v.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Violation log (bottom-right, hidden on very small screens) ─── */}
      {violations.length > 0 && !disqualified && (
        <div className="fixed bottom-4 right-3 z-40 w-44 sm:w-52 space-y-1.5">
          {violations.slice(-3).map((v, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-900/90 text-white text-[10px] rounded-xl px-2.5 py-1.5 shadow-lg">
              <span>{VIOLATION_ICONS[v.type] || '⚠'}</span>
              <div className="min-w-0">
                <p className="font-semibold capitalize truncate">{v.type.replace(/_/g, ' ')}</p>
                <p className="text-slate-400">{new Date(v.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Test content ─────────────────────────────────────────────────── */}
      <div className={disqualified ? 'pointer-events-none select-none blur-sm' : ''}>
        {children}
      </div>
    </div>
  );
}
