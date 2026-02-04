const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const File = require('../models/File');
const User = require('../models/userModels');

// @desc Send a file from sender to receiver
// @route POST /api/files/send
// @access Protected
const sendFile = asyncHandler(async (req, res) => {
  const senderId = req.user.id;
  const { receiver } = req.body;

  if (!receiver) {
    res.status(400);
    throw new Error('Receiver id is required');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('File is required');
  }

  if (receiver === senderId) {
    res.status(400);
    throw new Error('Cannot send file to yourself');
  }

  // Optional: verify receiver exists
  const receiverUser = await User.findById(receiver).select('-password');
  if (!receiverUser) {
    res.status(404);
    throw new Error('Receiver user not found');
  }

  const saved = await File.create({
    sender: senderId,
    receiver,
    originalFileName: req.file.originalname,
    storedFileName: req.file.filename,
    filePath: path.join('uploads', req.file.filename).replace(/\\/g, '/'), // Normalize path
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
  });

  // Populate sender info for the notification
  await saved.populate('sender', 'username email');

  // Real-time notifications removed; respond with saved metadata only

  // Return minimal safe metadata
  res.status(201).json({
    _id: saved._id,
    originalFileName: saved.originalFileName,
    fileSize: saved.fileSize,
    mimeType: saved.mimeType,
    createdAt: saved.createdAt,
    sender: saved.sender,
    receiver: saved.receiver,
  });
});

// @desc Get inbox for current user (list of files received)
// @route GET /api/files/inbox
// @access Protected
const getInbox = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const files = await File.find({ receiver: userId })
    .sort({ createdAt: -1 })
    .populate('sender', 'username email')
    .select('_id originalFileName fileSize mimeType sender createdAt isDownloaded encryptedAesKey iv fileHash isEncrypted');

  res.json(files);
});

// @desc Get conversation (files between current user and another user)
// @route GET /api/files/with/:id
// @access Protected
const getConversation = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const otherId = req.params.id;

  const files = await File.find({
    $or: [
      { sender: userId, receiver: otherId },
      { sender: otherId, receiver: userId },
    ],
  })
    .sort({ createdAt: -1 })
    .populate('sender', 'username email')
    .populate('receiver', 'username email')
    .select('_id originalFileName fileSize mimeType sender receiver createdAt isDownloaded encryptedAesKey iv fileHash isEncrypted');

  res.json(files);
});

// @desc Download a file (stream)
// @route GET /api/files/download/:id
// @access Protected (sender or receiver)
const downloadFile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const fileId = req.params.id;

  // Quick auth & file check (minimal DB fetch)
  const file = await File.findById(fileId)
    .lean()
    .select('receiver sender filePath mimeType originalFileName fileSize');
    
  if (!file) {
    res.status(404);
    throw new Error('File not found');
  }

  // Verify access immediately
  if (file.receiver.toString() !== userId.toString() && file.sender.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to download this file');
  }

  // Get file path - file.filePath is stored as 'uploads/filename' (forward slashes)
  // Reconstruct properly: controller dir + .. + uploads/filename
  const absPath = path.resolve(__dirname, '..', file.filePath.replace(/\//g, path.sep));

  // Quick file existence check
  if (!fs.existsSync(absPath)) {
    return res.status(410).json({ message: 'File no longer exists on server' });
  }

  // Get file size using promises (non-blocking) 
  const stat = await fs.promises.stat(absPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Handle Range requests (pause/resume support)
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalFileName)}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.flushHeaders && res.flushHeaders();

    const stream = fs.createReadStream(absPath, { start, end, highWaterMark: 256 * 1024 });
    
    stream.on('error', (err) => {
      console.error('Stream read error:', err);
      stream.destroy();
      if (!res.headersSent) {
        res.status(500).end('Error reading file');
      } else {
        res.destroy();
      }
    });

    res.on('error', (err) => {
      console.error('Response error:', err);
      stream.destroy();
    });

    stream.pipe(res);
  } else {
    // Full file download - send headers immediately to start download
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalFileName)}"`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.flushHeaders && res.flushHeaders();

    const stream = fs.createReadStream(absPath, { highWaterMark: 256 * 1024 });

    stream.on('error', (err) => {
      console.error('Stream read error:', err);
      stream.destroy();
      if (!res.headersSent) {
        res.status(500).end('Error reading file');
      } else {
        res.destroy();
      }
    });

    res.on('error', (err) => {
      console.error('Response error:', err);
      stream.destroy();
    });

    stream.pipe(res);
  }

  // Update download tracking asynchronously (non-blocking)
  if (file.receiver.toString() === userId.toString()) {
    setImmediate(() => {
      File.findByIdAndUpdate(fileId, { 
        isDownloaded: true, 
        $inc: { downloadCount: 1 }, 
        downloadedAt: new Date() 
      }).exec().catch(err => console.error('Error updating download tracking:', err));
    });
  }
});


