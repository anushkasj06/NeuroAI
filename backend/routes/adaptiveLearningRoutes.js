/**
 * Adaptive Learning Engine routes — all JWT-protected.
 *
 * POST  /api/adaptive/evaluate                       — run full evaluation pipeline
 * GET   /api/adaptive/topic/:subjectSlug/:topic      — latest record for one topic
 * GET   /api/adaptive/history                        — user history (?subjectSlug&limit)
 * GET   /api/adaptive/dashboard                      — latest record per active topic
 * PATCH /api/adaptive/:recordId/apply                — mark recommendation applied
 * PATCH /api/adaptive/:recordId/dismiss              — dismiss recommendation
 */
'use strict';

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/adaptiveLearningController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post  ('/evaluate',                        ctrl.evaluate);
router.get   ('/topic/:subjectSlug/:topic',        ctrl.getTopicRecord);
router.get   ('/history',                          ctrl.getUserHistory);
router.get   ('/dashboard',                        ctrl.getDashboard);
router.patch ('/:recordId/apply',                  ctrl.applyRecord);
router.patch ('/:recordId/dismiss',                ctrl.dismissRecord);

module.exports = router;
