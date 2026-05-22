const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/studyPlanController');

router.use(protect);

router.post('/generate', ctrl.generatePlan);
router.get('/active', ctrl.getActivePlan);
router.get('/all', ctrl.getAllPlans);
router.post('/session/complete', ctrl.completeSession);
router.get('/analytics/dashboard', ctrl.getDashboardAnalytics);
router.post('/recommendations/generate', ctrl.generateRecommendations);
router.patch('/recommendations/:id/dismiss', ctrl.dismissRecommendation);
router.post('/progress/update', ctrl.updateTopicProgress);
router.get('/progress', ctrl.getTopicProgress);

module.exports = router;
