const mongoose = require('mongoose');

const adaptiveQuestionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    learningSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningSession', required: true },
    subject: { type: String, required: true },
    subjectSlug: { type: String, required: true },
    topic: { type: String, required: true },
    subtopic: { type: String, default: '' },
    conceptTag: { type: String, default: '' },
    questionNumber: { type: Number, required: true },
    type: {
      type: String,
      enum: ['mcq', 'short_answer', 'code', 'scenario', 'true_false'],
      default: 'mcq',
    },
    difficultyLevel: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    prompt: { type: String, required: true },
    options: [String],
    correctAnswer: { type: String, default: '' },
    idealAnswer: { type: String, default: '' },
    hint: { type: String, default: '' },
    teacherPurpose: { type: String, default: '' },
    expectedTimeSeconds: { type: Number, default: 90 },
    generatedFrom: {
      previousAnswerQuality: { type: String, default: 'not_available' },
      previousConfidence: { type: Number, default: 3 },
      previousResponseTimeSeconds: { type: Number, default: 0 },
      weakConcepts: [String],
    },
    answered: { type: Boolean, default: false },
    rawAiResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

adaptiveQuestionSchema.index({ learningSessionId: 1, questionNumber: 1 }, { unique: true });

module.exports = mongoose.model('AdaptiveQuestion', adaptiveQuestionSchema);
