import bcrypt from 'bcryptjs'
import { generateAccesstoken, generateRefreshToken } from "../auth/generateTokens.js";
import { loginSchema } from '../utils/validationSchema.js';
import { z } from 'zod'

import { prisma } from '../config/prisma.js'


//! Login User
const loginUser = async (req, res) => {
    const validatedData = loginSchema.parse(req.body)
    const { email, password } = validatedData;

    const foundUser = await prisma.user.findUnique({ where: { email } })

    if (!foundUser) return res.status(404).json("User Not Found")
    // if (!foundUser.isVerified) return res.status(400).json('Please verify your account first');

    const validPassword = bcrypt.compareSync(password, foundUser.password);

    if (!validPassword) return res.status(404).json('Invalid password');

    const accessToken = generateAccesstoken(foundUser);
    const refreshToken = generateRefreshToken(foundUser);

    try {
        const updatedUser = await prisma.user.update({
            where: { id: foundUser.id },
            data: { refreshToken }
        });

        return res.json({ accessToken, refreshToken, user: updatedUser })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message)
            });
        }
        res.status(400).json({ success: false, message: error.message });
    }
}

export {
    loginUser
}