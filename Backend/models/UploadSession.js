const mongoose = require('mongoose');
const { Schema } = mongoose;

const UploadSessionSchema = new Schema(
  {
    uploadId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    originalFileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    chunkSize: {
      type: Number,
      default: 5 * 1024 * 1024 // 5MB
    },
    totalChunks: {
      type: Number,
      required: true
    },
    uploadedChunks: {
      type: [Number],
      default: []
    },
    fileHash: {
      type: String // SHA256 hash of complete file
    },
    encryptedAesKey: {
      type: String,
      default: null
    },
    iv: {
      type: String,
      default: null
    },
    isEncrypted: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['in-progress', 'completed', 'failed', 'cancelled'],
      default: 'in-progress',
      index: true
    },
    mimeType: {
      type: String
    },
    uploadStartTime: {
      type: Date,
      default: Date.now
    },
    uploadEndTime: {
      type: Date
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      index: { expireAfterSeconds: 0 } // TTL index for auto-cleanup
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UploadSession', UploadSessionSchema);
