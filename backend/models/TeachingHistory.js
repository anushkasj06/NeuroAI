const mongoose = require('mongoose');

const teachingHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    learningSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningSession' },
    subject: { type: String, required: true },
    subjectSlug: { type: String, required: true },
    topic: { type: String, required: true },
    eventType: {
      type: String,
      enum: ['session_started', 'content_generated', 'question_generated', 'answer_analyzed', 'mode_changed', 'plan_modified', 'session_completed'],
      required: true,
    },
    teachingMode: { type: String, default: 'mixed' },
    difficultyLevel: { type: String, default: 'medium' },
    summary: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

teachingHistorySchema.index({ userId: 1, subjectSlug: 1, topic: 1, createdAt: -1 });

module.exports = mongoose.model('TeachingHistory', teachingHistorySchema);
