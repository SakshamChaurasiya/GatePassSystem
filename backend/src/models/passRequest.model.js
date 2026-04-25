const mongoose = require("mongoose");

const passRequestSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    reason: {
        type: String,
        required: true
    },

    destination: {
        type: String,
        required: true
    },

    fromDate: {
        type: Date,
        required: true
    },

    toDate: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "forwarded", "cancelled"],
        default: "pending"
    },
    supportingDoc: {
        type: String
    },
    docPublicId: {
        type: String // for deletion later
    },

    managerAction: {
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "forwarded", "cancelled"],
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

    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    hostel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hostel",
        required: true
    }

}, { timestamps: true });

module.exports = mongoose.model("PassRequest", passRequestSchema);