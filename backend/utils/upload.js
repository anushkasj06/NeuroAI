const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadRoot = path.join(__dirname, '..', 'uploads');

const safeName = (value) =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 60);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadRoot, { recursive: true });
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const base = safeName(path.parse(file.originalname).name) || 'asset';
    const ext = path.extname(file.originalname).toLowerCase();
    const stamp = Date.now();
    cb(null, `${base}-${stamp}${ext}`);
  },
});

const allowedMimes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    return cb(null, true);
  }
  if (allowedMimes.has(file.mimetype)) {
    return cb(null, true);
  }
  return cb(new Error('Unsupported file type'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

module.exports = upload;
