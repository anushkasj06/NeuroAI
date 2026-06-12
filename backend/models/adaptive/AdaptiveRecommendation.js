const mongoose = require('mongoose');

const adaptiveRecommendationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  triggerSource: {
    type: String,
    enum: {
      values: ['low_quiz_score', 'high_frustration', 'streak_alert', 'exam_deadline'],
      message: 'Trigger source must be low_quiz_score, high_frustration, streak_alert, or exam_deadline'
    },
    required: [true, 'Trigger source is required']
  },
  recommendationType: {
    type: String,
    enum: {
      values: ['difficulty_adjustment', 'revision_insertion', 'motivation', 'break_suggestion'],
      message: 'Recommendation type must be difficulty_adjustment, revision_insertion, motivation, or break_suggestion'
    },
    required: [true, 'Recommendation type is required']
  },
  payload: {
    title: { 
      type: String, 
      required: [true, 'Recommendation title is required'],
      trim: true 
    },
    description: { 
      type: String, 
      required: [true, 'Recommendation description is required'],
      trim: true 
    },
    actionRoute: { type: String, trim: true },
    actionText: { type: String, trim: true }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'dismissed', 'applied'],
    default: 'unread',
    required: true
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiry timestamp is required']
  }
}, { timestamps: true });

// Optimize feed fetch queries
adaptiveRecommendationSchema.index({ userId: 1, status: 1, expiresAt: 1 });

// Time-To-Live index to auto-delete documents when the current time crosses `expiresAt`
adaptiveRecommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AdaptiveRecommendation', adaptiveRecommendationSchema);
