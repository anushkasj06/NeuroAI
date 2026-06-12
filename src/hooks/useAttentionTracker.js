/**
 * useAttentionTracker
 *
 * Core hook that drives the entire browser-side attention tracking pipeline.
 * Uses MediaPipe Face Mesh (loaded via CDN script tag) to detect:
 *   - Face Presence
 *   - Head Pose  (yaw, pitch, roll) derived from 3D face landmarks
 *   - Eye Gaze   (left / right / up / down / center / away)
 *   - Screen Focus via Page Visibility API
 *
 * Every 3 seconds it flushes a snapshot to the backend and resets counters.
 *
 * Usage:
 *   const tracker = useAttentionTracker({ sessionId, enabled: true });
 *   // Mount <video ref={tracker.videoRef} /> and <canvas ref={tracker.canvasRef} /> in the component
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { attention } from '../services/api';

// ── Constants ────────────────────────────────────────────────────────────────
const SNAPSHOT_INTERVAL_MS = 3_000;  // 3 seconds — first telemetry snapshot arrives fast
const HEAD_YAW_THRESHOLD   = 25;     // degrees — beyond this = head turned
const HEAD_PITCH_THRESHOLD = 25;     // degrees
const GAZE_THRESHOLD       = 0.12;   // normalised iris offset
const CURSOR_IDLE_THRESHOLD_MS = 1_500;
const POINTER_SAMPLE_MS = 100;

// MediaPipe CDN load guard — only inject once per page
let mediapipeLoading = false;
let mediapipeReady   = false;
const mediapipeCallbacks = [];

function loadMediaPipe() {
  return new Promise((resolve, reject) => {
    if (mediapipeReady) { resolve(); return; }
    mediapipeCallbacks.push({ resolve, reject });
    if (mediapipeLoading) return;
    mediapipeLoading = true;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      mediapipeReady = true;
      mediapipeCallbacks.forEach(cb => cb.resolve());
      mediapipeCallbacks.length = 0;
    };
    script.onerror = (e) => {
      mediapipeLoading = false;
      mediapipeCallbacks.forEach(cb => cb.reject(e));
      mediapipeCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

// ── Landmark indices (MediaPipe Face Mesh 468-point model) ──────────────────
// Nose tip: 1 | Left eye outer: 33 | Right eye outer: 263
// Left iris (approx centre): 468 | Right iris (approx centre): 473
// Chin: 152 | Forehead: 10
// Left eye centre: 159 | Right eye centre: 386

const IDX = {
  NOSE_TIP:        1,
  LEFT_EYE_OUTER:  33,
  RIGHT_EYE_OUTER: 263,
  CHIN:            152,
  FOREHEAD:        10,
  LEFT_EYE_CENTER: 159,
  RIGHT_EYE_CENTER:386,
  // Iris landmarks are indices 468-477 (added when refineLandmarks: true)
  LEFT_IRIS:       468,
  RIGHT_IRIS:      473,
};

// ── Geometry helpers ─────────────────────────────────────────────────────────
function lm(landmarks, idx) {
  // Returns {x, y, z} in normalised [0,1] space
  return landmarks[idx] || { x: 0.5, y: 0.5, z: 0 };
}

/**
 * Estimate head pose from key facial landmarks.
 * Returns { yaw, pitch, roll } in degrees (approx).
 */
function estimateHeadPose(landmarks) {
  const noseTip   = lm(landmarks, IDX.NOSE_TIP);
  const leftEye   = lm(landmarks, IDX.LEFT_EYE_OUTER);
  const rightEye  = lm(landmarks, IDX.RIGHT_EYE_OUTER);
  const chin      = lm(landmarks, IDX.CHIN);
  const forehead  = lm(landmarks, IDX.FOREHEAD);

  // Yaw: horizontal nose offset relative to eye midpoint
  const eyeMidX  = (leftEye.x + rightEye.x) / 2;
  const yawRaw   = (noseTip.x - eyeMidX) / (Math.abs(leftEye.x - rightEye.x) + 1e-6);
  const yaw      = Math.round(yawRaw * 90);

  // Pitch: vertical nose offset between forehead and chin
  const faceH    = Math.abs(forehead.y - chin.y) + 1e-6;
  const noseMidY = (forehead.y + chin.y) / 2;
  const pitchRaw = (noseTip.y - noseMidY) / faceH;
  const pitch    = Math.round(pitchRaw * 90);

  // Roll: tilt of eye line from horizontal
  const dy = rightEye.y - leftEye.y;
  const dx = rightEye.x - leftEye.x + 1e-6;
  const roll = Math.round(Math.atan2(dy, dx) * (180 / Math.PI));

  return { yaw, pitch, roll };
}

