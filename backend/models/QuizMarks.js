const mongoose = require('mongoose');

const quizMarksSchema = new mongoose.Schema({
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
  marks: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  correctAnswers: {
    type: Number,
    required: true
  },
  answers: [{
    question: String,
    selectedAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean
  }],
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const QuizMarks = mongoose.model('QuizMarks', quizMarksSchema);

module.exports = QuizMarks; 