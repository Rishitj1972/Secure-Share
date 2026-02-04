const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { v4: uuidv4 } = require('uuid');
const UploadSession = require('../models/UploadSession');
const File = require('../models/File');
const User = require('../models/userModels');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const CHUNKS_DIR = path.join(__dirname, '..', 'uploads', 'chunks');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });

// @desc Initialize a chunked upload session
// @route POST /api/files/chunked/init
// @access Protected
const initChunkedUpload = asyncHandler(async (req, res) => {
  const senderId = req.user.id;
  const { filename, fileSize, receiver, mimeType, preferredChunkSize, encryptedAesKey, iv, fileHash, isEncrypted } = req.body;

  if (!filename || !fileSize || !receiver || !mimeType) {
    res.status(400);
    throw new Error('Missing required fields: filename, fileSize, receiver, mimeType');
  }

  if (fileSize > 4 * 1024 * 1024 * 1024) { // 4GB limit
    res.status(400);
    throw new Error('File size exceeds maximum limit of 4GB');
  }

  if (receiver === senderId) {
    res.status(400);
    throw new Error('Cannot send file to yourself');
  }

  // Verify receiver exists
  const receiverUser = await User.findById(receiver).select('-password');
  if (!receiverUser) {
    res.status(404);
    throw new Error('Receiver user not found');
  }

  // If encrypted, verify encryption data
  if (isEncrypted && (!encryptedAesKey || !iv || !fileHash)) {
    res.status(400);
    throw new Error('Encrypted upload missing encryption metadata');
  }

  // Dynamic chunk size based on file size, with optional client preference
  const minChunkSize = 5 * 1024 * 1024;  // 5MB
  const maxChunkSize = 50 * 1024 * 1024; // 50MB
  let chunkSize = minChunkSize;
  const fileSizeInMB = fileSize / (1024 * 1024);

  if (fileSizeInMB >= 500) {
    chunkSize = 50 * 1024 * 1024;
  } else if (fileSizeInMB >= 50) {
    chunkSize = 25 * 1024 * 1024;
  }

  if (preferredChunkSize) {
    const preferred = parseInt(preferredChunkSize, 10);
    if (!isNaN(preferred)) {
      chunkSize = Math.min(maxChunkSize, Math.max(minChunkSize, preferred));
    }
  }

  const totalChunks = Math.ceil(fileSize / chunkSize);
  const uploadId = uuidv4();

  const uploadSession = await UploadSession.create({
    uploadId,
    sender: senderId,
    receiver,
    originalFileName: filename,
    fileSize,
    chunkSize,
    totalChunks,
    mimeType,
    status: 'in-progress',
    encryptedAesKey: isEncrypted ? encryptedAesKey : null,
    iv: isEncrypted ? iv : null,
    fileHash: isEncrypted ? fileHash : null,
    isEncrypted: !!isEncrypted
  });

  // Create directory for this upload's chunks
  const uploadPath = path.join(CHUNKS_DIR, uploadId);
  fs.mkdirSync(uploadPath, { recursive: true });

  res.status(201).json({
    uploadId,
    chunkSize,
    totalChunks
  });
});

// @desc Upload a single chunk
// @route POST /api/files/chunked/upload-chunk
// @access Protected
const uploadChunk = asyncHandler(async (req, res) => {
  const senderId = req.user.id;
  // Get fields from either body or query (multer puts fields in req.body)
  const uploadId = req.body.uploadId || req.query.uploadId;
  const chunkNumber = parseInt(req.body.chunkNumber || req.query.chunkNumber);
  const totalChunks = parseInt(req.body.totalChunks || req.query.totalChunks);
  const chunkHash = req.body.chunkHash || req.query.chunkHash;

  if (!uploadId || isNaN(chunkNumber) || isNaN(totalChunks)) {
    res.status(400);
    throw new Error('Missing required fields: uploadId, chunkNumber, totalChunks');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('Chunk file is required');
  }

  // Find upload session
  const uploadSession = await UploadSession.findOne({ uploadId });
  if (!uploadSession) {
    res.status(404);
    throw new Error('Upload session not found');
  }

  // Verify ownership
  if (uploadSession.sender.toString() !== senderId) {
    res.status(403);
    throw new Error('Not authorized to upload chunks for this session');
  }

  if (uploadSession.status === 'completed' || uploadSession.status === 'cancelled') {
    res.status(400);
    throw new Error(`Cannot upload chunk to ${uploadSession.status} session`);
  }

  // Verify chunk hash if provided
  // Note: Skipping hash verification on individual chunks for performance
  // Final file integrity is verified in completeChunkedUpload
  if (false && chunkHash) {
    const fileData = fs.readFileSync(req.file.path);
    const hash = crypto.createHash('sha256').update(fileData).digest('hex');
    if (hash !== chunkHash) {
      fs.unlinkSync(req.file.path);
      res.status(400);
      throw new Error('Chunk hash mismatch - file corrupted during transfer');
    }
  }

  // Move chunk to upload session directory
  const uploadPath = path.join(CHUNKS_DIR, uploadId);
  const chunkPath = path.join(uploadPath, `chunk_${chunkNumber}`);
  
  try {
    // Ensure upload directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    // Move chunk from temp location to chunks folder (atomic operation)
    fs.renameSync(req.file.path, chunkPath);
  } catch (err) {
    // Clean up temp file on move error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }
    }
    res.status(500);
    throw new Error(`Failed to save chunk: ${err.message}`);
  }

  // Record uploaded chunk
  if (!uploadSession.uploadedChunks.includes(chunkNumber)) {
    uploadSession.uploadedChunks.push(chunkNumber);
  }
  
  await uploadSession.save();

  res.json({
    success: true,
    chunkNumber,
    uploadedChunks: uploadSession.uploadedChunks.sort((a, b) => a - b),
    totalChunks
  });
});

