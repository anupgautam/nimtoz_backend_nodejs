import { prisma } from "../config/prisma.js";
import { z } from "zod";

// ✅ Validation schema
const ratingSchema = z.object({
    productId: z.number(),
    userId: z.number(), // ✅ add this
    rating: z.number().min(1).max(5),
    review: z.string().optional(),
});

//! Add or Update Product Rating
const addOrUpdateRating = async (req, res) => {
    try {
        const validatedData = ratingSchema.parse(req.body);
        const { productId, rating, review, userId } = validatedData;

        const productRating = await prisma.productRating.upsert({
            where: {
                userId_productId: {  // ✅ match your @@unique([userId, productId])
                    userId,
                    productId
                }
            },
            update: { rating, review },
            create: { userId, productId, rating, review },
        });

        const agg = await prisma.productRating.aggregate({
            where: { productId },
            _avg: { rating: true },
        });

        await prisma.product.update({
            where: { id: productId },
            data: { overall_rating: agg._avg.rating || 0 },
        });

        res.status(200).json({
            success: true,
            message: "Rating saved successfully.",
            rating: productRating,
            overall_rating: agg._avg.rating || 0,
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

export const getProductRatings = async (req, res) => {
    try {
      // Try reading both params and query
      const productId = Number(req.params.id || req.query.id);
  
      if (!productId || isNaN(productId)) {
        return res.status(400).json({ success: false, error: "Invalid product ID" });
      }
  
      // Check if product exists
      const productExists = await prisma.product.findUnique({
        where: { id: productId },
      });
  
      if (!productExists) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
  
      // Fetch all ratings for this product
      const ratings = await prisma.productRating.findMany({
        where: { productId },
        include: { User: true },
        orderBy: { createdAt: "desc" },
      });
  
      // Calculate average rating
      const agg = await prisma.productRating.aggregate({
        where: { productId },
        _avg: { rating: true },
      });
  
      const overallRating = agg?._avg?.rating ?? 0;
  
      // ✅ Update only the overall_rating field
      await prisma.product.update({
        where: { id: productId },
        data: { overall_rating: overallRating },
      });
  
      // Send response
      res.status(200).json({
        success: true,
        productId,
        overall_rating: overallRating,
        total_ratings: ratings.length,
        ratings,
      });
    } catch (error) {
      console.error("Error fetching product ratings:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
  



//! Get Product Overall Rating
const getProductOverallRating = async (req, res) => {
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
