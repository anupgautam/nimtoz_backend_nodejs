// controllers/blogController.js
import db from "../config/prisma.js";
import { blogSchema } from "../utils/validationSchema.js";
import { z } from "zod";


// Helper: escape LIKE patterns
const escapeLike = (str) => str.replace(/[%_]/g, "\\$&");

//! Get All Blogs (with search & pagination)
const getAllBlogs = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = "";
        let params = [];

        if (search) {
            const searchLower = `%${search.toLowerCase()}%`;
            whereClause = `
        WHERE (
          LOWER(b.title) LIKE ? OR
          LOWER(u.firstname) LIKE ? OR
          LOWER(u.lastname) LIKE ?
        )
      `;
            params.push(searchLower, searchLower, searchLower);
        }

        const countQuery = `
      SELECT COUNT(*) as total
      FROM Blog b
      LEFT JOIN User u ON b.authorId = u.id
      ${whereClause}
    `;

        const [countResult] = await db.execute(countQuery, params);
        const totalCount = countResult[0].total;

        const blogsQuery = `
      SELECT 
        b.*,
        u.id as author_id,
        u.firstname as author_firstname,
        u.lastname as author_lastname,
        u.email as author_email,
        u.avatar as author_avatar
      FROM Blog b
      LEFT JOIN User u ON b.authorId = u.id
      ${whereClause}
      ORDER BY b.updated_at DESC
      LIMIT ? OFFSET ?
    `;

        const [blogs] = await db.execute(blogsQuery, [...params, take, offset]);

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            blogs,
        });
    } catch (error) {
        console.error("getAllBlogs error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Static Blogs (no search, just pagination)
const getStatBlogs = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [blogs] = await db.execute(
            `SELECT * FROM Blog ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
            [take, offset]
        );

        res.json({ success: true, blogs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Blog by ID
const getBlogById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(
            `SELECT 
         b.*,
         u.id as author_id,
         u.firstname as author_firstname,
         u.lastname as author_lastname,
         u.email as author_email,
         u.avatar as author_avatar
       FROM Blog b
       LEFT JOIN User u ON b.authorId = u.id
       WHERE b.id = ?`,
            [id]
        );

        const blog = rows[0];
        if (!blog) {
            return res.status(404).json({ success: false, error: `Blog ${id} doesn't exist.` });
        }

        res.json({ success: true, blog });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Delete Blog by ID
const deleteBlogById = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(`DELETE FROM Blog WHERE id = ?`, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: `Blog with ID ${id} does not exist` });
        }

        res.json({ success: true, message: "Blog Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Create Blog
const createBlog = async (req, res) => {
    try {
        const { is_approved, author_id } = req.body;

        const isApproved = is_approved === "true" || is_approved === true;
        const authorId = parseInt(author_id, 10);

        if (isNaN(authorId)) {
            return res.status(400).json({ success: false, error: "Invalid author_id" });
        }

        const validatedData = blogSchema.parse({
            ...req.body,
            author_id: authorId,
            is_approved: isApproved,
        });

        const blogImage = req.file ? `/uploads/blogs/${req.file.filename}` : null;

        const [result] = await db.execute(
            `INSERT INTO Blog 
       (title, short_description, description, image, authorId, is_approved, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                validatedData.title,
                validatedData.title, // short_description = title
                validatedData.description,
                blogImage,
                validatedData.author_id,
                validatedData.is_approved,
            ]
        );

        const [newBlog] = await db.execute(`SELECT * FROM Blog WHERE id = ?`, [result.insertId]);

        res.status(201).json({ success: true, blog: newBlog[0] });
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

//! Update Blog
const updateBlog = async (req, res) => {
    const { id } = req.params;
    try {
        const { is_approved, author_id } = req.body;

        const isApproved = is_approved === "true" || is_approved === true;
        const authorId = parseInt(author_id, 10);

        if (author_id && isNaN(authorId)) {
            return res.status(400).json({ success: false, error: "Invalid author_id" });
        }

        const validatedData = blogSchema.parse({
            ...req.body,
            author_id: authorId,
            is_approved: isApproved,
        });

        const blogImage = req.file
            ? `/uploads/blogs/${req.file.filename}`
            : validatedData.image || null;

        // Build dynamic SET clause
        const updates = [];
        const values = [];

        if (validatedData.title) {
            updates.push("title = ?");
            updates.push("short_description = ?");
            values.push(validatedData.title, validatedData.title);
        }
        if (validatedData.description) {
            updates.push("description = ?");
            values.push(validatedData.description);
        }
        if (blogImage !== null) {
            updates.push("image = ?");
            values.push(blogImage);
        }
        if (author_id) {
            updates.push("authorId = ?");
            values.push(validatedData.author_id);
        }
        if (is_approved !== undefined) {
            updates.push("is_approved = ?");
            values.push(validatedData.is_approved);
        }

        updates.push("updated_at = NOW()");

        if (updates.length === 1) {
            return res.status(400).json({ success: false, error: "No fields to update" });
        }

        values.push(id);

        const [result] = await db.execute(
            `UPDATE Blog SET ${updates.join(", ")} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: `Blog ${id} not found` });
        }

        const [updatedBlog] = await db.execute(`SELECT * FROM Blog WHERE id = ?`, [id]);

        res.json({
            success: true,
            message: "Blog Updated",
            blog: updatedBlog[0],
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

export {
    getAllBlogs,
    getBlogById,
    getStatBlogs,
    deleteBlogById,
    createBlog,
    updateBlog,
};