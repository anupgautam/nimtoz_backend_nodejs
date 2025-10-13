import { productSchema, updateProductSchema } from "../utils/validationSchema.js";
import { z } from 'zod'

import { prisma } from '../config/prisma.js'
import { nextTuesdayWithOptions } from "date-fns/fp";

//! Get All Products
const getAllProducts = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query

        const where = search
            ? {
                OR: [
                    {
                        title: { contains: search.toLowerCase() },
                        address: { contains: search.toLowerCase() },
                        district: { contains: search.toLowerCase() },
                    },
                ],
            }
            : {}

        const skip = (page - 1) * limit
        const take = Number.parseInt(limit)

        const products = await prisma.product.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            include: {
                category: {
                    select: {
                        id: true,
                        category_name: true,
                    },
                },
                District: {
                    select: {
                        id: true,
                        district_name: true,
                    },
                },
                Venue: {
                    select: {
                        id: true,
                        venue_name: true,
                    },
                },
                partypalace: true,
                musical: true,
                multimedia: true,
                luxury: true,
                meeting: true,
                adventure: true,
                beautydecor: true,
                entertainment: true,
                cateringtent: true,
            },
            skip,
            take,
        })

        const totalCount = await prisma.product.count({ where })

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: Number.parseInt(page),
            products,
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Get All Products booking
const getBookingProducts = async (req, res) => {
    try {
        const getBookingActiveProducts = await prisma.product.findMany({
            where: {
                Venue: {
                    active: true
                }
            },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                title: true,
                partypalace: {
                    select: {
                        id: true,
                        partypalace_name: true,
                        price: true,
                    }
                },
                musical: {
                    select: {
                        id: true,
                        instrument_name: true,
                        price: true,
                    }
                },
                multimedia: {
                    select: {
                        id: true,
                        multimedia_name: true,
                        price: true,
                    }
                },
                luxury: {
                    select: {
                        id: true,
                        luxury_name: true,
                        price: true,
                    }
                },
                meeting: {
                    select: {
                        id: true,
                        meeting_name: true,
                        price: true,
                    }
                },
                adventure: {
                    select: {
                        id: true,
                        adventure_name: true,
                        price: true,
                    }
                },
                beautydecor: {
                    select: {
                        id: true,
                        beauty_name: true,
                        price: true,
                    }
                },
                entertainment: {
                    select: {
                        id: true,
                        entertainment_name: true,
                        price: true,
                    }
                },
                cateringtent: {
                    select: {
                        id: true,
                        catering_name: true,
                        price: true,
                    }
                }
            }
        });

        return res.status(200).json(getBookingActiveProducts);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message),
            });
        }
        return res.status(500).json({ error: error.message });
    }
};

const getBookingProductsById = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await prisma.product.findUnique({
            where: { id: Number(id) },
            include: {
                //* 1. Party Palace 
                partypalace: {
                    select: {
                        id: true,
                        partypalace_name: true,
                        price: true
                    }
                },
                //* 2. Multimedia 
                multimedia: {
                    select: {
                        id: true,
                        multimedia_name: true,
                        price: true,
                    }
                },
                //* 3. Musical 
                musical: {
                    select: {
                        id: true,
                        instrument_name: true,
                        price: true
                    }
                },
                //! 4. Luxury 
                luxury: {
                    select: {
                        id: true,
                        luxury_name: true,
                        price: true
                    }
                },
                //! 5. CateringTent 
                cateringtent: {
                    select: {
                        id: true,
                        catering_name: true,
                        price: true
                    }
                },
                //! 6. Adventure 
                adventure: {
                    select: {
                        id: true,
                        adventure_name: true,
                        price: true
                    }
                },
                //! 7. Entertainment 
                entertainment: {
                    select: {
                        id: true,
                        entertainment_name: true,
                        price: true
                    }
                },
                //! 8. Beauty & Decoration 
                beautydecor: {
                    select: {
                        id: true,
                        beauty_name: true,
                        price: true
                    }
                },
                //! 9. Luxury 
                meeting: {
                    select: {
                        id: true,
                        meeting_name: true,
                        price: true
                    }
                }
            },
        })

        if (!product) return res.status(404).json({ error: `Products ${id} doesn't exist.` })

        res.json({ success: true, product })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message),
            });
        }
        return res.status(500).json({ error: error.message });
    }
}

