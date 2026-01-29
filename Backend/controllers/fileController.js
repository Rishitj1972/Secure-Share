const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');
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
    filePath: path.join('uploads', req.file.filename),
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
    .select('_id originalFileName fileSize mimeType sender createdAt isDownloaded');

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
    .select('_id originalFileName fileSize mimeType sender receiver createdAt isDownloaded');

  res.json(files);
});

// @desc Download a file (stream)
// @route GET /api/files/download/:id
// @access Protected (sender or receiver)
const downloadFile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const fileId = req.params.id;

  const file = await File.findById(fileId);
  if (!file) {
    res.status(404);
    throw new Error('File not found');
  }

  // Allow sender or receiver to download their file
  if (file.receiver.toString() !== userId.toString() && file.sender.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to download this file');
  }

  const absPath = path.join(__dirname, '..', file.filePath);

  if (!fs.existsSync(absPath)) {
    res.status(410);
    throw new Error('File no longer exists on server');
  }

  const stat = fs.statSync(absPath);
  res.setHeader('Content-Disposition', `attachment; filename="${file.originalFileName}"`);
  if (file.mimeType) res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', stat.size);

  const stream = fs.createReadStream(absPath);

  // Update download tracking only when receiver downloads
  if (file.receiver.toString() === userId.toString()) {
    File.findByIdAndUpdate(fileId, { isDownloaded: true, $inc: { downloadCount: 1 }, downloadedAt: new Date() }).exec();
  }

  stream.pipe(res);
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

  const absPath = path.join(__dirname, '..', file.filePath);
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

module.exports = { sendFile, getInbox, getConversation, downloadFile, deleteFile };
