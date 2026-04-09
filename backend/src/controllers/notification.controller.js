const Notification = require("../models/notification.model");

const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const notifications = await Notification.find({
            recipient: userId
        })
            .sort({ createdAt: -1 })
            .populate({
                path: "relatedPass",
                populate: {
                    path: "studentId",
                    select: "name email"
                }
            });

        res.json({
            count: notifications.length,
            notifications
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        await Notification.findByIdAndUpdate(id, {
            isRead: true
        });

        res.json({ message: "Marked as read" });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getMyNotifications, markAsRead };