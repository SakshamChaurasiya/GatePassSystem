/**
 * One-time cleanup script: For each student with multiple active/out passes,
 * keep the latest one and expire all others.
 *
 * Usage: node src/scripts/cleanupDuplicateActivePasses.js
 */
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const Pass = require("../models/pass.model");

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        // Find all students who have more than 1 active/out pass
        const duplicates = await Pass.aggregate([
            { $match: { status: { $in: ["active", "out"] } } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$studentId",
                    count: { $sum: 1 },
                    latestPassId: { $first: "$_id" },
                    allPassIds: { $push: "$_id" }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]);

        if (duplicates.length === 0) {
            console.log("✅ No duplicate active passes found. Database is clean.");
            await mongoose.disconnect();
            return;
        }

        console.log(`Found ${duplicates.length} student(s) with multiple active passes.`);

        let totalExpired = 0;
        for (const dup of duplicates) {
            // Keep the latest, expire all others
            const toExpire = dup.allPassIds.filter(
                id => id.toString() !== dup.latestPassId.toString()
            );

            const result = await Pass.updateMany(
                { _id: { $in: toExpire } },
                { $set: { status: "expired" } }
            );

            console.log(
                `  Student ${dup._id}: kept latest pass, expired ${result.modifiedCount} older pass(es)`
            );
            totalExpired += result.modifiedCount;
        }

        console.log(`\n✅ Cleanup complete. Expired ${totalExpired} duplicate pass(es).`);
        await mongoose.disconnect();
    } catch (err) {
        console.error("Cleanup error:", err);
        process.exit(1);
    }
}

cleanup();
