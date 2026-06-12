/**
 * Content Adaptation Engine routes — all JWT-protected.
 *
 * POST  /api/content-adapt/recommend                  — generate format recommendation
 * GET   /api/content-adapt/topic/:subjectSlug/:topic  — latest rec for one topic
 * GET   /api/content-adapt/history                    — user history (?subjectSlug&limit)
 * GET   /api/content-adapt/dashboard                  — latest rec per topic (widget)
 * GET   /api/content-adapt/stats                      — format usage stats (?days)
 * PATCH /api/content-adapt/:recordId/apply            — mark applied
 * PATCH /api/content-adapt/:recordId/dismiss          — dismiss
 */
'use strict';

const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/contentAdaptationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post  ('/recommend',                       ctrl.recommend);
router.get   ('/topic/:subjectSlug/:topic',        ctrl.getTopicRecommendation);
router.get   ('/history',                          ctrl.getHistory);
router.get   ('/dashboard',                        ctrl.getDashboard);
router.get   ('/stats',                            ctrl.getStats);
router.patch ('/:recordId/apply',                  ctrl.applyRecord);
router.patch ('/:recordId/dismiss',                ctrl.dismissRecord);

module.exports = router;
