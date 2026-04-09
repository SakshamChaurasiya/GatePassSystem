const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const passRoutes = require("./routes/pass.routes");
const hostelRoutes = require("./routes/hostel.routes");
const checkOverduePasses = require("./jobs/overduePass.job");
const notificationRoutes = require("./routes/notification.routes");

dotenv.config();

connectDB();
checkOverduePasses();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000

//health route
app.use("/health", (req, res) => {
    return res.status(200).json({
        message: "ok"
    })
})

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/passes", passRoutes);
app.use("/api/hostel", hostelRoutes);
app.use("/api/notifications", notificationRoutes);


app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`)
})