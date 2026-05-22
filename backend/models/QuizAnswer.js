const mongoose = require('mongoose');

const quizAnswerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentCGPA: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  education: {
    type: String,
    required: true,
    enum: ['btech1', 'btech2', 'btech3', 'btech4']
  },
  subjects: {
    ads: {
      marks: { type: Number, min: 0, max: 100 },
      attendance: { type: Number, min: 0, max: 100 },
      interest: { type: Number, min: 1, max: 10 },
      assignments: { type: Number, min: 0, max: 100 },
      quizzes: { type: Number, min: 0, max: 100 },
      participation: { type: Number, min: 0, max: 100 }
    },
    ds: {
      marks: { type: Number, min: 0, max: 100 },
      attendance: { type: Number, min: 0, max: 100 },
      interest: { type: Number, min: 1, max: 10 },
      assignments: { type: Number, min: 0, max: 100 },
      quizzes: { type: Number, min: 0, max: 100 },
      participation: { type: Number, min: 0, max: 100 }
    },
    am: {
      marks: { type: Number, min: 0, max: 100 },
      attendance: { type: Number, min: 0, max: 100 },
      interest: { type: Number, min: 1, max: 10 },
      assignments: { type: Number, min: 0, max: 100 },
      quizzes: { type: Number, min: 0, max: 100 },
      participation: { type: Number, min: 0, max: 100 }
    },
    java: {
      marks: { type: Number, min: 0, max: 100 },
      attendance: { type: Number, min: 0, max: 100 },
      interest: { type: Number, min: 1, max: 10 },
      assignments: { type: Number, min: 0, max: 100 },
      quizzes: { type: Number, min: 0, max: 100 },
      participation: { type: Number, min: 0, max: 100 }
    },
    dbms: {
      marks: { type: Number, min: 0, max: 100 },
      attendance: { type: Number, min: 0, max: 100 },
      interest: { type: Number, min: 1, max: 10 },
      assignments: { type: Number, min: 0, max: 100 },
      quizzes: { type: Number, min: 0, max: 100 },
      participation: { type: Number, min: 0, max: 100 }
    }
  },
  achievements: {
    type: String,
    trim: true
  },
  hobbies: {
    type: String,
    trim: true
  },
  studyStyle: {
    type: String,
    required: true,
    enum: ['visual', 'auditory', 'reading', 'kinesthetic']
  },
  parentEducation: {
    type: String,
    required: true,
    enum: ['high_school', 'bachelors', 'masters', 'phd']
  },
  aim: {
    type: String,
    required: true,
    enum: ['software', 'data', 'ai', 'other']
  },
  goal: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  screenTime: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  sleepTime: {
    type: Number,
    required: true,
    min: 0,
    max: 12
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QuizAnswer', quizAnswerSchema);