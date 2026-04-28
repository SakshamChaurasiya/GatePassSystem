const User = require("../models/user.model");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const { Readable } = require("stream");
const Hostel = require("../models/hostel.model");
const StudentProfile = require("../models/studentProfile.model");
const WardenProfile = require("../models/wardenProfile.model");
const ManagerProfile = require("../models/managerProfile.model");
const GatekeeperProfile = require("../models/gatekeeperProfile.model");
const EmailJob = require("../models/emailJob.model");
const Notification = require("../models/notification.model");
const mongoose = require("mongoose");

const generateTempPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#";
    let password = "";
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

// =========================
// CREATE USER (UPDATED)
// =========================
const createUser = async (req, res) => {
    try {
        const { name, email, role, hostel: hostelId } = req.body;

        const rolesRequiringHostel = ["warden", "manager"]; //, "student"

        // =========================
        // 🔴 BASIC VALIDATION
        // =========================
        if (!name || !email || !role) {
            return res.status(400).json({
                message: "Name, email and role are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // =========================
        // 🔴 DUPLICATE CHECK
        // =========================
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                message: "User with this email already exists"
            });
        }

        // =========================
        // 🔴 HOSTEL VALIDATION (TARGET ROLE BASED)
        // =========================
        if (rolesRequiringHostel.includes(role) && !hostelId) {
            return res.status(400).json({
                message: "Hostel is required for this role"
            });
        }

        if (!rolesRequiringHostel.includes(role) && hostelId) {
            return res.status(400).json({
                message: "Hostel should not be provided for this role"
            });
        }

        // =========================
        // 🔴 VALIDATE HOSTEL EXISTS
        // =========================
        let hostelDoc = null;

        if (hostelId) {
            hostelDoc = await Hostel.findById(hostelId);

            if (!hostelDoc) {
                return res.status(400).json({
                    message: "Invalid hostel"
                });
            }
        }

        // =========================
        // 🔒 CREATOR RESTRICTION
        // =========================
        if (["warden", "manager"].includes(req.user.role)) {

            // 👉 enforce ONLY if target role needs hostel
            if (rolesRequiringHostel.includes(role)) {

                if (!req.user.hostel) {
                    return res.status(400).json({
                        message: "Your account is not assigned to any hostel"
                    });
                }

                if (hostelId.toString() !== req.user.hostel) {
                    return res.status(403).json({
                        message: "You can only assign users to your hostel"
                    });
                }
            }
        }

        // =========================
        // 🔐 GENERATE TEMP PASSWORD
        // =========================
        const tempPassword = generateTempPassword();

        // =========================
        // 🔥 CREATE USER
        // =========================
        // If hostelId is not provided (e.g. manager creating a student), default to the creator's hostel
        const finalHostel = hostelId || (["warden", "manager"].includes(req.user.role) ? req.user.hostel : null);

        const newUser = await User.create({
            name,
            email: normalizedEmail,
            password: tempPassword,
            role,
            hostel: finalHostel,
            createdBy: req.user.id,
            mustChangePassword: true
        });

        // =========================
        // 📧 QUEUE EMAIL & NOTIFICATION
        // =========================
        const emailBody = `
            <h2>Welcome to Gate Pass System, ${name}!</h2>
            <p>Your account has been created successfully. Please log in using the temporary password below:</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
            <p>You will be required to change this password upon your first login.</p>
        `;

        const { v4: uuidv4 } = require("uuid");
        const batchId = uuidv4();

        await EmailJob.create({
            recipientEmail: normalizedEmail,
            subject: "Your Gate Pass System Account",
            body: emailBody,
            batchId,
            creatorId: req.user.id,
            studentName: name
        });

        // =========================
        // ✅ RESPONSE
        // =========================
        return res.status(201).json({
            message: `Sending password to user...`,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                hostel: newUser.hostel
            }
        });

    } catch (error) {
        console.error("Create User Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// =========================
// GET USERS (HOSTEL BASED)
// =========================
const getUsers = async (req, res) => {
    try {
        const { role: userRole, hostel } = req.user;
        const { role: requestedRole } = req.query;

        let query = {};

        if (userRole === "super-admin") {
            query = {}; // sees all
        } else if (["admin", "warden", "manager"].includes(userRole)) {
            query = { hostel };
        } else {
            return res.status(403).json({
                message: "Not allowed to view users"
            });
        }

        // If a specific role is requested, add it to the query
        if (requestedRole && requestedRole !== 'all') {
            // Case-insensitive role match for the query if possible, 
            // but for simplicity we assume the enum is lowercase
            query.role = requestedRole.toLowerCase();
        }

        const users = await User.find(query).select('name email role hostel').lean();
        
        // If a specific role was requested, return a flat list for that role
        if (requestedRole && requestedRole !== 'all') {
            return res.status(200).json({
                count: users.length,
                role: requestedRole,
                debug: {
                    userRole,
                    requestedRole,
                    totalFound: users.length,
                    currentUser: req.user, // NEW
                    dbName: mongoose.connection.db.databaseName // NEW
                },
                data: users
            });
        }

        // For "all" or if no role specified, return the grouped structure 
        // AND also return the flat list in a 'users' field for easier debugging
        const grouped = {
            admins: users.filter(u => u.role === "admin"),
            wardens: users.filter(u => u.role === "warden"),
            managers: users.filter(u => u.role === "manager"),
            gatekeepers: users.filter(u => u.role === "gatekeeper"),
            students: users.filter(u => u.role === "student")
        };

        return res.status(200).json({
            counts: {
                admins: grouped.admins.length,
                wardens: grouped.wardens.length,
                managers: grouped.managers.length,
                gatekeepers: grouped.gatekeepers.length,
                students: grouped.students.length,
                total: users.length
            },
            data: grouped,
            allUsers: users // NEW Debug field
        });

    } catch (error) {
        console.error("Get Users Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// DASHBOARD (HOSTEL BASED)
// =========================
const getDashboardStats = async (req, res) => {
    try {
        const { role, hostel } = req.user;

        let stats = {};

        if (role === "super-admin") {
            const totalUsers = await User.countDocuments();

            const roleStats = await User.aggregate([
                {
                    $group: {
                        _id: "$role",
                        count: { $sum: 1 }
                    }
                }
            ]);

            const hostelStats = await User.aggregate([
                { $match: { role: "student", hostel: { $ne: null } } },
                {
                    $group: {
                        _id: "$hostel",
                        count: { $sum: 1 }
                    }
                }
            ]);

            const recentUsers = await User.find()
                .sort({ createdAt: -1 })
                .limit(8)
                .select("name role createdAt");

            stats = {
                totalUsers,
                roleBreakdown: roleStats,
                hostelBreakdown: hostelStats,
                recentUsers
            };
        }

        else if (["admin", "warden", "manager"].includes(role)) {
            const users = await User.find({ hostel });

            const grouped = {
                wardens: users.filter(u => u.role === "warden").length,
                managers: users.filter(u => u.role === "manager").length,
                gatekeepers: users.filter(u => u.role === "gatekeeper").length,
                students: users.filter(u => u.role === "student").length
            };

            stats = {
                ...grouped,
                total:
                    grouped.wardens +
                    grouped.managers +
                    grouped.gatekeepers +
                    grouped.students
            };
        }

        else if (role === "gatekeeper") {
            stats = {
                message: "Dashboard will be based on pass verification"
            };
        }

        else {
            stats = {
                message: "No dashboard available"
            };
        }

        return res.status(200).json({ role, stats });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const createProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const data = req.body;

        let profile;

        // =========================
        // 🎓 STUDENT
        // =========================
        if (role === "student") {
            const existing = await StudentProfile.findOne({ userId });
            if (existing) {
                return res.status(400).json({
                    message: "Profile already exists"
                });
            }

            const requiredFields = [
                "enrollmentNumber",
                "roomNumber",
                "course",
                "year",
                "phoneNumber"
            ];

            const missingFields = requiredFields.filter(field => !data[field]);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    message: "Missing required fields",
                    fields: missingFields
                });
            }


            profile = await StudentProfile.create({
                userId,
                enrollmentNumber: data.enrollmentNumber,
                roomNumber: data.roomNumber,
                course: data.course,
                year: data.year,
                phoneNumber: data.phoneNumber,
                emergencyContact: data.emergencyContact
            });
        }

        // =========================
        // 🧠 WARDEN
        // =========================
        else if (role === "warden") {
            const existing = await WardenProfile.findOne({ userId });
            if (existing) {
                return res.status(400).json({
                    message: "Profile already exists"
                });
            }

            const requiredFields = [
                "department",
                "phoneNumber",
            ];

            const missingFields = requiredFields.filter(field => !data[field]);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    message: "Missing required fields",
                    fields: missingFields
                });
            }

            profile = await WardenProfile.create({
                userId,
                department: data.department,
                phoneNumber: data.phoneNumber,
            });
        }

        // =========================
        // 🧠 MANAGER
        // =========================
        else if (role === "manager") {
            const existing = await ManagerProfile.findOne({ userId });
            if (existing) {
                return res.status(400).json({
                    message: "Profile already exists"
                });
            }

            const requiredFields = [
                "phoneNumber",
            ];

            const missingFields = requiredFields.filter(field => !data[field]);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    message: "Missing required fields",
                    fields: missingFields
                });
            }

            profile = await ManagerProfile.create({
                userId,
                phoneNumber: data.phoneNumber
            });
        }

        // =========================
        // 🚪 GATEKEEPER
        // =========================
        else if (role === "gatekeeper") {
            const existing = await GatekeeperProfile.findOne({ userId });
            if (existing) {
                return res.status(400).json({
                    message: "Profile already exists"
                });
            }

            const requiredFields = [
                "phoneNumber",
                "shift"
            ];

            const missingFields = requiredFields.filter(field => !data[field]);

            if (missingFields.length > 0) {
                return res.status(400).json({
                    message: "Missing required fields",
                    fields: missingFields
                });
            }

            profile = await GatekeeperProfile.create({
                userId,
                phoneNumber: data.phoneNumber,
                shift: data.shift
            });
        }

        // =========================
        // 👑 ADMIN / SUPER ADMIN
        // =========================
        else {
            return res.status(400).json({
                message: "No profile required for this role"
            });
        }

        // =========================
        // ✅ UPDATE USER FLAG
        // =========================
        await User.findByIdAndUpdate(userId, {
            profileCompleted: true
        });

        return res.status(201).json({
            message: "Profile created successfully",
            profile
        });

    } catch (error) {
        console.error("Create Profile Error:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: "Server error"
        });
    }
}

