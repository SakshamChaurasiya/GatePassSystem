require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/user.model");

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const count = await User.countDocuments({});
        console.log("Total users (countDocuments):", count);

        const users = await User.find({});
        console.log("Total users (find):", users.length);

        const roles = await User.distinct("role");
        console.log("Roles found:", roles);

        for (const role of roles) {
            const rCount = await User.countDocuments({ role });
            const rFind = await User.find({ role });
            console.log(`Role: ${role} | countDocuments: ${rCount} | find: ${rFind.length}`);
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

test();
