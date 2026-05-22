const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    subjectSlug: { type: String, required: true },
    topic: { type: String, required: true },
    subtopic: { type: String, default: '' },
    durationMinutes: { type: Number, required: true },
    sessionType: {
      type: String,
      enum: ['learn', 'revise', 'practice', 'quiz', 'rest'],
      default: 'learn',
    },
    difficultyLevel: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    skipped: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { _id: true }
);

const dailyPlanSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    dayLabel: { type: String }, // "Monday", "Day 1", etc.
    totalMinutes: { type: Number, default: 0 },
    sessions: [studySessionSchema],
    completed: { type: Boolean, default: false },
    completionPercent: { type: Number, default: 0 },
    motivationalNote: { type: String, default: '' },
  },
  { _id: false }
);

const weeklyPlanSchema = new mongoose.Schema(
  {
    weekNumber: { type: Number, required: true },
    weekLabel: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    focusSubjects: [String],
    weeklyGoal: { type: String },
    totalHours: { type: Number, default: 0 },
    days: [dailyPlanSchema],
    completionPercent: { type: Number, default: 0 },
  },
  { _id: false }
);

const monthlyMilestoneSchema = new mongoose.Schema(
  {
    month: { type: Number, required: true },
    monthLabel: { type: String },
    goals: [String],
    targetScores: { type: Map, of: Number },
    revisionTopics: [String],
    completionPercent: { type: Number, default: 0 },
  },
  { _id: false }
);

const studyPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
    },
    learningStyleReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningStyleReport',
    },

    // Plan metadata
    planName: { type: String, default: 'My Study Plan' },
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'archived'],
      default: 'active',
    },
    generatedByAI: { type: Boolean, default: true },

    // Student context at generation time
    learningStyle: { type: String },
    targetScore: { type: Number },
    currentScore: { type: Number },
    availableHoursPerDay: { type: Number },
    examDeadline: { type: Date },
    examName: { type: String },

    // Selected subjects & topics
    selectedSubjects: [
      {
        subjectSlug: String,
        subjectName: String,
        currentMarks: Number,
        targetMarks: Number,
        priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
        selectedTopics: [String],
      },
    ],

    // Generated plans
    dailyPlan: [dailyPlanSchema],
    weeklyPlan: [weeklyPlanSchema],
    monthlyRoadmap: [monthlyMilestoneSchema],

    // AI-generated content
    aiSummary: { type: String },
    aiRecommendations: [String],
    adaptationHistory: [
      {
        date: { type: Date, default: Date.now },
        reason: String,
        change: String,
      },
    ],

    // Analytics
    totalPlannedHours: { type: Number, default: 0 },
    totalCompletedHours: { type: Number, default: 0 },
    overallCompletionPercent: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastStudiedAt: { type: Date },

    rawAiResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

studyPlanSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