//! Get HomePage Products 
const getHomePageProducts = async (req, res) => {
    try {
        const { search = "", category = "", location: district = "" } = req.query

        const whereClause = {
            is_active: true,
            Venue: {
                is: {
                    active: true,
                },
            },
        }

        if (search) {
            whereClause.title = {
                contains: search,
                mode: "insensitive",
            }
        }

        if (category) {
            whereClause.category = {
                is: {
                    category_name: category,
                },
            }
        }

        if (district) {
            whereClause.districtId = Number.parseInt(district)
        }

        // Fetch all products with related data
        const products = await prisma.product.findMany({
            where: Object.keys(whereClause).length ? whereClause : undefined,
            include: {
                product_image: true,
                District: { select: { district_name: true } },
                multimedia: {
                    select: { price: true, offerPrice: true, multimedia_name: true },
                    orderBy: { price: "asc" },
                },
                entertainment: {
                    select: { price: true, offerPrice: true, entertainment_name: true },
                    orderBy: { price: "asc" },
                },
                musical: {
                    select: { price: true, offerPrice: true, instrument_name: true },
                    orderBy: { price: "asc" },
                },
                cateringtent: {
                    select: { price: true, offerPrice: true, catering_name: true },
                    orderBy: { price: "asc" },
                },
                adventure: {
                    select: { price: true, offerPrice: true, adventure_name: true },
                    orderBy: { price: "asc" },
                },
                luxury: {
                    select: { price: true, offerPrice: true, luxury_name: true },
                    orderBy: { price: "asc" },
                },
                meeting: {
                    select: { price: true, offerPrice: true, meeting_name: true },
                    orderBy: { price: "asc" },
                },
                partypalace: {
                    select: { price: true, offerPrice: true, partypalace_name: true },
                    orderBy: { price: "asc" },
                },
                beautydecor: {
                    select: { price: true, offerPrice: true, beauty_name: true },
                    orderBy: { price: "asc" },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        })

        // Process prices and discount
        const productsWithPriceAndDiscount = products.map((product) => {
            // Collect all price sources
            const allPrices = [
                ...(product.multimedia || []),
                ...(product.entertainment || []),
                ...(product.musical || []),
                ...(product.partypalace || []),
                ...(product.beautydecor || []),
                ...(product.adventure || []),
                ...(product.luxury || []),
                ...(product.cateringtent || []),
                ...(product.meeting || []),
            ]

            // Compute minimum price
            const minPrice = Math.min(
                ...allPrices.map((item) => item.price).filter((p) => p != null),
                Number.POSITIVE_INFINITY,
            )

            // Compute minimum offer price if available
            const minOfferPrice = Math.min(
                ...allPrices.map((item) => item.offerPrice).filter((p) => p != null && p > 0),
                Number.POSITIVE_INFINITY,
            )

            // Calculate discount percentage (based on min offer price)
            let discountPercentage = 0
            if (Number.isFinite(minPrice) && Number.isFinite(minOfferPrice) && minOfferPrice < minPrice) {
                discountPercentage = Math.round(((minPrice - minOfferPrice) / minPrice) * 100)
            }

            return {
                ...product,
                minPrice: Number.isFinite(minPrice) ? minPrice : 0,
                minOfferPrice: Number.isFinite(minOfferPrice) ? minOfferPrice : null,
                discountPercentage,
            }
        })

        res.json(productsWithPriceAndDiscount)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message),
            })
        }

        console.error("Error fetching homepage products:", error)
        res.status(400).json({ error: error.message })
    }
}

