// controllers/authController.js
import bcrypt from "bcryptjs";
import { generateAccesstoken, generateRefreshToken } from "../auth/generateTokens.js";
import { loginSchema } from "../utils/validationSchema.js";
import { z } from "zod";
import db from "../config/prisma.js";

//! Login User
const loginUser = async (req, res) => {
    try {
        // Validate input with zod
        const { phone_number, password } = loginSchema.parse(req.body);

        // Validate required field
        if (!phone_number) {
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }

        // Find user by phone_number
        const [rows] = await db.execute(
            `SELECT id, firstname, lastname, email, phone_number, password, role, avatar 
       FROM User 
       WHERE phone_number = ?`,
            [phone_number]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user = rows[0];

        // Compare password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // Remove password from user object
        const { password: _, ...userWithoutPassword } = user;

        // Generate tokens
        const accessToken = generateAccesstoken(userWithoutPassword);
        const refreshToken = generateRefreshToken(userWithoutPassword);

        res.json({
            success: true,
            accessToken,
            refreshToken,
            user: userWithoutPassword,
        });
    } catch (error) {
        console.error("loginUser error:", error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message),
            });
        }

        res.status(400).json({ success: false, error: error.message });
    }
};

export { loginUser };