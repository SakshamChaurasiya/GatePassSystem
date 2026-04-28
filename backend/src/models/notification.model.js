const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    type: {
        type: String,
        enum: ["OVERDUE", "LATE_RETURN", "STUDENT_OUT", "STUDENT_IN", "GENERAL", "EXTENSION_REQUEST", "EXTENSION_RESULT", "ACCOUNT_CREATED"],
        default: "GENERAL"
    },

    message: {
        type: String,
        required: true
    },

    relatedPass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pass"
    },

    isRead: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);