const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let profile;

        if (role === "student") {
            profile = await StudentProfile.findOne({ userId }).populate({
                path: "userId",
                select: "name email role hostel",
                populate: {
                    path: "hostel",
                    select: "name type category"
                }
            });
        }

        else if (role === "warden") {
            profile = await WardenProfile.findOne({ userId }).populate({
                path: "userId",
                select: "name email role hostel",
                populate: {
                    path: "hostel",
                    select: "name type category"
                }
            });
        }

        else if (role === "manager") {
            profile = await ManagerProfile.findOne({ userId }).populate({
                path: "userId",
                select: "name email role hostel",
                populate: {
                    path: "hostel",
                    select: "name type category"
                }
            });
        }

        else if (role === "gatekeeper") {
            profile = await GatekeeperProfile.findOne({ userId }).populate({
                path: "userId",
                select: "name email role hostel",
                populate: {
                    path: "hostel",
                    select: "name type category"
                }
            });
        }

        else {
            return res.status(400).json({
                message: "No profile available for this role"
            });
        }

        if (!profile) {
            return res.status(200).json({
                profile: null,
                message: "Profile not created"
            });
        }

        return res.status(200).json({
            profile: {
                ...profile.toObject(),
            }
        });

    } catch (error) {
        console.error("Get Profile Error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const bulkUploadStudents = async (req, res) => {
    try {
        
        if (req.user.role !== "manager") {
            return res.status(403).json({
                message: "Only manager can upload students"
            });
        }

        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: "File required" });
        }



        let students = [];

        // ================= CSV =================
        if (file.mimetype === "text/csv") {
            const stream = Readable.from(file.buffer.toString());

            await new Promise((resolve, reject) => {
                stream
                    .pipe(csv())
                    .on("data", (data) => students.push(data))
                    .on("end", resolve)
                    .on("error", reject);
            });
        }

        // ================= EXCEL =================
        else {
            const workbook = xlsx.read(file.buffer);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            students = xlsx.utils.sheet_to_json(sheet);
        }

        // ================= INSERT USERS =================
        const formatted = students.map(s => ({
            name: s.name,
            email: s.email,
            password: generateTempPassword(),
            role: "student",
            hostel: req.user.hostel || null,
            createdBy: req.user.id,
            mustChangePassword: true,
            _tempPlainPassword: s.password // Temporary field to construct the email
        }));

        const insertedUsers = await User.insertMany(formatted);

        // ================= QUEUE EMAILS & NOTIFICATIONS =================
        const emailJobs = [];
        const { v4: uuidv4 } = require("uuid");
        const batchId = uuidv4();

        // Match inserted users with their generated temp passwords
        insertedUsers.forEach((user, index) => {
            const originalData = formatted[index];
            
            emailJobs.push({
                recipientEmail: user.email,
                subject: "Your Gate Pass System Account",
                body: `
                    <h2>Welcome to Gate Pass System, ${user.name}!</h2>
                    <p>Your student account has been created by your hostel manager. Please log in using the temporary password below:</p>
                    <p><strong>Temporary Password:</strong> ${originalData.password}</p>
                    <p>You will be required to change this password and complete your profile upon your first login.</p>
                `,
                batchId,
                creatorId: req.user.id
            });
        });

        // Bulk insert to avoid blocking the thread or rate limits
        await EmailJob.insertMany(emailJobs);

        res.json({
            message: `Sending passwords to users...`,
            count: insertedUsers.length
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed" });
    }
};

module.exports = { createUser, getUsers, getDashboardStats, createProfile, getProfile, bulkUploadStudents };
