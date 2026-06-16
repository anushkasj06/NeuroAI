/**
 * ContentFormatRecommendation
 * ===========================
 * One document per format recommendation produced by the
 * Content Adaptation Engine.  Stores all four input signals,
 * the ranked format list, the primary recommendation, and the
 * reasoning — ready to be consumed by the frontend.
 *
 * Supported content formats:
 *   video | pdf | infographic | flashcards | interactive_quiz | coding_practice
 *
 * Does NOT modify any existing course data structure.
 * LearningMaterial documents are referenced by materialId only.
 */

'use strict';

const mongoose = require('mongoose');

// ── Per-format score sub-doc ──────────────────────────────────────────────────
const formatScoreSchema = new mongoose.Schema(
  {
    format: {
      type: String,
      enum: ['video', 'pdf', 'infographic', 'flashcards', 'interactive_quiz', 'coding_practice'],
      required: true,
    },
    score:       { type: Number, min: 0, max: 100, required: true },   // 0–100 fit score
    rank:        { type: Number, min: 1, required: true },              // 1 = best fit
    reasoning:   { type: String, default: '' },
    estimatedEngagementGain: { type: Number, min: -100, max: 100, default: 0 }, // predicted delta
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────
const contentFormatRecommendationSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',            required: true },
    sessionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'LearningSession', default: null },
    materialId:  { type: mongoose.Schema.Types.ObjectId, ref: 'LearningMaterial', default: null },

    // ── Topic context ─────────────────────────────────────────────────────
    subjectSlug: { type: String, trim: true, required: true },
    subject:     { type: String, trim: true, default: '' },
    topic:       { type: String, trim: true, required: true },
    subtopic:    { type: String, trim: true, default: '' },

    // ── Input signals (snapshot at recommendation time) ───────────────────
    inputs: {
      learningStyle:    { type: String, default: 'Reading/Writing Learner' },
      confusionScore:   { type: Number, min: 0, max: 100, default: 0 },
      engagementScore:  { type: Number, min: 0, max: 100, default: 50 },
      historicalSuccess: { type: Number, min: 0, max: 100, default: 50 }, // avg past quiz/mastery
    },

    // ── Engine outputs ────────────────────────────────────────────────────
    recommendedFormat: {
      type: String,
      enum: ['video', 'pdf', 'infographic', 'flashcards', 'interactive_quiz', 'coding_practice'],
      required: true,
    },
    fallbackFormat: {
      type: String,
      enum: ['video', 'pdf', 'infographic', 'flashcards', 'interactive_quiz', 'coding_practice'],
      default: 'pdf',
    },

    // Full ranked list (6 formats, rank 1–6)
    rankedFormats: { type: [formatScoreSchema], default: [] },

    // Human-readable explanation
    primaryReasoning: { type: String, default: '' },
    adaptationNote:   { type: String, default: '' },  // e.g. "High confusion → simplified visual"

    // ── Generated Content ─────────────────────────────────────────────────
    generatedContent: { type: String, default: '' },
    generatedSummary: { type: String, default: '' },

    // ── Lifecycle ─────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'applied', 'dismissed'],
      default: 'active',
    },
    appliedAt:    { type: Date },
    generatedAt:  { type: Date, default: Date.now },

    // TTL — auto-purge after 14 days
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
contentFormatRecommendationSchema.index({ userId: 1, subjectSlug: 1, topic: 1, generatedAt: -1 });
contentFormatRecommendationSchema.index({ userId: 1, status: 1, generatedAt: -1 });
contentFormatRecommendationSchema.index({ sessionId: 1 }, { sparse: true });
// TTL
contentFormatRecommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ContentFormatRecommendation', contentFormatRecommendationSchema);
