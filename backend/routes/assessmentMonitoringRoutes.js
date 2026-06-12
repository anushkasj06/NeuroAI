/**
 * Assessment Monitoring routes — all JWT-protected.
 *
 * POST  /api/assessment-monitor/start              — create monitoring session
 * POST  /api/assessment-monitor/violation          — log single violation
 * POST  /api/assessment-monitor/batch              — log multiple violations
 * GET   /api/assessment-monitor/history            — user's history
 * GET   /api/assessment-monitor/:attemptId         — get record for attempt
 * PATCH /api/assessment-monitor/:attemptId/finish  — mark submitted
 */
'use strict';

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/assessmentMonitoringController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post  ('/start',                    ctrl.startSession);
router.post  ('/violation',                ctrl.logViolation);
router.post  ('/batch',                    ctrl.logBatch);
router.get   ('/history',                  ctrl.getHistory);
router.get   ('/:attemptId',               ctrl.getRecord);
router.patch ('/:attemptId/finish',        ctrl.finishSession);

module.exports = router;
