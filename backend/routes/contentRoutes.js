const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const contentController = require('../controllers/contentController');
const upload = require('../utils/upload');

const router = express.Router();

router.use(protect);

router.get('/student', restrictTo('student'), contentController.getStudentContent);
router.get('/student/:id/concept-map', restrictTo('student'), contentController.getStudentConceptMap);
router.get('/teacher/students', restrictTo('teacher'), contentController.getTeacherStudents);
router.get('/teacher', restrictTo('teacher'), contentController.getTeacherContent);
router.post('/teacher', restrictTo('teacher'), contentController.createContent);
router.put('/teacher/:id', restrictTo('teacher'), contentController.updateContent);
router.post('/teacher/:id/publish', restrictTo('teacher'), contentController.publishContent);
router.post('/teacher/:id/draft', restrictTo('teacher'), contentController.unpublishContent);
router.delete('/teacher/:id', restrictTo('teacher'), contentController.deleteContent);
router.post(
  '/teacher/uploads',
  restrictTo('teacher'),
  upload.single('file'),
  contentController.uploadAsset
);

module.exports = router;
