import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

//! Get All Counts
const getAllCounts = async (req, res) => {
    try {
        const [userCount, businessCount, locationCount, productCount] = await prisma.$transaction([
            prisma.user.count(),
            prisma.venue.count(),
            prisma.district.count(),
            prisma.product.count()
        ])

        res.status(200).json({
            users: userCount,
            business: businessCount,
            location: locationCount,
            products: productCount,
        })


    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export {
    getAllCounts,
}