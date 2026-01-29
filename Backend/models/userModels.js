const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: [true, "Please add a username"]
    },
    email: {
        type: String,
        required: [true, "Please add an email"],
        unique: [true, "Email already exists"]
    },
    password: {
        type: String,
        required: [true, "Please add a password"]
    },
    currentToken: {
        type: String,
        default: null
    },
    tokenExpiresAt: {
        type: Date,
        default: null
    }
}, { timestamps: true
})

module.exports = mongoose.model("User", userSchema);