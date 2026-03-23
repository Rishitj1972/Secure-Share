const path = require('path');
const multer = require('multer');
const fs = require('fs');

const GROUP_DIR = path.join(__dirname, '..', 'uploads', 'groups');
if (!fs.existsSync(GROUP_DIR)) fs.mkdirSync(GROUP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, GROUP_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${ext}`);
  }
});

const groupUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fieldSize: 2 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file && file.mimetype && !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

module.exports = groupUpload;
