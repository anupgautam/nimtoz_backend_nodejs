import { categorySchema } from "../utils/validationSchema.js";
import { z } from 'zod'

import { prisma } from '../config/prisma.js'

//! Get All Categories
// const getAllCategories = async (req, res) => {
//     try {
//         const categories = await prisma.category.findMany({
//             orderBy: {
//                 updatedAt: "desc"
//             }
//         });
//         res.json({ success: true, categories })
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// }    

//! Get All Categories
const getAllCategories = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;

        const where = search
            ? {
                OR: [
                    { category_name: { contains: search.toLowerCase() } },
                ]
            }
            : {};

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        // Fetch the data with search, pagination, and ordering
        const categories = await prisma.category.findMany({
            where,
            include: {
                products: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take,
        });

        // Get the total count of categories (useful for pagination)
        const totalCount = await prisma.category.count({ where });

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            categories
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


//! Get Category by Id
const getCategoryById = async (req, res) => {
    const { id } = req.params;
    try {
        const category = await prisma.category.findUnique({
            where: { id: parseInt(id) }
        })

        if (!category) return res.status(404).json({ error: `Category ${id} doesn't exist` })
        res.json({ success: true, category });

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Get Category by Product Id
const getCategoryByProductId = async (req, res) => {
    const { id } = req.params;
    try {
        const productCategory = await prisma.category.findMany({
            where: {
                products: {
                    some: {
                        id: productId
                    }
                }
            },
            select: {
                id: true,
                category_name: true
            }
        })

        if (!productCategory) return res.status(404).json({ error: `Category of product ${id} doesn't exist` })
        res.json({ success: true, category });

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Delete Category By Id
const deleteCategoryById = async (req, res) => {
    const { id } = req.params;
    try {

        const category = await prisma.category.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ success: true, message: "Category Deleted" });
    } catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: `Category with ID ${id} does not exist` });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};


//! Create new Category 
const createCategory = async (req, res) => {
    try {

        const validatedData = categorySchema.parse(req.body)

        // const { category_name, category_icon } = validatedData;

        const categoryIconPath = req.file ? `/uploads/categories/${req.file.filename}` : null;

        const category = await prisma.category.create({
            data: {
                category_icon: categoryIconPath,
                category_name: validatedData.category_name
            }
        })
        res.status(201).json({ success: true, category })
    } catch (error) {

        // if (error instanceof z.ZodError) {
        //     return res.status(400).json({
        //         success: false,
        //         errors: error.errors.map((e) => e.message)
        //     });
        // }
        // res.status(400).json({ error: error.message });

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message)
            });
        }

        // Filter out the specific "must not be null" message if it exists
        const nullErrorMessage = error.message.match(/`(.+)` must not be null\./);
        res.status(400).json({
            error: nullErrorMessage ? nullErrorMessage[0] : error.message
        });
    }
}

//! Update a category
const updateCategory = async (req, res) => {

    const { id } = req.params;
    try {
        const validatedData = categorySchema.parse(req.body)

        const categoryIconPath = req.file
            ? `/uploads/categories/${req.file.filename}` // New file path
            : validatedData.category_icon || null;

        // const { category_name, category_icon } = validatedData;

        const category = await prisma.category.update({
            where: { id: Number(id) },
            data: {
                category_icon: categoryIconPath,
                category_name: validatedData.category_name
            }
        })
        res.status(200).json({ success: true, message: "Category Updated", category })
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

//! Count Categories
const countCategory = async (req, res) => {
    try {
        const categoriesWithProductCount = await prisma.category.findMany({
            select: {
                category_name: true,
                _count: {
                    select: {
                        products: true,
                    }
                }
            },
            orderBy: {
                updatedAt: "desc"
            }
        });
        res.status(200).json(categoriesWithProductCount)

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export {
    getAllCategories,
    getCategoryById,
    getCategoryByProductId,
    deleteCategoryById,
    createCategory,
    updateCategory,
    countCategory
}