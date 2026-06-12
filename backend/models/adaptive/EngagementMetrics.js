/**
 * EngagementMetrics — one document per learning session.
 *
 * Composite engagement score formula:
 *   score = (attentionComponent * 0.40)
 *         + (presenceComponent  * 0.30)
 *         + (emotionStability   * 0.20)
 *         + (interactionRate    * 0.10)
 *
 * All component fields and the final score are stored so downstream
 * queries can filter/sort by any individual dimension.
 */
const mongoose = require('mongoose');

// ── Sub-schema: per-interaction-event log ────────────────────────────────────
const interactionEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: [
        'answer_submitted',
        'question_generated',
        'session_started',
        'session_completed',
        'block_viewed',
        'hint_used',
        'confidence_rated',
        'revision_triggered',
        'plan_modified',
      ],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

// ── Sub-schema: emotion stability breakdown ───────────────────────────────────
const emotionBreakdownSchema = new mongoose.Schema(
  {
    happy:      { type: Number, default: 0, min: 0, max: 1 },
    neutral:    { type: Number, default: 0, min: 0, max: 1 },
    confused:   { type: Number, default: 0, min: 0, max: 1 },
    frustrated: { type: Number, default: 0, min: 0, max: 1 },
    sad:        { type: Number, default: 0, min: 0, max: 1 },
    engaged:    { type: Number, default: 0, min: 0, max: 1 },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────
const engagementMetricsSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningSession',
      required: [true, 'Session ID is required'],
    },

    // ── Session context ───────────────────────────────────────────────────
    subject:       { type: String, trim: true, default: '' },
    subjectSlug:   { type: String, trim: true, default: '' },
    topic:         { type: String, trim: true, default: '' },
    sessionStatus: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
    },

    // ── Timing ────────────────────────────────────────────────────────────
    date:              { type: Date, required: true, default: Date.now },
    sessionDurationMs: { type: Number, default: 0, min: 0 },  // total wall-clock ms

    // ── Input signal counts (raw) ─────────────────────────────────────────
    attentionSnapshotCount: { type: Number, default: 0, min: 0 },
    emotionLogCount:        { type: Number, default: 0, min: 0 },
    interactionEventCount:  { type: Number, default: 0, min: 0 },

    // ── Component scores (0–100, pre-normalised) ──────────────────────────
    //  40% — average attention score from AttentionSnapshot docs
    attentionComponent: { type: Number, min: 0, max: 100, default: 0 },

    //  30% — face presence rate × screen focus rate from AttentionSnapshot
    presenceComponent: { type: Number, min: 0, max: 100, default: 0 },

    //  20% — emotion stability: penalise frustration/confusion, reward engaged/happy
    emotionStabilityComponent: { type: Number, min: 0, max: 100, default: 0 },

    //  10% — interaction rate: events per minute of session
    interactionComponent: { type: Number, min: 0, max: 100, default: 0 },

    // ── Composite score ───────────────────────────────────────────────────
    engagementScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      required: true,
    },

    // ── Grade label derived from score ────────────────────────────────────
    engagementGrade: {
      type: String,
      enum: ['excellent', 'good', 'moderate', 'low', 'critical'],
      default: 'moderate',
    },

    // ── Attention detail ──────────────────────────────────────────────────
    avgAttentionScore:    { type: Number, default: 0, min: 0, max: 100 },
    avgFocusPercentage:   { type: Number, default: 0, min: 0, max: 100 },
    facePresenceRate:     { type: Number, default: 0, min: 0, max: 100 },
    screenFocusRate:      { type: Number, default: 0, min: 0, max: 100 },
    totalFaceMissingMs:   { type: Number, default: 0, min: 0 },
    totalLookingAwayMs:   { type: Number, default: 0, min: 0 },
    distractionCount:     { type: Number, default: 0, min: 0 },

    // ── Emotion detail ────────────────────────────────────────────────────
    dominantEmotion: {
      type: String,
      enum: ['happy', 'neutral', 'confused', 'frustrated', 'sad', 'engaged', 'unknown'],
      default: 'unknown',
    },
    emotionDistribution: { type: emotionBreakdownSchema, default: () => ({}) },

    // ── Interaction events log ────────────────────────────────────────────
    interactionEvents: { type: [interactionEventSchema], default: [] },
    activeInteractionMinutes: { type: Number, default: 0, min: 0 },

    // ── Browser Telemetry ─────────────────────────────────────────────────
    browserTelemetry: {
      cursorMoves: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      keyPresses: { type: Number, default: 0 },
      scrolls: { type: Number, default: 0 },
      tabSwitches: { type: Number, default: 0 },
      windowBlurs: { type: Number, default: 0 },
      cursorLeaves: { type: Number, default: 0 },
      windowBlurDurationMs: { type: Number, default: 0 },
      idleRate: { type: Number, default: 0, min: 0, max: 100 },
    },

    // ── Focus index (legacy compat field — kept, derived from presence×attention) ──
    focusIndex: { type: Number, min: 0, max: 100, default: 0 },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
engagementMetricsSchema.index({ userId: 1, date: -1 });
engagementMetricsSchema.index({ userId: 1, subjectSlug: 1, date: -1 });
engagementMetricsSchema.index({ sessionId: 1 }, { unique: true, sparse: true });
// TTL — purge raw engagement docs after 90 days
engagementMetricsSchema.index({ date: 1 }, { expireAfterSeconds: 7_776_000 });

module.exports = mongoose.model('EngagementMetrics', engagementMetricsSchema);
