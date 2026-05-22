const express = require('express');
const router = express.Router();
const { submitQuiz, getQuizAnswers } = require('../controllers/quizController');
const { protect } = require('../middleware/auth');
const { saveQuizMarks, getQuizHistory } = require('../controllers/quizController');

// Submit quiz answers
router.post('/submit', protect, submitQuiz);

// Get user's quiz answers
router.get('/answers', protect, getQuizAnswers);

// Save quiz marks
router.post('/save-marks', protect, saveQuizMarks);

// Get quiz history
router.get('/history', protect, getQuizHistory);

module.exports = router; 