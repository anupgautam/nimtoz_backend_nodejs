// controllers/productController.js
import { productSchema, updateProductSchema } from "../utils/validationSchema.js";
import { z } from "zod";
import db from "../config/prisma.js"; // <-- your MySQL pool

// Helper: Execute query and return rows
const query = async (sql, params = []) => {
    const [rows] = await db.execute(sql, params);
    return rows;
};

//! Get All Products (Admin)
const getAllProducts = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = "";
        let params = [];

        if (search) {
            const term = `%${search.toLowerCase()}%`;
            whereClause = `WHERE LOWER(p.title) LIKE ? OR LOWER(p.address) LIKE ? OR LOWER(d.district_name) LIKE ?`;
            params.push(term, term, term);
        }

        // Count
        const countQuery = `SELECT COUNT(*) as total FROM Product p LEFT JOIN District d ON p.districtId = d.id ${whereClause}`;
        const [countResult] = await db.execute(countQuery, params);
        const totalCount = countResult[0].total;

        // Fetch products with relations
        const productsQuery = `
      SELECT 
        p.*,
        c.id as cat_id, c.category_name,
        d.id as dist_id, d.district_name,
        v.id as venue_id, v.venue_name,
        pp.id as pp_id, pp.partypalace_name, pp.price as pp_price,
        mu.id as mu_id, mu.instrument_name, mu.price as mu_price,
        mm.id as mm_id, mm.multimedia_name, mm.price as mm_price,
        lx.id as lx_id, lx.luxury_name, lx.price as lx_price,
        mt.id as mt_id, mt.meeting_name, mt.price as mt_price,
        ad.id as ad_id, ad.adventure_name, ad.price as ad_price,
        bd.id as bd_id, bd.beauty_name, bd.price as bd_price,
        en.id as en_id, en.entertainment_name, en.price as en_price,
        ct.id as ct_id, ct.catering_name, ct.price as ct_price
      FROM Product p
      LEFT JOIN Category c ON p.category_id = c.id
      LEFT JOIN District d ON p.districtId = d.id
      LEFT JOIN Venue v ON p.businessId = v.id
      LEFT JOIN PartyPalace pp ON p.id = pp.productId
      LEFT JOIN Musical mu ON p.id = mu.productId
      LEFT JOIN Multimedia mm ON p.id = mm.productId
      LEFT JOIN Luxury lx ON p.id = lx.productId
      LEFT JOIN Meeting mt ON p.id = mt.productId
      LEFT JOIN Adventure ad ON p.id = ad.productId
      LEFT JOIN BeautyDecor bd ON p.id = bd.productId
      LEFT JOIN Entertainment en ON p.id = en.productId
      LEFT JOIN CateringTent ct ON p.id = ct.productId
      ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `;

        const rows = await query(productsQuery, [...params, take, offset]);

        // Group related data
        const products = [];
        const map = new Map();

        rows.forEach((row) => {
            const pid = row.id;
            if (!map.has(pid)) {
                const base = {
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    short_description: row.short_description,
                    address: row.address,
                    is_active: Boolean(row.is_active),
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    category: row.cat_id ? { id: row.cat_id, category_name: row.category_name } : null,
                    District: row.dist_id ? { id: row.dist_id, district_name: row.district_name } : null,
                    Venue: row.venue_id ? { id: row.venue_id, venue_name: row.venue_name } : null,
                    partypalace: [],
                    musical: [],
                    multimedia: [],
                    luxury: [],
                    meeting: [],
                    adventure: [],
                    beautydecor: [],
                    entertainment: [],
                    cateringtent: [],
                };
                map.set(pid, base);
            }

            const p = map.get(pid);
            if (row.pp_id) p.partypalace.push({ id: row.pp_id, partypalace_name: row.partypalace_name, price: row.pp_price });
            if (row.mu_id) p.musical.push({ id: row.mu_id, instrument_name: row.instrument_name, price: row.mu_price });
            if (row.mm_id) p.multimedia.push({ id: row.mm_id, multimedia_name: row.multimedia_name, price: row.mm_price });
            if (row.lx_id) p.luxury.push({ id: row.lx_id, luxury_name: row.luxury_name, price: row.lx_price });
            if (row.mt_id) p.meeting.push({ id: row.mt_id, meeting_name: row.meeting_name, price: row.mt_price });
            if (row.ad_id) p.adventure.push({ id: row.ad_id, adventure_name: row.adventure_name, price: row.ad_price });
            if (row.bd_id) p.beautydecor.push({ id: row.bd_id, beauty_name: row.beauty_name, price: row.bd_price });
            if (row.en_id) p.entertainment.push({ id: row.en_id, entertainment_name: row.entertainment_name, price: row.en_price });
            if (row.ct_id) p.cateringtent.push({ id: row.ct_id, catering_name: row.catering_name, price: row.ct_price });
        });

        map.forEach((val) => products.push(val));

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            products,
        });
    } catch (error) {
        console.error("getAllProducts error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Booking Products (Active Venues)
const getBookingProducts = async (req, res) => {
    try {
        const rows = await query(`
      SELECT 
        p.id, p.title,
        pp.id as pp_id, pp.partypalace_name, pp.price,
        mu.id as mu_id, mu.instrument_name, mu.price,
        mm.id as mm_id, mm.multimedia_name, mm.price,
        lx.id as lx_id, lx.luxury_name, lx.price,
        mt.id as mt_id, mt.meeting_name, mt.price,
        ad.id as ad_id, ad.adventure_name, ad.price,
        bd.id as bd_id, bd.beauty_name, bd.price,
        en.id as en_id, en.entertainment_name, en.price,
        ct.id as ct_id, ct.catering_name, ct.price
      FROM Product p
      JOIN Venue v ON p.businessId = v.id
      LEFT JOIN PartyPalace pp ON p.id = pp.productId
      LEFT JOIN Musical mu ON p.id = mu.productId
      LEFT JOIN Multimedia mm ON p.id = mm.productId
      LEFT JOIN Luxury lx ON p.id = lx.productId
      LEFT JOIN Meeting mt ON p.id = mt.productId
      LEFT JOIN Adventure ad ON p.id = ad.productId
      LEFT JOIN BeautyDecor bd ON p.id = bd.productId
      LEFT JOIN Entertainment en ON p.id = en.productId
      LEFT JOIN CateringTent ct ON p.id = ct.productId
      WHERE v.active = 1
      ORDER BY p.updated_at DESC
    `);

        const products = [];
        const map = new Map();

        rows.forEach((row) => {
            if (!map.has(row.id)) {
                map.set(row.id, {
                    id: row.id,
                    title: row.title,
                    partypalace: [],
                    musical: [],
                    multimedia: [],
                    luxury: [],
                    meeting: [],
                    adventure: [],
                    beautydecor: [],
                    entertainment: [],
                    cateringtent: [],
                });
            }
            const p = map.get(row.id);
            if (row.pp_id) p.partypalace.push({ id: row.pp_id, partypalace_name: row.partypalace_name, price: row.price });
            if (row.mu_id) p.musical.push({ id: row.mu_id, instrument_name: row.instrument_name, price: row.price });
            if (row.mm_id) p.multimedia.push({ id: row.mm_id, multimedia_name: row.multimedia_name, price: row.price });
            if (row.lx_id) p.luxury.push({ id: row.lx_id, luxury_name: row.luxury_name, price: row.price });
            if (row.mt_id) p.meeting.push({ id: row.mt_id, meeting_name: row.meeting_name, price: row.price });
            if (row.ad_id) p.adventure.push({ id: row.ad_id, adventure_name: row.adventure_name, price: row.price });
            if (row.bd_id) p.beautydecor.push({ id: row.bd_id, beauty_name: row.beauty_name, price: row.price });
            if (row.en_id) p.entertainment.push({ id: row.en_id, entertainment_name: row.entertainment_name, price: row.price });
            if (row.ct_id) p.cateringtent.push({ id: row.ct_id, catering_name: row.catering_name, price: row.price });
        });

        map.forEach((val) => products.push(val));
        res.json(products);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Booking Product by ID
const getBookingProductsById = async (req, res) => {
    const { id } = req.params;
    try {
        const rows = await query(`
      SELECT 
        p.id, p.title,
        pp.id as pp_id, pp.partypalace_name, pp.price,
        mu.id as mu_id, mu.instrument_name, mu.price,
        mm.id as mm_id, mm.multimedia_name, mm.price,
        lx.id as lx_id, lx.luxury_name, lx.price,
        mt.id as mt_id, mt.meeting_name, mt.price,
        ad.id as ad_id, ad.adventure_name, ad.price,
        bd.id as bd_id, bd.beauty_name, bd.price,
        en.id as en_id, en.entertainment_name, en.price,
        ct.id as ct_id, ct.catering_name, ct.price
      FROM Product p
      LEFT JOIN PartyPalace pp ON p.id = pp.productId
      LEFT JOIN Musical mu ON p.id = mu.productId
      LEFT JOIN Multimedia mm ON p.id = mm.productId
      LEFT JOIN Luxury lx ON p.id = lx.productId
      LEFT JOIN Meeting mt ON p.id = mt.productId
      LEFT JOIN Adventure ad ON p.id = ad.productId
      LEFT JOIN BeautyDecor bd ON p.id = bd.productId
      LEFT JOIN Entertainment en ON p.id = en.productId
      LEFT JOIN CateringTent ct ON p.id = ct.productId
      WHERE p.id = ?
    `, [id]);

        if (rows.length === 0) return res.status(404).json({ success: false, error: `Product ${id} doesn't exist.` });

        const product = {
            id: rows[0].id,
            title: rows[0].title,
            partypalace: [],
            musical: [],
            multimedia: [],
            luxury: [],
            meeting: [],
            adventure: [],
            beautydecor: [],
            entertainment: [],
            cateringtent: [],
        };

        rows.forEach((row) => {
            if (row.pp_id) product.partypalace.push({ id: row.pp_id, partypalace_name: row.partypalace_name, price: row.price });
            if (row.mu_id) product.musical.push({ id: row.mu_id, instrument_name: row.instrument_name, price: row.price });
            if (row.mm_id) product.multimedia.push({ id: row.mm_id, multimedia_name: row.multimedia_name, price: row.price });
            if (row.lx_id) product.luxury.push({ id: row.lx_id, luxury_name: row.luxury_name, price: row.price });
            if (row.mt_id) product.meeting.push({ id: row.mt_id, meeting_name: row.meeting_name, price: row.price });
            if (row.ad_id) product.adventure.push({ id: row.ad_id, adventure_name: row.adventure_name, price: row.price });
            if (row.bd_id) product.beautydecor.push({ id: row.bd_id, beauty_name: row.beauty_name, price: row.price });
            if (row.en_id) product.entertainment.push({ id: row.en_id, entertainment_name: row.entertainment_name, price: row.price });
            if (row.ct_id) product.cateringtent.push({ id: row.ct_id, catering_name: row.catering_name, price: row.price });
        });

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get HomePage Products
const getHomePageProducts = async (req, res) => {
    try {
        const { search = "", category = "", location: district = "" } = req.query;

        let whereClause = "WHERE p.is_active = 1 AND v.active = 1";
        let params = [];

        if (search) {
            whereClause += " AND p.title LIKE ?";
            params.push(`%${search}%`);
        }
        if (category) {
            whereClause += " AND c.category_name = ?";
            params.push(category);
        }
        if (district) {
            whereClause += " AND p.districtId = ?";
            params.push(district);
        }

        const rows = await query(`
      SELECT 
        p.id, p.title, p.description, p.short_description, p.address, p.is_active,
        d.district_name,
        pi.id as img_id, pi.url,
        mm.price as mm_price, mm.offerPrice as mm_offer, mm.multimedia_name,
        en.price as en_price, en.offerPrice as en_offer, en.entertainment_name,
        mu.price as mu_price, mu.offerPrice as mu_offer, mu.instrument_name,
        ct.price as ct_price, ct.offerPrice as ct_offer, ct.catering_name,
        ad.price as ad_price, ad.offerPrice as ad_offer, ad.adventure_name,
        lx.price as lx_price, lx.offerPrice as lx_offer, lx.luxury_name,
        mt.price as mt_price, mt.offerPrice as mt_offer, mt.meeting_name,
        pp.price as pp_price, pp.offerPrice as pp_offer, pp.partypalace_name,
        bd.price as bd_price, bd.offerPrice as bd_offer, bd.beauty_name
      FROM Product p
      JOIN Venue v ON p.businessId = v.id
      LEFT JOIN District d ON p.districtId = d.id
      LEFT JOIN Category c ON p.category_id = c.id
      LEFT JOIN ProductImage pi ON p.id = pi.productId
      LEFT JOIN Multimedia mm ON p.id = mm.productId
      LEFT JOIN Entertainment en ON p.id = en.productId
      LEFT JOIN Musical mu ON p.id = mu.productId
      LEFT JOIN CateringTent ct ON p.id = ct.productId
      LEFT JOIN Adventure ad ON p.id = ad.productId
      LEFT JOIN Luxury lx ON p.id = lx.productId
      LEFT JOIN Meeting mt ON p.id = mt.productId
      LEFT JOIN PartyPalace pp ON p.id = pp.productId
      LEFT JOIN BeautyDecor bd ON p.id = bd.productId
      ${whereClause}
      ORDER BY p.updated_at DESC
    `, params);

        const products = [];
        const map = new Map();

        rows.forEach((row) => {
            if (!map.has(row.id)) {
                map.set(row.id, {
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    short_description: row.short_description,
                    address: row.address,
                    is_active: Boolean(row.is_active),
                    District: { district_name: row.district_name },
                    product_image: [],
                    multimedia: [],
                    entertainment: [],
                    musical: [],
                    cateringtent: [],
                    adventure: [],
                    luxury: [],
                    meeting: [],
                    partypalace: [],
                    beautydecor: [],
                });
            }
            const p = map.get(row.id);
            if (row.img_id) p.product_image.push({ id: row.img_id, url: row.url });
            if (row.mm_price !== null) p.multimedia.push({ price: row.mm_price, offerPrice: row.mm_offer, multimedia_name: row.multimedia_name });
            if (row.en_price !== null) p.entertainment.push({ price: row.en_price, offerPrice: row.en_offer, entertainment_name: row.entertainment_name });
            if (row.mu_price !== null) p.musical.push({ price: row.mu_price, offerPrice: row.mu_offer, instrument_name: row.instrument_name });
            if (row.ct_price !== null) p.cateringtent.push({ price: row.ct_price, offerPrice: row.ct_offer, catering_name: row.catering_name });
            if (row.ad_price !== null) p.adventure.push({ price: row.ad_price, offerPrice: row.ad_offer, adventure_name: row.adventure_name });
            if (row.lx_price !== null) p.luxury.push({ price: row.lx_price, offerPrice: row.lx_offer, luxury_name: row.luxury_name });
            if (row.mt_price !== null) p.meeting.push({ price: row.mt_price, offerPrice: row.mt_offer, meeting_name: row.mt_offer });
            if (row.pp_price !== null) p.partypalace.push({ price: row.pp_price, offerPrice: row.pp_offer, partypalace_name: row.partypalace_name });
            if (row.bd_price !== null) p.beautydecor.push({ price: row.bd_price, offerPrice: row.bd_offer, beauty_name: row.beauty_name });
        });

        const result = Array.from(map.values()).map((product) => {
            const allPrices = [
                ...product.multimedia,
                ...product.entertainment,
                ...product.musical,
                ...product.partypalace,
                ...product.beautydecor,
                ...product.adventure,
                ...product.luxury,
                ...product.cateringtent,
                ...product.meeting,
            ];

            const minPrice = Math.min(...allPrices.map(i => i.price).filter(p => p != null), Infinity);
            const minOfferPrice = Math.min(...allPrices.map(i => i.offerPrice).filter(p => p != null && p > 0), Infinity);

            const discountPercentage = Number.isFinite(minPrice) && Number.isFinite(minOfferPrice) && minOfferPrice < minPrice
                ? Math.round(((minPrice - minOfferPrice) / minPrice) * 100)
                : 0;

            return {
                ...product,
                minPrice: Number.isFinite(minPrice) ? minPrice : 0,
                minOfferPrice: Number.isFinite(minOfferPrice) ? minOfferPrice : null,
                discountPercentage,
            };
        });

        res.json(result);
    } catch (error) {
        console.error("getHomePageProducts error:", error);
        res.status(400).json({ success: false, error: error.message });
    }
};

//! Get Product by ID
const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const rows = await query(`
      SELECT 
        p.*,
        d.district_name, v.venue_name, c.category_name,
        pi.id as img_id, pi.url,
        pp.*, mu.*, mm.*, lx.*, ct.*, ad.*, en.*, bd.*, mt.*
      FROM Product p
      LEFT JOIN District d ON p.districtId = d.id
      LEFT JOIN Venue v ON p.businessId = v.id
      LEFT JOIN Category c ON p.category_id = c.id
      LEFT JOIN ProductImage pi ON p.id = pi.productId
      LEFT JOIN PartyPalace pp ON p.id = pp.productId
      LEFT JOIN Musical mu ON p.id = mu.productId
      LEFT JOIN Multimedia mm ON p.id = mm.productId
      LEFT JOIN Luxury lx ON p.id = lx.productId
      LEFT JOIN CateringTent ct ON p.id = ct.productId
      LEFT JOIN Adventure ad ON p.id = ad.productId
      LEFT JOIN Entertainment en ON p.id = en.productId
      LEFT JOIN BeautyDecor bd ON p.id = bd.productId
      LEFT JOIN Meeting mt ON p.id = mt.productId
      WHERE p.id = ?
    `, [id]);

        if (rows.length === 0) return res.status(404).json({ success: false, error: `Product ${id} doesn't exist.` });

        const product = {
            ...rows[0],
            District: { id: rows[0].districtId, district_name: rows[0].district_name },
            Venue: { venue_name: rows[0].venue_name },
            category: { id: rows[0].category_id, category_name: rows[0].category_name },
            product_image: [],
            partypalace: [], musical: [], multimedia: [], luxury: [], cateringtent: [],
            adventure: [], entertainment: [], beautydecor: [], meeting: [],
        };

        const calculateDiscount = (price, offerPrice) => {
            if (offerPrice && price && offerPrice < price) {
                return Math.round(((price - offerPrice) / price) * 100);
            }
            return 0;
        };

        rows.forEach((row) => {
            if (row.img_id) product.product_image.push({ id: row.img_id, url: row.url });
            if (row.pp_id) product.partypalace.push({ ...row, discountPercentage: calculateDiscount(row.price, row.offerPrice) });
            if (row.mu_id) product.musical.push({ ...row, discountPercentage: calculateDiscount(row.price, row.offerPrice) });
            if (row.mm_id) product.multimedia.push({ ...row, discountPercentage: calculateDiscount(row.price, row.offerPrice) });
            if (row.lx_id) product.luxury.push({ ...row, discountPercentage: calculateDiscount(row.price, row.offerPrice) });
            if (row.ct_id) product.cateringtent.push({ ...row, discountPercentage: calculateDiscount(row.price, row.offerPrice) });
            if (row.ad_id) product.adventure.push({ ...row, discountPercentage: calculateDiscount(row.price, row.offerPrice) });
            if (row.en_id) product.entertainment.push({ ...row, discountPercentage: calculateDiscount(row.price, row.offerPrice) });
            if (row.bd_id) product.beautydecor.push({ ...row, discountPercentage: calculateDiscount(row.price, row.offerPrice) });
            if (row.mt_id) product.meeting.push({ ...row, discountPercentage: calculateDiscount(row.price, row.offerPrice) });
        });

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Product Images by ID
const getProductImagesById = async (req, res) => {
    const { id } = req.params;
    try {
        const images = await query(`SELECT id, url FROM ProductImage WHERE productId = ?`, [id]);
        res.json({ success: true, product: images });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Delete Product by ID
const deleteProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(`DELETE FROM Product WHERE id = ?`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: `Product with ID ${id} does not exist` });
        }
        res.json({ success: true, message: "Product Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Create Product
const createProduct = async (req, res) => {
    const productImages = req.files ? req.files.map(file => ({ url: file.path.replace("\\", "/") })) : [];

    try {
        const parsedData = {
            ...req.body,
            multimedia: typeof req.body.multimedia === 'string' ? JSON.parse(req.body.multimedia) : req.body.multimedia || [],
            musical: typeof req.body.musical === 'string' ? JSON.parse(req.body.musical) : req.body.musical || [],
            luxury: typeof req.body.luxury === 'string' ? JSON.parse(req.body.luxury) : req.body.luxury || [],
            entertainment: typeof req.body.entertainment === 'string' ? JSON.parse(req.body.entertainment) : req.body.entertainment || [],
            meeting: typeof req.body.meeting === 'string' ? JSON.parse(req.body.meeting) : req.body.meeting || [],
            beautydecor: typeof req.body.beautydecor === 'string' ? JSON.parse(req.body.beautydecor) : req.body.beautydecor || [],
            adventure: typeof req.body.adventure === 'string' ? JSON.parse(req.body.adventure) : req.body.adventure || [],
            partypalace: typeof req.body.partypalace === 'string' ? JSON.parse(req.body.partypalace) : req.body.partypalace || [],
            cateringtent: typeof req.body.cateringtent === 'string' ? JSON.parse(req.body.cateringtent) : req.body.cateringtent || [],
            is_active: ["true", true].includes(req.body.is_active),
        };

        const [result] = await db.execute(
            `INSERT INTO Product 
       (title, description, short_description, address, category_id, districtId, businessId, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                parsedData.title,
                parsedData.description,
                parsedData.title,
                parsedData.address,
                parseInt(parsedData.category, 10),
                parseInt(parsedData.location, 10),
                parseInt(parsedData.business, 10),
                parsedData.is_active,
            ]
        );

        const productId = result.insertId;

        // Insert images
        if (productImages.length > 0) {
            const imgValues = productImages.map(img => [img.url, productId]);
            await db.execute(
                `INSERT INTO ProductImage (url, productId) VALUES ?`,
                [imgValues]
            );
        }

        // Insert service data
        const insertService = async (data, table) => {
            if (data && data.length > 0) {
                const values = data.map(item => [item.name || item.partypalace_name || item.instrument_name || item.multimedia_name || item.luxury_name || item.meeting_name || item.adventure_name || item.beauty_name || item.entertainment_name || item.catering_name, item.price, item.offerPrice || null, item.description || null, productId]);
                await db.execute(`INSERT INTO ${table} (name, price, offerPrice, description, productId) VALUES ?`, [values]);
            }
        };

        await insertService(parsedData.multimedia, 'Multimedia');
        await insertService(parsedData.musical, 'Musical');
        await insertService(parsedData.luxury, 'Luxury');
        await insertService(parsedData.entertainment, 'Entertainment');
        await insertService(parsedData.meeting, 'Meeting');
        await insertService(parsedData.beautydecor, 'BeautyDecor');
        await insertService(parsedData.adventure, 'Adventure');
        await insertService(parsedData.partypalace, 'PartyPalace');
        await insertService(parsedData.cateringtent, 'CateringTent');

        res.status(201).json({ success: true, message: "Product Created" });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
            });
        }
        res.status(400).json({ success: false, error: error.message });
    }
};

//! Update Product
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const uploadedFiles = req.files ? req.files.map(file => ({ url: file.path.replace("\\", "/") })) : [];
    const existingImages = req.body.product_image ? (Array.isArray(req.body.product_image) ? req.body.product_image : [req.body.product_image]) : [];
    const productImages = [...uploadedFiles, ...existingImages.map(url => ({ url }))];

    try {
        const parsedData = {
            ...req.body,
            multimedia: typeof req.body.multimedia === 'string' ? JSON.parse(req.body.multimedia) : req.body.multimedia || [],
            musical: typeof req.body.musical === 'string' ? JSON.parse(req.body.musical) : req.body.musical || [],
            luxury: typeof req.body.luxury === 'string' ? JSON.parse(req.body.luxury) : req.body.luxury || [],
            entertainment: typeof req.body.entertainment === 'string' ? JSON.parse(req.body.entertainment) : req.body.entertainment || [],
            meeting: typeof req.body.meeting === 'string' ? JSON.parse(req.body.meeting) : req.body.meeting || [],
            beautydecor: typeof req.body.beautydecor === 'string' ? JSON.parse(req.body.beautydecor) : req.body.beautydecor || [],
            adventure: typeof req.body.adventure === 'string' ? JSON.parse(req.body.adventure) : req.body.adventure || [],
            partypalace: typeof req.body.partypalace === 'string' ? JSON.parse(req.body.partypalace) : req.body.partypalace || [],
            cateringtent: typeof req.body.cateringtent === 'string' ? JSON.parse(req.body.cateringtent) : req.body.cateringtent || [],
            is_active: ["true", true].includes(req.body.is_active),
        };

        // Delete old related data
        await db.execute(`DELETE FROM ProductImage WHERE productId = ?`, [id]);
        await db.execute(`DELETE FROM Multimedia WHERE productId = ?`, [id]);
        await db.execute(`DELETE FROM Musical WHERE productId = ?`, [id]);
        await db.execute(`DELETE FROM Luxury WHERE productId = ?`, [id]);
        await db.execute(`DELETE FROM Entertainment WHERE productId = ?`, [id]);
        await db.execute(`DELETE FROM Meeting WHERE productId = ?`, [id]);
        await db.execute(`DELETE FROM BeautyDecor WHERE productId = ?`, [id]);
        await db.execute(`DELETE FROM Adventure WHERE productId = ?`, [id]);
        await db.execute(`DELETE FROM PartyPalace WHERE productId = ?`, [id]);
        await db.execute(`DELETE FROM CateringTent WHERE productId = ?`, [id]);

        // Re-insert images
        if (productImages.length > 0) {
            const imgValues = productImages.map(img => [img.url, id]);
            await db.execute(`INSERT INTO ProductImage (url, productId) VALUES ?`, [imgValues]);
        }

        // Re-insert services
        const insertService = async (data, table) => {
            if (data && data.length > 0) {
                const values = data.map(item => [item.name || item.partypalace_name || item.instrument_name || item.multimedia_name || item.luxury_name || item.meeting_name || item.adventure_name || item.beauty_name || item.entertainment_name || item.catering_name, item.price, item.offerPrice || null, item.description || null, id]);
                await db.execute(`INSERT INTO ${table} (name, price, offerPrice, description, productId) VALUES ?`, [values]);
            }
        };

        await insertService(parsedData.multimedia, 'Multimedia');
        await insertService(parsedData.musical, 'Musical');
        await insertService(parsedData.luxury, 'Luxury');
        await insertService(parsedData.entertainment, 'Entertainment');
        await insertService(parsedData.meeting, 'Meeting');
        await insertService(parsedData.beautydecor, 'BeautyDecor');
        await insertService(parsedData.adventure, 'Adventure');
        await insertService(parsedData.partypalace, 'PartyPalace');
        await insertService(parsedData.cateringtent, 'CateringTent');

        // Update main product
        await db.execute(
            `UPDATE Product SET title = ?, description = ?, short_description = ?, address = ?, category_id = ?, districtId = ?, businessId = ?, is_active = ?, updated_at = NOW() WHERE id = ?`,
            [
                parsedData.title,
                parsedData.description,
                parsedData.title,
                parsedData.address,
                parseInt(parsedData.category, 10),
                parseInt(parsedData.location, 10),
                parseInt(parsedData.business, 10),
                parsedData.is_active,
                id,
            ]
        );

        res.json({ success: true, message: "Product Updated" });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map(e => e.message),
            });
        }
        res.status(400).json({ success: false, error: error.message });
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
    updateProduct,
};