//! Get Product by Id
const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await prisma.product.findUnique({
            where: { id: Number(id) },
            include: {
                District: {
                    select: {
                        id: true,
                        district_name: true,
                    },
                },
                Venue: {
                    select: {
                        venue_name: true,
                    },
                },
                product_image: {
                    select: {
                        id: true,
                        url: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        category_name: true,
                    },
                },

                //* 1. Party Palace 
                partypalace: {
                    select: {
                        id: true,
                        partypalace_name: true,
                        price: true,
                        offerPrice: true,
                        description: true,
                    },
                },

                //* 2. Multimedia 
                multimedia: {
                    select: {
                        id: true,
                        multimedia_name: true,
                        price: true,
                        offerPrice: true,
                        description: true,
                    },
                },

                //* 3. Musical 
                musical: {
                    select: {
                        id: true,
                        instrument_name: true,
                        price: true,
                        offerPrice: true,
                        description: true,
                    },
                },

                //! 4. Luxury 
                luxury: {
                    select: {
                        id: true,
                        luxury_name: true,
                        price: true,
                        offerPrice: true,
                        description: true,
                    },
                },

                //! 5. CateringTent 
                cateringtent: {
                    select: {
                        id: true,
                        catering_name: true,
                        price: true,
                        offerPrice: true,
                        description: true,
                    },
                },

                //! 6. Adventure 
                adventure: {
                    select: {
                        id: true,
                        adventure_name: true,
                        price: true,
                        offerPrice: true,
                        description: true,
                    },
                },

                //! 7. Entertainment 
                entertainment: {
                    select: {
                        id: true,
                        entertainment_name: true,
                        price: true,
                        offerPrice: true,
                        description: true,
                    },
                },

                //! 8. Beauty & Decoration 
                beautydecor: {
                    select: {
                        id: true,
                        beauty_name: true,
                        price: true,
                        offerPrice: true,
                        description: true,
                    },
                },

                //! 9. Meeting 
                meeting: {
                    select: {
                        id: true,
                        meeting_name: true,
                        price: true,
                        offerPrice: true,
                        description: true,
                    },
                },
            },
        });

        if (!product) {
            return res.status(404).json({ error: `Product ${id} doesn't exist.` });
        }

        // ✅ Calculate discount percentage for each related item
        const calculateDiscount = (price, offerPrice) => {
            if (offerPrice && price && offerPrice < price) {
                return Math.round(((price - offerPrice) / price) * 100);
            }
            return 0;
        };

        const addDiscounts = (items) =>
            items?.map((item) => ({
                ...item,
                discountPercentage: calculateDiscount(item.price, item.offerPrice),
            })) || [];

        const productWithDiscounts = {
            ...product,
            multimedia: addDiscounts(product.multimedia),
            entertainment: addDiscounts(product.entertainment),
            musical: addDiscounts(product.musical),
            partypalace: addDiscounts(product.partypalace),
            beautydecor: addDiscounts(product.beautydecor),
            adventure: addDiscounts(product.adventure),
            luxury: addDiscounts(product.luxury),
            cateringtent: addDiscounts(product.cateringtent),
            meeting: addDiscounts(product.meeting),
        };

        res.json({ success: true, product: productWithDiscounts });
    } catch (error) {
        console.error("Error fetching product by ID:", error);
        res.status(500).json({ error: error.message });
    }
};

//! Get Product Images By Id
const getProductImagesById = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await prisma.productImage.findMany({
            where: {
                productId: Number(id)
            },
            select: { id: true, url: true }
        })

        if (!product) return res.status(404).json({ error: `Product Image ${id} doesn't exist.` })

        res.json({ success: true, product })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Delete Product By Id
const deleteProductById = async (req, res) => {
    const { id } = req.params;
    try {

        const product = await prisma.product.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ success: true, message: "Product Deleted" });
    } catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: `Product with ID ${id} does not exist` });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

