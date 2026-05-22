const mongoose = require('mongoose');

const progressReportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    learningSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningSession', required: true },
    studyPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyPlan' },
    subject: { type: String, required: true },
    subjectSlug: { type: String, required: true },
    topic: { type: String, required: true },
    summary: { type: String, default: '' },
    whatStudentLearned: [String],
    conceptMastery: { type: Number, min: 0, max: 100, default: 0 },
    confidenceLevel: { type: Number, min: 1, max: 5, default: 3 },
    quizAccuracy: { type: Number, min: 0, max: 100, default: 0 },
    improvementFromPrevious: { type: String, default: '' },
    strongAreas: [String],
    weakAreas: [String],
    recommendedNextSteps: [String],
    motivationFeedback: { type: String, default: '' },
    planModification: {
      required: { type: Boolean, default: false },
      reason: { type: String, default: '' },
      changes: [String],
    },
    rawAiResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

progressReportSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ProgressReport', progressReportSchema);
