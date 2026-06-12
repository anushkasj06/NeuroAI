/**
 * useSecureAssessment
 * ===================
 * Core hook that enforces all five browser-level security measures
 * and reports violations to the backend in real time.
 *
 * Security features:
 *   1. Fullscreen Enforcement  — requests fullscreen, tracks exits
 *   2. Tab Switch Detection    — visibilitychange API
 *   3. Visibility Change       — Page Visibility API (blur/focus)
 *   4. Copy / Paste Blocking   — keydown + copy/cut/paste events
 *   5. Right-Click Blocking    — contextmenu event
 *
 * Warning thresholds (mirror backend):
 *   ≥ 1  → 'warned'
 *   ≥ 3  → 'suspicious'
 *   ≥ 6  → 'disqualified'  (test should be auto-submitted)
 *
 * Usage:
 *   const secure = useSecureAssessment({ attemptId, enabled: true });
 *   Mount <SecureAssessmentOverlay secure={secure} /> in the test wrapper.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const DISQUALIFY_THRESHOLD = 6;
const WARN_THRESHOLD       = 1;

const VIOLATION_SEVERITY = {
  fullscreen_exit:   'medium',
  tab_switch:        'high',
  window_blur:       'low',
  visibility_change: 'medium',
  copy_paste:        'high',
  right_click:       'low',
};

const VIOLATION_MESSAGES = {
  fullscreen_exit:   'You exited fullscreen. Please return to fullscreen mode.',
  tab_switch:        'Tab switch detected. Stay on this page during the test.',
  window_blur:       'Window lost focus. Keep the test window active.',
  visibility_change: 'Tab visibility changed — this is being recorded.',
  copy_paste:        'Copy & paste is disabled during this assessment.',
  right_click:       'Right-click is disabled during this assessment.',
};

// ── API helpers ───────────────────────────────────────────────────────────────
async function apiStart(attemptId) {
  try {
    await api.post('/assessment-monitor/start', { attemptId });
  } catch (e) {
    console.warn('[SecureAssessment] start failed:', e.message);
  }
}

async function apiLogViolation(attemptId, type, detail = '') {
  try {
    const res = await api.post('/assessment-monitor/violation', { attemptId, type, detail });
    return res.data?.data;
  } catch (e) {
    console.warn('[SecureAssessment] log violation failed:', e.message);
    return null;
  }
}

async function apiFinish(attemptId) {
  try {
    await api.patch(`/assessment-monitor/${attemptId}/finish`);
  } catch (e) {
    console.warn('[SecureAssessment] finish failed:', e.message);
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function useSecureAssessment({ attemptId, enabled = false }) {
  const [isFullscreen,    setIsFullscreen]    = useState(false);
  const [violations,      setViolations]      = useState([]);
  const [proctorStatus,   setProctorStatus]   = useState('clean');
  const [warningMessage,  setWarningMessage]  = useState('');
  const [showWarning,     setShowWarning]     = useState(false);
  const [disqualified,    setDisqualified]    = useState(false);

  const enabledRef    = useRef(enabled);
  const attemptIdRef  = useRef(attemptId);
  const warningTimer  = useRef(null);

  // Keep refs current
  useEffect(() => { enabledRef.current = enabled;   }, [enabled]);
  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);

  // ── violation dispatcher ────────────────────────────────────────────────
  const dispatchViolation = useCallback(async (type, detail = '') => {
    if (!enabledRef.current || !attemptIdRef.current) return;

    const event = {
      type,
      timestamp: new Date().toISOString(),
      severity: VIOLATION_SEVERITY[type] || 'low',
      detail,
    };

    setViolations((prev) => {
      const updated = [...prev, event];
      const count = updated.length;

      if (count >= DISQUALIFY_THRESHOLD) setDisqualified(true);

      const newStatus =
        count >= DISQUALIFY_THRESHOLD ? 'disqualified'
        : count >= 3                  ? 'suspicious'
        : count >= WARN_THRESHOLD     ? 'warned'
        : 'clean';

      setProctorStatus(newStatus);
      return updated;
    });

    const msg = VIOLATION_MESSAGES[type] || 'A security event was detected.';
    setWarningMessage(msg);
    setShowWarning(true);

    // Auto-hide warning after 4 seconds
    if (warningTimer.current) clearTimeout(warningTimer.current);
    warningTimer.current = setTimeout(() => setShowWarning(false), 4000);

    // Send to backend (non-blocking)
    const result = await apiLogViolation(attemptIdRef.current, type, detail);
    if (result?.proctorStatus) setProctorStatus(result.proctorStatus);
    if (result?.disqualified)  setDisqualified(true);
  }, []);

  // ── 1. Fullscreen enforcement ───────────────────────────────────────────
  const requestFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen)       await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen)    await el.mozRequestFullScreen();
    } catch {
      // User denied — treat as violation immediately
      dispatchViolation('fullscreen_exit', 'Fullscreen request denied');
    }
  }, [dispatchViolation]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      );
      setIsFullscreen(active);
      if (!active && enabledRef.current) {
        dispatchViolation('fullscreen_exit', 'User exited fullscreen');
      }
    };
    document.addEventListener('fullscreenchange',       onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange',    onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange',       onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange',    onFullscreenChange);
    };
  }, [dispatchViolation]);

  // ── 2 & 3. Tab switch + visibility change ──────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      if (!enabledRef.current) return;
      if (document.hidden || document.visibilityState === 'hidden') {
        dispatchViolation('tab_switch', 'Document hidden');
      } else {
        dispatchViolation('visibility_change', `State: ${document.visibilityState}`);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [dispatchViolation]);

  // ── Window blur (switching apps / clicking outside) ─────────────────────
  useEffect(() => {
    const onBlur = () => {
      if (enabledRef.current) dispatchViolation('window_blur', 'Window lost focus');
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [dispatchViolation]);

  // ── 4. Copy / Paste blocking ───────────────────────────────────────────
  useEffect(() => {
    const block = (e) => {
      if (!enabledRef.current) return;
      e.preventDefault();
      const combo = e.type === 'keydown'
        ? `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.key}`
        : e.type;
      dispatchViolation('copy_paste', combo);
    };

    const onKey = (e) => {
      if (!enabledRef.current) return;
      const ctrlC = (e.ctrlKey || e.metaKey) && e.key === 'c';
      const ctrlV = (e.ctrlKey || e.metaKey) && e.key === 'v';
      const ctrlX = (e.ctrlKey || e.metaKey) && e.key === 'x';
      const ctrlA = (e.ctrlKey || e.metaKey) && e.key === 'a';
      if (ctrlC || ctrlV || ctrlX || ctrlA) {
        e.preventDefault();
        dispatchViolation('copy_paste', `${e.key.toUpperCase()} combination`);
      }
    };

    document.addEventListener('copy',  block);
    document.addEventListener('cut',   block);
    document.addEventListener('paste', block);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('copy',  block);
      document.removeEventListener('cut',   block);
      document.removeEventListener('paste', block);
      document.removeEventListener('keydown', onKey);
    };
  }, [dispatchViolation]);

  // ── 5. Right-click blocking ────────────────────────────────────────────
  useEffect(() => {
    const block = (e) => {
      if (!enabledRef.current) return;
      e.preventDefault();
      dispatchViolation('right_click', `x:${e.clientX} y:${e.clientY}`);
    };
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, [dispatchViolation]);

  // ── Start / stop monitoring session ───────────────────────────────────
  useEffect(() => {
    if (!enabled || !attemptId) return;
    apiStart(attemptId);
    requestFullscreen();

    return () => {
      // On unmount: exit fullscreen
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [enabled, attemptId, requestFullscreen]);

  // ── Finish ─────────────────────────────────────────────────────────────
  const finishMonitoring = useCallback(async () => {
    if (!attemptIdRef.current) return;
    await apiFinish(attemptIdRef.current);
    // Exit fullscreen on submit
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const dismissWarning = useCallback(() => setShowWarning(false), []);

  return {
    // State
    isFullscreen,
    violations,
    proctorStatus,
    warningMessage,
    showWarning,
    disqualified,
    totalViolations: violations.length,
    // Controls
    requestFullscreen,
    finishMonitoring,
    dismissWarning,
  };
}
