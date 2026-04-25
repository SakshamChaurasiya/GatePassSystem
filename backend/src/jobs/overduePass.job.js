const cron = require("node-cron");
const Pass = require("../models/pass.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");

const checkOverduePasses = () => {
    cron.schedule("*/5 * * * *", async () => {
        try {
            const now = new Date();

            // Find passes where student is OUT but hasn't returned and pass time has expired
            const overduePasses = await Pass.find({
                status: "out",
                returnedAt: null,
                validTo: { $lt: now },
                notified: { $ne: true }
            }).populate("studentId");

            for (let pass of overduePasses) {
                // Find both manager and warden for this hostel
                const staffMembers = await User.find({
                    role: { $in: ["manager", "warden"] },
                    hostel: pass.hostel
                });

                for (const staff of staffMembers) {
                    await Notification.create({
                        recipient: staff._id,
                        type: "OVERDUE",
                        message: `⚠️ OVERDUE: ${pass.studentId?.name || "Student"} has not returned on time (Pass: ${pass.passId}, Expected by: ${new Date(pass.validTo).toLocaleString()})`,
                        relatedPass: pass._id
                    });
                }

                pass.notified = true;
                await pass.save();
            }

            // Also auto-expire active passes that are past validTo and never used
            await Pass.updateMany(
                {
                    status: "active",
                    validTo: { $lt: now }
                },
                { $set: { status: "expired" } }
            );

        } catch (err) {
            console.error("Overdue Job Error:", err);
        }
    });
};

module.exports = checkOverduePasses;