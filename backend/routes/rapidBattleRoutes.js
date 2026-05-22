const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  generateRapidQuiz,
  submitRapidBattleAttempt,
  getRapidLeaderboard,
  getMyRapidBattleHistory,
} = require('../controllers/rapidBattleController');

router.post('/generate', protect, generateRapidQuiz);
router.post('/attempts', protect, submitRapidBattleAttempt);
router.get('/leaderboard', protect, getRapidLeaderboard);
router.get('/history', protect, getMyRapidBattleHistory);

module.exports = router;
