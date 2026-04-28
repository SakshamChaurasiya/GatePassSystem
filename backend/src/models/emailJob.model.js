const mongoose = require("mongoose");

const emailJobSchema = new mongoose.Schema({
    recipientEmail: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending"
    },
    retryCount: {
        type: Number,
        default: 0
    },
    errorLog: {
        type: String
    },
    batchId: {
        type: String
    },
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    studentName: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model("EmailJob", emailJobSchema);
