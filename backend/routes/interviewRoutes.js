/**
 * Interview Routes
 * ================
 * All routes are protected except the Vapi webhook.
 */

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/interviewController');

// ── Public routes (no auth) ───────────────────────────────────────────────────
// Vapi webhook — must be reachable without JWT
router.post('/webhook', ctrl.vapiWebhook);

// ── Protected routes ──────────────────────────────────────────────────────────
router.use(protect);

router.post('/schedule',        ctrl.scheduleInterview);
router.get('/',                 ctrl.getUserInterviews);
router.get('/analytics',        ctrl.getAnalytics);
router.get('/:id',              ctrl.getInterview);
router.post('/:id/prepare',     ctrl.prepareInterview);
router.post('/:id/start',       ctrl.startInterview);
router.post('/:id/transcript',  ctrl.appendTranscript);
router.post('/:id/end',         ctrl.endInterview);
router.get('/:id/analysis',     ctrl.getAnalysis);
router.get('/:id/report',       ctrl.getReport);
router.delete('/:id',           ctrl.deleteInterview);

module.exports = router;
