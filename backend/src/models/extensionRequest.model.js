const mongoose = require("mongoose");

const extensionRequestSchema = new mongoose.Schema({
    passId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pass",
        required: true
    },

    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    hostel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hostel",
        required: true
    },

    requestedHours: {
        type: Number,
        required: true,
        min: 1,
        max: 4
    },

    originalValidTo: {
        type: Date,
        required: true
    },

    newValidTo: {
        type: Date,
        required: true
    },

    remark: {
        type: String,
        required: true
    },

    supportingDoc: {
        type: String
    },

    docPublicId: {
        type: String
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "forwarded"],
        default: "pending"
    },

    managerAction: {
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "forwarded"],
            default: "pending"
        },
        remark: String,
        actedAt: Date
    },

    wardenAction: {
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },
        remark: String,
        actedAt: Date
    },

    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }

}, { timestamps: true });

module.exports = mongoose.model("ExtensionRequest", extensionRequestSchema);
