const mongoose = require('mongoose');

const subjectInsightSchema = new mongoose.Schema(
  {
    subject: String,
    strength: String,
    weakness: String,
    improvementPotential: String,
  },
  { _id: false }
);

const learningStyleReportSchema = new mongoose.Schema(
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
    diagnosticAssessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiagnosticAssessment',
      required: true,
    },
    preferredLearningStyle: {
      type: String,
      enum: ['Visual Learner', 'Audio Learner', 'Reading/Writing Learner', 'Interactive Learner'],
      required: true,
    },
    strongestLearningMode: { type: String, enum: ['text', 'audio', 'video'], required: true },
    weakestLearningMode: { type: String, enum: ['text', 'audio', 'video'], required: true },
    attentionLevel: { type: String, required: true },
    engagementScore: { type: Number, min: 0, max: 100 },
    confidenceLevel: { type: String, required: true },
    studyConsistencyAnalysis: { type: String, required: true },
    subjectStrengths: [subjectInsightSchema],
    subjectWeaknesses: [subjectInsightSchema],
    estimatedImprovementPotential: { type: String, required: true },
    recommendedStudyHours: { type: Number, required: true },
    recommendedTeachingFormat: { type: String, required: true },
    recommendedTeachingApproach: { type: String, required: true },
    likelyWeakAreas: [String],
    personalizedInsights: [String],
    motivationalFeedback: { type: String, required: true },
    attentionBehavior: { type: String, required: true },
    engagementAnalysis: { type: String, required: true },
    modalityScores: {
      text: Number,
      audio: Number,
      video: Number,
    },
    aiGeneratedSummary: { type: String },
    rawAiResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LearningStyleReport', learningStyleReportSchema);
