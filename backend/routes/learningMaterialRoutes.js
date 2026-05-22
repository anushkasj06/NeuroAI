const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/learningMaterialController');

router.use(protect);

// Static routes MUST come before dynamic /:topicId to avoid shadowing
router.post('/generate',          ctrl.generateMaterial);
router.post('/revision/generate', ctrl.generateRevision);
router.get('/list',               ctrl.listMaterials);

// Dynamic route last
router.get('/:topicId',           ctrl.getMaterial);

module.exports = router;
