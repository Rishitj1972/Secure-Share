const fs = require('fs');
const path = require('path');
const UploadSession = require('../models/UploadSession');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const CHUNKS_DIR = path.join(__dirname, '..', 'uploads', 'chunks');

/**
 * Clean up orphaned chunk directories (incomplete uploads older than 24 hours)
 */
const cleanupOrphanedChunks = async () => {
  try {
    console.log('Starting orphaned chunks cleanup...');

    if (!fs.existsSync(CHUNKS_DIR)) {
      console.log('Chunks directory does not exist');
      return;
    }

    const uploadIds = fs.readdirSync(CHUNKS_DIR);
    let cleanedCount = 0;
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    for (const uploadId of uploadIds) {
      const uploadPath = path.join(CHUNKS_DIR, uploadId);
      const stat = fs.statSync(uploadPath);

      // Check if upload is older than 24 hours
      if (now - stat.mtimeMs > ONE_DAY_MS) {
        // Check database for upload session
        const session = await UploadSession.findOne({ uploadId });

        // Delete if session not found or is failed/cancelled
        if (!session || session.status === 'failed' || session.status === 'cancelled') {
          try {
            fs.rmSync(uploadPath, { recursive: true, force: true });
            cleanedCount++;
            console.log(`Cleaned up orphaned upload: ${uploadId}`);
          } catch (err) {
            console.error(`Error cleaning up ${uploadId}:`, err.message);
          }
        }
      }
    }

    console.log(`Cleanup completed. Removed ${cleanedCount} orphaned chunk directories.`);
  } catch (err) {
    console.error('Error during cleanup:', err);
  }
};

/**
 * Clean up incomplete temporary upload files in the main uploads folder
 */
const cleanupTempUploadFiles = () => {
  try {
    console.log('Cleaning up temporary upload files...');

    if (!fs.existsSync(UPLOAD_DIR)) {
      console.log('Upload directory does not exist');
      return;
    }

    const files = fs.readdirSync(UPLOAD_DIR);
    let cleanedCount = 0;
    const now = Date.now();
    const ONE_HOUR_MS = 60 * 60 * 1000;

    for (const file of files) {
      // Skip chunks folder
      if (file === 'chunks') continue;

      const filePath = path.join(UPLOAD_DIR, file);
      const stat = fs.statSync(filePath);

      // Delete temporary files older than 1 hour (incomplete uploads)
      if (now - stat.mtimeMs > ONE_HOUR_MS && stat.isFile()) {
        try {
          fs.unlinkSync(filePath);
          cleanedCount++;
          console.log(`Cleaned up temp file: ${file}`);
        } catch (err) {
          console.error(`Error cleaning up ${file}:`, err.message);
        }
      }
    }

    console.log(`Temp file cleanup completed. Removed ${cleanedCount} temporary files.`);
  } catch (err) {
    console.error('Error during temp file cleanup:', err);
  }
};

/**
 * Run all cleanup operations
 */
const runCleanup = async () => {
  console.log('\n=== Starting File Cleanup Service ===\n');
  cleanupTempUploadFiles();
  await cleanupOrphanedChunks();
  console.log('\n=== File Cleanup Service Complete ===\n');
};

module.exports = {
  cleanupOrphanedChunks,
  cleanupTempUploadFiles,
  runCleanup
};
