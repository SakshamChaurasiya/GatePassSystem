const mongoose = require("mongoose");

const gateLogSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    passId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pass",
        required: true
    },

    gatekeeperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    action: {
        type: String,
        enum: ["out", "in"],
        required: true
    },

    timestamp: {
        type: Date,
        default: Date.now
    },

    outTime: Date,
    inTime: Date

}, { timestamps: true });

module.exports = mongoose.model("GateLog", gateLogSchema);