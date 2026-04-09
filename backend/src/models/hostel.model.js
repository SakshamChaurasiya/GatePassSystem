const mongoose = require("mongoose");

const hostelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String, // boys / girls
        required: true
    },
    category: {
        type: String // junior / senior
    }
}, { timestamps: true });

module.exports = mongoose.model("Hostel", hostelSchema);