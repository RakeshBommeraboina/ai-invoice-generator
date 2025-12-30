const transporter = require("../config/mailer");

const sendEmail = async (mailOptions) => {
  try {
    console.log("📨 Sending email to:", mailOptions.to);

    const info = await transporter.sendMail({
      from: `"AI Invoice Generator" <${process.env.GMAIL_USER}>`,
      ...mailOptions,
    });

    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email send failed:", error);
    throw error;
  }
};

module.exports = { sendEmail };
