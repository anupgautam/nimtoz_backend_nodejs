// controllers/authController.js
import db from "../config/prisma.js"; 

const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: "Email and OTP are required" });
  }

  try {
    // Find user by email
    const [users] = await db.execute(
      `SELECT id, isVerified, otp, otpExpiresAt FROM User WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = users[0];

    // Already verified
    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "User is already verified" });
    }

    // Invalid or expired OTP
    if (user.otp !== otp || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // Mark as verified and clear OTP
    await db.execute(
      `UPDATE User 
       SET isVerified = 1, otp = NULL, otpExpiresAt = NULL 
       WHERE id = ?`,
      [user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Account verified successfully",
    });
  } catch (error) {
    console.error("verifyOTP error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export { verifyOTP };