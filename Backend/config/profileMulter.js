const path = require('path');
const multer = require('multer');
const fs = require('fs');

const PROFILE_DIR = path.join(__dirname, '..', 'uploads', 'profiles');
if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PROFILE_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${ext}`);
  }
});

const profileUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB profile photo limit
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

module.exports = profileUpload;
