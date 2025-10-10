import { prisma } from "../config/prisma.js";
import { z } from "zod";

const ratingSchema = z.object({
    productId: z.preprocess((val) => Number(val), z.number()),
    userId: z.preprocess((val) => Number(val), z.number()),
    rating: z.preprocess((val) => Number(val), z.number().min(1).max(5)),
    review: z.string().optional(),
});

const addOrUpdateRating = async (req, res) => {
    try {
        const validatedData = ratingSchema.parse(req.body);
        const { productId, userId, rating, review } = validatedData;

        if (isNaN(productId)) {
            return res.status(400).json({ success: false, error: "Invalid product ID" });
        }

        // Upsert the rating
        const productRating = await prisma.productRating.upsert({
            where: { userId_productId: { userId, productId } },
            update: { rating, review },
            create: { userId, productId, rating, review },
        });

        // Recalculate overall rating
        const agg = await prisma.productRating.aggregate({
            where: { productId },
            _avg: { rating: true },
        });

        // Update only overall_rating
        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: { overall_rating: agg._avg.rating || 0 },
        });

        return res.status(200).json({
            success: true,
            message: "Rating saved successfully.",
            rating: productRating,
            overall_rating: updatedProduct.overall_rating,
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message),
            });
        }
        console.error(error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

//! Get All Ratings for a Product
const getProductRatings = async (req, res) => {
    try {
        const productId = Number(req.params.id);
        if (isNaN(productId)) {
            return res.status(400).json({ success: false, error: "Invalid productId" });
        }

        // Get all ratings for this product with user info
        const ratings = await prisma.productRating.findMany({
            where: { productId },
            orderBy: { createdAt: "desc" },
        });

        // Calculate overall rating
        const agg = await prisma.productRating.aggregate({
            where: { productId },
            _avg: { rating: true },
        });

        res.status(200).json({
            success: true,
            ratings,
            overall_rating: agg._avg.rating || 0,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Product Overall Rating
const getProductOverallRating = async (req, res) => {
    console.log('hello');
    try {
        const ratings = await prisma.productRating.findMany({
            orderBy: { createdAt: "desc" },
        });


        res.status(200).json({
            success: true,
            ratings,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Delete a Rating
const deleteRating = async (req, res) => {
    try {
        const { id } = req.params;

        const rating = await prisma.productRating.delete({
            where: { id: Number(id) },
        });

        res
            .status(200)
            .json({ success: true, message: "Rating deleted successfully.", rating });
    } catch (error) {
        if (error.code === "P2025") {
            res
                .status(404)
                .json({ success: false, message: `Rating with ID ${id} not found` });
        } else {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

export {
    addOrUpdateRating,
    getProductRatings,
    getProductOverallRating,
    deleteRating,
};
