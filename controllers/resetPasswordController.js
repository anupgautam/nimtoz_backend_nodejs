// controllers/authController.js
import { resetPasswordSchema } from "../utils/validationSchema.js";
import bcrypt from "bcryptjs"; // modern import
import { z } from "zod";
import db from "../config/prisma.js"; 

const resetPassword = async (req, res) => {
    try {
        const validatedData = resetPasswordSchema.parse(req.body);
        const { token, password } = validatedData;

        // Find user with valid token and non-expired
        const [users] = await db.execute(
            `SELECT id FROM User 
       WHERE resetPasswordToken = ? 
         AND resetPasswordTokenExpiry > NOW()`,
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired token",
            });
        }

        const user = users[0];
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Update password and clear token
        await db.execute(
            `UPDATE User 
       SET password = ?, 
           resetPasswordToken = NULL, 
           resetPasswordTokenExpiry = NULL 
       WHERE id = ?`,
            [hashedPassword, user.id]
        );

        return res.status(200).json({
            success: true,
            message: "Password reset successful",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message),
            });
        }
        console.error("resetPassword error:", error);
        res.status(400).json({ success: false, error: error.message });
    }
};

export { resetPassword };