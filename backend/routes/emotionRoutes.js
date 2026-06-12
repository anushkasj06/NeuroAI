const express = require('express');
const router = express.Router();
const emotionController = require('../controllers/emotionController');
const { protect } = require('../middleware/auth');

router.post('/', protect, emotionController.logEmotion);

module.exports = router;
