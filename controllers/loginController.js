// controllers/authController.js
import bcrypt from "bcryptjs";
import { generateAccesstoken, generateRefreshToken } from "../auth/generateTokens.js";
import { loginSchema } from "../utils/validationSchema.js";
import { z } from "zod";
import db from "../config/prisma.js"; // your MySQL connection

//! Login User
const loginUser = async (req, res) => {
  try {
    // Validate input
    const { phone_number, password } = loginSchema.parse(req.body);

    if (!phone_number || !password) {
      return res.status(400).json({ success: false, message: "Phone number and password are required" });
    }

    // Find user by phone_number
    const [rows] = await db.execute(
      `SELECT 
          id,
          firstname,
          lastname,
          email,
          phone_number,
          password,
          role,
          avatar,
          isVerified,
          status
       FROM Users
       WHERE phone_number = ?`,
      [phone_number]
    );

    // If user not found OR password invalid, return generic error
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: "Phone number or password is incorrect" });
    }

    const user = rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ success: false, message: "Phone number or password is incorrect" });
    }

    // Check if user is ACTIVE
    if (user.status !== "ACTIVE") {
      return res.status(400).json({ success: false, message: "User account is inactive" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({ success: false, message: "User email/phone is not verified" });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Generate tokens
    const accessToken = generateAccesstoken({
      id: userWithoutPassword.id,
      role: userWithoutPassword.role,
      isVerified: Boolean(userWithoutPassword.isVerified),
    });

    const refreshToken = generateRefreshToken({
      id: userWithoutPassword.id,
      isVerified: Boolean(userWithoutPassword.isVerified),
    });

    // Respond
    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        ...userWithoutPassword,
        isVerified: Boolean(userWithoutPassword.isVerified),
      },
    });
  } catch (error) {
    console.error("loginUser error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors.map((e) => e.message),
      });
    }

    res.status(500).json({ success: false, error: error.message });
  }
};

export { loginUser };
