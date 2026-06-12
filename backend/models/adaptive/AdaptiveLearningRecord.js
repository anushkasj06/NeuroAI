/**
 * AdaptiveLearningRecord
 * ======================
 * One document per topic-session evaluation produced by the
 * Adaptive Learning Engine.  Stores all six input signals,
 * the three computed scores, the decision case, and the full
 * recommendation object — ready to be consumed by the frontend
 * or re-evaluated on demand.
 *
 * Relationship to existing models:
 *   userId        → User
 *   sessionId     → LearningSession   (may be null if computed from history)
 *   subjectSlug   → matches TopicProgress / ConceptMastery indexes
 */

'use strict';

const mongoose = require('mongoose');

// ── Input signals sub-doc ─────────────────────────────────────────────────────
const inputSignalsSchema = new mongoose.Schema(
  {
    quizMarks:        { type: Number, min: 0, max: 100, default: 0 },   // latest quiz score 0-100
    emotionScore:     { type: Number, min: 0, max: 100, default: 50 },  // from EmotionLog aggregation
    attentionScore:   { type: Number, min: 0, max: 100, default: 50 },  // from AttentionSnapshot aggregation
    engagementScore:  { type: Number, min: 0, max: 100, default: 50 },  // from EngagementMetrics
    completionRate:   { type: Number, min: 0, max: 100, default: 0 },   // % of plan sessions completed
    learningSpeed:    { type: Number, min: 0, max: 100, default: 50 },  // derived from response-time trend
  },
  { _id: false }
);

// ── Computed scores sub-doc ───────────────────────────────────────────────────
const computedScoresSchema = new mongoose.Schema(
  {
    readinessScore:  { type: Number, min: 0, max: 100, default: 0, required: true },
    confidenceScore: { type: Number, min: 0, max: 100, default: 0, required: true },
    confusionScore:  { type: Number, min: 0, max: 100, default: 0, required: true },
  },
  { _id: false }
);

// ── Recommendation object sub-doc ─────────────────────────────────────────────
const recommendationSchema = new mongoose.Schema(
  {
    // One of the 4 decision cases
    decisionCase: {
      type: String,
      enum: ['advance_topic', 'more_practice', 'simpler_explanation', 'change_format'],
      required: true,
    },
    // Human-readable title and message
    title:   { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // Actionable specifics
    actionType: {
      type: String,
      enum: [
        'next_topic',
        'practice_quiz',
        'reteach_session',
        'mode_switch',
        'revision',
        'break',
        'reduce_difficulty',
        'change_learning_format',
      ],
      required: true,
    },
    actionRoute:  { type: String, default: '' },   // frontend route e.g. /ai-teacher?subject=...
    actionLabel:  { type: String, default: '' },   // button text

    // Suggested teaching parameters
    suggestedDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    suggestedMode: {
      type: String,
      enum: ['visual', 'audio', 'reading', 'interactive', 'mixed'],
      default: 'mixed',
    },
    suggestedNextTopic: { type: String, default: '' },

    // Priority for surfacing in the UI
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Reasoning for transparency
    reasoning: { type: String, default: '' },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────
const adaptiveLearningRecordSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',            required: true },
    sessionId:    { type: mongoose.Schema.Types.ObjectId, ref: 'LearningSession', default: null },
    subjectSlug:  { type: String, trim: true, required: true },
    subject:      { type: String, trim: true, default: '' },
    topic:        { type: String, trim: true, required: true },
    subtopic:     { type: String, trim: true, default: '' },

    // Evaluation context
    evaluatedAt:  { type: Date, default: Date.now },
    triggerEvent: {
      type: String,
      enum: [
        'session_completed',
        'quiz_submitted',
        'manual_request',
        'plan_check',
        'periodic_review',
      ],
      default: 'manual_request',
    },

    // Input signals (raw values used for computation)
    inputs: { type: inputSignalsSchema, default: () => ({}) },

    // Computed scores (0–100)
    scores: { type: computedScoresSchema, required: true },

    // Decision case label (mirrors recommendation.decisionCase for fast querying)
    decisionCase: {
      type: String,
      enum: ['advance_topic', 'more_practice', 'simpler_explanation', 'change_format'],
      required: true,
    },

    // Full recommendation object
    recommendation: { type: recommendationSchema, required: true },

    // Lifecycle
    status: {
      type: String,
      enum: ['active', 'applied', 'dismissed', 'expired'],
      default: 'active',
    },
    appliedAt:   { type: Date },
    dismissedAt: { type: Date },

    // Expiry — auto-purge via TTL
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
adaptiveLearningRecordSchema.index({ userId: 1, subjectSlug: 1, topic: 1, evaluatedAt: -1 });
adaptiveLearningRecordSchema.index({ userId: 1, status: 1, evaluatedAt: -1 });
adaptiveLearningRecordSchema.index({ sessionId: 1 }, { sparse: true });
// TTL auto-delete
adaptiveLearningRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AdaptiveLearningRecord', adaptiveLearningRecordSchema);
