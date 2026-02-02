const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/validateTokenHandler');
const upload = require('../config/multer');
const { sendFile, getInbox, getConversation, downloadFile, deleteFile, getFileMetadata, verifyFile } = require('../controllers/fileController');
const { 
  initChunkedUpload, 
  uploadChunk, 
  getUploadStatus, 
  completeChunkedUpload, 
  cancelChunkedUpload,
  cleanupAbandonedUploads 
} = require('../controllers/chunkedUploadController');

// Simple file upload (existing)
router.post('/send', validateToken, upload.single('file'), sendFile);
router.get('/inbox', validateToken, getInbox);
router.get('/with/:id', validateToken, getConversation);
router.get('/meta/:id', validateToken, getFileMetadata);
router.get('/download/:id', validateToken, downloadFile);
router.get('/verify/:id', validateToken, verifyFile);
router.delete('/:id', validateToken, deleteFile);

// Chunked upload routes
router.post('/chunked/init', validateToken, initChunkedUpload);
router.post('/chunked/upload-chunk', validateToken, upload.single('chunk'), uploadChunk);
router.get('/chunked/status/:uploadId', validateToken, getUploadStatus);
router.post('/chunked/complete', validateToken, completeChunkedUpload);
router.delete('/chunked/:uploadId', validateToken, cancelChunkedUpload);
router.delete('/chunked/cleanup/all', validateToken, cleanupAbandonedUploads); // Manual cleanup endpoint

module.exports = router;

