// controllers/categoryController.js
import { categorySchema } from "../utils/validationSchema.js";
import { z } from "zod";
import db from "../config/prisma.js";

//! Get All Categories (with search, pagination, and product titles)
const getAllCategories = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = "";
        let params = [];

        if (search) {
            const searchTerm = `%${search.toLowerCase()}%`;
            whereClause = `WHERE LOWER(c.category_name) LIKE ?`;
            params.push(searchTerm);
        }

        // Count total
        const countQuery = `SELECT COUNT(*) as total FROM Category c ${whereClause}`;
        const [countResult] = await db.execute(countQuery, params);
        const totalCount = countResult[0].total;

        // Fetch categories + product titles
        const categoriesQuery = `
      SELECT 
        c.id,
        c.category_name,
        c.category_icon,
        c.created_at,
        c.updated_at,
        p.id as product_id,
        p.title as product_title
      FROM Category c
      LEFT JOIN Product p ON c.id = p.category_id
      ${whereClause}
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `;

        const [rows] = await db.execute(categoriesQuery, [...params, take, offset]);

        // Group products under each category
        const categories = [];
        const map = new Map();

        rows.forEach((row) => {
            const catId = row.id;
            if (!map.has(catId)) {
                const { product_id, product_title, ...cat } = row;
                map.set(catId, {
                    ...cat,
                    products: [],
                });
            }
            if (row.product_id) {
                map.get(catId).products.push({
                    id: row.product_id,
                    title: row.product_title,
                });
            }
        });

        map.forEach((val) => categories.push(val));

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            categories,
        });
    } catch (error) {
        console.error("getAllCategories error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Category by ID
const getCategoryById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(
            `SELECT * FROM Category WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: `Category ${id} doesn't exist` });
        }

        res.json({ success: true, category: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Category by Product ID
const getCategoryByProductId = async (req, res) => {
    const { id: productId } = req.params;
    try {
        const [rows] = await db.execute(
            `SELECT c.id, c.category_name 
       FROM Category c
       JOIN Product p ON c.id = p.category_id
       WHERE p.id = ?`,
            [productId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: `Category of product ${productId} doesn't exist` });
        }

        res.json({ success: true, category: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Delete Category by ID
const deleteCategoryById = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(`DELETE FROM Category WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: `Category with ID ${id} does not exist` });
        }

        res.json({ success: true, message: "Category Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Create Category
const createCategory = async (req, res) => {
    try {
        const validatedData = categorySchema.parse(req.body);
        const categoryIconPath = req.file ? `/uploads/categories/${req.file.filename}` : null;

        if (!categoryIconPath) {
            return res.status(400).json({ success: false, error: "Category icon is required" });
        }

        const [result] = await db.execute(
            `INSERT INTO Category (category_name, category_icon, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())`,
            [validatedData.category_name, categoryIconPath]
        );

        const [newCategory] = await db.execute(`SELECT * FROM Category WHERE id = ?`, [result.insertId]);

        res.status(201).json({ success: true, category: newCategory[0] });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message),
            });
        }
        const nullError = error.message.match(/`(.+?)` must not be null/);
        res.status(400).json({
            success: false,
            error: nullError ? nullError[0] : error.message,
        });
    }
};

//! Update Category
const updateCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const validatedData = categorySchema.parse(req.body);
        const categoryIconPath = req.file
            ? `/uploads/categories/${req.file.filename}`
            : validatedData.category_icon || null;

        const updates = [];
        const values = [];

        if (validatedData.category_name) {
            updates.push("category_name = ?");
            values.push(validatedData.category_name);
        }
        if (categoryIconPath !== null) {
            updates.push("category_icon = ?");
            values.push(categoryIconPath);
        }

        updates.push("updated_at = NOW()");
        values.push(id);

        if (updates.length === 1) {
            return res.status(400).json({ success: false, error: "No fields to update" });
        }

        const [result] = await db.execute(
            `UPDATE Category SET ${updates.join(", ")} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Category not found" });
        }

        const [updatedCategory] = await db.execute(`SELECT * FROM Category WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: "Category Updated",
            category: updatedCategory[0],
        });
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

//! Count Categories with Product Count
const countCategory = async (req, res) => {
    try {
        const [rows] = await db.execute(`
      SELECT 
        c.category_name,
        COUNT(p.id) as product_count
      FROM Category c
      LEFT JOIN Product p ON c.id = p.category_id
      GROUP BY c.id, c.category_name
      ORDER BY c.updated_at DESC
    `);

        const result = rows.map((row) => ({
            category_name: row.category_name,
            _count: { products: parseInt(row.product_count) },
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export {
    getAllCategories,
    getCategoryById,
    getCategoryByProductId,
    deleteCategoryById,
    createCategory,
    updateCategory,
    countCategory,
};