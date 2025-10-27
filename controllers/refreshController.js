// controllers/authController.js
import jwt from "jsonwebtoken";
import { generateAccesstoken, generateRefreshToken } from "../auth/generateTokens.js";
import db from "../config/prisma.js"; // <-- your MySQL pool

const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    try {
        if (!refreshToken) {
            return res.sendStatus(401); // Unauthorized
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            return res.sendStatus(403); // Forbidden
        }

        // Fetch user with stored refresh token
        const [users] = await db.execute(
            `SELECT id, firstname, lastname, email, phone_number, role, avatar, refreshToken 
       FROM User 
       WHERE id = ? AND refreshToken = ?`,
            [decoded.id, refreshToken]
        );

        if (users.length === 0) {
            return res.sendStatus(403); // Invalid or expired token
        }

        const user = users[0];

        // Generate new tokens
        const newAccessToken = generateAccesstoken(user);
        const newRefreshToken = generateRefreshToken(user);

        // Update refresh token in DB
        await db.execute(
            `UPDATE User SET refreshToken = ? WHERE id = ?`,
            [newRefreshToken, user.id]
        );

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        console.error("refreshToken error:", error);
        res.status(403).json({ success: false, error: error.message });
    }
};

export { refreshToken };