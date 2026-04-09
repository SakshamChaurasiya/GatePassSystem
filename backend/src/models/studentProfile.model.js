const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    enrollmentNumber: {
        type: String,
        unique: true
    },
    roomNumber: {
        type: String,
        required: true
    },
    course: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        match: /^[0-9]{10}$/
    },
    emergencyContact: {
        type: String,
        match: /^[0-9]{10}$/
    }
}, { timestamps: true });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);