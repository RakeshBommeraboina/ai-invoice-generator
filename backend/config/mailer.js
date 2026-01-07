const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,          // TLS
  secure: false,      // true for 465, false for 587
  auth: {
    user: process.env.GMAIL_USER,          // your-email@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD,  // 16-char App Password
  },
  tls: {
    rejectUnauthorized: false, // prevents TLS issues in some hosts
  },
});

// Verify SMTP connection on startup (recommended)
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP connection failed:", error);
  } else {
    console.log("✅ Gmail SMTP is ready to send emails");
  }
});

module.exports = transporter;
