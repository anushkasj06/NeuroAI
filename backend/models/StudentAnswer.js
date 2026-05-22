const mongoose = require('mongoose');

const studentAnswerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    learningSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningSession', required: true },
    adaptiveQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdaptiveQuestion', required: true },
    answerText: { type: String, default: '' },
    selectedOption: { type: String, default: '' },
    confidence: { type: Number, min: 1, max: 5, default: 3 },
    responseTimeSeconds: { type: Number, default: 0 },
    isCorrect: { type: Boolean, default: false },
    score: { type: Number, min: 0, max: 100, default: 0 },
    understandingLevel: {
      type: String,
      enum: ['confused', 'partial', 'solid', 'advanced'],
      default: 'partial',
    },
    feedback: { type: String, default: '' },
    misconceptionDetected: { type: String, default: '' },
    nextTeachingAction: {
      type: String,
      enum: ['reteach', 'hint', 'easier_question', 'continue', 'increase_difficulty'],
      default: 'continue',
    },
    suggestedMode: {
      type: String,
      enum: ['visual', 'audio', 'reading', 'interactive', 'mixed'],
      default: 'mixed',
    },
    rawAiResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

studentAnswerSchema.index({ learningSessionId: 1, createdAt: 1 });

module.exports = mongoose.model('StudentAnswer', studentAnswerSchema);
