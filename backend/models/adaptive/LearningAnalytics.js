const mongoose = require('mongoose');

const learningAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  timeFrame: {
    type: String,
    enum: {
      values: ['daily', 'weekly', 'monthly'],
      message: 'Timeframe must be daily, weekly, or monthly'
    },
    required: [true, 'Timeframe is required']
  },
  startDate: { 
    type: Date, 
    required: [true, 'Start date is required'] 
  },
  endDate: { 
    type: Date, 
    required: [true, 'End date is required'] 
  },
  efficiencyScore: { 
    type: Number, 
    min: 0, 
    max: 100, 
    required: [true, 'Efficiency score is required'] 
  },
  completionRate: { 
    type: Number, 
    min: 0, 
    max: 100, 
    required: [true, 'Completion rate is required'] 
  },
  averageFocusTimeMinutes: { 
    type: Number, 
    required: [true, 'Average focus time is required'],
    min: 0 
  },
  preferredModalityEfficiency: {
    visual: { type: Number, default: 0, min: 0, max: 100 },
    audio: { type: Number, default: 0, min: 0, max: 100 },
    reading: { type: Number, default: 0, min: 0, max: 100 },
    interactive: { type: Number, default: 0, min: 0, max: 100 }
  },
  highestFrustrationTopics: [{
    type: String,
    trim: true
  }]
}, { timestamps: true });

// Optimize feed fetch queries
learningAnalyticsSchema.index({ userId: 1, timeFrame: 1, startDate: -1 });

module.exports = mongoose.model('LearningAnalytics', learningAnalyticsSchema);
