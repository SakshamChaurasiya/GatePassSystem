const PassRequest = require("../models/passRequest.model");
const User = require("../models/user.model");
const Pass = require("../models/pass.model");
const GateLog = require("../models/gateLog.model");
const Notification = require("../models/notification.model");
const ExtensionRequest = require("../models/extensionRequest.model");
const { getStartOfDayIST } = require("../utils/date.utils");
const { v4: uuidv4 } = require("uuid");


// =========================
// CREATE PASS REQUEST
// =========================
const createPassRequest = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { reason, destination, fromDate, toDate } = req.body;

        if (!reason || !destination || !fromDate || !toDate) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const now = new Date();
        const from = new Date(fromDate);
        const to = new Date(toDate);

        if (from > to) {
            return res.status(400).json({ message: "fromDate cannot be after toDate" });
        }

        const diffInDays = Math.ceil((from - now) / (1000 * 60 * 60 * 24));
        if (diffInDays > 1) {
            return res.status(400).json({ message: "You can only request pass for today or tomorrow" });
        }
        if (diffInDays < 0) {
            return res.status(400).json({ message: "Cannot request pass for past dates" });
        }

        const existingRequest = await PassRequest.findOne({ studentId, status: "pending" });
        if (existingRequest) {
            return res.status(400).json({ message: "You already have a pending request. Please wait or cancel it first." });
        }

        // Block if there's a forwarded request (waiting on warden)
        const forwardedRequest = await PassRequest.findOne({ studentId, status: "forwarded" });
        if (forwardedRequest) {
            return res.status(400).json({ message: "You have a request forwarded to the warden. Please wait for it to be processed." });
        }

        // Block if student already has an active or out pass
        const activePass = await Pass.findOne({ studentId, status: { $in: ["active", "out"] } });
        if (activePass) {
            return res.status(400).json({ message: "You already have an active pass. You cannot request a new one until it is returned or expired." });
        }

        const cooldownHours = 1;
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        const lastRejected = await PassRequest.findOne({ studentId, status: "rejected" }).sort({ updatedAt: -1 });

        if (lastRejected) {
            const rejectedAt = lastRejected.wardenAction?.actedAt || lastRejected.managerAction?.actedAt;
            if (rejectedAt && (Date.now() - new Date(rejectedAt).getTime()) < cooldownMs) {
                return res.status(429).json({ message: `Wait ${cooldownHours} hours after rejection before requesting again` });
            }
        }

        const file = req.file;
        const passRequest = await PassRequest.create({
            studentId,
            reason,
            destination,
            fromDate: from,
            toDate: to,
            hostel: req.user.hostel,
            supportingDoc: file ? file.path : null,
            docPublicId: file ? file.filename : null
        });

        return res.status(201).json({ message: "Pass request submitted successfully", passRequest });
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
        const validStatuses = ["pending", "approved", "rejected", "forwarded", "cancelled"];
        let query = { studentId };

        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status filter" });
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

        return res.status(200).json({ count: formatted.length, requests: formatted });
    } catch (error) {
        console.error("Get My Pass Requests Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// GET MY PASSES WITH STATUS
// =========================
const getMyPassesWithStatus = async (req, res) => {
    try {
        const studentId = req.user.id;
        const now = new Date();

        const passes = await Pass.find({ studentId })
            .sort({ createdAt: -1 })
            .populate("studentId", "name email");

        const formatted = passes.map(pass => {
            let status = pass.status;
            // Auto-detect expired
            if (status === "active" && new Date(pass.validTo) < now) {
                status = "expired";
            }

            return {
                id: pass._id,
                passId: pass.passId,
                student: pass.studentId,
                validFrom: pass.validFrom,
                validTo: pass.validTo,
                usedAt: pass.usedAt || null,
                returnedAt: pass.returnedAt || null,
                qrCode: pass.qrCode,
                status,
                lateReturn: pass.lateReturn || false,
                createdAt: pass.createdAt
            };
        });

        return res.status(200).json({ count: formatted.length, passes: formatted });
    } catch (error) {
        console.error("Get My Passes Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// HANDLE PASS ACTION (Manager/Warden approve/reject/forward)
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

        if (student.hostel.toString() !== userHostel) {
            return res.status(403).json({ message: "You can only act within your hostel" });
        }

        if (["approved", "rejected", "cancelled"].includes(passRequest.status)) {
            return res.status(400).json({ message: "Already finalized" });
        }

        // MANAGER
        if (role === "manager") {
            if (passRequest.managerAction.status !== "pending") {
                return res.status(400).json({ message: "Already processed by manager" });
            }

            if (action === "forward") {
                passRequest.status = "forwarded";
                passRequest.managerAction = { status: "forwarded", remark, actedAt: new Date() };
            } else if (action === "approve") {
                passRequest.status = "approved";
                passRequest.managerAction = { status: "approved", remark, actedAt: new Date() };
                passRequest.approvedBy = userId;

                // Expire any existing active/out passes for this student (enforce single active pass)
                await Pass.updateMany(
                    { studentId: student._id, status: { $in: ["active", "out"] } },
                    { $set: { status: "expired" } }
                );

                await Pass.create({
                    passId: `PASS-${uuidv4().slice(0, 8)}`,
                    studentId: student._id,
                    passRequestId: passRequest._id,
                    hostel: student.hostel,
                    validFrom: passRequest.fromDate,
                    validTo: passRequest.toDate,
                    qrCode: `QR-${uuidv4()}`,
                    status: "active"
                });
            } else if (action === "reject") {
                passRequest.status = "rejected";
                passRequest.managerAction = { status: "rejected", remark, actedAt: new Date() };
            }
        }
        // WARDEN
        else if (role === "warden") {
            if (passRequest.status !== "forwarded") {
                return res.status(400).json({ message: "Only forwarded requests allowed" });
            }
            if (passRequest.wardenAction.status !== "pending") {
                return res.status(400).json({ message: "Already processed by warden" });
            }

            if (action === "approve") {
                passRequest.status = "approved";
                passRequest.wardenAction = { status: "approved", remark, actedAt: new Date() };
                passRequest.approvedBy = userId;

                // Expire any existing active/out passes for this student (enforce single active pass)
                await Pass.updateMany(
                    { studentId: student._id, status: { $in: ["active", "out"] } },
                    { $set: { status: "expired" } }
                );

                await Pass.create({
                    passId: `PASS-${uuidv4().slice(0, 8)}`,
                    studentId: student._id,
                    passRequestId: passRequest._id,
                    hostel: student.hostel,
                    validFrom: passRequest.fromDate,
                    validTo: passRequest.toDate,
                    qrCode: `QR-${uuidv4()}`,
                    status: "active"
                });
            } else if (action === "reject") {
                passRequest.status = "rejected";
                passRequest.wardenAction = { status: "rejected", remark, actedAt: new Date() };
            } else {
                return res.status(400).json({ message: "Warden cannot forward" });
            }
        }

        await passRequest.save();
        return res.status(200).json({ message: `Pass ${action}ed successfully`, passRequest });
    } catch (error) {
        console.error("Pass Action Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// CANCEL PASS REQUEST
// =========================
const cancelPassRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const studentId = req.user.id;
        const passRequest = await PassRequest.findOne({ _id: id, studentId });

        if (!passRequest) return res.status(404).json({ message: "Request not found" });
        if (passRequest.status !== "pending") return res.status(400).json({ message: "Only pending requests can be cancelled" });

        passRequest.status = "cancelled";
        await passRequest.save();
        return res.status(200).json({ message: "Request cancelled successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// GATEKEEPER — GET ALL APPROVED PASSES (FIXED: show all, not just unused)
// =========================
const getGatekeeperPasses = async (req, res) => {
    try {
        const hostelId = req.user.hostel;
        const todayStart = getStartOfDayIST();

        // Show passes that are: active, out, or returned today
        const passes = await Pass.find({
            hostel: hostelId,
            $or: [
                { status: "active" },
                { status: "out" },
                { status: "returned", returnedAt: { $gte: todayStart } }
            ]
        })
            .populate("studentId", "name email")
            .populate("gatekeeperOutId", "name")
            .populate("gatekeeperInId", "name")
            .sort({ createdAt: -1 });

        res.json({ count: passes.length, passes });
    } catch (err) {
        console.error("Get Gatekeeper Passes Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// MARK OUT (FIXED — removed strict validFrom check)
// =========================
const markOut = async (req, res) => {
    try {
        const { passId } = req.body;
        const pass = await Pass.findOne({ passId });

        if (!pass) return res.status(404).json({ message: "Invalid pass" });
        if (pass.hostel.toString() !== req.user.hostel) {
            return res.status(403).json({ message: "Pass does not belong to your hostel" });
        }

        // Only allow mark-out on active passes
        if (pass.status !== "active") {
            if (pass.status === "out") return res.status(400).json({ message: "Student already marked OUT" });
            if (pass.status === "returned") return res.status(400).json({ message: "Pass already completed" });
            if (pass.status === "expired") return res.status(400).json({ message: "Pass expired" });
            return res.status(400).json({ message: "Pass is not active" });
        }

        const now = new Date();

        // Check if pass has expired
        if (pass.validTo < now) {
            pass.status = "expired";
            await pass.save();
            return res.status(400).json({ message: "Pass expired" });
        }

        // Mark OUT — no strict validFrom check since pass is already approved
        pass.usedAt = now;
        pass.status = "out";
        pass.gatekeeperOutId = req.user.id;
        await pass.save();

        // Create gate log
        await GateLog.create({
            studentId: pass.studentId,
            passId: pass._id,
            gatekeeperId: req.user.id,
            action: "out",
            outTime: now,
            timestamp: now
        });

        // Notify manager & warden
        const student = await User.findById(pass.studentId);
        const staffMembers = await User.find({
            hostel: pass.hostel,
            role: { $in: ["manager", "warden"] }
        });

        for (const staff of staffMembers) {
            await Notification.create({
                recipient: staff._id,
                type: "STUDENT_OUT",
                message: `${student?.name || "Student"} has been marked OUT (Pass: ${pass.passId})`,
                relatedPass: pass._id
            });
        }

        return res.json({ message: "Student marked OUT successfully", pass });
    } catch (err) {
        console.error("Mark Out Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// MARK IN (FIXED — detect late returns)
// =========================
const markIn = async (req, res) => {
    try {
        const { passId } = req.body;
        const pass = await Pass.findOne({ passId });

        if (!pass) return res.status(404).json({ message: "Invalid pass" });
        if (pass.hostel.toString() !== req.user.hostel) {
            return res.status(403).json({ message: "Pass does not belong to your hostel" });
        }
        if (pass.status !== "out") {
            if (pass.status === "active") return res.status(400).json({ message: "Student not marked OUT yet" });
            if (pass.status === "returned") return res.status(400).json({ message: "Already marked IN" });
            return res.status(400).json({ message: "Cannot mark in for this pass" });
        }

        const now = new Date();
        const isLate = now > new Date(pass.validTo);

        pass.returnedAt = now;
        pass.status = "returned";
        pass.gatekeeperInId = req.user.id;
        pass.lateReturn = isLate;
        await pass.save();

        // Create gate log
        await GateLog.create({
            studentId: pass.studentId,
            passId: pass._id,
            gatekeeperId: req.user.id,
            action: "in",
            inTime: now,
            timestamp: now
        });

        // Notify manager & warden
        const student = await User.findById(pass.studentId);
        const staffMembers = await User.find({
            hostel: pass.hostel,
            role: { $in: ["manager", "warden"] }
        });

        const notifType = isLate ? "LATE_RETURN" : "STUDENT_IN";
        const notifMsg = isLate
            ? `⚠️ ${student?.name || "Student"} returned LATE (Pass: ${pass.passId})`
            : `${student?.name || "Student"} has returned (Pass: ${pass.passId})`;

        for (const staff of staffMembers) {
            await Notification.create({
                recipient: staff._id,
                type: notifType,
                message: notifMsg,
                relatedPass: pass._id
            });
        }

        return res.json({ message: isLate ? "Student marked IN (LATE RETURN)" : "Student marked IN successfully", pass });
    } catch (err) {
        console.error("Mark In Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// SCAN QR
// =========================
const scanQR = async (req, res) => {
    try {
        const { qrCode } = req.body;
        const pass = await Pass.findOne({ qrCode });

        if (!pass) return res.status(404).json({ message: "Invalid QR Code" });

        const now = new Date();

        // Auto-decide: if not out yet → mark out; if out → mark in
        if (pass.status === "active") {
            if (pass.validTo < now) {
                pass.status = "expired";
                await pass.save();
                return res.status(400).json({ message: "Pass expired" });
            }

            pass.usedAt = now;
            pass.status = "out";
            pass.gatekeeperOutId = req.user.id;
            await pass.save();

            await GateLog.create({
                studentId: pass.studentId, passId: pass._id,
                gatekeeperId: req.user.id, action: "out", outTime: now, timestamp: now
            });

            // Notify staff
            const student = await User.findById(pass.studentId);
            const staff = await User.find({ hostel: pass.hostel, role: { $in: ["manager", "warden"] } });
            for (const s of staff) {
                await Notification.create({
                    recipient: s._id, type: "STUDENT_OUT",
                    message: `${student?.name || "Student"} marked OUT via QR (Pass: ${pass.passId})`,
                    relatedPass: pass._id
                });
            }

            return res.json({ message: "OUT marked via QR", action: "out", pass });
        }

        if (pass.status === "out") {
            const isLate = now > new Date(pass.validTo);
            pass.returnedAt = now;
            pass.status = "returned";
            pass.gatekeeperInId = req.user.id;
            pass.lateReturn = isLate;
            await pass.save();

            await GateLog.create({
                studentId: pass.studentId, passId: pass._id,
                gatekeeperId: req.user.id, action: "in", inTime: now, timestamp: now
            });

            const student = await User.findById(pass.studentId);
            const staff = await User.find({ hostel: pass.hostel, role: { $in: ["manager", "warden"] } });
            const notifType = isLate ? "LATE_RETURN" : "STUDENT_IN";
            for (const s of staff) {
                await Notification.create({
                    recipient: s._id, type: notifType,
                    message: isLate
                        ? `⚠️ ${student?.name || "Student"} returned LATE via QR (Pass: ${pass.passId})`
                        : `${student?.name || "Student"} returned via QR (Pass: ${pass.passId})`,
                    relatedPass: pass._id
                });
            }

            return res.json({ message: isLate ? "IN marked via QR (LATE)" : "IN marked via QR", action: "in", pass });
        }

        return res.status(400).json({ message: "Pass already completed" });
    } catch (err) {
        console.error("Scan QR Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// GET ALL PASS REQUESTS (Manager/Warden)
// =========================
const getAllPassRequests = async (req, res) => {
    try {
        const role = req.user.role;
        const userHostel = req.user.hostel;

        if (!["manager", "warden"].includes(role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        let filter = { hostel: userHostel };
        if (role === "manager") filter.status = "pending";
        if (role === "warden") filter.status = "forwarded";

        const requests = await PassRequest.find(filter)
            .populate("studentId", "name email")
            .populate("approvedBy", "name role")
            .sort({ createdAt: -1 });

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
            approvedBy: item.approvedBy ? { name: item.approvedBy.name, role: item.approvedBy.role } : null,
            supportingDoc: item.supportingDoc || null,
            createdAt: item.createdAt
        }));

        return res.status(200).json({ count: formatted.length, requests: formatted });
    } catch (error) {
        console.error("Get All Pass Requests Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// STUDENT HISTORY (Enhanced — full detail)
// =========================
const getStudentHistory = async (req, res) => {
    try {
        const { studentId } = req.params;
        const role = req.user.role;
        const userHostel = req.user.hostel;
        const now = new Date();

        if (!["manager", "warden"].includes(role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const student = await User.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student not found" });
        if (student.hostel.toString() !== userHostel) {
            return res.status(403).json({ message: "Access denied for this hostel" });
        }

        // Request stats
        const requestStats = await PassRequest.aggregate([
            { $match: { studentId: student._id } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        let requestSummary = { total: 0, pending: 0, approved: 0, rejected: 0, forwarded: 0, cancelled: 0 };
        requestStats.forEach(r => { requestSummary[r._id] = r.count; requestSummary.total += r.count; });

        // All requests detail
        const allRequests = await PassRequest.find({ studentId: student._id })
            .sort({ createdAt: -1 })
            .populate("approvedBy", "name role");

        // Pass stats
        const passes = await Pass.find({ studentId: student._id })
            .sort({ createdAt: -1 })
            .populate("gatekeeperOutId", "name")
            .populate("gatekeeperInId", "name");

        let passSummary = { total: passes.length, active: 0, out: 0, returned: 0, expired: 0, lateReturns: 0 };
        passes.forEach(p => {
            if (p.status === "out") passSummary.out++;
            else if (p.status === "returned") passSummary.returned++;
            else if (p.status === "expired" || (p.status === "active" && new Date(p.validTo) < now)) passSummary.expired++;
            else passSummary.active++;
            if (p.lateReturn) passSummary.lateReturns++;
        });

        return res.status(200).json({
            student: { id: student._id, name: student.name, email: student.email },
            requests: requestSummary,
            requestDetails: allRequests,
            passes: passSummary,
            passDetails: passes
        });
    } catch (error) {
        console.error("Student History Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// MANAGER HISTORY (Warden-only)
// =========================
const getManagerHistory = async (req, res) => {
    try {
        const { managerId } = req.params;
        const role = req.user.role;
        const userHostel = req.user.hostel;

        if (role !== "warden") {
            return res.status(403).json({ message: "Access denied" });
        }

        const manager = await User.findById(managerId);
        if (!manager || manager.role !== "manager") {
            return res.status(404).json({ message: "Manager not found" });
        }
        if (manager.hostel.toString() !== userHostel) {
            return res.status(403).json({ message: "Access denied for this hostel" });
        }

        // All requests where manager took action
        const approvedRequests = await PassRequest.find({
            hostel: userHostel,
            "managerAction.status": "approved"
        }).populate("studentId", "name email").sort({ "managerAction.actedAt": -1 });

        const rejectedRequests = await PassRequest.find({
            hostel: userHostel,
            "managerAction.status": "rejected"
        }).populate("studentId", "name email").sort({ "managerAction.actedAt": -1 });

        const forwardedRequests = await PassRequest.find({
            hostel: userHostel,
            "managerAction.status": "forwarded"
        }).populate("studentId", "name email").sort({ "managerAction.actedAt": -1 });

        return res.status(200).json({
            manager: { id: manager._id, name: manager.name, email: manager.email },
            summary: {
                approved: approvedRequests.length,
                rejected: rejectedRequests.length,
                forwarded: forwardedRequests.length,
                total: approvedRequests.length + rejectedRequests.length + forwardedRequests.length
            },
            approvedRequests,
            rejectedRequests,
            forwardedRequests
        });
    } catch (error) {
        console.error("Manager History Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// ALL PASSES WITH STATUS (Live view for manager/warden)
// =========================
const getAllPassesWithStatus = async (req, res) => {
    try {
        const role = req.user.role;
        const userHostel = req.user.hostel;

        if (!["manager", "warden"].includes(role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const { status, studentId, fromDate, toDate } = req.query;
        let filter = { hostel: userHostel };

        if (status) filter.status = status;
        if (studentId) filter.studentId = studentId;
        if (fromDate || toDate) {
            filter.createdAt = {};
            if (fromDate) filter.createdAt.$gte = new Date(fromDate);
            if (toDate) filter.createdAt.$lte = new Date(toDate);
        }

        const passes = await Pass.find(filter)
            .populate("studentId", "name email")
            .populate("gatekeeperOutId", "name")
            .populate("gatekeeperInId", "name")
            .sort({ createdAt: -1 });

        // Summary stats
        const allPasses = await Pass.find({ hostel: userHostel });
        const summary = { total: allPasses.length, active: 0, out: 0, returned: 0, expired: 0, lateReturns: 0 };
        const now = new Date();
        allPasses.forEach(p => {
            if (p.status === "out") summary.out++;
            else if (p.status === "returned") summary.returned++;
            else if (p.status === "expired" || (p.status === "active" && new Date(p.validTo) < now)) summary.expired++;
            else summary.active++;
            if (p.lateReturn) summary.lateReturns++;
        });

        return res.status(200).json({ count: passes.length, summary, passes });
    } catch (error) {
        console.error("All Passes Status Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};


// =========================
// REQUEST EXTENSION (Student)
// =========================
const requestExtension = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { passId, requestedHours, remark } = req.body;

        if (!passId || !requestedHours || !remark) {
            return res.status(400).json({ message: "passId, requestedHours, and remark are required" });
        }

        const hours = parseInt(requestedHours);
        if (isNaN(hours) || hours < 1 || hours > 4) {
            return res.status(400).json({ message: "Extension must be between 1 and 4 hours" });
        }

        // Find the pass — must be owned by this student and currently "out"
        const pass = await Pass.findOne({ _id: passId, studentId });
        if (!pass) {
            return res.status(404).json({ message: "Pass not found" });
        }
        if (pass.status !== "out") {
            return res.status(400).json({ message: "You can only request extension for a pass that is currently in use (status: out)" });
        }

        // Check for existing pending/forwarded extension on this pass
        const existingExtension = await ExtensionRequest.findOne({
            passId: pass._id,
            status: { $in: ["pending", "forwarded"] }
        });
        if (existingExtension) {
            return res.status(400).json({ message: "You already have a pending extension request for this pass. Please wait for it to be processed." });
        }

        const originalValidTo = new Date(pass.validTo);
        const newValidTo = new Date(originalValidTo.getTime() + hours * 60 * 60 * 1000);

        const file = req.file;
        const extensionRequest = await ExtensionRequest.create({
            passId: pass._id,
            studentId,
            hostel: req.user.hostel,
            requestedHours: hours,
            originalValidTo,
            newValidTo,
            remark,
            supportingDoc: file ? file.path : null,
            docPublicId: file ? file.filename : null
        });

        // Notify managers & wardens in the hostel
        const student = await User.findById(studentId);
        const staffMembers = await User.find({
            hostel: pass.hostel,
            role: { $in: ["manager", "warden"] }
        });

        for (const staff of staffMembers) {
            await Notification.create({
                recipient: staff._id,
                type: "EXTENSION_REQUEST",
                message: `🕐 ${student?.name || "Student"} has requested a ${hours}hr extension for pass ${pass.passId}`,
                relatedPass: pass._id
            });
        }

        return res.status(201).json({ message: "Extension request submitted successfully", extensionRequest });
    } catch (error) {
        console.error("Request Extension Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// GET MY EXTENSION REQUESTS (Student)
// =========================
const getMyExtensionRequests = async (req, res) => {
    try {
        const studentId = req.user.id;

        const extensions = await ExtensionRequest.find({ studentId })
            .sort({ createdAt: -1 })
            .populate("passId", "passId validFrom validTo status")
            .populate("processedBy", "name role");

        return res.status(200).json({ count: extensions.length, extensions });
    } catch (error) {
        console.error("Get My Extensions Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// GET ALL EXTENSION REQUESTS (Manager/Warden)
// =========================
const getAllExtensionRequests = async (req, res) => {
    try {
        const role = req.user.role;
        const userHostel = req.user.hostel;

        if (!["manager", "warden"].includes(role)) {
            return res.status(403).json({ message: "Access denied" });
        }

        let filter = { hostel: userHostel };
        if (role === "manager") filter.status = "pending";
        if (role === "warden") filter.status = "forwarded";

        const extensions = await ExtensionRequest.find(filter)
            .populate("studentId", "name email")
            .populate("passId", "passId validFrom validTo status")
            .populate("processedBy", "name role")
            .sort({ createdAt: -1 });

        const formatted = extensions.map(ext => ({
            id: ext._id,
            student: {
                id: ext.studentId?._id,
                name: ext.studentId?.name,
                email: ext.studentId?.email
            },
            pass: {
                id: ext.passId?._id,
                passId: ext.passId?.passId,
                validFrom: ext.passId?.validFrom,
                validTo: ext.passId?.validTo,
                status: ext.passId?.status
            },
            requestedHours: ext.requestedHours,
            originalValidTo: ext.originalValidTo,
            newValidTo: ext.newValidTo,
            remark: ext.remark,
            supportingDoc: ext.supportingDoc || null,
            status: ext.status,
            managerAction: ext.managerAction,
            wardenAction: ext.wardenAction,
            processedBy: ext.processedBy ? { name: ext.processedBy.name, role: ext.processedBy.role } : null,
            createdAt: ext.createdAt
        }));

        return res.status(200).json({ count: formatted.length, extensions: formatted });
    } catch (error) {
        console.error("Get All Extensions Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =========================
// HANDLE EXTENSION ACTION (Manager/Warden)
// =========================
const handleExtensionAction = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const userHostel = req.user.hostel;
        const { id } = req.params;
        const { action, remark } = req.body;

        const validActions = ["approve", "reject", "forward"];
        if (!validActions.includes(action)) {
            return res.status(400).json({ message: "Invalid action. Must be approve, reject, or forward." });
        }

        const extension = await ExtensionRequest.findById(id);
        if (!extension) {
            return res.status(404).json({ message: "Extension request not found" });
        }

        if (extension.hostel.toString() !== userHostel) {
            return res.status(403).json({ message: "You can only act on extensions within your hostel" });
        }

        if (["approved", "rejected"].includes(extension.status)) {
            return res.status(400).json({ message: "Extension already finalized" });
        }

        const student = await User.findById(extension.studentId);
        const pass = await Pass.findById(extension.passId);

        if (!pass) {
            return res.status(404).json({ message: "Related pass not found" });
        }

        // MANAGER
        if (role === "manager") {
            if (extension.managerAction.status !== "pending") {
                return res.status(400).json({ message: "Already processed by manager" });
            }

            if (action === "forward") {
                extension.status = "forwarded";
                extension.managerAction = { status: "forwarded", remark, actedAt: new Date() };

                // Notify wardens
                const wardens = await User.find({ hostel: pass.hostel, role: "warden" });
                for (const w of wardens) {
                    await Notification.create({
                        recipient: w._id,
                        type: "EXTENSION_REQUEST",
                        message: `🔀 Extension request forwarded: ${student?.name || "Student"} wants ${extension.requestedHours}hr extension on pass ${pass.passId}`,
                        relatedPass: pass._id
                    });
                }
            } else if (action === "approve") {
                extension.status = "approved";
                extension.managerAction = { status: "approved", remark, actedAt: new Date() };
                extension.processedBy = userId;

                // Update the pass validTo
                pass.validTo = extension.newValidTo;
                await pass.save();

                // Notify student
                await Notification.create({
                    recipient: extension.studentId,
                    type: "EXTENSION_RESULT",
                    message: `✅ Your extension request for pass ${pass.passId} has been approved! New return time: ${extension.newValidTo.toLocaleString()}`,
                    relatedPass: pass._id
                });
            } else if (action === "reject") {
                extension.status = "rejected";
                extension.managerAction = { status: "rejected", remark, actedAt: new Date() };
                extension.processedBy = userId;

                // Notify student
                await Notification.create({
                    recipient: extension.studentId,
                    type: "EXTENSION_RESULT",
                    message: `❌ Your extension request for pass ${pass.passId} has been rejected.${remark ? " Reason: " + remark : ""}`,
                    relatedPass: pass._id
                });
            }
        }
        // WARDEN
        else if (role === "warden") {
            if (extension.status !== "forwarded") {
                return res.status(400).json({ message: "Only forwarded extensions can be acted on by warden" });
            }
            if (extension.wardenAction.status !== "pending") {
                return res.status(400).json({ message: "Already processed by warden" });
            }

            if (action === "approve") {
                extension.status = "approved";
                extension.wardenAction = { status: "approved", remark, actedAt: new Date() };
                extension.processedBy = userId;

                // Update the pass validTo
                pass.validTo = extension.newValidTo;
                await pass.save();

                // Notify student
                await Notification.create({
                    recipient: extension.studentId,
                    type: "EXTENSION_RESULT",
                    message: `✅ Your extension request for pass ${pass.passId} has been approved by warden! New return time: ${extension.newValidTo.toLocaleString()}`,
                    relatedPass: pass._id
                });
            } else if (action === "reject") {
                extension.status = "rejected";
                extension.wardenAction = { status: "rejected", remark, actedAt: new Date() };
                extension.processedBy = userId;

                // Notify student
                await Notification.create({
                    recipient: extension.studentId,
                    type: "EXTENSION_RESULT",
                    message: `❌ Your extension request for pass ${pass.passId} has been rejected by warden.${remark ? " Reason: " + remark : ""}`,
                    relatedPass: pass._id
                });
            } else {
                return res.status(400).json({ message: "Warden cannot forward extensions" });
            }
        }

        await extension.save();
        return res.status(200).json({ message: `Extension ${action}ed successfully`, extension });
    } catch (error) {
        console.error("Extension Action Error:", error);
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
    getStudentHistory,
    cancelPassRequest,
    getManagerHistory,
    getAllPassesWithStatus,
    requestExtension,
    getMyExtensionRequests,
    getAllExtensionRequests,
    handleExtensionAction
};