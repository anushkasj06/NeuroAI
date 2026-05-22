const mongoose = require('mongoose');

const topicProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studyPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan',
    },

    subject: { type: String, required: true },
    subjectSlug: { type: String, required: true },
    topic: { type: String, required: true },
    subtopic: { type: String, default: '' },

    // Mastery tracking
    masteryPercent: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'needs_revision'],
      default: 'not_started',
    },

    // Session tracking
    totalStudyMinutes: { type: Number, default: 0 },
    sessionsCompleted: { type: Number, default: 0 },
    quizAttempts: { type: Number, default: 0 },
    lastQuizScore: { type: Number, default: 0 },
    bestQuizScore: { type: Number, default: 0 },

    // Revision
    revisionCount: { type: Number, default: 0 },
    lastRevisedAt: { type: Date },
    nextRevisionDue: { type: Date },

    // Difficulty adaptation
    currentDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    difficultyHistory: [
      {
        date: { type: Date, default: Date.now },
        from: String,
        to: String,
        reason: String,
      },
    ],

    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

topicProgressSchema.index({ userId: 1, subjectSlug: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('TopicProgress', topicProgressSchema);
