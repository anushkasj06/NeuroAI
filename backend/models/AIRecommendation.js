const mongoose = require('mongoose');

const aiRecommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studyPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyPlan',
    },

    type: {
      type: String,
      enum: [
        'difficulty_adjustment',
        'schedule_change',
        'topic_focus',
        'revision_alert',
        'motivation',
        'study_tip',
        'break_suggestion',
        'streak_encouragement',
      ],
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },
    actionLabel: { type: String },
    actionRoute: { type: String },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Context that triggered this recommendation
    triggerContext: { type: mongoose.Schema.Types.Mixed },

    // User interaction
    seen: { type: Boolean, default: false },
    seenAt: { type: Date },
    dismissed: { type: Boolean, default: false },
    acted: { type: Boolean, default: false },

    expiresAt: { type: Date },
  },
  { timestamps: true }
);

aiRecommendationSchema.index({ userId: 1, seen: 1, dismissed: 1 });

module.exports = mongoose.model('AIRecommendation', aiRecommendationSchema);
