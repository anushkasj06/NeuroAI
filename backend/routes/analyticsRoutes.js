/**
 * Analytics routes — all protected by JWT middleware.
 *
 * POST  /api/analytics/session/:sessionId/compute  — trigger/refresh engagement computation
 * GET   /api/analytics/session/:sessionId          — get engagement metrics for one session
 * GET   /api/analytics/user                        — user engagement summary (?days=30&subjectSlug=ads)
 * GET   /api/analytics/course/:subjectSlug         — course-level engagement (?days=30)
 * GET   /api/analytics/dashboard                   — lightweight KPI block
 */
'use strict';

const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ── Session ──────────────────────────────────────────────────────────────────
router.post('/session/:sessionId/compute', ctrl.computeSessionEngagement);
router.get('/session/:sessionId',          ctrl.getSessionAnalytics);

// ── User ─────────────────────────────────────────────────────────────────────
router.get('/user',                        ctrl.getUserAnalytics);

// ── Course ───────────────────────────────────────────────────────────────────
router.get('/course/:subjectSlug',         ctrl.getCourseAnalytics);

// ── Dashboard KPIs ────────────────────────────────────────────────────────────
router.get('/dashboard',                   ctrl.getDashboardKPIs);

module.exports = router;
