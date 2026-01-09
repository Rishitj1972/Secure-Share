const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/validateTokenHandler');
const upload = require('../config/multer');
const { sendFile, getInbox, getConversation, downloadFile, deleteFile } = require('../controllers/fileController');

// Sender uploads a single file with form field name 'file' and body field 'receiver' (receiver id)
router.post('/send',validateToken, upload.single('file'), sendFile);

// Get files received by the current user
router.get('/inbox', validateToken, getInbox);

// Get conversation with another user (both sent and received files)
router.get('/with/:id', validateToken, getConversation);

// Download file by id (sender or receiver)
router.get('/download/:id', validateToken, downloadFile);

// Delete a file (sender or receiver)
router.delete('/:id', validateToken, deleteFile);

module.exports = router;
