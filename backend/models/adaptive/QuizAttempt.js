const mongoose = require('mongoose');

const quizItemAnswerSchema = new mongoose.Schema({
  questionId: { 
    type: String, 
    required: [true, 'Question ID is required'] 
  },
  selectedOption: { 
    type: String 
  },
  isCorrect: { 
    type: Boolean, 
    required: [true, 'Correctness flag is required'] 
  },
  responseTimeMs: { 
    type: Number, 
    required: [true, 'Response time is required'], 
    min: 0 
  },
  confidenceLevel: { 
    type: Number, 
    min: 1, 
    max: 5 
  }
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningSession'
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
  difficultyLevel: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: [true, 'Difficulty level is required']
  },
  answers: [quizItemAnswerSchema],
  score: { 
    type: Number, 
    min: 0, 
    max: 100, 
    required: [true, 'Quiz score is required'] 
  },
  passingScore: { 
    type: Number, 
    default: 75 
  },
  passed: { 
    type: Boolean, 
    required: true 
  },
  xpEarned: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  attemptedAt: { 
    type: Date, 
    default: Date.now,
    required: true
  }
}, { timestamps: true });

// Compound indexes for optimization
quizAttemptSchema.index({ userId: 1, subjectSlug: 1, topic: 1 });
quizAttemptSchema.index({ sessionId: 1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
