import { blogSchema } from "../utils/validationSchema.js";
import { z } from 'zod'

import { prisma } from '../config/prisma.js'

//! Get All Blogs
const getAllBlogs = async (req, res) => {

    try {
        const { search, page = 1, limit = 10 } = req.query;

        const where = search
            ? {
                OR: [
                    {
                        title: { contains: search.toLowerCase() },
                    },
                    {
                        author: {
                            OR: [
                                { firstname: { contains: search.toLowerCase() } },
                                { lastname: { contains: search.toLowerCase() } },
                            ]
                        }
                    }
                ]
            }
            : {};

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const blogs = await prisma.blog.findMany({
            where,
            include: {
                author: true,
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take,
        });

        const totalCount = await prisma.blog.count({ where });

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            blogs
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getStatBlogs = async (req, res) => {

    try {
        const { page, limit } = req.query;

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const blogs = await prisma.blog.findMany({
            orderBy: { updatedAt: 'desc' },
            skip,
            take,
        });


        res.json({
            success: true,
            blogs
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//! Get Blog by Id
const getBlogById = async (req, res) => {
    const { id } = req.params;
    try {
        const blog = await prisma.blog.findUnique({
            where: { id: Number(id) },
            include: {
                author: true
            }
        })

        if (!blog) return res.status(404).json({ error: `Blogs ${id} doesn't exist.` })

        res.json({ success: true, blog })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Delete Blog By Id
const deleteBlogById = async (req, res) => {
    const { id } = req.params;
    try {

        const blog = await prisma.blog.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ success: true, message: "Blog Deleted" });
    } catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: `Blog with ID ${id} does not exist` });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

//! Create new Blog 
const createBlog = async (req, res) => {

    const { is_approved } = req.body;

    try {
        req.body.author_id = parseInt(req.body.author_id, 10);
        // req.body.is_approved = Boolean(req.body.is_approved)

        const isApproved = is_approved === 'true';

        const validatedData = blogSchema.parse({
            ...req.body,
            is_approved: isApproved, // Use the converted value in validation
        });

        const blogImage = req.file ? `/uploads/blogs/${req.file.filename}` : null;

        const blog = await prisma.blog.create({
            data: {
                title: validatedData.title,
                description: validatedData.description,
                short_description: validatedData.title,
                authorId: validatedData.author_id,
                is_approved: validatedData.is_approved,
                image: blogImage
            }
        })
        res.status(201).json({ success: true, blog })
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

//! Update a blog
const updateBlog = async (req, res) => {
    const { id } = req.params;
    const { is_approved } = req.body
    try {
        req.body.author_id = parseInt(req.body.author_id, 10);

        const isApproved = is_approved === 'true';

        const validatedData = blogSchema.parse({
            ...req.body,
            is_approved: isApproved, // Use the converted value in validation
        });

        const blogImage = req.file ? `/uploads/blogs/${req.file.filename}` : validatedData.image || null;

        // const { category_name, category_icon } = validatedData;

        const blog = await prisma.blog.update({
            where: { id: Number(id) },
            data: {
                title: validatedData.title,
                description: validatedData.description,
                short_description: validatedData.title,
                authorId: validatedData.author_id,
                is_approved: validatedData.is_approved,
                image: blogImage
            }
        })
        res.status(200).json({ success: true, message: "Blogs Updated", blog })
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
    getAllBlogs,
    getBlogById,
    getStatBlogs,
    deleteBlogById,
    createBlog,
    updateBlog,
}