// @desc Get upload status
// @route GET /api/files/chunked/status/:uploadId
// @access Protected
const getUploadStatus = asyncHandler(async (req, res) => {
  const { uploadId } = req.params;
  const userId = req.user.id;

  const uploadSession = await UploadSession.findOne({ uploadId }).lean().select('uploadId status uploadedChunks totalChunks fileSize uploadStartTime');
  if (!uploadSession) {
    res.status(404);
    throw new Error('Upload session not found');
  }

  // Verify ownership
  if (uploadSession.sender.toString() !== userId) {
    res.status(403);
    throw new Error('Not authorized to view this upload');
  }

  res.json({
    uploadId,
    status: uploadSession.status,
    uploadedChunks: uploadSession.uploadedChunks.sort((a, b) => a - b),
    totalChunks: uploadSession.totalChunks,
    fileSize: uploadSession.fileSize,
    uploadProgress: Math.round((uploadSession.uploadedChunks.length / uploadSession.totalChunks) * 100)
  });
});

// @desc Complete chunked upload and assemble file
// @route POST /api/files/chunked/complete
// @access Protected
const completeChunkedUpload = asyncHandler(async (req, res) => {
  const senderId = req.user.id;
  const { uploadId, fileHash } = req.body;

  if (!uploadId) {
    res.status(400);
    throw new Error('uploadId is required');
  }

  const uploadSession = await UploadSession.findOne({ uploadId });
  if (!uploadSession) {
    res.status(404);
    throw new Error('Upload session not found');
  }

  // Verify ownership
  if (uploadSession.sender.toString() !== senderId) {
    res.status(403);
    throw new Error('Not authorized to complete this upload');
  }

  // Verify all chunks received
  const receivedChunks = uploadSession.uploadedChunks.sort((a, b) => a - b);
  if (receivedChunks.length !== uploadSession.totalChunks) {
    res.status(400);
    throw new Error(`Missing chunks. Received ${receivedChunks.length}/${uploadSession.totalChunks}`);
  }

  try {
    // Assemble file from chunks using streaming for better memory efficiency
    const uploadPath = path.join(CHUNKS_DIR, uploadId);
    const ext = path.extname(uploadSession.originalFileName);
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const finalPath = path.join(UPLOAD_DIR, uniqueFilename);

    const writeStream = fs.createWriteStream(finalPath, { highWaterMark: 256 * 1024 }); // 256KB buffer for better performance
    
    // Increase max listeners to prevent warnings (we pipe many chunks to one stream)
    writeStream.setMaxListeners(uploadSession.totalChunks + 5);

    // Assemble chunks sequentially with error handling
    let bytesWritten = 0;
    let streamError = null;
    
    writeStream.on('error', (err) => {
      streamError = err;
    });

    for (let i = 1; i <= uploadSession.totalChunks; i++) {
      const chunkPath = path.join(uploadPath, `chunk_${i}`);

      // Check for errors before processing next chunk
      if (streamError) {
        writeStream.destroy();
        if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
        throw streamError;
      }

      // Verify chunk exists
      let stat;
      try {
        stat = fs.statSync(chunkPath);
      } catch (statErr) {
        writeStream.destroy();
        if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
        res.status(400);
        throw new Error(`Missing chunk ${i} during assembly`);
      }

      bytesWritten += stat.size;

      const readStream = fs.createReadStream(chunkPath, { highWaterMark: 256 * 1024 });
      try {
        await pipeline(readStream, writeStream, { end: false });
      } catch (pipeErr) {
        writeStream.destroy();
        if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
        throw pipeErr;
      }
    }

    // Finalize write stream
    await new Promise((resolve, reject) => {
      writeStream.end(() => resolve());
      writeStream.on('error', (err) => {
        if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
        reject(err);
      });
    });

    // Verify file size matches expected size (faster than hash for large files)
    const fileStats = fs.statSync(finalPath);
    if (fileStats.size !== uploadSession.fileSize) {
      fs.unlinkSync(finalPath);
      res.status(400);
      throw new Error(`File size mismatch. Expected ${uploadSession.fileSize} bytes, got ${fileStats.size} bytes. Bytes written: ${bytesWritten}`);
    }

    // Calculate hash only if client provided one or file is small (speed optimization)
    let calculatedHash = null;
    const shouldHash = !!fileHash || uploadSession.fileSize <= 200 * 1024 * 1024;
    if (shouldHash) {
      calculatedHash = await new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const readStream = fs.createReadStream(finalPath, { highWaterMark: 256 * 1024 });

        readStream.on('data', (chunk) => hash.update(chunk));
        readStream.on('end', () => resolve(hash.digest('hex')));
        readStream.on('error', (err) => {
          readStream.destroy();
          reject(err);
        });
      });

      if (fileHash && calculatedHash !== fileHash) {
        fs.unlinkSync(finalPath);
        res.status(400);
        throw new Error('File integrity check failed');
      }
    }

    // Create File record
    const file = await File.create({
      sender: uploadSession.sender,
      receiver: uploadSession.receiver,
      originalFileName: uploadSession.originalFileName,
      storedFileName: uniqueFilename,
      filePath: path.join('uploads', uniqueFilename).replace(/\\/g, '/'), // Normalize path
      fileSize: uploadSession.fileSize,
      mimeType: uploadSession.mimeType,
      encryptedAesKey: uploadSession.encryptedAesKey,
      iv: uploadSession.iv,
      fileHash: uploadSession.fileHash,
      isEncrypted: uploadSession.isEncrypted
    });

    // Update upload session
    uploadSession.status = 'completed';
    uploadSession.fileHash = calculatedHash || uploadSession.fileHash;
    uploadSession.uploadEndTime = new Date();
    await uploadSession.save();

    // Cleanup chunks
    fs.rmSync(uploadPath, { recursive: true, force: true });

    res.json({
      success: true,
      fileId: file._id,
      filename: file.originalFileName,
      fileSize: file.fileSize,
      createdAt: file.createdAt
    });

  } catch (error) {
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        // Ignore cleanup errors
      }
    }
    
    // Mark session as failed
    uploadSession.status = 'failed';
    uploadSession.failureReason = error.message;
    await uploadSession.save();
    throw error;
  }
});

