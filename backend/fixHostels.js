require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/user.model");

const fixMissingHostels = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");

        // Find students with no hostel
        const studentsWithoutHostel = await User.find({ role: "student", hostel: null });
        console.log(`Found ${studentsWithoutHostel.length} students missing a hostel.`);

        for (const student of studentsWithoutHostel) {
            // Find the manager/warden who created them to get the correct hostel
            const creator = await User.findById(student.createdBy);
            if (creator && creator.hostel) {
                student.hostel = creator.hostel;
                await student.save();
                console.log(`✅ Fixed student: ${student.email} -> Assigned to hostel: ${creator.hostel}`);
            } else {
                console.log(`⚠️ Could not fix student: ${student.email} (Creator has no hostel)`);
            }
        }

        console.log("Fix complete.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
};

fixMissingHostels();
