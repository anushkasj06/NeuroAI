const mongoose = require('mongoose');

/**
 * AttentionSnapshot — stores one 10-second attention sample per session.
 * Tracks head pose, eye gaze, face presence, and screen focus derived
 * from MediaPipe Face Mesh landmarks computed in the browser.
 */
const attentionSnapshotSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningSession',
    required: [true, 'Learning Session ID is required'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },

  // ── Face presence ────────────────────────────────────────────────────────
  facePresent: { type: Boolean, default: false, required: true },
  faceMissingDurationMs: { type: Number, default: 0, min: 0 },

  // ── Head pose (degrees) ──────────────────────────────────────────────────
  headPose: {
    yaw: { type: Number, default: 0 },   // left/right rotation
    pitch: { type: Number, default: 0 }, // up/down tilt
    roll: { type: Number, default: 0 },  // head tilt
  },

  // ── Eye gaze ─────────────────────────────────────────────────────────────
  gazeDirection: {
    type: String,
    enum: ['center', 'left', 'right', 'up', 'down', 'away'],
    default: 'center',
  },
  lookingAwayDurationMs: { type: Number, default: 0, min: 0 },

  // ── Screen focus (tab visibility API) ────────────────────────────────────
  isScreenFocused: { type: Boolean, default: true },
  screenUnfocusedDurationMs: { type: Number, default: 0, min: 0 },

  // ── Derived scores (0–100) ────────────────────────────────────────────────
  attentionScore: { type: Number, min: 0, max: 100, default: 0, required: true },
  focusPercentage: { type: Number, min: 0, max: 100, default: 0, required: true },

  // ── Distraction events in this window ────────────────────────────────────
  distractionEvents: [
    {
      type: String,
      enum: ['face_missing', 'looking_away', 'tab_switch', 'head_turned', 'window_blur', 'cursor_left'],
    },
  ],

  // ── Browser Interaction Telemetry ───────────────────────────────────────────
  browserTelemetry: {
    cursorMoveCount: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    keyPressCount: { type: Number, default: 0 },
    scrollCount: { type: Number, default: 0 },
    tabSwitchCount: { type: Number, default: 0 },
    windowBlurCount: { type: Number, default: 0 },
    cursorLeaveCount: { type: Number, default: 0 },
    windowBlurDurationMs: { type: Number, default: 0 },
    isIdle: { type: Boolean, default: false },
  },
});

// Query indexes
attentionSnapshotSchema.index({ sessionId: 1, timestamp: 1 });
attentionSnapshotSchema.index({ userId: 1, timestamp: -1 });

// Auto-purge after 30 days (matches EmotionLog & AttentionLog TTL)
attentionSnapshotSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('AttentionSnapshot', attentionSnapshotSchema);
