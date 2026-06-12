const express = require('express');
const router = express.Router();
const attentionController = require('../controllers/attentionController');
const { protect } = require('../middleware/auth');

// All attention routes require authentication
router.use(protect);

// POST  /api/attention/snapshot          — save a 10-second attention window
router.post('/snapshot', attentionController.saveSnapshot);

// GET   /api/attention/analytics          — user-level analytics (?days=7)
router.get('/analytics', attentionController.getAttentionAnalytics);

// GET   /api/attention/summary            — last-24h lightweight KPI summary
router.get('/summary', attentionController.getRecentSummary);

// GET   /api/attention/session/:sessionId — all snapshots for a session
router.get('/session/:sessionId', attentionController.getSessionAttention);

module.exports = router;
