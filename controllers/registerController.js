import { registerSchema } from "../utils/validationSchema.js";
import bcrypt from 'bcryptjs'
import { generateAccesstoken, generateRefreshToken } from "../auth/generateTokens.js";
import { z } from 'zod'
import nodemailer from 'nodemailer'
import axios from "axios";

import { prisma } from '../config/prisma.js'


//! OTP wala
const sendOTPEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.EMAIL_USER, // Gmail email address
            pass: process.env.EMAIL_PASS, // Gmail app password
        },
    });
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is: ${otp}`,
    });
    console.log('transporter', transporter);
}

const sendOTPSMS = async (phone, otp) => {
    const apiKey = process.env.SMS_API_KEY;
    const senderId = "FSN_Alert";
    const message = `Your OTP code is: ${otp}`;

    try {
        const url = `https://samayasms.com.np/smsapi/index?key=${apiKey}&contacts=${phone}&senderid=${senderId}&msg=${message}&responsetype=json`;

        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("Error sending SMS:", error.message);
        throw new Error("Failed to send SMS");
    }
};


//! Get All Users
const getAllUsers = async (req, res) => {

    try {
        const { search, page = 1, limit = 10 } = req.query;

        const where = search
            ? {
                OR: [
                    { firstname: { contains: search.toLowerCase() } },
                    { lastname: { contains: search.toLowerCase() } },
                    { email: { contains: search.toLowerCase() } },
                    { phone_number: { contains: search.toLowerCase() } },
                ]
            }
            : {};

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const users = await prisma.user.findMany({
            where,
            include: {
                events_booked: true
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take,
        });

        const totalCount = await prisma.user.count({ where });

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            users
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//! Get Top 3 bookers
const getTopBookers = async (req, res) => {
    try {
        const topUsers = await prisma.user.findMany({
            take: 3,
            orderBy: {
                events_booked: {
                    _count: 'desc',
                },
            },
            where: {
                events_booked: {
                    some: {
                        is_approved: true,
                    },
                },
            },
            select: {
                firstname: true,
                lastname: true,
                events_booked: true,
            },
        });

        if (!topUsers) return res.status(404).json({ success: false })
        res.json(topUsers)

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}
//! Get User by Id
const getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: Number(id) }
        })

        if (!user) return res.status(404).json({ error: `User ${id} doesn't exist.` })

        res.json({ success: true, user })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Delete User By Id
const deleteUserById = async (req, res) => {
    const { id } = req.params;
    try {

        const user = await prisma.user.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ success: true, message: "User Deleted" });
    } catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: `User with ID ${id} does not exist` });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

//! Register User
const createUser = async (req, res) => {

    const validatedData = registerSchema.parse(req.body)
    const { firstname, lastname, email, password, phone_number } = validatedData;

    const existingUser = await prisma.user.findUnique({

        where: { email }
    })

    if (existingUser) {
        return res.status(400).json({ error: `User with this phone number ${existingUser.phone_number} already exists` })
    }

    try {
        const hashedPassword = bcrypt.hashSync(password, 10)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const user = await prisma.user.create({
            data: {
                firstname: firstname,
                lastname: lastname,
                email: email,
                phone_number: phone_number,
                password: hashedPassword,
                role: "USER",
                otp,
                otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // OTP expires in 15 minutes
            }
        })

        await sendOTPSMS(phone_number, otp);

        res.status(201).json({ success: true, message: 'User registered successfully.', user: user });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message)
            });
        }
        res.status(400).json({ success: false, error: error.message });
    }
}

//! Update User Role
const updateUser = async (req, res) => {

    const { id } = req.params;

    try {
        const { role } = req.body;
        const user = await prisma.user.update({
            where: { id: Number(id) },
            data: {
                role
            }
        })
        res.status(200).json({ success: true, message: "User Role", user })
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
    getAllUsers,
    getUserById,
    getTopBookers,
    deleteUserById,
    createUser,
    updateUser,
}