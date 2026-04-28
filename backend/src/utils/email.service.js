const nodemailer = require("nodemailer");

// Create a transporter using environment variables or fallback to ethereal for testing
const getTransporter = () => {
    // If real SMTP credentials are provided, use them
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_PORT === "465",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    
    // Fallback: Using Ethereal Email (fake SMTP service) for local development if no real credentials
    console.warn("⚠️ No SMTP credentials found in .env. Using Ethereal Email for testing.");
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'mckenna.lindgren@ethereal.email',
            pass: 'XmY7Vq7n4b7uK3j3yG'
        }
    });
};

const transporter = getTransporter();

const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Gate Pass System" <${process.env.SMTP_USER || "noreply@gatepass.system"}>`,
            to,
            subject,
            html,
        });
        
        // Log the Ethereal URL if using fallback
        if (info.messageId && info.envelope.from === 'noreply@gatepass.system') {
             console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        }

        return { success: true, info };
    } catch (error) {
        console.error("Email Service Error:", error);
        throw error;
    }
};

module.exports = { sendEmail };
