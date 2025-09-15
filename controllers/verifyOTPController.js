import { prisma } from "../config/prisma.js";


const verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).send("Email and OTP are required")
    }


    try {
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) return res.status(404).send('User not found');
        if (user.isVerified) return res.status(400).send('User is already verified');
        if (user.otp !== otp || user.otpExpiresAt < new Date())
            return res.status(400).send('Invalid or expired OTP');

        await prisma.user.update({
            where: { email },
            data: { isVerified: true, otp: null, otpExpiresAt: null },
        });

        return res.status(200).json({ success: true, message: "Account verified successfully" })

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
    verifyOTP
}