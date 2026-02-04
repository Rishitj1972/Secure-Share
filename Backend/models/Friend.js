const mongoose = require('mongoose');

const friendSchema = mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, { timestamps: true });

// Ensure no duplicate friend requests
friendSchema.index({ requester: 1, receiver: 1 }, { unique: true });

module.exports = mongoose.model("Friend", friendSchema);
