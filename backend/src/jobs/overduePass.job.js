const cron = require("node-cron");
const Pass = require("../models/pass.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");

const checkOverduePasses = () => {
    cron.schedule("*/5 * * * *", async () => {
        // runs every 5 minutes

        try {
            const now = new Date();

            const overduePasses = await Pass.find({
                usedAt: { $ne: null },
                returnedAt: null,
                validTo: { $lt: now },
                notified: { $ne: true } // prevent spam
            }).populate("studentId");

            for (let pass of overduePasses) {

                // 👉 Find manager (depends on your schema)
                const manager = await User.findOne({
                    role: "manager",
                    hostel: pass.hostel
                });

                if (manager) {
                    await Notification.create({
                        recipient: manager._id,
                        type: "OVERDUE",
                        message: `${pass.studentId.name} has not returned on time`,
                        relatedPass: pass._id
                    });
                }

                // mark as notified (IMPORTANT)
                pass.notified = true;
                await pass.save();
            }

        } catch (err) {
            console.error("Overdue Job Error:", err);
        }
    });
};

module.exports = checkOverduePasses;