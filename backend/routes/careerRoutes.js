const express = require('express');
const path = require('path');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const careerController = require('../controllers/careerController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `resume-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Only PDF/DOC/DOCX files allowed'));
  },
});

router.post('/resume/upload', protect, upload.single('resume'), careerController.uploadResume);
router.get('/resume', protect, careerController.getResumeData);
router.get('/resume/view', careerController.viewResume);  // token via query param
router.delete('/resume', protect, careerController.deleteResume);
router.post('/recommend', protect, careerController.recommend);
router.post('/simulate', protect, careerController.simulate);
router.post('/skill-gap', protect, careerController.skillGap);
router.post('/role-chat', protect, careerController.roleChat);
router.get('/market-trends', protect, careerController.marketTrends);
router.get('/live-jobs', protect, careerController.liveJobs);
router.post('/linkedin/scrape', protect, careerController.scrapeLinkedIn);
router.get('/linkedin', protect, careerController.getLinkedInData);
router.delete('/linkedin', protect, careerController.clearLinkedInData);
router.get('/explore', protect, careerController.exploreCareer);
router.get('/explore/:careerId/pathways', protect, careerController.getCareerPathways);

module.exports = router;
