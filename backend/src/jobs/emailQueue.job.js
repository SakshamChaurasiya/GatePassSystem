const cron = require("node-cron");
const EmailJob = require("../models/emailJob.model");
const Notification = require("../models/notification.model");
const { sendEmail } = require("../utils/email.service");

// Run every minute
const startEmailQueueWorker = () => {
    cron.schedule("* * * * *", async () => {
        try {
            // Process up to 20 emails per minute to avoid rate limits
            const pendingJobs = await EmailJob.find({ status: "pending", retryCount: { $lt: 3 } })
                .limit(20)
                .sort({ createdAt: 1 });

            if (pendingJobs.length === 0) return;

            console.log(`[EmailWorker] Processing ${pendingJobs.length} pending emails...`);

            for (const job of pendingJobs) {
                try {
                    await sendEmail(job.recipientEmail, job.subject, job.body);
                    
                    // Mark as sent
                    job.status = "sent";
                    await job.save();
                    console.log(`[EmailWorker] Sent email to ${job.recipientEmail}`);
                } catch (error) {
                    console.error(`[EmailWorker] Failed to send email to ${job.recipientEmail}:`, error.message);
                    job.retryCount += 1;
                    job.errorLog = error.message;
                    if (job.retryCount >= 3) {
                        job.status = "failed";
                    }
                    await job.save();
                }

                // Check if batch is complete and notify the creator
                if (job.batchId && job.creatorId) {
                    const remaining = await EmailJob.countDocuments({ batchId: job.batchId, status: "pending" });
                    
                    if (remaining === 0) {
                        const batchCount = await EmailJob.countDocuments({ batchId: job.batchId });
                        let message = "";
                        
                        if (batchCount === 1 && job.studentName) {
                            message = `Password is sent to ${job.studentName} successfully.`;
                        } else {
                            message = `Password sent to ${batchCount} users successfully.`;
                        }
                        
                        await Notification.create({
                            recipient: job.creatorId,
                            type: "GENERAL",
                            message: message
                        });
                    }
                }
            }
        } catch (error) {
            console.error("[EmailWorker] Job execution error:", error);
        }
    });
};

module.exports = startEmailQueueWorker;
