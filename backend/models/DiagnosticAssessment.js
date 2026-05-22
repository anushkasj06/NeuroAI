const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: String,
    questionType: { type: String, enum: ['mcq', 'short', 'match'] },
    selectedAnswer: String,
    isCorrect: Boolean,
    responseTimeMs: Number,
  },
  { _id: false }
);

const modalityResultSchema = new mongoose.Schema(
  {
    completed: { type: Boolean, default: false },
    startedAt: Date,
    completedAt: Date,
    readingOrWatchTimeSeconds: { type: Number, default: 0 },
    listeningDurationSeconds: { type: Number, default: 0 },
    replayCount: { type: Number, default: 0 },
    pauseCount: { type: Number, default: 0 },
    skipCount: { type: Number, default: 0 },
    interactionCount: { type: Number, default: 0 },
    answers: [answerSchema],
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    accuracyPercent: { type: Number, default: 0 },
    avgResponseTimeMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const diagnosticAssessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
    },
    textMode: { type: modalityResultSchema, default: () => ({}) },
    audioMode: { type: modalityResultSchema, default: () => ({}) },
    videoMode: { type: modalityResultSchema, default: () => ({}) },
    interactiveMode: { type: modalityResultSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('DiagnosticAssessment', diagnosticAssessmentSchema);
