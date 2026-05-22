const express = require('express');
const router = express.Router();
const { submitQuiz, getQuizAnswers, saveQuizMarks, getQuizHistory, getAllQuizMarks } = require('../controllers/quizController');
const auth = require('../middleware/auth');

// Protected routes (require authentication)
router.post('/submit', auth, submitQuiz);
router.get('/answers', auth, getQuizAnswers);
router.post('/save-marks', auth, saveQuizMarks);
router.get('/history', auth, getQuizHistory);
router.get('/marks', auth, getAllQuizMarks); // Leaderboard endpoint

module.exports = router; 