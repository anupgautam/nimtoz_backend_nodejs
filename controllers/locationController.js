// controllers/locationController.js
import { locationSchema } from "../utils/validationSchema.js";
import { z } from "zod";
import db from "../config/prisma.js";

//! Get All Locations (with search, pagination, and product titles)
const getAllLocations = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = "";
        let params = [];

        if (search) {
            const searchTerm = `%${search.toLowerCase()}%`;
            whereClause = `WHERE LOWER(d.district_name) LIKE ?`;
            params.push(searchTerm);
        }

        // Count total
        const countQuery = `SELECT COUNT(*) as total FROM District d ${whereClause}`;
        const [countResult] = await db.execute(countQuery, params);
        const totalCount = countResult[0].total;

        // Fetch districts + product titles
        const locationsQuery = `
      SELECT 
        d.id,
        d.district_name,
        d.created_at,
        d.updated_at,
        p.id as product_id,
        p.title as product_title
      FROM District d
      LEFT JOIN Product p ON d.id = p.districtId
      ${whereClause}
      ORDER BY d.updated_at DESC
      LIMIT ? OFFSET ?
    `;

        const [rows] = await db.execute(locationsQuery, [...params, take, offset]);

        // Group products under each district
        const locations = [];
        const map = new Map();

        rows.forEach((row) => {
            const districtId = row.id;
            if (!map.has(districtId)) {
                const { product_id, product_title, ...district } = row;
                map.set(districtId, {
                    ...district,
                    products: [],
                });
            }
            if (row.product_id) {
                map.get(districtId).products.push({
                    id: row.product_id,
                    title: row.product_title,
                });
            }
        });

        map.forEach((val) => locations.push(val));

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            locations,
        });
    } catch (error) {
        console.error("getAllLocations error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Location by ID
const getLocationById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(`SELECT * FROM District WHERE id = ?`, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: `Location ${id} doesn't exist.` });
        }

        res.json({ success: true, location: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Delete Location by ID
const deleteLocationById = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(`DELETE FROM District WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: `Location with ID ${id} does not exist` });
        }

        res.json({ success: true, message: "Location Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Create Location
const createLocation = async (req, res) => {
    try {
        const validatedData = locationSchema.parse(req.body);
        const { district_name } = validatedData;

        const [result] = await db.execute(
            `INSERT INTO District (district_name, created_at, updated_at)
       VALUES (?, NOW(), NOW())`,
            [district_name]
        );

        const [newLocation] = await db.execute(`SELECT * FROM District WHERE id = ?`, [result.insertId]);

        res.status(201).json({ success: true, location: newLocation[0] });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error - errors.map((e) => e.message),
            });
        }
        res.status(400).json({ success: false, error: error.message });
    }
};

//! Update Location
const updateLocation = async (req, res) => {
    const { id } = req.params;

    try {
        const validatedData = locationSchema.parse(req.body);
        const { district_name } = validatedData;

        const [result] = await db.execute(
            `UPDATE District SET district_name = ?, updated_at = NOW() WHERE id = ?`,
            [district_name, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Location not found" });
        }

        const [updatedLocation] = await db.execute(`SELECT * FROM District WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: "Location Updated",
            location: updatedLocation[0],
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
    getAllLocations,
    getLocationById,
    deleteLocationById,
    createLocation,
    updateLocation,
};