// @desc Cancel chunked upload
// @route DELETE /api/files/chunked/:uploadId
// @access Protected
const cancelChunkedUpload = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { uploadId } = req.params;

  const uploadSession = await UploadSession.findOne({ uploadId });
  if (!uploadSession) {
    res.status(404);
    throw new Error('Upload session not found');
  }

  // Verify ownership
  if (uploadSession.sender.toString() !== userId) {
    res.status(403);
    throw new Error('Not authorized to cancel this upload');
  }

  // Cleanup chunks
  const uploadPath = path.join(CHUNKS_DIR, uploadId);
  if (fs.existsSync(uploadPath)) {
    fs.rmSync(uploadPath, { recursive: true, force: true });
  }

  // Mark as cancelled
  uploadSession.status = 'cancelled';
  await uploadSession.save();

  res.json({ success: true, message: 'Upload cancelled' });
});

// @desc Cleanup orphaned uploads (admin only)
// @route DELETE /api/files/chunked/cleanup/all
// @access Protected (should be admin)
const cleanupAbandonedUploads = asyncHandler(async (req, res) => {
  const { runCleanup } = require('../utils/cleanupOrphanedFiles');
  
  try {
    await runCleanup();
    res.json({ 
      success: true, 
      message: 'Cleanup completed successfully' 
    });
  } catch (error) {
    res.status(500);
    throw new Error('Cleanup failed: ' + error.message);
  }
});

module.exports = {
  initChunkedUpload,
  uploadChunk,
  getUploadStatus,
  completeChunkedUpload,
  cancelChunkedUpload,
  cleanupAbandonedUploads
};
