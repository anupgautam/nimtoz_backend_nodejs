import jwt from 'jsonwebtoken'
import { generateAccesstoken, generateRefreshToken } from '../auth/generateTokens.js';

import { prisma } from '../config/prisma.js'

const refreshToken = async (req, res) => {

    const { refreshToken } = req.body;

    try {
        if (!refreshToken) return res.sendStatus(401);
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.id } })

        if (!user || user.refreshToken !== refreshToken) return res.sendStatus(403)

        const newAccessToken = generateAccesstoken(user)
        const newRefreshToken = generateRefreshToken(user)

        await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: newRefreshToken }
        })

        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })

    } catch (error) {
        res.status(403).json({ success: false, error: error.message });
    }
}

export {
    refreshToken
}