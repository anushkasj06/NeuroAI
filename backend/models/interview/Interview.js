/**
 * Interview Model
 * Stores the scheduled interview configuration and lifecycle state.
 */

const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ── Basic Info ─────────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Interview title is required'],
      trim: true,
      maxlength: 120,
    },
    interviewType: {
      type: String,
      enum: ['technical', 'behavioral', 'hr', 'mixed'],
      required: true,
    },
    topics: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => v.length >= 1,
        message: 'At least one topic is required',
      },
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      required: true,
    },
    durationMinutes: {
      type: Number,
      enum: [15, 30, 45, 60],
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },

    // ── Vapi Integration ───────────────────────────────────────────────────────
    vapiCallId: {
      type: String,
      default: null,
      index: true,
    },
    vapiAssistantId: {
      type: String,
      default: null,
    },

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['scheduled', 'ready', 'in_progress', 'completed', 'analysing', 'analysed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },

    startedAt:   { type: Date, default: null },
    endedAt:     { type: Date, default: null },
    actualDurationSeconds: { type: Number, default: 0 },

    // ── Question Bank ──────────────────────────────────────────────────────────
    generatedQuestions: {
      type: mongoose.Schema.Types.Mixed, // Array of question objects
      default: [],
    },
    questionsGeneratedAt: { type: Date, default: null },

    // ── Transcript ─────────────────────────────────────────────────────────────
    transcript: {
      type: [
        {
          role:      { type: String, enum: ['ai', 'user'] },
          message:   { type: String },
          timestamp: { type: Date },
        },
      ],
      default: [],
    },

    // ── Real-time Metrics (collected during interview) ─────────────────────────
    metrics: {
      pauseCount:        { type: Number, default: 0 },
      totalPauseDurationMs: { type: Number, default: 0 },
      totalWordCount:    { type: Number, default: 0 },
      avgResponseSeconds: { type: Number, default: 0 },
      confidenceScore:   { type: Number, default: 0 },   // 0-100
    },

    // ── Analysis Result ────────────────────────────────────────────────────────
    analysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    analysedAt: { type: Date, default: null },

    // ── Report ─────────────────────────────────────────────────────────────────
    report: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // ── Notes ─────────────────────────────────────────────────────────────────
    candidateNotes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

// Compound index for user + status queries
interviewSchema.index({ userId: 1, status: 1, scheduledAt: -1 });

module.exports = mongoose.model('Interview', interviewSchema);
