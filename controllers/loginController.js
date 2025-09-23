import bcrypt from 'bcryptjs'
import { generateAccesstoken, generateRefreshToken } from "../auth/generateTokens.js";
import { loginSchema } from '../utils/validationSchema.js';
import { z } from 'zod'

import { prisma } from '../config/prisma.js'


//! Login User
const loginUser = async (req, res) => {
    try {
        // Validate input with zod
        const { phone_number, password } = loginSchema.parse(req.body);

        // Build where clause dynamically
        let where = {};
        if (phone_number) {
            where.phone_number = phone_number;
        } else {
            return res.status(400).json({ message: "Email or phone number is required" });
        }

        // Find user
        const user = await prisma.user.findUnique({ where });
        console.log('user', user);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Compare password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate tokens
        const accessToken = generateAccesstoken(user);
        const refreshToken = generateRefreshToken(user);

        res.json({ success: true, accessToken, refreshToken, user });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, error: error.message });
    }
};

export {
    loginUser
}