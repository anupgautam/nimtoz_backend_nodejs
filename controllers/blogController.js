// controllers/blogController.js
import { BASE_URL } from "../baseUrl.js";
import db from "../config/prisma.js";
import { blogSchema } from "../utils/validationSchema.js";
import { z } from "zod";

const addBaseUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
};



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

    // Count total blogs
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Blog b
      LEFT JOIN Users u ON b.authorId = u.id
      ${whereClause}
    `;
    const [countResult] = await db.execute(countQuery, params);
    const totalCount = countResult[0].total;

    // Fetch blogs + author info
    const blogsQuery = `
      SELECT 
        b.*,
        u.id as author_id,
        u.firstname as author_firstname,
        u.lastname as author_lastname,
        u.email as author_email,
        u.avatar as author_avatar
      FROM Blog b
      LEFT JOIN Users u ON b.authorId = u.id
      ${whereClause}
      ORDER BY b.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.execute(blogsQuery, [...params, take, offset]);

    // ✅ Add BASE_URL to image and avatar
    const blogs = rows.map((row) => ({
      id: row.id,
      title: row.title,
      short_description: row.short_description,
      description: row.description,
      image: addBaseUrl(row.image),
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: {
        id: row.author_id,
        firstname: row.author_firstname,
        lastname: row.author_lastname,
        email: row.author_email,
        avatar: addBaseUrl(row.author_avatar),
      },
    }));

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
       LEFT JOIN Users u ON b.authorId = u.id
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

const createBlogSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  author_id: z.number().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});


//! Create Blog
const createBlog = async (req, res) => {
  try {
    const parsedData = {
      ...req.body,
      author_id: req.body.author_id
        ? parseInt(req.body.author_id, 10)
        : null,
      status: req.body.status || "PENDING",
    };

    const validatedData = createBlogSchema.parse(parsedData);

    const blogImage = req.file
      ? `/uploads/blogs/${req.file.filename}`
      : null;

    const [result] = await db.execute(
      `INSERT INTO Blog 
      (title, description, image, status, authorId, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        validatedData.title,
        validatedData.description,
        blogImage,
        validatedData.status,
        validatedData.author_id,
      ]
    );

    const [blog] = await db.execute(
      `SELECT * FROM Blog WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      blog: blog[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors.map((e) => e.message),
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};


//! Update Blog
const updateBlogSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  author_id: z.number().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});

const updateBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const parsedData = {
      ...req.body,
      author_id: req.body.author_id
        ? parseInt(req.body.author_id, 10)
        : undefined,
    };

    const validatedData = updateBlogSchema.parse(parsedData);

    const blogImage = req.file
      ? `/uploads/blogs/${req.file.filename}`
      : undefined;

    const updates = [];
    const values = [];

    if (validatedData.title) {
      updates.push("title = ?");
      values.push(validatedData.title);
    }

    if (validatedData.description) {
      updates.push("description = ?");
      values.push(validatedData.description);
    }

    if (validatedData.status) {
      updates.push("status = ?");
      values.push(validatedData.status);
    }

    if (validatedData.author_id !== undefined) {
      updates.push("authorId = ?");
      values.push(validatedData.author_id);
    }

    if (blogImage) {
      updates.push("image = ?");
      values.push(blogImage);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields provided to update",
      });
    }

    updates.push("updated_at = NOW()");
    values.push(id);

    const [result] = await db.execute(
      `UPDATE Blog SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: `Blog ${id} not found`,
      });
    }

    const [rows] = await db.execute(
      `SELECT 
        b.*,
        u.id AS author_id,
        u.firstname AS author_firstname,
        u.lastname AS author_lastname,
        u.email AS author_email,
        u.avatar AS author_avatar
      FROM Blog b
      LEFT JOIN Users u ON b.authorId = u.id
      WHERE b.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Blog updated successfully",
      blog: rows[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors.map((e) => e.message),
      });
    }
    res.status(500).json({ success: false, error: error.message });
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