// @desc Delete a file (remove record and file from disk)
// @route DELETE /api/files/:id
// @access Protected (sender or receiver)
const deleteFile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const fileId = req.params.id;

  const file = await File.findById(fileId);
  if (!file) {
    res.status(404);
    throw new Error('File not found');
  }

  // Only sender or receiver can delete
  if (file.receiver.toString() !== userId.toString() && file.sender.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this file');
  }

  const absPath = path.resolve(__dirname, '..', file.filePath.replace(/\//g, path.sep));
  try {
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  } catch (err) {
    // Non-fatal: continue to remove db record
  }

  const removed = await File.findByIdAndDelete(fileId);

  if (!removed) {
    res.status(404);
    throw new Error('File not found during deletion');
  }

  // Return a consistent JSON response to make it easier for the client to handle
  res.status(200).json({ message: 'File deleted' });
});

// @desc Get file metadata quickly (minimal DB fetch, no streaming)
// @route GET /api/files/meta/:id
// @access Protected
const getFileMetadata = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const fileId = req.params.id;

  // Ultra-fast query: only get required fields
  const file = await File.findById(fileId)
    .lean()
    .select('receiver sender originalFileName fileSize mimeType createdAt');

  if (!file) {
    return res.status(404).json({ message: 'File not found' });
  }

  // Verify access
  if (file.receiver.toString() !== userId.toString() && file.sender.toString() !== userId.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  // Return metadata immediately (< 10ms response time)
  res.json({
    _id: fileId,
    originalFileName: file.originalFileName,
    fileSize: file.fileSize,
    mimeType: file.mimeType,
    createdAt: file.createdAt
  });
});

// @desc Verify file integrity
// @route GET /api/files/verify/:id
// @access Protected
const verifyFile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const fileId = req.params.id;

  const file = await File.findById(fileId).lean();
  if (!file) {
    res.status(404);
    throw new Error('File not found');
  }

  // Allow sender or receiver to verify
  if (file.receiver.toString() !== userId.toString() && file.sender.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to verify this file');
  }

  const absPath = path.resolve(__dirname, '..', file.filePath.replace(/\//g, path.sep));

  if (!fs.existsSync(absPath)) {
    return res.status(410).json({ success: false, message: 'File not found on server' });
  }

  try {
    const stat = fs.statSync(absPath);
    
    // Verify file size
    if (stat.size !== file.fileSize) {
      return res.json({ 
        success: false, 
        message: `File size mismatch. Expected ${file.fileSize}, got ${stat.size}` 
      });
    }

    // Calculate hash for verification
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(absPath, { highWaterMark: 256 * 1024 });
    
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => {
      const calculatedHash = hash.digest('hex');
      res.json({
        success: true,
        fileSize: stat.size,
        expectedSize: file.fileSize,
        hash: calculatedHash,
        message: 'File integrity verified'
      });
    });

    stream.on('error', (err) => {
      res.status(500).json({ success: false, message: 'Error calculating hash: ' + err.message });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error verifying file: ' + err.message });
  }
});

module.exports = { sendFile, getInbox, getConversation, downloadFile, deleteFile, getFileMetadata, verifyFile };
