const User = require("../models/user.model");
const jwt = require("jsonwebtoken");

// 🔑 Generate JWT
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );
};



// =========================
// 🔓 LOGIN
// =========================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        

        // 1. Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // 2. Find user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // 3. Check active status
        if (!user.isActive) {
            return res.status(403).json({
                message: "Account is deactivated"
            });
        }

        // 4. Compare password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // 5. Handle forced password change
        if (user.mustChangePassword) {
            const token = generateToken(user);

            return res.status(200).json({
                message: "Password change required",
                mustChangePassword: true,
                token,
                role: user.role
            });
        }

        // 6. Normal login
        const token = generateToken(user);

        return res.status(200).json({
            message: "Login successful",
            token,
            role: user.role
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
};



// =========================
// 🔁 CHANGE PASSWORD
// =========================
const changePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({
                message: "New password is required"
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Prevent reusing same password
        const isSame = await user.comparePassword(newPassword);
        if (isSame) {
            return res.status(400).json({
                message: "New password cannot be same as old password"
            });
        }

        user.password = newPassword;
        user.mustChangePassword = false;

        await user.save();

        res.status(200).json({
            message: "Password updated successfully"
        });

    } catch (error) {
        console.error("Change Password Error:", error);
        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = { login, changePassword };