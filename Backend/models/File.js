const mongoose = require("mongoose");
const { Schema } = mongoose;

const FileSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    originalFileName: { 
      type: String, 
      required: true 
    },
    storedFileName: { 
      type: String, 
      required: true, 
      unique: true 
    },
    filePath: { 
      type: String, 
      required: true 
    },
    fileSize: { 
      type: Number, 
      required: true 
    },
    mimeType: { 
      type: String 
    },
    isDownloaded: { 
      type: Boolean, 
      default: false 
    },
    downloadedAt: { 
      type: Date 
    },
  },
  { timestamps: true }
);

// Compound indexes for fast queries
FileSchema.index({ receiver: 1, createdAt: -1 });
FileSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model("File", FileSchema);
