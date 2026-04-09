require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user.model");

const seedSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");

        // 🔍 Check if super-admin already exists
        const existingSuperAdmin = await User.findOne({
            $or: [
                { role: "super-admin" },
                { email: process.env.SUPER_ADMIN_EMAIL }
            ]
        });

        if (existingSuperAdmin) {
            console.log("Super-admin already exists");
            process.exit();
        }

        // 🔐 Create super-admin
        const superAdmin = await User.create({
            name: "Super Admin",
            email: process.env.SUPER_ADMIN_EMAIL || "superadmin@example.com",
            password: process.env.SUPER_ADMIN_PASSWORD || "Admin@123",
            role: "super-admin",
            mustChangePassword: false // 🔥 important
        });

        console.log("✅ Super-admin created:");
        console.log(`Email: ${superAdmin.email}`);

        process.exit();

    } catch (error) {
        console.error("❌ Error seeding super-admin:", error);
        process.exit(1);
    }
};

seedSuperAdmin();