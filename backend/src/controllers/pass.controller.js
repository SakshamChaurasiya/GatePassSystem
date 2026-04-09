const PassRequest = require("../models/passRequest.model");
const User = require("../models/user.model");
const Pass = require("../models/pass.model");
const { v4: uuidv4 } = require("uuid");


// =========================
// CREATE PASS REQUEST
// =========================
const createPassRequest = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { reason, destination, fromDate, toDate } = req.body;

        if (!reason || !destination || !fromDate || !toDate) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const now = new Date();
        const from = new Date(fromDate);
        const to = new Date(toDate);

        // =========================
        // 🔒 DATE VALIDATION
        // =========================

        if (from > to) {
            return res.status(400).json({
                message: "fromDate cannot be after toDate"
            });
        }

        const diffInDays = Math.ceil((from - now) / (1000 * 60 * 60 * 24));

        if (diffInDays > 1) {
            return res.status(400).json({
                message: "You can only request pass for today or tomorrow"
            });
        }

        if (diffInDays < 0) {
            return res.status(400).json({
                message: "Cannot request pass for past dates"
            });
        }

        // =========================
        // 🔒 BLOCK ACTIVE + UPCOMING PASS
        // =========================

        const existingPass = await Pass.findOne({
            studentId,
            usedAt: null,
            validTo: { $gte: now } // covers BOTH active + upcoming
        });

        if (existingPass) {
            return res.status(400).json({
                message: "You already have an active or upcoming pass"
            });
        }

        // =========================
        // 🔒 BLOCK PENDING REQUEST
        // =========================

        const existingRequest = await PassRequest.findOne({
            studentId,
            status: { $in: ["pending", "forwarded"] }
        });

        if (existingRequest) {
            return res.status(400).json({
                message: "You already have a pending request"
            });
        }

        // =========================
        // ✅ CREATE REQUEST
        // =========================
        const cooldownHours = 6;
        const cooldownMs = cooldownHours * 60 * 60 * 1000;

        const lastRejected = await PassRequest.findOne({
            studentId,
            status: "rejected"
        }).sort({ updatedAt: -1 });

        if (lastRejected) {
            const rejectedAt =
                lastRejected.wardenAction?.actedAt ||
                lastRejected.managerAction?.actedAt;

            if (rejectedAt && (Date.now() - new Date(rejectedAt).getTime()) < cooldownMs) {
                return res.status(429).json({
                    message: `Wait ${cooldownHours} hours after rejection before requesting again`
                });
            }
        }

        const file = req.file;

        const passRequest = await PassRequest.create({
            studentId,
            reason,
            destination,
            fromDate: from,
            toDate: to,
            supportingDoc: file ? file.path : null,
            docPublicId: file ? file.filename : null 
        });

        return res.status(201).json({
            message: "Pass request submitted successfully",
            passRequest
        });

    } catch (error) {
        console.error("Create Pass Request Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// GET MY PASS REQUESTS
// =========================
const getMyPassRequests = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { status } = req.query;

        const validStatuses = ["pending", "approved", "rejected", "forwarded"];

        let query = { studentId };

        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status filter"
            });
        }

        if (status) query.status = status;

        const requests = await PassRequest.find(query)
            .sort({ createdAt: -1 })
            .populate("approvedBy", "name role");

        const formatted = requests.map(item => ({
            id: item._id,
            reason: item.reason,
            destination: item.destination,
            fromDate: item.fromDate,
            toDate: item.toDate,
            status: item.status,
            managerAction: item.managerAction,
            wardenAction: item.wardenAction,
            approvedBy: item.approvedBy || null,
            createdAt: item.createdAt
        }));

        return res.status(200).json({
            count: formatted.length,
            requests: formatted
        });

    } catch (error) {
        console.error("Get My Pass Requests Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getMyPassesWithStatus = async (req, res) => {
    try {
        const studentId = req.user.id;
        const now = new Date();

        const passes = await Pass.find({ studentId })
            .sort({ createdAt: -1 })
            .populate("studentId", "name email");

        const formatted = passes.map(pass => {
            let status = "active";

            if (pass.usedAt) {
                status = "used";
            } else if (new Date(pass.validTo) < now) {
                status = "expired";
            } else if (new Date(pass.validFrom) > now) {
                status = "upcoming";
            }

            return {
                id: pass._id,
                passId: pass.passId,
                student: pass.studentId,

                validFrom: pass.validFrom,
                validTo: pass.validTo,

                // 🔥 IMPORTANT ADDITION
                usedAt: pass.usedAt || null,

                qrCode: pass.qrCode,

                status,

                createdAt: pass.createdAt
            };
        });

        return res.status(200).json({
            count: formatted.length,
            passes: formatted
        });

    } catch (error) {
        console.error("Get My Passes Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// HANDLE PASS ACTION (UPDATED)
// =========================
const handlePassChange = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const userHostel = req.user.hostel;

        const { id } = req.params;
        const { action, remark } = req.body;

        const validActions = ["approve", "reject", "forward"];

        if (!validActions.includes(action)) {
            return res.status(400).json({ message: "Invalid action" });
        }

        const passRequest = await PassRequest.findById(id);

        if (!passRequest) {
            return res.status(404).json({ message: "Pass request not found" });
        }

        const student = await User.findById(passRequest.studentId);

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // 🔥 HOSTEL CHECK
        if (student.hostel.toString() !== userHostel) {
            return res.status(403).json({
                message: "You can only act within your hostel"
            });
        }

        // 🔴 FINAL STATE CHECK
        if (["approved", "rejected"].includes(passRequest.status)) {
            return res.status(400).json({
                message: "Already finalized"
            });
        }

        // =========================
        // 🧠 MANAGER
        // =========================
        if (role === "manager") {

            if (passRequest.managerAction.status !== "pending") {
                return res.status(400).json({
                    message: "Already processed by manager"
                });
            }

            if (action === "forward") {
                passRequest.status = "forwarded";
                passRequest.managerAction = {
                    status: "forwarded",
                    remark,
                    actedAt: new Date()
                };
            }

            else if (action === "approve") {

                passRequest.status = "approved";
                passRequest.managerAction = {
                    status: "approved",
                    remark,
                    actedAt: new Date()
                };
                passRequest.approvedBy = userId;

                // 🔥 CREATE PASS
                await Pass.create({
                    passId: `PASS-${uuidv4().slice(0, 8)}`,
                    studentId: student._id,
                    passRequestId: passRequest._id,
                    hostel: student.hostel,
                    validFrom: passRequest.fromDate,
                    validTo: passRequest.toDate,
                    qrCode: `QR-${uuidv4()}`
                });
            }

            else if (action === "reject") {
                passRequest.status = "rejected";
                passRequest.managerAction = {
                    status: "rejected",
                    remark,
                    actedAt: new Date()
                };
            }
        }

        // =========================
        // 🧠 WARDEN
        // =========================
        else if (role === "warden") {

            if (passRequest.status !== "forwarded") {
                return res.status(400).json({
                    message: "Only forwarded requests allowed"
                });
            }

            if (passRequest.wardenAction.status !== "pending") {
                return res.status(400).json({
                    message: "Already processed by warden"
                });
            }

            if (action === "approve") {

                passRequest.status = "approved";
                passRequest.wardenAction = {
                    status: "approved",
                    remark,
                    actedAt: new Date()
                };
                passRequest.approvedBy = userId;

                // 🔥 CREATE PASS
                await Pass.create({
                    passId: `PASS-${uuidv4().slice(0, 8)}`,
                    studentId: student._id,
                    passRequestId: passRequest._id,
                    hostel: student.hostel,
                    validFrom: passRequest.fromDate,
                    validTo: passRequest.toDate,
                    qrCode: `QR-${uuidv4()}`
                });
            }

            else if (action === "reject") {
                passRequest.status = "rejected";
                passRequest.wardenAction = {
                    status: "rejected",
                    remark,
                    actedAt: new Date()
                };
            }

            else {
                return res.status(400).json({
                    message: "Warden cannot forward"
                });
            }
        }

        await passRequest.save();

        return res.status(200).json({
            message: `Pass ${action}ed successfully`,
            passRequest
        });

    } catch (error) {
        console.error("Pass Action Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


const getGatekeeperPasses = async (req, res) => {
    try {
        const now = new Date();

        const hostelId = req.user.hostel;
        const passes = await Pass.find({
            hostel: hostelId,
            usedAt: null,
            validTo: { $gte: now }
        })
            .populate("studentId", "name email");

        res.json({
            count: passes.length,
            passes
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

const markOut = async (req, res) => {
    try {
        const { passId } = req.body;

        const pass = await Pass.findOne({ passId });

        if (!pass) {
            return res.status(404).json({ message: "Invalid pass" });
        }

        if (pass.hostel.toString() !== req.user.hostel) {
            return res.status(403).json({ message: "Pass does not belong to your hostel" });
        }

        const now = new Date();

        // ❌ Already used
        if (pass.usedAt) {
            return res.status(400).json({ message: "Pass already used" });
        }

        // ❌ Expired
        if (pass.validTo < now) {
            return res.status(400).json({ message: "Pass expired" });
        }

        // ❌ Too early
        if (pass.validFrom > now) {
            return res.status(400).json({ message: "Pass not active yet" });
        }

        // ✅ Mark OUT
        pass.usedAt = now;
        await pass.save();

        return res.json({
            message: "Student marked OUT successfully",
            pass
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

const markIn = async (req, res) => {
    try {
        const { passId } = req.body;

        const pass = await Pass.findOne({ passId });

        if (!pass) {
            return res.status(404).json({ message: "Invalid pass" });
        }

        if (pass.hostel.toString() !== req.user.hostel) {
            return res.status(403).json({ message: "Pass does not belong to your hostel" });
        }

        // ❌ Not gone out yet
        if (!pass.usedAt) {
            return res.status(400).json({ message: "Student not marked OUT yet" });
        }

        // ❌ Already returned
        if (pass.returnedAt) {
            return res.status(400).json({ message: "Already marked IN" });
        }

        pass.returnedAt = new Date();
        await pass.save();

        return res.json({
            message: "Student marked IN successfully",
            pass
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

const scanQR = async (req, res) => {
    try {
        const { qrCode } = req.body;

        const pass = await Pass.findOne({ qrCode });

        if (!pass) {
            return res.status(404).json({
                message: "Invalid QR Code"
            });
        }

        if (pass.hostel.toString() !== req.user.hostel) {
            return res.status(403).json({ message: "Pass does not belong to your hostel" });
        }

        const now = new Date();

        // Decide action automatically
        if (!pass.usedAt) {
            // 👉 MARK OUT
            if (pass.validTo < now) {
                return res.status(400).json({ message: "Pass expired" });
            }

            if (pass.validFrom > now) {
                return res.status(400).json({ message: "Pass not active yet" });
            }

            pass.usedAt = now;
            await pass.save();

            return res.json({
                message: "OUT marked via QR",
                action: "out",
                pass
            });
        }

        if (!pass.returnedAt) {
            // 👉 MARK IN
            pass.returnedAt = now;
            await pass.save();

            return res.json({
                message: "IN marked via QR",
                action: "in",
                pass
            });
        }

        return res.status(400).json({
            message: "Pass already completed"
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

const getAllPassRequests = async (req, res) => {
    try {
        const role = req.user.role;
        const userHostel = req.user.hostel;

        // =========================
        // 🔒 ACCESS CONTROL
        // =========================
        if (!["manager", "warden"].includes(role)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // =========================
        // 🎯 ROLE-BASED FILTER
        // =========================
        let filter = {
            hostel: userHostel
        };

        if (role === "manager") {
            filter.status = "pending";
        }

        if (role === "warden") {
            filter.status = "forwarded";
        }

        // =========================
        // 📦 FETCH DATA
        // =========================
        const requests = await PassRequest.find(filter)
            .populate("studentId", "name email")
            .populate("approvedBy", "name role")
            .sort({ createdAt: -1 });

        // =========================
        // 🧾 FORMAT RESPONSE
        // =========================
        const formatted = requests.map(item => ({
            id: item._id,

            student: {
                id: item.studentId?._id,
                name: item.studentId?.name,
                email: item.studentId?.email
            },

            reason: item.reason,
            destination: item.destination,

            fromDate: item.fromDate,
            toDate: item.toDate,

            status: item.status,

            managerAction: item.managerAction,
            wardenAction: item.wardenAction,

            approvedBy: item.approvedBy
                ? {
                    name: item.approvedBy.name,
                    role: item.approvedBy.role
                }
                : null,

            // 🔥 DOCUMENT (Cloudinary URL)
            supportingDoc: item.supportingDoc || null,

            createdAt: item.createdAt
        }));

        return res.status(200).json({
            count: formatted.length,
            requests: formatted
        });

    } catch (error) {
        console.error("Get All Pass Requests Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getStudentHistory = async (req, res) => {
    try {
        const { studentId } = req.params;
        const role = req.user.role;
        const userHostel = req.user.hostel;
        const now = new Date();

        // =========================
        // 🔒 ACCESS CONTROL
        // =========================
        if (!["manager", "warden"].includes(role)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        // =========================
        // 👤 VALIDATE STUDENT
        // =========================
        const student = await User.findById(studentId);

        if (!student) {
            return res.status(404).json({
                message: "Student not found"
            });
        }

        if (student.hostel.toString() !== userHostel) {
            return res.status(403).json({
                message: "Access denied for this hostel"
            });
        }

        // =========================
        // 📊 PASS REQUEST STATS
        // =========================
        const requestStats = await PassRequest.aggregate([
            { $match: { studentId: student._id } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        let requestSummary = {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0,
            forwarded: 0
        };

        requestStats.forEach(r => {
            requestSummary[r._id] = r.count;
            requestSummary.total += r.count;
        });

        // =========================
        // 🎫 PASS STATS
        // =========================
        const passes = await Pass.find({ studentId });

        let passSummary = {
            total: passes.length,
            used: 0,
            expired: 0,
            active: 0,
            upcoming: 0
        };

        passes.forEach(p => {
            if (p.usedAt) {
                passSummary.used++;
            } else if (new Date(p.validTo) < now) {
                passSummary.expired++;
            } else if (new Date(p.validFrom) > now) {
                passSummary.upcoming++;
            } else {
                passSummary.active++;
            }
        });

        // =========================
        // 📦 RESPONSE
        // =========================
        return res.status(200).json({
            student: {
                id: student._id,
                name: student.name,
                email: student.email
            },

            requests: requestSummary,
            passes: passSummary
        });

    } catch (error) {
        console.error("Student History Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


module.exports = {
    createPassRequest,
    getMyPassRequests,
    handlePassChange,
    getMyPassesWithStatus,
    getGatekeeperPasses,
    markOut,
    markIn,
    scanQR,
    getAllPassRequests,
    getStudentHistory
};