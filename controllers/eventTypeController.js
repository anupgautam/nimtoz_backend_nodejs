// controllers/eventTypeController.js
import { eventTypeSchema } from "../utils/validationSchema.js";
import { z } from "zod";
import db from "../config/prisma.js";

//! Get All Event Types (with search & pagination)
const getAllEventTypes = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = "";
        let params = [];

        if (search) {
            const searchTerm = `%${search.toLowerCase()}%`;
            whereClause = `WHERE LOWER(title) LIKE ?`;
            params.push(searchTerm);
        }

        // Count total
        const countQuery = `SELECT COUNT(*) as total FROM EventType ${whereClause}`;
        const [countResult] = await db.execute(countQuery, params);
        const totalCount = countResult[0].total;

        // Fetch event types
        const eventTypesQuery = `
      SELECT * FROM EventType
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `;

        const [eventTypes] = await db.execute(eventTypesQuery, [...params, take, offset]);

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            eventTypes,
        });
    } catch (error) {
        console.error("getAllEventTypes error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Event Type by ID
const getEventTypeById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(`SELECT * FROM EventType WHERE id = ?`, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: `Event Type ${id} doesn't exist.` });
        }

        res.json({ success: true, eventType: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Delete Event Type by ID
const deleteEventTypeById = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(`DELETE FROM EventType WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: `Event Type with ID ${id} does not exist` });
        }

        res.json({ success: true, message: "Event Type Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Create Event Type
const createEventType = async (req, res) => {
    try {
        const validatedData = eventTypeSchema.parse(req.body);
        const { title } = validatedData;

        const [result] = await db.execute(
            `INSERT INTO EventType (title, created_at, updated_at)
       VALUES (?, NOW(), NOW())`,
            [title]
        );

        const [newEventType] = await db.execute(`SELECT * FROM EventType WHERE id = ?`, [result.insertId]);

        res.status(201).json({ success: true, eventType: newEventType[0] });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message),
            });
        }
        res.status(400).json({ success: false, error: error.message });
    }
};

//! Update Event Type
const updateEventType = async (req, res) => {
    const { id } = req.params;

    try {
        const validatedData = eventTypeSchema.parse(req.body);
        const { title } = validatedData;

        const [result] = await db.execute(
            `UPDATE EventType SET title = ?, updated_at = NOW() WHERE id = ?`,
            [title, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Event Type not found" });
        }

        const [updatedEventType] = await db.execute(`SELECT * FROM EventType WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: "EventType Updated",
            eventType: updatedEventType[0],
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
    getAllEventTypes,
    getEventTypeById,
    deleteEventTypeById,
    createEventType,
    updateEventType,
};