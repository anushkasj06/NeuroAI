/**
 * AttentionTracker Component
 *
 * Drop-in replacement / companion for WebcamEmotionDetector.
 * Renders a camera feed with MediaPipe Face Mesh overlay, live metrics,
 * and handles the full 10-second snapshot upload cycle.
 *
 * Props:
 *   sessionId   {string}   – active LearningSession _id (required to flush data)
 *   enabled     {boolean}  – whether the tracker should be running (default false)
 *   showOverlay {boolean}  – show landmark dots on canvas (default true)
 *   compact     {boolean}  – compact sidebar mode (default false)
 *   onMetrics   {function} – optional callback invoked on every live-metrics update
 */

import React, { useEffect } from 'react';
import { useAttentionTracker } from '../../hooks/useAttentionTracker';
import {
  EyeIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  SignalIcon,
  FaceSmileIcon,
  ArrowsPointingOutIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

// Score → colour helper
function scoreColor(score) {
  if (score >= 75) return { text: 'text-emerald-600', bg: 'bg-emerald-500', ring: 'ring-emerald-400/30' };
  if (score >= 45) return { text: 'text-amber-600',   bg: 'bg-amber-500',   ring: 'ring-amber-400/30' };
  return           { text: 'text-rose-600',    bg: 'bg-rose-500',    ring: 'ring-rose-400/30' };
}

function gazeLabel(dir) {
  const map = { center: 'On screen', left: 'Looking left', right: 'Looking right', up: 'Looking up', down: 'Looking down', away: 'Away' };
  return map[dir] || dir;
}

function poseLabel({ yaw, pitch }) {
  if (Math.abs(yaw) < 15 && Math.abs(pitch) < 15) return 'Forward';
  if (Math.abs(yaw) > Math.abs(pitch)) return yaw > 0 ? 'Turned right' : 'Turned left';
  return pitch > 0 ? 'Tilted down' : 'Tilted up';
}

export default function AttentionTracker({
  sessionId,
  enabled = false,
  showOverlay = true,
  compact = false,
  onMetrics,
}) {
  const tracker = useAttentionTracker({ sessionId, enabled });
  const { videoRef, canvasRef, isActive, permError, metrics } = tracker;

  // Fire callback whenever metrics change
  useEffect(() => {
    if (onMetrics && isActive) onMetrics(metrics);
  }, [metrics, isActive, onMetrics]);

  const score   = metrics.attentionScore;
  const colors  = scoreColor(score);
  const focused = metrics.isScreenFocused;

  return (
    <div className={`w-full bg-white/90 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-lg transition-all duration-300 ${compact ? 'p-3' : 'p-5'}`}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className={`font-semibold text-slate-800 ${compact ? 'text-sm' : 'text-base'}`}>
            Attention Tracker
          </h4>
          {!compact && (
            <p className="text-xs text-slate-500 mt-0.5">
              MediaPipe Face Mesh · 10-second windows
            </p>
          )}
        </div>

        {/* Live attention score badge */}
        {isActive && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ring-2 ${colors.ring} ${colors.text} border-current bg-white`}>
            <span className={`w-2 h-2 rounded-full ${colors.bg} animate-pulse`} />
            {score}%
          </div>
        )}
      </div>

      {/* ── Camera feed ──────────────────────────────────────────── */}
      <div className={`relative rounded-xl bg-slate-950 overflow-hidden border border-slate-800 ${compact ? 'aspect-[4/3]' : 'aspect-video'} mb-3 flex items-center justify-center`}>

        {/* Mirrored video feed */}
        <video
          ref={videoRef}
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* MediaPipe landmark overlay canvas (mirrored to match video) */}
        {showOverlay && (
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {/* Inactive placeholder */}
        {!isActive && (
          <div className="relative z-10 text-center p-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto mb-2 text-slate-500">
              <VideoCameraSlashIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-400">Tracker inactive</p>
            <p className="text-xs text-slate-600 mt-0.5">Activates when session starts</p>
          </div>
        )}

        {/* Active status indicator */}
        {isActive && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur px-2 py-1 rounded-full text-xs font-semibold border border-slate-700">
            {metrics.facePresent
              ? <><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-400">TRACKING</span></>
              : <><span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" /><span className="text-rose-400">NO FACE</span></>
            }
          </div>
        )}

        {/* Screen focus warning overlay */}
        {isActive && !focused && (
          <div className="absolute inset-0 bg-amber-900/70 flex items-center justify-center z-20 rounded-xl">
            <div className="text-center">
              <p className="text-amber-300 font-bold text-sm">Tab unfocused</p>
              <p className="text-amber-400 text-xs mt-1">Return to this tab</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Live metrics (only when tracking) ────────────────────── */}
      {isActive && (
        <div className="space-y-2">

          {/* Attention score bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <SignalIcon className="w-3 h-3" />
                Attention
              </span>
              <span className={`font-bold ${colors.text}`}>{score}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${colors.bg}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* Focus percentage bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <EyeIcon className="w-3 h-3" />
                Focus
              </span>
              <span className="font-bold text-slate-700">{metrics.focusPercentage}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                style={{ width: `${metrics.focusPercentage}%` }}
              />
            </div>
          </div>

          {/* Status chips row */}
          {!compact && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <MetricChip
                icon={<FaceSmileIcon className="w-3 h-3" />}
                label={metrics.facePresent ? 'Face detected' : 'Face missing'}
                positive={metrics.facePresent}
              />
              <MetricChip
                icon={<EyeIcon className="w-3 h-3" />}
                label={gazeLabel(metrics.gazeDirection)}
                positive={metrics.gazeDirection === 'center'}
              />
              <MetricChip
                icon={<ArrowsPointingOutIcon className="w-3 h-3" />}
                label={poseLabel(metrics.headPose)}
                positive={poseLabel(metrics.headPose) === 'Forward'}
              />
              <MetricChip
                icon={<ComputerDesktopIcon className="w-3 h-3" />}
                label={focused ? 'Screen focused' : 'Tab switched'}
                positive={focused}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Permission error ──────────────────────────────────────── */}
      {permError && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
          <p className="text-xs font-semibold text-rose-600">Camera access denied</p>
          <p className="text-[10px] text-rose-500 mt-0.5">Update browser permissions to enable attention tracking.</p>
        </div>
      )}
    </div>
  );
}

function MetricChip({ icon, label, positive }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
      positive
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
        : 'bg-rose-50 border-rose-200 text-rose-600'
    }`}>
      {icon}
      {label}
    </span>
  );
}
