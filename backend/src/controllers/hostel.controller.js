const Hostel = require("../models/hostel.model");

// CREATE HOSTEL
const createHostel = async (req, res) => {
    try {
        const { name, type, category } = req.body;

        if (!name || !type) {
            return res.status(400).json({
                message: "Name and type are required"
            });
        }

        const existing = await Hostel.findOne({ name });

        if (existing) {
            return res.status(400).json({
                message: "Hostel already exists"
            });
        }

        const hostel = await Hostel.create({
            name,
            type,
            category
        });

        res.status(201).json({
            message: "Hostel created",
            hostel
        });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// GET ALL HOSTELS
const getHostels = async (req, res) => {
    try {
        const hostels = await Hostel.find();

        res.status(200).json({ hostels });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { createHostel, getHostels };