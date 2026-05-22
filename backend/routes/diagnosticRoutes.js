const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  validateOnboarding,
  validateModalitySubmission,
} = require('../middleware/validateDiagnostic');
const diagnosticController = require('../controllers/diagnosticController');

router.get('/config', diagnosticController.getConfig);
router.get('/subjects/:level', diagnosticController.getSubjectsForLevel);

router.use(protect);

router.get('/status', diagnosticController.getStatus);
router.get('/profile', diagnosticController.getProfile);
router.post('/onboarding', validateOnboarding, diagnosticController.submitOnboarding);
router.get('/assessment-content', diagnosticController.getAssessmentContent);
router.post('/assessment/text', validateModalitySubmission, diagnosticController.submitTextAssessment);
router.post('/assessment/audio', validateModalitySubmission, diagnosticController.submitAudioAssessment);
router.post('/assessment/video', validateModalitySubmission, diagnosticController.submitVideoAssessment);
router.post('/assessment/interactive', validateModalitySubmission, diagnosticController.submitInteractiveAssessment);
router.post('/analyze', diagnosticController.analyzeAndGenerateReport);
router.get('/report', diagnosticController.getReport);

module.exports = router;
