import bcrypt from 'bcryptjs'
import { generateAccesstoken, generateRefreshToken } from "../auth/generateTokens.js";
import { loginSchema } from '../utils/validationSchema.js';
import { z } from 'zod'

import { prisma } from '../config/prisma.js'


//! Login User
const loginUser = async (req, res) => {
    let validatedData;
    try {
        validatedData = loginSchema.parse(req.body);
        console.log('validatedDatavalidatedData', validatedData);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ success: false, errors: err.errors });
        }
        return res.status(500).json({ success: false, message: 'Server error' });
    }

    const { email, password } = validatedData;

    const foundUser = await prisma.user.findUnique({ where: { email } });
    if (!foundUser) {
        return res.status(404).json("User Not Found");
    }

    const validPassword = bcrypt.compareSync(password, foundUser.password);
    if (!validPassword) {
        return res.status(401).json('Invalid credentials');
    }

    const accessToken = generateAccesstoken(foundUser);
    const refreshToken = generateRefreshToken(foundUser);

    try {
        const updatedUser = await prisma.user.update({
            where: { id: foundUser.id },
            data: { refreshToken }
        });

        return res.json({
            success: true,
            accessToken,
            refreshToken,
            user: updatedUser
        });

    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export {
    loginUser
}