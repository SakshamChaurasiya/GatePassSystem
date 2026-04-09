const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const roleHierarchy = require("../config/roleHierarchy");

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                message: "User not found or inactive"
            });
        }

        req.user = {
            id: user._id,
            role: user.role,
            hostel: user.hostel?.toString(), // 🔥 normalize
            mustChangePassword: user.mustChangePassword,
            profileCompleted: user.profileCompleted // 🔥 FIXED
        };

        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token expired" });
        }
        return res.status(401).json({ message: "Invalid token" });
    }
};

exports.enforcePasswordChange = (req, res, next) => {
    if (req.user.mustChangePassword) {
        return res.status(403).json({
            message: "Please change your password first"
        });
    }

    next();
};

exports.authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                message: "Not authorized"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied for role: ${req.user.role}`
            });
        }

        next();
    };
};

exports.canCreateUser = (req, res, next) => {
    const creatorRole = req.user.role;
    const { role: targetRole } = req.body;

    const validRoles = ['super-admin', 'admin', 'warden', 'gatekeeper', 'manager', 'student'];

    if (!validRoles.includes(targetRole)) {
        return res.status(400).json({
            message: "Invalid role specified"
        });
    }

    if (!roleHierarchy[creatorRole]) {
        return res.status(403).json({
            message: "Invalid role hierarchy configuration"
        });
    }

    const allowedRoles = roleHierarchy[creatorRole];

    if (!allowedRoles.includes(targetRole)) {
        return res.status(403).json({
            message: `${creatorRole} cannot create ${targetRole}`
        });
    }

    next();
};

exports.requireProfile = (req, res, next) => {
    if (req.user.profileCompleted==false) {
        return res.status(403).json({
            message: "Complete profile first"
        });
    }
    next();
};