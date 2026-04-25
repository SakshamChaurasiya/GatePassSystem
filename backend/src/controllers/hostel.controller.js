const Hostel = require("../models/hostel.model");
const User = require("../models/user.model");

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

const getHostelDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const hostel = await Hostel.findById(id);
        if (!hostel) return res.status(404).json({ message: "Hostel not found" });

        const users = await User.find({ hostel: id }).select('name email role');

        const grouped = {
            wardens: users.filter(u => u.role === 'warden'),
            managers: users.filter(u => u.role === 'manager'),
            gatekeepers: users.filter(u => u.role === 'gatekeeper'),
            students: users.filter(u => u.role === 'student'),
        };

        res.status(200).json({
            hostel,
            counts: {
                total: users.length,
                wardens: grouped.wardens.length,
                managers: grouped.managers.length,
                gatekeepers: grouped.gatekeepers.length,
                students: grouped.students.length,
            },
            users: grouped
        });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { createHostel, getHostels, getHostelDetails };