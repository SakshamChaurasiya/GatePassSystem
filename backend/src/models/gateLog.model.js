const gateLogSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    passId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Pass"
    },

    outTime: Date,
    inTime: Date

}, { timestamps: true });

module.exports = mongoose.model("GateLog", gateLogSchema);