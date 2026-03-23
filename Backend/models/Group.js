const mongoose = require('mongoose');
const { Schema } = mongoose;

const groupMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    joinedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    groupPhoto: {
      type: String,
      default: null
    },
    members: {
      type: [groupMemberSchema],
      default: []
    }
  },
  { timestamps: true }
);

groupSchema.index({ 'members.user': 1, 'members.status': 1 });

module.exports = mongoose.model('Group', groupSchema);
