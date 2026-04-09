const mongoose = require("mongoose");

const managerProfileSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    phoneNumber: {
        type: String,
        unique: true,
        required: true,
        match: /^[0-9]{10}$/
    }
}, { timestamps: true });

module.exports = mongoose.model('ManagerProfile', managerProfileSchema);