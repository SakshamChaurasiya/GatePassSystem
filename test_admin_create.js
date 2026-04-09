const axios = require("axios");

async function run() {
    try {
        const login = await axios.post("http://localhost:5000/api/auth/login", {
            email: "superadmin@example.com",
            password: "Admin@123"
        });
        const token = login.data.token;
        console.log("Token:", token.substring(0, 20) + "...");

        try {
            const createAdmin = await axios.post("http://localhost:5000/api/user/create-user", {
                name: "Test Admin",
                email: "testadmin@cdgi.com",
                role: "admin"
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log("Success:", createAdmin.data);
        } catch (e) {
            console.error("Status:", e.response?.status);
            console.error("Data:", JSON.stringify(e.response?.data, null, 2));
        }
    } catch (err) {
        console.error("Login failed:", err.message);
    }
}
run();
