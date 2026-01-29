const express = require('express');
const router = express.Router();
const validateToken = require('../middleware/validateTokenHandler');
const upload = require('../config/multer');
const { sendFile, getInbox, getConversation, downloadFile, deleteFile } = require('../controllers/fileController');

router.post('/send', validateToken, upload.single('file'), sendFile);
router.get('/inbox', validateToken, getInbox);
router.get('/with/:id', validateToken, getConversation);
router.get('/download/:id', validateToken, downloadFile);
router.delete('/:id', validateToken, deleteFile);

module.exports = router;
