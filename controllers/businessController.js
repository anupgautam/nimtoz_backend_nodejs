// controllers/businessController.js
import { venueSchema } from "../utils/validationSchema.js";
import { z } from "zod";
import db from "../config/prisma.js";

//! Get All Businesses (with search & pagination + products)
const getAllBusinesses = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = "";
        let params = [];

        if (search) {
            const searchTerm = `%${search.toLowerCase()}%`;
            whereClause = `
        WHERE (
          LOWER(v.venue_name) LIKE ? OR
          LOWER(v.venue_address) LIKE ? OR
          LOWER(v.contact_person) LIKE ? OR
          LOWER(v.phone_number) LIKE ? OR
          LOWER(v.email) LIKE ? OR
          LOWER(v.pan_vat_number) LIKE ?
        )
      `;
            params = Array(6).fill(searchTerm);
        }

        // Count total
        const countQuery = `
      SELECT COUNT(*) as total
      FROM Venue v
      ${whereClause}
    `;
        const [countResult] = await db.execute(countQuery, params);
        const totalCount = countResult[0].total;

        // Fetch businesses + products
        const businessesQuery = `
      SELECT 
        v.*,
        p.id as product_id,
        p.title as product_title,
        p.description as product_description,
        p.address as product_address,
        p.short_description,
        p.is_active as product_active,
        p.overall_rating,
        p.created_at as product_created_at,
        p.updated_at as product_updated_at
      FROM Venue v
      LEFT JOIN Product p ON v.id = p.businessId
      ${whereClause}
      ORDER BY v.updated_at DESC
      LIMIT ? OFFSET ?
    `;

        const [rows] = await db.execute(businessesQuery, [...params, take, offset]);

        // Group products under each venue
        const businesses = [];
        const map = new Map();

        rows.forEach((row) => {
            const venueId = row.id;
            if (!map.has(venueId)) {
                const { product_id, product_title, product_description, product_address, short_description, product_active, overall_rating, product_created_at, product_updated_at, ...venue } = row;
                map.set(venueId, {
                    ...venue,
                    products: [],
                });
            }

            if (row.product_id) {
                map.get(venueId).products.push({
                    id: row.product_id,
                    title: row.product_title,
                    description: row.product_description,
                    address: row.product_address,
                    short_description: row.short_description,
                    is_active: Boolean(row.product_active),
                    overall_rating: row.overall_rating,
                    created_at: row.product_created_at,
                    updated_at: row.product_updated_at,
                });
            }
        });

        map.forEach((val) => businesses.push(val));

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            businesses,
        });
    } catch (error) {
        console.error("getAllBusinesses error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Business by ID (with products)
const getBusinessById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(
            `SELECT 
         v.*,
         p.id as product_id,
         p.title as product_title,
         p.description as product_description,
         p.address as product_address,
         p.short_description,
         p.is_active as product_active,
         p.overall_rating,
         p.created_at as product_created_at,
         p.updated_at as product_updated_at
       FROM Venue v
       LEFT JOIN Product p ON v.id = p.businessId
       WHERE v.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: `Business ${id} doesn't exist.` });
        }

        const business = {
            ...rows[0],
            products: [],
        };

        rows.forEach((row) => {
            if (row.product_id) {
                business.products.push({
                    id: row.product_id,
                    title: row.product_title,
                    description: row.product_description,
                    address: row.product_address,
                    short_description: row.short_description,
                    is_active: Boolean(row.product_active),
                    overall_rating: row.overall_rating,
                    created_at: row.product_created_at,
                    updated_at: row.product_updated_at,
                });
            }
        });

        // Remove duplicate product fields from root
        delete business.product_id;
        delete business.product_title;
        // ... etc (optional)

        res.json({ success: true, business });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Delete Business by ID
const deleteBusinessById = async (req, res) => {
    const { id } = req.params;

    try {
        // 1️⃣ Check if any products exist for this business
        const [products] = await db.execute(
            `SELECT COUNT(*) AS count FROM Product WHERE businessId = ?`,
            [id]
        );
        if (products[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete business with ID ${id} because it has associated products`,
            });
        }

        // 2️⃣ Check if any events exist for this business
        const [events] = await db.execute(
            `SELECT COUNT(e.id) AS count
         FROM Event e
         JOIN Product p ON e.productId = p.id
         WHERE p.businessId = ?`,
            [id]
        );
        if (events[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete business with ID ${id} because it has associated bookings/events`,
            });
        }

        // 3️⃣ Delete the business
        const [result] = await db.execute(`DELETE FROM Venue WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: `Business with ID ${id} does not exist` });
        }

        res.json({ success: true, message: "Business deleted successfully" });
    } catch (error) {
        console.error("deleteBusinessById error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};


//! Create Business
const createBusiness = async (req, res) => {
    try {
        const validatedData = venueSchema.parse(req.body);

        const { venue_name, email, venue_address, phone_number, contact_person, pan_vat_number, active } = validatedData;

        const [result] = await db.execute(
            `INSERT INTO Venue 
       (venue_name, venue_address, contact_person, phone_number, email, pan_vat_number, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                venue_name,
                venue_address,
                contact_person,
                phone_number,
                email,
                pan_vat_number || null,
                active ?? false,
            ]
        );

        const [newBusiness] = await db.execute(`SELECT * FROM Venue WHERE id = ?`, [result.insertId]);

        res.status(201).json({ success: true, business: newBusiness[0] });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => ({
                    field: e.path.join("."),
                    message: e.message,
                })),
            });
        }
        res.status(400).json({ success: false, error: error.message });
    }
};

//! Update Business
const updateBusiness = async (req, res) => {
    const { id } = req.params;

    try {
        const validatedData = venueSchema.parse(req.body);

        const { venue_name, email, venue_address, phone_number, contact_person, pan_vat_number, active } = validatedData;

        const updates = [];
        const values = [];

        if (venue_name !== undefined) {
            updates.push("venue_name = ?");
            values.push(venue_name);
        }
        if (venue_address !== undefined) {
            updates.push("venue_address = ?");
            values.push(venue_address);
        }
        if (phone_number !== undefined) {
            updates.push("phone_number = ?");
            values.push(phone_number);
        }
        if (email !== undefined) {
            updates.push("email = ?");
            values.push(email);
        }
        if (pan_vat_number !== undefined) {
            updates.push("pan_vat_number = ?");
            values.push(pan_vat_number);
        }
        if (contact_person !== undefined) {
            updates.push("contact_person = ?");
            values.push(contact_person);
        }
        if (active !== undefined) {
            updates.push("active = ?");
            values.push(active);
        }

        updates.push("updated_at = NOW()");
        values.push(id);

        if (updates.length === 1) {
            return res.status(400).json({ success: false, error: "No fields to update" });
        }

        const [result] = await db.execute(
            `UPDATE Venue SET ${updates.join(", ")} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Business not found" });
        }

        const [updatedBusiness] = await db.execute(`SELECT * FROM Venue WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: "Business Updated",
            business: updatedBusiness[0],
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => ({
                    field: e.path.join("."),
                    message: e.message,
                })),
            });
        }
        res.status(400).json({ success: false, error: error.message });
    }
};

export {
    getAllBusinesses,
    getBusinessById,
    deleteBusinessById,
    createBusiness,
    updateBusiness,
};