const mongoose = require('mongoose');

const emotionLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningSession',
    required: [true, 'Learning Session ID is required']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  faceDetected: {
    type: Boolean,
    default: true,
    required: true
  },
  emotions: {
    happy: { type: Number, default: 0, min: 0, max: 1 },
    neutral: { type: Number, default: 0, min: 0, max: 1 },
    confused: { type: Number, default: 0, min: 0, max: 1 },
    frustrated: { type: Number, default: 0, min: 0, max: 1 },
    sad: { type: Number, default: 0, min: 0, max: 1 },
    engaged: { type: Number, default: 0, min: 0, max: 1 }
  },
  dominantEmotion: {
    type: String,
    enum: {
      values: ['happy', 'neutral', 'confused', 'frustrated', 'sad', 'engaged'],
      message: 'Dominant emotion must be happy, neutral, confused, frustrated, sad, or engaged'
    },
    required: true
  },
  triggerContext: {
    blockId: { type: String, trim: true },
    questionId: { type: String, trim: true },
    mediaOffsetSeconds: { type: Number, min: 0 }
  }
});

// Indexes
emotionLogSchema.index({ sessionId: 1, timestamp: 1 });
emotionLogSchema.index({ userId: 1, timestamp: -1 });

// TTL index to automatically purge logs after 30 days
emotionLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('EmotionLog', emotionLogSchema);
