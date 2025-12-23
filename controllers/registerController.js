// controllers/userController.js
import { registerSchema } from "../utils/validationSchema.js";
import bcrypt from "bcryptjs";
import { z } from "zod";
import nodemailer from "nodemailer";
import axios from "axios";
import db from "../config/prisma.js";

// Helper: Execute query
const query = async (sql, params = []) => {
    const [rows] = await db.execute(sql, params);
    return rows;
};

//! Send OTP via Email
const sendOTPEmail = async (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP code is: ${otp}`,
    });
};

//! Send OTP via SMS
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

//! Get All Users (with search & pagination)
const getAllUsers = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = "";
        let params = [];

        if (search) {
            const term = `%${search.toLowerCase()}%`;
            whereClause = `
                WHERE LOWER(firstname) LIKE ?
                   OR LOWER(lastname) LIKE ?
                   OR LOWER(email) LIKE ?
                   OR LOWER(phone_number) LIKE ?
            `;
            params.push(term, term, term, term);
        }

        const countQuery = `SELECT COUNT(*) as total FROM Users ${whereClause}`;
        const [countResult] = await db.execute(countQuery, params);
        const totalCount = countResult[0].total;

        const usersQuery = `
            SELECT 
                id,
                firstname,
                lastname,
                email,
                phone_number,
                role,
                status,
                isVerified,
                created_at,
                updated_at
            FROM Users
            ${whereClause}
            ORDER BY updated_at DESC
            LIMIT ? OFFSET ?
        `;

        const [users] = await db.execute(usersQuery, [...params, take, offset]);

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            users,
        });
    } catch (error) {
        console.error("getAllUsers error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Top 3 Bookers
const getTopBookers = async (req, res) => {
    try {
        const topUsers = await query(`
            SELECT 
                u.firstname,
                u.lastname,
                COUNT(e.id) AS booking_count
            FROM Users u
            JOIN Event e ON u.id = e.userId
            WHERE e.is_approved = 1
            GROUP BY u.id
            ORDER BY booking_count DESC
            LIMIT 3
        `);

        res.json(topUsers);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get User by ID
const getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.execute(
            `SELECT 
                id,
                firstname,
                lastname,
                email,
                phone_number,
                role,
                status,
                isVerified,
                created_at,
                updated_at
             FROM Users
             WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `User ${id} doesn't exist.`,
            });
        }

        res.json({ success: true, user: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Delete User by ID
const deleteUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.execute(
            `DELETE FROM Users WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: `User with ID ${id} does not exist`,
            });
        }

        res.json({ success: true, message: "User Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Register User
const createUser = async (req, res) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        const { firstname, lastname, email, password, phone_number } = validatedData;

        const [existing] = await db.execute(
            `SELECT id FROM Users WHERE email = ? OR phone_number = ?`,
            [email, phone_number]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                error: "User with this email or phone number already exists",
            });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        const [result] = await db.execute(
            `INSERT INTO Users
                (firstname, lastname, email, phone_number, password, role, otp, otpExpiresAt, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'USER', ?, ?, NOW(), NOW())`,
            [firstname, lastname, email, phone_number, hashedPassword, otp, otpExpiresAt]
        );

        await sendOTPSMS(phone_number, otp);

        const [newUser] = await db.execute(
            `SELECT 
                id,
                firstname,
                lastname,
                email,
                phone_number,
                role,
                status,
                isVerified
             FROM Users
             WHERE id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: newUser[0],
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map(e => e.message),
            });
        }
        res.status(400).json({ success: false, error: error.message });
    }
};

//! Update User Role + Status + isVerified
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { role, status, isVerified } = req.body;

    try {
        const fields = [];
        const values = [];

        if (role) {
            fields.push("role = ?");
            values.push(role);
        }

        if (status) {
            if (!["ACTIVE", "INACTIVE"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    error: "Status must be either ACTIVE or INACTIVE",
                });
            }
            fields.push("status = ?");
            values.push(status);
        }

        if (typeof isVerified !== "undefined") {
            fields.push("isVerified = ?");
            values.push(isVerified ? 1 : 0);
        }

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Nothing to update",
            });
        }

        fields.push("updated_at = NOW()");

        const sql = `
            UPDATE Users
            SET ${fields.join(", ")}
            WHERE id = ?
        `;

        values.push(id);

        const [result] = await db.execute(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        const [updatedUser] = await db.execute(
            `SELECT 
                id,
                firstname,
                lastname,
                email,
                phone_number,
                role,
                status,
                isVerified,
                created_at,
                updated_at
             FROM Users
             WHERE id = ?`,
            [id]
        );

        res.json({
            success: true,
            message: "User updated successfully",
            user: updatedUser[0],
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export {
    getAllUsers,
    getUserById,
    getTopBookers,
    deleteUserById,
    createUser,
    updateUser,
};
