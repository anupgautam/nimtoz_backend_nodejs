import jwt from 'jsonwebtoken'

export const generateAccesstoken = (user) => {
    return jwt.sign(
        {
            id: user.id, role: user.role
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "30min" }
    )
}

export const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "30min" }
    )
}