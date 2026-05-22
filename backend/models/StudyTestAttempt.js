const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    question: String,
    selectedAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean,
    confidenceBefore: { type: Number, min: 1, max: 5, default: 3 },
    pointsAwarded: { type: Number, default: 0 },
    explanation: String,
  },
  { _id: false }
);

const studyTestAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studyPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyPlan' },
    sourceMaterialId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningMaterial' },
    subject: { type: String, required: true },
    subjectSlug: { type: String, required: true },
    topic: { type: String, required: true },
    subtopic: { type: String, default: '' },
    learningStyle: String,
    personalityMode: String,
    difficultyLevel: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    test: { type: mongoose.Schema.Types.Mixed, required: true },
    answers: [answerSchema],
    scorePercent: { type: Number, default: 0 },
    rawScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    xpEarned: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    confidenceAverage: { type: Number, default: 0 },
    performanceBand: {
      type: String,
      enum: ['excellent', 'pass', 'revise'],
      default: 'revise',
    },
    report: {
      summary: String,
      strengths: [String],
      weakAreas: [String],
      nextActions: [String],
      planAdjustmentReason: String,
    },
  },
  { timestamps: true }
);

studyTestAttemptSchema.index({ userId: 1, subjectSlug: 1, topic: 1, createdAt: -1 });

module.exports = mongoose.model('StudyTestAttempt', studyTestAttemptSchema);