//! Create new Product 
const createProduct = async (req, res) => {

    // const productImages = req.files ? req.files.map(file => ({ url: file.path })) : [];
    const productImages = req.files ? req.files.map(file => ({ url: file.path.replace("\\", "/") })) : [];
    try {
        // req.body.author_id = parseInt(req.body.author_id, 10);
        // const productImages = req.body.product_image;

        const parsedData = {
            ...req.body,
            multimedia: typeof req.body.multimedia === 'string' ? JSON.parse(req.body.multimedia) : req.body.multimedia,
            musical: typeof req.body.musical === 'string' ? JSON.parse(req.body.musical) : req.body.musical,
            luxury: typeof req.body.luxury === 'string' ? JSON.parse(req.body.luxury) : req.body.luxury,
            entertainment: typeof req.body.entertainment === 'string' ? JSON.parse(req.body.entertainment) : req.body.entertainment,
            meeting: typeof req.body.meeting === 'string' ? JSON.parse(req.body.meeting) : req.body.meeting,
            beautydecor: typeof req.body.beautydecor === 'string' ? JSON.parse(req.body.beautydecor) : req.body.beautydecor,
            adventure: typeof req.body.adventure === 'string' ? JSON.parse(req.body.adventure) : req.body.adventure,
            partypalace: typeof req.body.partypalace === 'string' ? JSON.parse(req.body.partypalace) : req.body.partypalace,
            cateringtent: typeof req.body.cateringtent === 'string' ? JSON.parse(req.body.cateringtent) : req.body.cateringtent,
            is_active: req.body.is_active === "true" || req.body.is_active === true,
        };

        // const validatedData = productSchema.parse(parsedData)
        const product = await prisma.product.create({
            data: {
                title: parsedData.title,
                description: parsedData.description,
                short_description: parsedData.title,
                address: parsedData.address,

                category_id: parseInt(parsedData.category, 10),
                districtId: parseInt(parsedData.location, 10),
                businessId: parseInt(parsedData.business, 10),

                product_image: {
                    create: productImages
                },

                //! 1. Multimedia 
                multimedia: {
                    create: parsedData.multimedia,
                },
                //! 2. Musical 
                musical: {
                    create: parsedData.musical,
                },
                //! 3. Luxury 
                luxury: {
                    create: parsedData.luxury,
                },
                //! 4. Entertainment 
                entertainment: {
                    create: parsedData.entertainment,
                },
                //! 5. Meeting 
                meeting: {
                    create: parsedData.meeting,
                },
                //! 6. Beauty & Decor 
                beautydecor: {
                    create: parsedData.beautydecor,
                },
                //! 7. Adventure
                adventure: {
                    create: parsedData.adventure,
                },
                //! 8. Party Palace 
                partypalace: {
                    create: parsedData.partypalace,
                },
                //! 9. Catering Tent 
                cateringtent: {
                    create: parsedData.cateringtent,
                },
            }
        })
        res.status(201).json({ success: true, product, message: "Product Created" })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message
                }))
            });
        }
        res.status(400).json({ error: error.message });
    }
}

//! Update a produtc

// const updateProduct = async (req, res) => {
//     const { id } = req.params;
//     const uploadedFiles = req.files ? req.files.map(file => ({ url: file.path })) : [];



//     // Parse productImages from body if provided
//     const existingImages = req.body.product_image
//         ? Array.isArray(req.body.product_image)
//             ? req.body.product_image
//             : [req.body.product_image]  // Treat it as an array if it's a single string
//         : [];


//     const productImages = [
//         ...uploadedFiles,
//         ...existingImages.map(url => ({ url }))
//     ];