/**
 * Estimate gaze direction from iris position relative to eye corners.
 * Returns one of: 'center' | 'left' | 'right' | 'up' | 'down' | 'away'
 */
function estimateGaze(landmarks) {
  // Only available when refineLandmarks = true (iris landmarks 468-477)
  const hasIris = landmarks.length > 468;
  if (!hasIris) return 'center';

  const leftIris   = lm(landmarks, IDX.LEFT_IRIS);
  const rightIris  = lm(landmarks, IDX.RIGHT_IRIS);
  const leftEyeOuter  = lm(landmarks, IDX.LEFT_EYE_OUTER);
  const rightEyeOuter = lm(landmarks, IDX.RIGHT_EYE_OUTER);
  const leftEyeCtr    = lm(landmarks, IDX.LEFT_EYE_CENTER);
  const rightEyeCtr   = lm(landmarks, IDX.RIGHT_EYE_CENTER);

  // Normalise iris within its eye bounding box
  const leftOffsetX  = (leftIris.x  - leftEyeOuter.x) / (Math.abs(leftEyeCtr.x  - leftEyeOuter.x) + 1e-6) - 1;
  const rightOffsetX = (rightIris.x - rightEyeOuter.x) / (Math.abs(rightEyeCtr.x - rightEyeOuter.x) + 1e-6) - 1;
  const avgOffsetX   = (leftOffsetX + rightOffsetX) / 2;

  const leftOffsetY  = leftIris.y  - leftEyeCtr.y;
  const rightOffsetY = rightIris.y - rightEyeCtr.y;
  const avgOffsetY   = (leftOffsetY + rightOffsetY) / 2;

  if (Math.abs(avgOffsetX) > GAZE_THRESHOLD || Math.abs(avgOffsetY) > GAZE_THRESHOLD) {
    if (Math.abs(avgOffsetX) > Math.abs(avgOffsetY)) {
      return avgOffsetX > 0 ? 'right' : 'left';
    }
    return avgOffsetY > 0 ? 'down' : 'up';
  }
  return 'center';
}

