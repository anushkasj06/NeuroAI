const mongoose = require('mongoose');
const { EDUCATION_LEVELS } = require('../constants/educationSubjects');

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 5, max: 30 },
    educationLevel: {
      type: String,
      required: true,
      enum: EDUCATION_LEVELS,
    },
    targetPercentage: { type: Number, required: true, min: 0, max: 100 },
    currentCgpaOrPercentage: { type: Number, required: true, min: 0, max: 100 },
    studyHoursPerDay: { type: Number, required: true, min: 0.5, max: 16 },
    sleepHours: { type: Number, required: true, min: 0, max: 14 },
    screenTimeHours: { type: Number, required: true, min: 0, max: 24 },
    examDeadline: { type: Date, required: true },
    onboardingCompletedAt: { type: Date, default: Date.now },
    diagnosticStatus: {
      type: String,
      enum: ['onboarding_complete', 'assessment_in_progress', 'assessment_complete', 'analyzing', 'completed'],
      default: 'onboarding_complete',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
