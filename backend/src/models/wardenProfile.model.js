const mongoose = require("mongoose");

const wardenProfileSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    department: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        unique: true,
        required: true,
        match: /^[0-9]{10}$/
    },
}, { timestamps: true });

module.exports = mongoose.model('WardenProfile', wardenProfileSchema);