//     try {
//         const parsedData = {
//             ...req.body,
//             multimedia: typeof req.body.multimedia === 'string' ? JSON.parse(req.body.multimedia) : req.body.multimedia,
//             musical: typeof req.body.musical === 'string' ? JSON.parse(req.body.musical) : req.body.musical,
//             luxury: typeof req.body.luxury === 'string' ? JSON.parse(req.body.luxury) : req.body.luxury,
//             entertainment: typeof req.body.entertainment === 'string' ? JSON.parse(req.body.entertainment) : req.body.entertainment,
//             meeting: typeof req.body.meeting === 'string' ? JSON.parse(req.body.meeting) : req.body.meeting,
//             beautydecor: typeof req.body.beautydecor === 'string' ? JSON.parse(req.body.beautydecor) : req.body.beautydecor,
//             adventure: typeof req.body.adventure === 'string' ? JSON.parse(req.body.adventure) : req.body.adventure,
//             partypalace: typeof req.body.partypalace === 'string' ? JSON.parse(req.body.partypalace) : req.body.partypalace,
//             cateringtent: typeof req.body.cateringtent === 'string' ? JSON.parse(req.body.cateringtent) : req.body.cateringtent,
//         };

//         const validatedData = productSchema.parse(parsedData);

//         // Delete all possible category data first, regardless of incoming data
//         await prisma.productImage.deleteMany({ where: { productId: Number(id) } });

//         await prisma.multimedia.deleteMany({ where: { productId: Number(id) } });
//         await prisma.musical.deleteMany({ where: { productId: Number(id) } });
//         await prisma.luxury.deleteMany({ where: { productId: Number(id) } });
//         await prisma.entertainment.deleteMany({ where: { productId: Number(id) } });
//         await prisma.meeting.deleteMany({ where: { productId: Number(id) } });
//         await prisma.beautyDecor.deleteMany({ where: { productId: Number(id) } });
//         await prisma.adventure.deleteMany({ where: { productId: Number(id) } });
//         await prisma.partyPalace.deleteMany({ where: { productId: Number(id) } });
//         await prisma.cateringTent.deleteMany({ where: { productId: Number(id) } });

//         // Construct the new data for each provided category
//         if (productImages.length > 0) {
//             await prisma.productImage.createMany({
//                 data: productImages.map(img => ({
//                     ...img,
//                     productId: Number(id)
//                 }))
//             });
//         }

//         const insertCategoryData = async (categoryData, modelName) => {
//             if (categoryData && categoryData.length > 0) {
//                 await prisma[modelName].createMany({
//                     data: categoryData.map(item => ({
//                         ...item,
//                         productId: Number(id)
//                     }))
//                 });
//             }
//         };

//         await insertCategoryData(validatedData.multimedia, 'multimedia');
//         await insertCategoryData(validatedData.musical, 'musical');
//         await insertCategoryData(validatedData.luxury, 'luxury');
//         await insertCategoryData(validatedData.entertainment, 'entertainment');
//         await insertCategoryData(validatedData.meeting, 'meeting');
//         await insertCategoryData(validatedData.beautydecor, 'beautyDecor');
//         await insertCategoryData(validatedData.adventure, 'adventure');
//         await insertCategoryData(validatedData.partypalace, 'partyPalace');
//         await insertCategoryData(validatedData.cateringtent, 'cateringTent');

//         const data = {
//             title: validatedData.title,
//             description: validatedData.description,
//             short_description: validatedData.title,
//             address: validatedData.address,
//             category_id: parseInt(validatedData.category, 10),
//             districtId: parseInt(validatedData.location, 10),
//             businessId: parseInt(validatedData.business, 10),
//         };

//         const product = await prisma.product.update({
//             where: { id: Number(id) },
//             data
//         });

//         res.status(200).json({ success: true, product, message: "Product Updated" });
//     } catch (error) {
//         if (error instanceof z.ZodError) {
//             return res.status(400).json({
//                 success: false,
//                 errors: error.errors.map((e) => e.message)
//             });
//         }
//         res.status(400).json({ error: error.message });
//     }
// };

