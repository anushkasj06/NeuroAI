const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  generateRapidQuiz,
  submitRapidBattleAttempt,
  getRapidLeaderboard,
  getMyRapidBattleHistory,
} = require('../controllers/rapidBattleController');

router.use(protect);
router.use(restrictTo('student'));

router.post('/generate', generateRapidQuiz);
router.post('/attempts', submitRapidBattleAttempt);
router.get('/leaderboard', getRapidLeaderboard);
router.get('/history', getMyRapidBattleHistory);

module.exports = router;
