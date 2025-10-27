// controllers/authController.js
import { forgotPasswordSchema } from "../utils/validationSchema.js";
import crypto from "crypto";
import { z } from "zod";
import nodemailer from "nodemailer";
import db from "../config/prisma.js";

const forgotPassword = async (req, res) => {
    try {
        const validatedData = forgotPasswordSchema.parse(req.body);
        const { email } = validatedData;

        // 1. Check if user exists
        const [users] = await db.execute(`SELECT id, email FROM User WHERE email = ?`, [email]);

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: `User with ${email} not found.`,
            });
        }

        const user = users[0];

        // 2. Generate reset token
        const token = crypto.randomBytes(32).toString("hex");
        const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // 3. Save token & expiry to DB
        await db.execute(
            `UPDATE User 
       SET resetPasswordToken = ?, resetPasswordTokenExpiry = ? 
       WHERE email = ?`,
            [token, tokenExpiry, email]
        );

        // 4. Send email
        const transporter = nodemailer.createTransport({
            service: "Gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const resetLink = `${process.env.RESET_URL}/reset-password?token=${token}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset",
            html: `
        <div style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; text-align: center;">
          <div style="max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p style="font-size: 16px; color: #555;">
              You requested to reset your password. Click the button below to create a new password:
            </p>
            <a href="${resetLink}" style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
              Reset Password
            </a>
            <p style="font-size: 14px; color: #777;">
              If you did not request a password reset, please ignore this email.
            </p>
            <p style="font-size: 14px; color: #777;">
              Thank you,<br>Nimtoz
            </p>
          </div>
        </div>
      `,
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({
            success: true,
            message: "Check email for forgot password link.",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message),
            });
        }
        console.error("forgotPassword error:", error);
        res.status(400).json({ success: false, error: error.message });
    }
};

export { forgotPassword };