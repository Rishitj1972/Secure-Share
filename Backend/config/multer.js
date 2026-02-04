const path = require('path');
const multer = require('multer');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { 
    fileSize: 200 * 1024 * 1024, // 200MB per chunk (supports up to 100MB dynamic chunks + overhead)
    files: 1,
    fieldSize: 10 * 1024 * 1024 // 10MB for form fields
  },
  fileFilter: (req, file, cb) => {
    // Only accept allowed file types (optional security layer)
    // For now, allow all - can be restricted if needed
    if (file && file.originalname) {
      // Prevent path traversal attacks
      const filename = file.originalname.replace(/\.\./g, '').replace(/[/\\]/g, '');
      if (filename !== file.originalname) {
        return cb(new Error('Invalid filename'));
      }
    }
    cb(null, true);
  }
});

module.exports = upload;

