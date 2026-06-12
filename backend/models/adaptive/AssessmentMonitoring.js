/**
 * AssessmentMonitoring
 * ====================
 * Stores all security violations and proctoring events
 * for a single test attempt (StudyTestAttempt).
 *
 * Tracks:
 *   - fullscreen exits
 *   - tab switches
 *   - window blur events
 *   - copy/paste attempts
 *   - right-click attempts
 *   - visibility changes
 *
 * Warning thresholds:
 *   ≥ 1  violation  → warn
 *   ≥ 3  violations → suspicious
 *   ≥ 6  violations → disqualified
 */

const mongoose = require('mongoose');

const violationEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'fullscreen_exit',
        'tab_switch',
        'window_blur',
        'visibility_change',
        'copy_paste',
        'right_click',
        // Legacy values kept for backward-compat
        'face_lost',
        'multiple_faces',
        'audio_excessive',
      ],
      required: [true, 'Violation type is required'],
    },
    timestamp:    { type: Date, default: Date.now, required: true },
    severity:     { type: String, enum: ['low', 'medium', 'high'], required: true },
    screenshotUrl:{ type: String, trim: true },
    detail:       { type: String, trim: true, default: '' }, // e.g. key combo for copy-paste
  },
  { _id: false }
);

const assessmentMonitoringSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyTestAttempt',
      required: [true, 'Attempt ID is required'],
      unique: true,
    },
    // Legacy field kept for backward compat (quizAttempts)
    quizAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizAttempt',
      default: null,
    },

    // ── Counters (denormalised for fast queries) ───────────────────────────
    fullscreenExitCount:   { type: Number, default: 0, min: 0 },
    tabSwitchCount:        { type: Number, default: 0, min: 0 },
    windowBlurCount:       { type: Number, default: 0, min: 0 },
    visibilityChangeCount: { type: Number, default: 0, min: 0 },
    copyPasteCount:        { type: Number, default: 0, min: 0 },
    rightClickCount:       { type: Number, default: 0, min: 0 },
    // Legacy
    unfocusedSeconds:      { type: Number, default: 0, min: 0 },

    // ── Timeline ───────────────────────────────────────────────────────────
    violations: { type: [violationEventSchema], default: [] },

    // ── Derived status ─────────────────────────────────────────────────────
    proctorStatus: {
      type: String,
      enum: ['clean', 'warned', 'suspicious', 'disqualified'],
      default: 'clean',
    },
    warningCount:  { type: Number, default: 0, min: 0 },

    // ── Timing ─────────────────────────────────────────────────────────────
    startedAt:    { type: Date, default: Date.now },
    submittedAt:  { type: Date },

    // ── Review (teacher-side) ──────────────────────────────────────────────
    reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNotes:  { type: String, trim: true },
  },
  { timestamps: true }
);

// ── Thresholds helper (also used server-side) ─────────────────────────────────
assessmentMonitoringSchema.methods.computeStatus = function () {
  const total = this.violations.length;
  if (total >= 6) return 'disqualified';
  if (total >= 3) return 'suspicious';
  if (total >= 1) return 'warned';
  return 'clean';
};

assessmentMonitoringSchema.index({ userId: 1, proctorStatus: 1 });
assessmentMonitoringSchema.index({ attemptId: 1 });

module.exports = mongoose.model('AssessmentMonitoring', assessmentMonitoringSchema);
