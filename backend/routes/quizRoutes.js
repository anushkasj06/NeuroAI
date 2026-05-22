const express = require('express');
const router = express.Router();
const {
  submitQuiz,
  getQuizAnswers,
  saveQuizMarks,
  getQuizHistory,
  getAllQuizMarks,
} = require('../controllers/quizController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);
router.use(restrictTo('student'));

// Submit quiz answers
router.post('/submit', submitQuiz);

// Get user's quiz answers
router.get('/answers', getQuizAnswers);

// Save quiz marks
router.post('/save-marks', saveQuizMarks);

// Get quiz history
router.get('/history', getQuizHistory);

// Get quiz marks leaderboard
router.get('/marks', getAllQuizMarks);

module.exports = router; 
