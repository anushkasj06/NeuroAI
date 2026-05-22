const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/adaptiveTeacherController');

router.use(protect);

router.post('/sessions/start', ctrl.startTeachingSession);
router.get('/sessions/:sessionId', ctrl.getTeachingSession);
router.post('/sessions/:sessionId/question', ctrl.generateNextQuestion);
router.post('/sessions/:sessionId/complete', ctrl.completeTeachingSession);
router.post('/questions/:questionId/answer', ctrl.submitAnswer);
router.get('/analytics', ctrl.getLearningAnalytics);
router.get('/revision-center', ctrl.getRevisionCenter);

module.exports = router;
