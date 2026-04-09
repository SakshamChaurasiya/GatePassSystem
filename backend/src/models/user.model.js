const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['super-admin', 'admin', 'gatekeeper', 'warden', 'manager', 'student'],
        required: true
    },
    hostel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Hostel",
    validate: {
        validator: function (value) {
            if (!this.role) return true;

            if (["warden", "manager", "student", "gatekeeper"].includes(this.role)) {
                return !!value;
            }

            return true;
        },
        message: "Hostel is required for this role"
    }
},
    isActive: {
        type: Boolean,
        default: true
    },
    mustChangePassword: {
        type: Boolean,
        default: true
    },
    profileCompleted: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);