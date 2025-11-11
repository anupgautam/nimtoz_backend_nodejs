import db from "../../config/prisma.js";

const getAllCounts = async (req, res) => {
    try {
        // Run all counts in parallel
        const [userCountResult] = await db.execute("SELECT COUNT(*) AS total FROM User");
        const [businessCountResult] = await db.execute("SELECT COUNT(*) AS total FROM Venue");
        const [locationCountResult] = await db.execute("SELECT COUNT(*) AS total FROM District");
        const [productCountResult] = await db.execute("SELECT COUNT(*) AS total FROM Product");

        res.status(200).json({
            success: true,
            users: userCountResult[0].total || 0,
            business: businessCountResult[0].total || 0,
            location: locationCountResult[0].total || 0,
            products: productCountResult[0].total || 0,
        });
    } catch (error) {
        console.error("getAllCounts error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export {
    getAllCounts,
}