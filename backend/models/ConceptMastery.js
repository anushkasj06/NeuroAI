const mongoose = require('mongoose');

const conceptMasterySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    subjectSlug: { type: String, required: true },
    topic: { type: String, required: true },
    concept: { type: String, required: true },
    masteryPercent: { type: Number, min: 0, max: 100, default: 0 },
    confidenceAverage: { type: Number, min: 1, max: 5, default: 3 },
    attempts: { type: Number, default: 0 },
    correctAttempts: { type: Number, default: 0 },
    weakSignals: [String],
    strongSignals: [String],
    lastTeachingMode: { type: String, default: 'mixed' },
    nextReviewAt: { type: Date },
  },
  { timestamps: true }
);

conceptMasterySchema.index({ userId: 1, subjectSlug: 1, topic: 1, concept: 1 }, { unique: true });

module.exports = mongoose.model('ConceptMastery', conceptMasterySchema);
