// controllers/productRatingController.js
import { z } from "zod";
import db from "../config/prisma.js"; // Your MySQL/Prisma db connection

// Validation schema using Zod
const ratingSchema = z.object({
  productId: z.number().int(),
  userId: z.number().int(),
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
});

// Helper to execute raw queries
const query = async (sql, params = []) => {
  const [rows] = await db.execute(sql, params);
  return rows;
};

//! Add or Update Product Rating
const addOrUpdateRating = async (req, res) => {
  try {
    const validatedData = ratingSchema.parse(req.body);
    const { productId, userId, rating, review } = validatedData;

    const [[user]] = await db.execute(`SELECT status FROM Users WHERE id = ?`, [userId]);
    if (user.status === "INACTIVE") {
      return res.status(400).json({
        success: false,
        error: "Inactive users are not allowed for rating.",
      });
    }

    // UPSERT using ON DUPLICATE KEY UPDATE
    await db.execute(
      `INSERT INTO ProductRating (userId, productId, rating, review, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         rating = VALUES(rating),
         review = VALUES(review),
         updated_at = NOW()`,
      [userId, productId, rating, review || null]
    );

    // Get the inserted/updated rating
    const [ratingRows] = await db.execute(
      `SELECT * FROM ProductRating WHERE userId = ? AND productId = ?`,
      [userId, productId]
    );
    const productRating = ratingRows[0];

    // Calculate average rating
    const [avgRows] = await db.execute(
      `SELECT AVG(rating) as avgRating FROM ProductRating WHERE productId = ?`,
      [productId]
    );
    const overallRating = avgRows[0].avgRating ? parseFloat(avgRows[0].avgRating).toFixed(2) : 0;

    // Update Product overall_rating
    await db.execute(
      `UPDATE Product SET overall_rating = ? WHERE id = ?`,
      [overallRating, productId]
    );

    res.status(200).json({
      success: true,
      message: "Rating saved successfully.",
      rating: productRating,
      overall_rating: parseFloat(overallRating),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors.map((e) => e.message),
      });
    }
    console.error("addOrUpdateRating error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

//! Get All Ratings for a Product
const getProductRatings = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (isNaN(productId)) {
      return res.status(400).json({ success: false, error: "Invalid productId" });
    }

    // 🧾 Fetch all ratings with user name (firstname + lastname)
    const ratings = await query(
      `SELECT 
         pr.*,
         CONCAT(u.firstname, ' ', u.lastname) AS name
       FROM ProductRating pr
       JOIN Users u ON pr.userId = u.id
       WHERE pr.productId = ?
       ORDER BY pr.created_at DESC`,
      [productId]
    );

    // ⭐ Calculate average rating
    const [avgRows] = await db.execute(
      `SELECT AVG(rating) as avgRating FROM ProductRating WHERE productId = ?`,
      [productId]
    );

    const overallRating = avgRows[0].avgRating
      ? parseFloat(avgRows[0].avgRating).toFixed(2)
      : 0;

    // ✅ Response
    res.status(200).json({
      success: true,
      ratings, // includes `name` for each user
      overall_rating: parseFloat(overallRating),
    });
  } catch (error) {
    console.error("getProductRatings error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

//! Get All Ratings (Admin / Super Admin only)
const getAllRatings = async (req, res) => {
  try {
    // Optional: check role if not already handled by middleware
    if (!'ADMIN'.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
      });
    }

    const ratings = await query(
      `SELECT 
          pr.id AS rating_id,
          pr.userId,
          u.email AS user_email,
          pr.productId,
          p.title AS product_title,
          pr.rating,
          pr.review,
          pr.created_at,
          pr.updated_at
       FROM ProductRating pr
       JOIN Users u ON pr.userId = u.id
       JOIN Product p ON pr.productId = p.id
       ORDER BY pr.created_at DESC`
    );

    if (!ratings.length) {
      return res.status(200).json({
        success: true,
        message: "No ratings found.",
        ratings: [],
      });
    }

    res.status(200).json({
      success: true,
      total_ratings: ratings.length,
      ratings,
    });
  } catch (error) {
    console.error("getAllRatings error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


//! Get Product Overall Rating (All Products)
const getProductOverallRating = async (req, res) => {
  try {
    const ratings = await query(
      `SELECT id, title, overall_rating 
       FROM Product 
       WHERE overall_rating > 0 
       ORDER BY overall_rating DESC`
    );

    res.status(200).json({
      success: true,
      ratings,
    });
  } catch (error) {
    console.error("getProductOverallRating error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

//! Delete a Rating
const deleteRating = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute(`DELETE FROM ProductRating WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Rating with ID ${id} not found` });
    }

    res.status(200).json({ success: true, message: "Rating deleted successfully." });
  } catch (error) {
    console.error("deleteRating error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export {
  addOrUpdateRating,
  getProductRatings,
  getProductOverallRating,
  deleteRating,
  getAllRatings
};
