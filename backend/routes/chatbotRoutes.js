const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/chatbotController');

router.post('/message', ctrl.sendMessage);

module.exports = router;
