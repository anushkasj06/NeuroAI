const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const teacherController = require('../controllers/teacherController');

const router = express.Router();

router.use(protect);
router.use(restrictTo('teacher'));

router.get('/dashboard', teacherController.getTeacherDashboard);
router.post('/resources', teacherController.createResource);

module.exports = router;
