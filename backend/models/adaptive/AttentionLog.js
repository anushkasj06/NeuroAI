const mongoose = require('mongoose');

const attentionLogSchema = new mongoose.Schema({
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
  isTabActive: {
    type: Boolean,
    default: true,
    required: true
  },
  gazeRegion: {
    type: String,
    enum: {
      values: ['screen', 'away', 'keyboard'],
      message: 'Gaze region must be screen, away, or keyboard'
    },
    required: true
  },
  distractionEvents: [{
    type: String,
    enum: ['tab_switched', 'idle', 'face_lost', 'multiple_faces']
  }],
  calibrationConfidence: {
    type: Number,
    min: [0, 'Calibration confidence must be at least 0%'],
    max: [100, 'Calibration confidence cannot exceed 100%']
  }
});

// Indexes for query performance
attentionLogSchema.index({ sessionId: 1, timestamp: 1 });
attentionLogSchema.index({ userId: 1, timestamp: -1 });

// Automatically prune entries older than 30 days
attentionLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('AttentionLog', attentionLogSchema);
