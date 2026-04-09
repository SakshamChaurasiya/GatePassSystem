async function run() {
    try {
        const loginRes = await fetch("http://localhost:3000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "admin@cdgi.com",
                password: "pass123"
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Token:", token.substring(0, 20) + "...");

        const createRes = await fetch("http://localhost:3000/api/user/create-user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                name: "Test Admin",
                email: "testadmin_new2@cdgi.com",
                role: "admin"
            })
        });
        
        const createData = await createRes.json();
        console.log("Status:", createRes.status);
        console.log("Data:", JSON.stringify(createData, null, 2));
    } catch (err) {
        console.error("Failed:", err.message);
    }
}
run();
