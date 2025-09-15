import { resetPasswordSchema } from "../utils/validationSchema.js";
import pkg from 'bcryptjs';
const { hashSync } = pkg;
import { z } from 'zod'

import { prisma } from '../config/prisma.js'

const resetPassword = async (req, res) => {

    try {
        const validatedData = resetPasswordSchema.parse(req.body);

        const { token, password } = validatedData;

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: token,
                resetPasswordTokenExpiry: {
                    gt: new Date(),
                }
            }
        })

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired token" })
        }

        const hashedPassword = hashSync(password, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordTokenExpiry: null,
            }
        })

        return res.status(200).json({ success: true, message: "Password reset successful" })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message)
            });
        }
        res.status(400).json({ error: error.message });
    }
}

export {
    resetPassword
}