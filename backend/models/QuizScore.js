const mongoose = require('mongoose');

const quizScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true,
    enum: ['ads', 'ds', 'am', 'java', 'dbms']
  },
  totalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('QuizScore', quizScoreSchema); 