const updateProduct = async (req, res) => {
    const { id } = req.params;

    const uploadedFiles = req.files ? req.files.map(file => ({ url: file.path })) : [];
    const existingImages = req.body.product_image
        ? Array.isArray(req.body.product_image)
            ? req.body.product_image
            : [req.body.product_image]
        : [];
    const productImages = [...uploadedFiles, ...existingImages.map(url => ({ url }))];

    try {
        const parsedData = {
            ...req.body,
            multimedia: JSON.parse(req.body.multimedia || "[]"),
            musical: JSON.parse(req.body.musical || "[]"),
            luxury: JSON.parse(req.body.luxury || "[]"),
            entertainment: JSON.parse(req.body.entertainment || "[]"),
            meeting: JSON.parse(req.body.meeting || "[]"),
            beautydecor: JSON.parse(req.body.beautydecor || "[]"),
            adventure: JSON.parse(req.body.adventure || "[]"),
            partypalace: JSON.parse(req.body.partypalace || "[]"),
            cateringtent: JSON.parse(req.body.cateringtent || "[]"),
        };

        // const validatedData = updateProductSchema.parse(parsedData);
        // console.log(validatedData)

        await prisma.productImage.deleteMany({ where: { productId: Number(id) } });

        await prisma.multimedia.deleteMany({ where: { productId: Number(id) } });
        await prisma.musical.deleteMany({ where: { productId: Number(id) } });
        await prisma.luxury.deleteMany({ where: { productId: Number(id) } });
        await prisma.entertainment.deleteMany({ where: { productId: Number(id) } });
        await prisma.meeting.deleteMany({ where: { productId: Number(id) } });
        await prisma.beautyDecor.deleteMany({ where: { productId: Number(id) } });
        await prisma.adventure.deleteMany({ where: { productId: Number(id) } });
        await prisma.partyPalace.deleteMany({ where: { productId: Number(id) } });
        await prisma.cateringTent.deleteMany({ where: { productId: Number(id) } });

        // Construct the new data for each provided category
        if (productImages.length > 0) {
            await prisma.productImage.createMany({
                data: productImages.map(img => ({
                    ...img,
                    productId: Number(id)
                }))
            });
        }

        const insertCategoryData = async (categoryData, modelName) => {
            if (categoryData && categoryData.length > 0) {
                await prisma[modelName].createMany({
                    data: categoryData.map(item => ({
                        ...item,
                        productId: Number(id)
                    }))
                });
            }
        };

        await insertCategoryData(parsedData.multimedia, 'multimedia');
        await insertCategoryData(parsedData.musical, 'musical');
        await insertCategoryData(parsedData.luxury, 'luxury');
        await insertCategoryData(parsedData.entertainment, 'entertainment');
        await insertCategoryData(parsedData.meeting, 'meeting');
        await insertCategoryData(parsedData.beautydecor, 'beautyDecor');
        await insertCategoryData(parsedData.adventure, 'adventure');
        await insertCategoryData(parsedData.partypalace, 'partyPalace');
        await insertCategoryData(parsedData.cateringtent, 'cateringTent');

        const data = {
            title: parsedData.title,
            description: parsedData.description,
            short_description: parsedData.title,
            address: parsedData.address,
            category_id: parseInt(parsedData.category, 10),
            districtId: parseInt(parsedData.location, 10),
            businessId: parseInt(parsedData.business, 10),
            is_active: parsedData.is_active,
        };

        const product = await prisma.product.update({
            where: { id: Number(id) },
            data
        });

        res.status(200).json({ success: true, message: "Product Updated" });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map(e => e.message),
            });
        }
        res.status(400).json({ error: error.message });
    }
};

export {
    getAllProducts,
    getProductById,
    getProductImagesById,
    getBookingProducts,
    getHomePageProducts,
    getBookingProductsById,
    deleteProductById,
    createProduct,
    updateProduct
}


