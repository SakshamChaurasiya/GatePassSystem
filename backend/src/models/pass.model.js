const mongoose = require("mongoose");

const passSchema = new mongoose.Schema({
    passId: {
        type: String,
        unique: true,
        required: true
    },

    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    passRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PassRequest",
        required: true
    },

    hostel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Hostel",
        required: true
    },

    qrCode: {
        type: String
    },

    status: {
        type: String,
        enum: ["active", "used", "expired"],
        default: "active"
    },
    returnedAt: {
        type: Date,
        default: null
    },
    notified: {
        type: Boolean,
        default: false
    },
    validFrom: Date,
    validTo: Date,

    usedAt: Date,
    returnedAt: Date

}, { timestamps: true });

module.exports = mongoose.model("Pass", passSchema);