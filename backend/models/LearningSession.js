const mongoose = require('mongoose');

const teachingBlockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: 'concept',
    },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    mediaType: {
      type: String,
      default: 'markdown',
    },
    diagramData: { type: mongoose.Schema.Types.Mixed },
    interactionPrompt: { type: String, default: '' },
    estimatedMinutes: { type: Number, default: 5 },
  },
  { _id: true }
);

const learningSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    studyPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyPlan' },
    subject: { type: String, required: true },
    subjectSlug: { type: String, required: true },
    topic: { type: String, required: true },
    subtopic: { type: String, default: '' },
    learningStyle: { type: String, default: 'Reading/Writing Learner' },
    activeTeachingMode: {
      type: String,
      enum: ['visual', 'audio', 'reading', 'interactive', 'mixed'],
      default: 'mixed',
    },
    difficultyLevel: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
    },
    currentStep: { type: Number, default: 0 },
    teachingFlow: [teachingBlockSchema],
    teacherPersona: { type: String, default: 'warm expert teacher' },
    masteryBefore: { type: Number, default: 0 },
    masteryAfter: { type: Number, default: 0 },
    confidenceStart: { type: Number, min: 1, max: 5, default: 3 },
    confidenceEnd: { type: Number, min: 1, max: 5, default: 3 },
    engagementScore: { type: Number, min: 0, max: 100, default: 60 },
    attentionScore: { type: Number, min: 0, max: 100, default: 60 },
    weakConcepts: [String],
    strongConcepts: [String],
    adaptationEvents: [
      {
        date: { type: Date, default: Date.now },
        trigger: String,
        change: String,
        fromMode: String,
        toMode: String,
        fromDifficulty: String,
        toDifficulty: String,
      },
    ],
    finalReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProgressReport' },
    rawAiResponse: { type: mongoose.Schema.Types.Mixed },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

learningSessionSchema.index({ userId: 1, subjectSlug: 1, topic: 1, createdAt: -1 });

module.exports = mongoose.model('LearningSession', learningSessionSchema);
