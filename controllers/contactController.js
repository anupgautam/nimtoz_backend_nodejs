// controllers/contactController.js
import { databaseResponseTimeHistogram } from "../utils/metrics.js";
import { contactusSchema } from "../utils/validationSchema.js";
import { z } from "zod";
import db from "../config/prisma.js";

//! Get All Contacts (with search & pagination)
const getAllContacts = async (req, res) => {
    const metricsLabels = { operation: "getAllContacts" };
    const timer = databaseResponseTimeHistogram.startTimer();

    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = "";
        let params = [];

        if (search) {
            const searchTerm = `%${search.toLowerCase()}%`;
            whereClause = `WHERE LOWER(business_name) LIKE ?`;
            params.push(searchTerm);
        }

        // Count total
        const countQuery = `SELECT COUNT(*) as total FROM ContactUs ${whereClause}`;
        const [countResult] = await db.execute(countQuery, params);
        const totalCount = countResult[0].total;

        // Fetch contacts
        const contactsQuery = `
      SELECT * FROM ContactUs
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `;

        const [contacts] = await db.execute(contactsQuery, [...params, take, offset]);

        timer({ ...metricsLabels, success: true });
        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            contacts,
        });
    } catch (error) {
        timer({ ...metricsLabels, success: false });
        console.error("getAllContacts error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Contact by ID
const getContactsById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(`SELECT * FROM ContactUs WHERE id = ?`, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: `Contact ${id} doesn't exist.` });
        }

        res.json({ success: true, contact: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Delete Contact by ID
const deleteContactById = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(`DELETE FROM ContactUs WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: `Contact with ID ${id} does not exist` });
        }

        res.json({ success: true, message: "Contact Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Create Contact
const createContact = async (req, res) => {
    const metricsLabels = { operation: "createContact" };
    const timer = databaseResponseTimeHistogram.startTimer();

    try {
        const validatedData = contactusSchema.parse(req.body);
        const { business_name, email, address, phone_number, contact_person } = validatedData;

        // Check email uniqueness
        const [[existingEmail]] = await db.execute(`SELECT 1 FROM ContactUs WHERE email = ?`, [email]);
        if (existingEmail) {
            return res.status(409).json({ success: false, error: `Email ${email} already exists` });
        }

        // Check phone uniqueness (if provided)
        if (phone_number) {
            const [[existingPhone]] = await db.execute(`SELECT 1 FROM ContactUs WHERE phone_number = ?`, [phone_number]);
            if (existingPhone) {
                return res.status(409).json({ success: false, error: `Phone Number ${phone_number} already exists` });
            }
        }

        const [result] = await db.execute(
            `INSERT INTO ContactUs 
       (business_name, email, address, phone_number, contact_person, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [business_name, email, address, phone_number || null, contact_person]
        );

        const [newContact] = await db.execute(`SELECT * FROM ContactUs WHERE id = ?`, [result.insertId]);

        timer({ ...metricsLabels, success: true });
        res.status(201).json({ success: true, contact: newContact[0] });
    } catch (error) {
        timer({ ...metricsLabels, success: false });

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }

        res.status(400).json({ success: false, error: error.message });
    }
};

//! Update Contact
const updateContact = async (req, res) => {
    const { id } = req.params;

    try {
        const validatedData = contactusSchema.parse(req.body);
        const { business_name, email, address, phone_number, contact_person } = validatedData;

        const updates = [];
        const values = [];

        if (business_name !== undefined) {
            updates.push("business_name = ?");
            values.push(business_name);
        }
        if (email !== undefined) {
            updates.push("email = ?");
            values.push(email);
        }
        if (address !== undefined) {
            updates.push("address = ?");
            values.push(address);
        }
        if (phone_number !== undefined) {
            updates.push("phone_number = ?");
            values.push(phone_number);
        }
        if (contact_person !== undefined) {
            updates.push("contact_person = ?");
            values.push(contact_person);
        }

        updates.push("updated_at = NOW()");
        values.push(id);

        if (updates.length === 1) {
            return res.status(400).json({ success: false, error: "No fields to update" });
        }

        const [result] = await db.execute(
            `UPDATE ContactUs SET ${updates.join(", ")} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Contact not found" });
        }

        const [updatedContact] = await db.execute(`SELECT * FROM ContactUs WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: "Contact Updated",
            contact: updatedContact[0],
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }
        res.status(400).json({ success: false, error: error.message });
    }
};

export {
    getAllContacts,
    getContactsById,
    deleteContactById,
    createContact,
    updateContact,
};