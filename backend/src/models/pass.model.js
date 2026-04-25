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
        enum: ["active", "out", "returned", "expired"],
        default: "active"
    },

    validFrom: Date,
    validTo: Date,

    usedAt: Date,       // when student was marked OUT
    returnedAt: Date,   // when student was marked IN

    gatekeeperOutId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    gatekeeperInId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    lateReturn: {
        type: Boolean,
        default: false
    },

    notified: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

module.exports = mongoose.model("Pass", passSchema);