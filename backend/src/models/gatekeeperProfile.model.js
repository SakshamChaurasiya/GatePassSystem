const mongoose = require("mongoose");

const gatekeeperProfileSchema = mongoose.Schema({
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
    },
    shift: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('GatekeeperProfile', gatekeeperProfileSchema);