const mongoose = require('mongoose');

const rapidBattleAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    mode: {
      type: String,
      enum: ['solo', 'friend'],
      default: 'solo',
      required: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    questionCount: {
      type: Number,
      required: true,
      min: 1,
      max: 30,
    },
    correctAnswers: {
      type: Number,
      required: true,
      min: 0,
    },
    unanswered: {
      type: Number,
      default: 0,
      min: 0,
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    challengeCode: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

rapidBattleAttemptSchema.index({ topic: 1, mode: 1 });
rapidBattleAttemptSchema.index({ correctAnswers: -1, accuracy: -1, timeSpentSeconds: 1 });

module.exports = mongoose.model('RapidBattleAttempt', rapidBattleAttemptSchema);
