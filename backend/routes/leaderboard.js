const express = require('express');
const router = express.Router();
const { saveQuizScore, getLeaderboard } = require('../controllers/leaderboardController');
const auth = require('../middleware/auth');

// Protected routes (require authentication)
router.post('/save-score', auth, saveQuizScore);
router.get('/', auth, getLeaderboard);

module.exports = router; 