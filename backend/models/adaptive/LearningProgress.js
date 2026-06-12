const mongoose = require('mongoose');

const masteryMilestoneSchema = new mongoose.Schema({
  date: { 
    type: Date, 
    default: Date.now,
    required: true
  },
  masteryPercent: { 
    type: Number, 
    required: [true, 'Mastery percentage is required'],
    min: 0,
    max: 100
  },
  sourceActivity: { 
    type: String,
    required: [true, 'Source activity label is required'],
    trim: true
  }
}, { _id: false });

const learningProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  subjectSlug: { 
    type: String, 
    required: [true, 'Subject slug is required'],
    trim: true 
  },
  topic: { 
    type: String, 
    required: [true, 'Topic name is required'],
    trim: true 
  },
  currentMastery: { 
    type: Number, 
    min: 0, 
    max: 100, 
    default: 0 
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'needs_revision'],
    default: 'not_started'
  },
  masteryHistory: [masteryMilestoneSchema],
  totalStudySeconds: { 
    type: Number, 
    default: 0,
    min: 0
  },
  lastActiveAt: { 
    type: Date, 
    default: Date.now,
    required: true
  }
}, { timestamps: true });

// Prevent duplicate mastery progress mappings
learningProgressSchema.index({ userId: 1, subjectSlug: 1, topic: 1 }, { unique: true });
// Optimize active progress filtering
learningProgressSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('LearningProgress', learningProgressSchema);