// ── Main Hook ─────────────────────────────────────────────────────────────────
export function useAttentionTracker({ sessionId, enabled = false }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceMeshRef    = useRef(null);
  const animFrameRef   = useRef(null);
  const snapshotTimerRef = useRef(null);

  // ── Live display state ───────────────────────────────────────────────────
  const [isActive, setIsActive]   = useState(false);
  const [permError, setPermError] = useState(false);
  const [mpLoaded, setMpLoaded]   = useState(mediapipeReady);

  // ── Current-tick metrics ─────────────────────────────────────────────────
  const [metrics, setMetrics] = useState({
    facePresent:       false,
    headPose:          { yaw: 0, pitch: 0, roll: 0 },
    gazeDirection:     'center',
    isScreenFocused:   true,
    attentionScore:    0,
    focusPercentage:   0,
  });

  // ── Rolling counters for the current 10-second window ───────────────────
  const windowRef = useRef(resetWindow());

  function resetWindow() {
    return {
      startedAt:               Date.now(),
      totalFrames:             0,
      facePresentFrames:       0,
      lookingAwayFrames:       0,
      screenUnfocusedMs:       0,
      faceMissingMs:           0,
      screenFocusedAtStart:    true,
      lastScreenBlurAt:        null,
      lastFaceMissingAt:       null,
      lastPointerMoveAt:       Date.now(),
      lastPointerSampleAt:     0,
      lastInteractionAt:       Date.now(),
      lastWindowBlurAt:        null,
      cursorMoveCount:         0,
      clickCount:              0,
      keyPressCount:           0,
      scrollCount:             0,
      tabSwitchCount:          0,
      windowBlurCount:         0,
      cursorLeaveCount:        0,
      windowBlurDurationMs:    0,
      headPoseAccum:           { yaw: 0, pitch: 0, roll: 0 },
      gazeAccum:               {},
      distractionEvents:       new Set(),
    };
  }

  // ── Page Visibility (screen focus) ───────────────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      const focused = document.visibilityState === 'visible';
      const w = windowRef.current;
      if (!focused) {
        w.lastScreenBlurAt = Date.now();
        w.tabSwitchCount++;
        w.distractionEvents.add('tab_switch');
      } else if (w.lastScreenBlurAt) {
        w.screenUnfocusedMs += Date.now() - w.lastScreenBlurAt;
        w.lastScreenBlurAt = null;
      }
      setMetrics(prev => ({ ...prev, isScreenFocused: focused }));
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // ── MediaPipe initialisation ─────────────────────────────────────────────
  const initMediaPipe = useCallback(async (videoEl) => {
    if (!window.FaceMesh) {
      await loadMediaPipe();
    }
    setMpLoaded(true);

    const faceMesh = new window.FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces:      1,
      refineLandmarks:  true,   // enables iris landmarks 468-477
      minDetectionConfidence: 0.5,
      minTrackingConfidence:  0.5,
    });

    faceMesh.onResults((results) => {
      const w = windowRef.current;
      w.totalFrames++;

      const hasFace = results.multiFaceLandmarks?.length > 0;

      if (hasFace) {
        // Accumulate face-present frames
        w.facePresentFrames++;
        if (w.lastFaceMissingAt) {
          w.faceMissingMs += Date.now() - w.lastFaceMissingAt;
          w.lastFaceMissingAt = null;
        }

        const landmarks = results.multiFaceLandmarks[0];
        const pose = estimateHeadPose(landmarks);
        const gaze = estimateGaze(landmarks);

        // Accumulate pose
        w.headPoseAccum.yaw   += pose.yaw;
        w.headPoseAccum.pitch += pose.pitch;
        w.headPoseAccum.roll  += pose.roll;

        // Accumulate gaze
        w.gazeAccum[gaze] = (w.gazeAccum[gaze] || 0) + 1;

        // Classify distraction events
        if (Math.abs(pose.yaw)   > HEAD_YAW_THRESHOLD)   w.distractionEvents.add('head_turned');
        if (Math.abs(pose.pitch) > HEAD_PITCH_THRESHOLD)  w.distractionEvents.add('head_turned');
        if (gaze !== 'center')                             w.distractionEvents.add('looking_away');
        if (gaze !== 'center') w.lookingAwayFrames++;

        // Update live metrics
        const attScore = computeAttentionScore({
          facePresent: true,
          headPose: pose,
          gaze,
          isScreenFocused: document.visibilityState === 'visible',
        });

        setMetrics({
          facePresent:     true,
          headPose:        pose,
          gazeDirection:   gaze,
          isScreenFocused: document.visibilityState === 'visible',
          attentionScore:  attScore,
          focusPercentage: attScore,
        });
      } else {
        // No face
        w.distractionEvents.add('face_missing');
        if (!w.lastFaceMissingAt) w.lastFaceMissingAt = Date.now();
        setMetrics(prev => ({
          ...prev,
          facePresent:    false,
          attentionScore: 0,
          focusPercentage: 0,
        }));
      }

      // Draw landmarks overlay on canvas
      drawOverlay(results, canvasRef.current, videoRef.current);
    });

    faceMeshRef.current = faceMesh;

    // Start detect loop
    const detect = async () => {
      if (videoEl.readyState >= 2) {
        try { await faceMesh.send({ image: videoEl }); } catch {}
      }
      animFrameRef.current = requestAnimationFrame(detect);
    };
    animFrameRef.current = requestAnimationFrame(detect);
  }, []);

  // ── Camera control ───────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      setPermError(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play().catch(() => {});
      }
      setIsActive(true);
      await initMediaPipe(videoEl);
    } catch {
      setPermError(true);
      setIsActive(false);
    }
  }, [initMediaPipe]);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current)  cancelAnimationFrame(animFrameRef.current);
    if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    faceMeshRef.current = null;
    setIsActive(false);
    setMetrics({
      facePresent: false,
      headPose: { yaw: 0, pitch: 0, roll: 0 },
      gazeDirection: 'center',
      isScreenFocused: true,
      attentionScore: 0,
      focusPercentage: 0,
    });
  }, []);

  // ── Snapshot flush ───────────────────────────────────────────────────────
  const flushSnapshot = useCallback(async () => {
    if (!sessionId || !isActive) return;
    const w = windowRef.current;
    const n = w.totalFrames || 1;

    // Close any open unfocused windows
    const now = Date.now();
    if (w.lastScreenBlurAt) {
      w.screenUnfocusedMs += now - w.lastScreenBlurAt;
      w.lastScreenBlurAt = now;
    }
    if (w.lastFaceMissingAt) {
      w.faceMissingMs += now - w.lastFaceMissingAt;
      w.lastFaceMissingAt = now;
    }

    if (w.lastWindowBlurAt) {
      w.windowBlurDurationMs += now - w.lastWindowBlurAt;
      w.lastWindowBlurAt = now;
    }

    // Average pose
    const avgPose = {
      yaw:   Math.round(w.headPoseAccum.yaw   / n),
      pitch: Math.round(w.headPoseAccum.pitch / n),
      roll:  Math.round(w.headPoseAccum.roll  / n),
    };

    // Dominant gaze
    const gazeEntries = Object.entries(w.gazeAccum);
    const dominantGaze = gazeEntries.length
      ? gazeEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]
      : 'center';

    const facePresent = w.facePresentFrames > n / 2;
    const isScreenFocused = document.visibilityState === 'visible';
    const lookingAwayMs = Math.round((w.lookingAwayFrames / n) * SNAPSHOT_INTERVAL_MS);

    // Compute idle time
    const timeSinceInteraction = Date.now() - w.lastInteractionAt;
    const isIdle = timeSinceInteraction > CURSOR_IDLE_THRESHOLD_MS;

    const attScore = computeAttentionScore({
      facePresent,
      headPose: avgPose,
      gaze: dominantGaze,
      isScreenFocused,
      faceMissingMs: w.faceMissingMs,
      screenUnfocusedMs: w.screenUnfocusedMs,
    });

    const focusPct = Math.round(
      (w.facePresentFrames / n) *
      (isScreenFocused ? 1 : 0.5) * 100
    );

    const payload = {
      sessionId,
      facePresent,
      faceMissingDurationMs: Math.round(w.faceMissingMs),
      headPose: avgPose,
      gazeDirection: dominantGaze,
      lookingAwayDurationMs: lookingAwayMs,
      isScreenFocused,
      screenUnfocusedDurationMs: Math.round(w.screenUnfocusedMs),
      attentionScore: attScore,
      focusPercentage: focusPct,
      distractionEvents: [...w.distractionEvents],
      browserTelemetry: {
        cursorMoveCount: w.cursorMoveCount,
        clickCount: w.clickCount,
        keyPressCount: w.keyPressCount,
        scrollCount: w.scrollCount,
        tabSwitchCount: w.tabSwitchCount,
        windowBlurCount: w.windowBlurCount,
        cursorLeaveCount: w.cursorLeaveCount,
        windowBlurDurationMs: w.windowBlurDurationMs,
        isIdle,
      }
    };

    // Reset window
    windowRef.current = resetWindow();

    try {
      await attention.saveSnapshot(payload);
    } catch (err) {
      // Non-fatal — don't break the UI
      console.warn('[AttentionTracker] snapshot save failed:', err.message);
    }
  }, [sessionId, isActive]);

  // ── Browser Interaction Tracking ─────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !sessionId) return;

    const onPointerMove = () => {
      const now = Date.now();
      const w = windowRef.current;
      w.lastInteractionAt = now;
      if (now - w.lastPointerSampleAt > POINTER_SAMPLE_MS) {
        w.cursorMoveCount++;
        w.lastPointerSampleAt = now;
      }
      w.lastPointerMoveAt = now;
    };
    
    const onClick = () => {
      const w = windowRef.current;
      w.lastInteractionAt = Date.now();
      w.clickCount++;
    };
    
    const onKeydown = () => {
      const w = windowRef.current;
      w.lastInteractionAt = Date.now();
      w.keyPressCount++;
    };
    
    const onScroll = () => {
      const w = windowRef.current;
      w.lastInteractionAt = Date.now();
      w.scrollCount++;
    };
    
    const onMouseLeave = (e) => {
      const w = windowRef.current;
      if (!e.relatedTarget && !e.toElement) {
        w.cursorLeaveCount++;
        w.distractionEvents.add('cursor_left');
      }
    };
    
    const onWindowBlur = () => {
      const w = windowRef.current;
      w.windowBlurCount++;
      w.lastWindowBlurAt = Date.now();
      w.distractionEvents.add('window_blur');
    };
    
    const onWindowFocus = () => {
      const w = windowRef.current;
      if (w.lastWindowBlurAt) {
        w.windowBlurDurationMs += Date.now() - w.lastWindowBlurAt;
        w.lastWindowBlurAt = null;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('click', onClick, { passive: true });
    window.addEventListener('keydown', onKeydown, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeydown);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [enabled, sessionId]);

  // ── Start/stop based on enabled + sessionId ──────────────────────────────
  useEffect(() => {
    if (enabled && sessionId) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [enabled, sessionId]); // eslint-disable-line

  // ── Snapshot interval (runs only while active) ───────────────────────────
  useEffect(() => {
    if (isActive && sessionId) {
      snapshotTimerRef.current = setInterval(flushSnapshot, SNAPSHOT_INTERVAL_MS);
    } else {
      if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current);
    }
    return () => {
      if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current);
    };
  }, [isActive, sessionId, flushSnapshot]);

  return {
    // Refs to mount in component
    videoRef,
    canvasRef,
    // State
    isActive,
    permError,
    mpLoaded,
    metrics,
    // Controls
    startCamera,
    stopCamera,
  };
}

// ── Score computation ─────────────────────────────────────────────────────────
function computeAttentionScore({ facePresent, headPose, gaze, isScreenFocused, faceMissingMs = 0, screenUnfocusedMs = 0 }) {
  if (!facePresent) return 0;
  if (!isScreenFocused) return 5;

  let score = 100;

  // Head pose penalty
  const yawPenalty   = Math.min(40, Math.abs(headPose?.yaw   || 0) * 1.2);
  const pitchPenalty = Math.min(30, Math.abs(headPose?.pitch || 0) * 1.0);
  score -= yawPenalty + pitchPenalty;

  // Gaze penalty
  if (gaze === 'away')                score -= 30;
  else if (gaze !== 'center')         score -= 15;

  // Duration penalties within the window
  const faceMissRatio = Math.min(1, faceMissingMs   / SNAPSHOT_INTERVAL_MS);
  const tabBlurRatio  = Math.min(1, screenUnfocusedMs / SNAPSHOT_INTERVAL_MS);
  score -= faceMissRatio  * 20;
  score -= tabBlurRatio   * 15;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// ── Canvas overlay drawing ────────────────────────────────────────────────────
function drawOverlay(results, canvas, video) {
  if (!canvas || !video) return;
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!results.multiFaceLandmarks?.length) return;

  const landmarks = results.multiFaceLandmarks[0];
  ctx.fillStyle = 'rgba(99,102,241,0.6)';
  for (const pt of landmarks) {
    ctx.beginPath();
    ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 1.2, 0, 2 * Math.PI);
    ctx.fill();
  }
}
