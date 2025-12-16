// controllers/productController.js
import { productSchema, updateProductSchema } from "../utils/validationSchema.js";
import { z } from "zod";
import db from "../config/prisma.js"; // <-- your MySQL pool
import { BASE_URL } from "../baseUrl.js";

// Helper: Execute query and return rows
const query = async (sql, params = []) => {
    const [rows] = await db.execute(sql, params);
    return rows;
};
// utils/buildFileUrl.js
export const buildFileUrl = (filePath) => {
  if (!filePath) return null;

  // If the path is an object with url property
  if (typeof filePath === "object" && filePath.url) {
    filePath = filePath.url;
  }

  // Ensure it's a string
  filePath = String(filePath);

  // Return full URL
  return filePath.startsWith("http")
    ? filePath
    : `${BASE_URL.replace(/\/$/, "")}/${filePath.replace(/^\/+/, "")}`;
};

//! Get All Products 
const getAllProducts = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let whereClause = "";
    const params = [];

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      whereClause = `WHERE LOWER(p.title) LIKE ? OR LOWER(p.address) LIKE ? OR LOWER(d.district_name) LIKE ?`;
      params.push(term, term, term);
    }

    // Count total products
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Product p 
      LEFT JOIN District d ON p.districtId = d.id 
      ${whereClause}
    `;
    const [countResult] = await db.execute(countQuery, params);
    const totalCount = countResult[0].total;

    // Fetch main product data
    const productsQuery = `
      SELECT 
        p.*, 
        d.id AS dist_id, d.district_name,
        c.id AS category_id, c.category_name,
        v.id AS business_id, v.venue_name
      FROM Product p
      LEFT JOIN District d ON p.districtId = d.id
      LEFT JOIN Category c ON p.category_id = c.id
      LEFT JOIN Venue v ON p.businessId = v.id
      ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await query(productsQuery, [...params, take, offset]);

    const products = [];
    const map = new Map();
    const productIds = [];

    rows.forEach(row => {
      const pid = row.id;
      productIds.push(pid);
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          title: row.title,
          description: row.description,
          short_description: row.short_description,
          address: row.address,
          is_active: Boolean(row.is_active),
          created_at: row.created_at,
          updated_at: row.updated_at,
          District: row.dist_id ? { id: row.dist_id, district_name: row.district_name } : null,
          Category: row.category_id ? { id: row.category_id, category_name: row.category_name } : null,
          Business: row.business_id ? { id: row.business_id, venue_name: row.venue_name } : null,
          product_image: [],
          partypalace: [],
          musical: [],
          multimedia: [],
          luxury: [],
          entertainment: [],
          adventure: [],
          cateringtent: [],
          beautydecor: [],
          meeting: [],
        });
      }
    });

    // Fetch product images
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(",");
      const [images] = await db.execute(
        `SELECT id, url, productId FROM ProductImage WHERE productId IN (${placeholders})`,
        productIds
      );

      const imagesMap = new Map();
      images.forEach(img => {
        if (!imagesMap.has(img.productId)) imagesMap.set(img.productId, []);
        imagesMap.get(img.productId).push({ id: img.id, url: buildFileUrl(img.url) });
      });

      map.forEach((p, pid) => {
        if (imagesMap.has(pid)) p.product_image = imagesMap.get(pid);
      });
    }

    // Utility function to fetch service data including Multimedia
    const fetchService = async (table, nameCol, alias) => {
      const [rows] = await db.execute(
        `SELECT id, ${nameCol} AS name, price, offerPrice, description, productId 
         FROM ${table} WHERE productId IN (${productIds.map(() => "?").join(",")})`,
        productIds
      );

      const tempMap = new Map();
      rows.forEach(r => {
        if (!tempMap.has(r.productId)) tempMap.set(r.productId, []);
        tempMap.get(r.productId).push({
          id: r.id,
          [nameCol]: r.name,
          price: r.price,
          offerPrice: r.offerPrice,
          description: r.description,
        });
      });

      map.forEach((p, pid) => {
        if (tempMap.has(pid)) p[alias] = tempMap.get(pid);
      });
    };

    if (productIds.length > 0) {
      await Promise.all([
        fetchService("PartyPalace", "partypalace_name", "partypalace"),
        fetchService("Musical", "instrument_name", "musical"),
        fetchService("Multimedia", "multimedia_name", "multimedia"),
        fetchService("Luxury", "luxury_name", "luxury"),
        fetchService("Entertainment", "entertainment_name", "entertainment"),
        fetchService("Adventure", "adventure_name", "adventure"),
        fetchService("CateringTent", "catering_name", "cateringtent"),
        fetchService("BeautyDecor", "beauty_name", "beautydecor"),
        fetchService("Meeting", "meeting_name", "meeting"),
      ]);
    }

    map.forEach(val => products.push(val));

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
            pp.price as pp_price, pp.offerPrice as pp_offer,
            mu.price as mu_price, mu.offerPrice as mu_offer,
            mm.price as mm_price, mm.offerPrice as mm_offer,
            lx.price as lx_price, lx.offerPrice as lx_offer,
            mt.price as mt_price, mt.offerPrice as mt_offer,
            ad.price as ad_price, ad.offerPrice as ad_offer,
            bd.price as bd_price, bd.offerPrice as bd_offer,
            en.price as en_price, en.offerPrice as en_offer,
            ct.price as ct_price, ct.offerPrice as ct_offer,
            pp.id as pp_id, pp.partypalace_name,
            mu.id as mu_id, mu.instrument_name,
            mm.id as mm_id, mm.multimedia_name,
            lx.id as lx_id, lx.luxury_name,
            mt.id as mt_id, mt.meeting_name,
            ad.id as ad_id, ad.adventure_name,
            bd.id as bd_id, bd.beauty_name,
            en.id as en_id, en.entertainment_name,
            ct.id as ct_id, ct.catering_name
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

        const productsMap = new Map();

        rows.forEach((row) => {
            if (!productsMap.has(row.id)) {
                productsMap.set(row.id, {
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
                    totalPrice: 0, // final total after deducting offerPrice
                });
            }

            const p = productsMap.get(row.id);

            const addService = (serviceId, name, price, offer, alias, colName) => {
                if (!serviceId) return;
                const finalPrice = price - (offer || 0); // deduct offerPrice from price
                p[alias].push({ id: serviceId, [colName]: name, price, offerPrice: offer, finalPrice });
                p.totalPrice += finalPrice;
            };

            addService(row.pp_id, row.partypalace_name, row.pp_price, row.pp_offer, "partypalace", "partypalace_name");
            addService(row.mu_id, row.instrument_name, row.mu_price, row.mu_offer, "musical", "instrument_name");
            addService(row.mm_id, row.multimedia_name, row.mm_price, row.mm_offer, "multimedia", "multimedia_name");
            addService(row.lx_id, row.luxury_name, row.lx_price, row.lx_offer, "luxury", "luxury_name");
            addService(row.mt_id, row.meeting_name, row.mt_price, row.mt_offer, "meeting", "meeting_name");
            addService(row.ad_id, row.adventure_name, row.ad_price, row.ad_offer, "adventure", "adventure_name");
            addService(row.bd_id, row.beauty_name, row.bd_price, row.bd_offer, "beautydecor", "beauty_name");
            addService(row.en_id, row.entertainment_name, row.en_price, row.en_offer, "entertainment", "entertainment_name");
            addService(row.ct_id, row.catering_name, row.ct_price, row.ct_offer, "cateringtent", "catering_name");
        });

        const products = Array.from(productsMap.values());
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
                d.id as district_id, d.district_name,
                c.id as category_id, c.category_name,
                v.id as business_id, v.venue_name, v.venue_address, v.contact_person, v.phone_number, v.email, v.pan_vat_number,
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
                    District: row.district_id ? { id: row.district_id, district_name: row.district_name } : null,
                    Category: row.category_id ? { id: row.category_id, category_name: row.category_name } : null,
                    Business: row.business_id ? {
                        id: row.business_id,
                        venue_name: row.venue_name,
                        venue_address: row.venue_address,
                        contact_person: row.contact_person,
                        phone_number: row.phone_number,
                        email: row.email,
                        pan_vat_number: row.pan_vat_number
                    } : null,
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

            if (row.img_id) p.product_image.push({ id: row.img_id, url: buildFileUrl(row.url) });
            if (row.mm_price !== null) p.multimedia.push({ price: row.mm_price, offerPrice: row.mm_offer, multimedia_name: row.multimedia_name });
            if (row.en_price !== null) p.entertainment.push({ price: row.en_price, offerPrice: row.en_offer, entertainment_name: row.entertainment_name });
            if (row.mu_price !== null) p.musical.push({ price: row.mu_price, offerPrice: row.mu_offer, instrument_name: row.instrument_name });
            if (row.ct_price !== null) p.cateringtent.push({ price: row.ct_price, offerPrice: row.ct_offer, catering_name: row.catering_name });
            if (row.ad_price !== null) p.adventure.push({ price: row.ad_price, offerPrice: row.ad_offer, adventure_name: row.adventure_name });
            if (row.lx_price !== null) p.luxury.push({ price: row.lx_price, offerPrice: row.lx_offer, luxury_name: row.luxury_name });
            if (row.mt_price !== null) p.meeting.push({ price: row.mt_price, offerPrice: row.mt_offer, meeting_name: row.meeting_name });
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

        res.json({ success: true, products: result });
    } catch (error) {
        console.error("getHomePageProducts error:", error);
        res.status(400).json({ success: false, error: error.message });
    }
};

//! Get Product by ID
const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch main product + venue info
    const [productRows] = await db.execute(
      `SELECT 
        p.*, 
        d.id AS dist_id, d.district_name,
        c.id AS category_id, c.category_name,
        v.id AS business_id, v.venue_name, v.venue_address, v.contact_person, v.phone_number, v.email, v.pan_vat_number
       FROM Product p
       LEFT JOIN District d ON p.districtId = d.id
       LEFT JOIN Category c ON p.category_id = c.id
       LEFT JOIN Venue v ON p.businessId = v.id
       WHERE p.id = ?`,
      [id]
    );

    if (!productRows.length) {
      return res.status(404).json({ success: false, error: `Product ${id} doesn't exist.` });
    }

    const row = productRows[0];

    const product = {
      id: row.id,
      title: row.title,
      description: row.description,
      short_description: row.short_description,
      address: row.address,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
      District: row.dist_id ? { id: row.dist_id, district_name: row.district_name } : null,
      Category: row.category_id ? { id: row.category_id, category_name: row.category_name } : null,
      Business: row.business_id
        ? {
            id: row.business_id,
            venue_name: row.venue_name,
            venue_address: row.venue_address,
            contact_person: row.contact_person,
            phone_number: row.phone_number,
            email: row.email,
            pan_vat_number: row.pan_vat_number,
          }
        : null,
      product_image: [],
      partypalace: [],
      musical: [],
      multimedia: [],
      luxury: [],
      entertainment: [],
      adventure: [],
      cateringtent: [],
      beautydecor: [],
      meeting: [],
    };

    // Fetch product images
    const [images] = await db.execute(
      `SELECT id, url FROM ProductImage WHERE productId = ?`,
      [id]
    );
    product.product_image = images.map(img => ({ id: img.id, url: buildFileUrl(img.url) }));

    // Helper to fetch services
    const fetchService = async (table, nameCol, alias) => {
      const [rows] = await db.execute(
        `SELECT id, ${nameCol} AS name, price, offerPrice, description 
         FROM ${table} WHERE productId = ?`,
        [id]
      );

      product[alias] = rows.map(r => ({
        id: r.id,
        [nameCol]: r.name,
        price: r.price,
        offerPrice: r.offerPrice,
        description: r.description,
        discountPercentage:
          r.offerPrice && r.price && r.offerPrice < r.price
            ? Math.round(((r.price - r.offerPrice) / r.price) * 100)
            : 0,
      }));
    };

    await Promise.all([
      fetchService("PartyPalace", "partypalace_name", "partypalace"),
      fetchService("Musical", "instrument_name", "musical"),
      fetchService("Multimedia", "multimedia_name", "multimedia"),
      fetchService("Luxury", "luxury_name", "luxury"),
      fetchService("Entertainment", "entertainment_name", "entertainment"),
      fetchService("Adventure", "adventure_name", "adventure"),
      fetchService("CateringTent", "catering_name", "cateringtent"),
      fetchService("BeautyDecor", "beauty_name", "beautydecor"),
      fetchService("Meeting", "meeting_name", "meeting"),
    ]);

    res.json({ success: true, product });
  } catch (error) {
    console.error("getProductById error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

//! Get Product Images by ID
const getProductImagesById = async (req, res) => {
    const { id } = req.params;
    try {
        const images = await query(
            `SELECT id, url FROM ProductImage WHERE productId = ?`,
            [id]
        );

        const formattedImages = images.map(img => ({
            id: img.id,
            url: buildFileUrl(img.url), // prepend BASE_URL
        }));

        res.json({ success: true, product: formattedImages });
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

// Helper to safely parse JSON arrays
const safeParseJSON = (field) => {
  try {
    if (!field) return [];
    return typeof field === "string" ? JSON.parse(field) : field;
  } catch (e) {
    console.error("Failed to parse JSON:", field, e);
    return [];
  }
};
//! Create Product
//! Create Product
const createProduct = async (req, res) => {
  try {
    // Handle uploaded images
    const productImages = req.files
      ? req.files.map(file => ({ url: file.path.replace(/\\/g, "/") }))
      : [];

    // Parse request data
    const parsedData = {
      title: req.body.title,
      description: req.body.description,
      short_description: req.body.short_description || req.body.title,
      address: req.body.address,
      category: parseInt(req.body.category, 10),
      location: parseInt(req.body.location, 10),
      business: parseInt(req.body.business, 10),
      is_active: ["true", true].includes(req.body.is_active),
      partypalace: safeParseJSON(req.body.partypalace),
      musical: safeParseJSON(req.body.musical),
      luxury: safeParseJSON(req.body.luxury),
      entertainment: safeParseJSON(req.body.entertainment),
      meeting: safeParseJSON(req.body.meeting),
      beautydecor: safeParseJSON(req.body.beautydecor),
      adventure: safeParseJSON(req.body.adventure),
      cateringtent: safeParseJSON(req.body.cateringtent),
      multimedia: safeParseJSON(req.body.multimedia),
    };

    // Insert main product
    const [result] = await db.execute(
      `INSERT INTO Product 
      (title, description, short_description, address, category_id, districtId, businessId, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        parsedData.title,
        parsedData.description,
        parsedData.short_description,
        parsedData.address,
        parsedData.category,
        parsedData.location,
        parsedData.business,
        parsedData.is_active,
      ]
    );
    const productId = result.insertId;

    // Insert product images
    if (productImages.length > 0) {
      const imgValues = productImages.map(img => [img.url, productId]);
      await db.query(`INSERT INTO ProductImage (url, productId) VALUES ?`, [imgValues]);
    }

    // Insert services helper
    const insertService = async (data, table, nameColumn) => {
      if (data && data.length > 0) {
        const values = data.map(item => [
          item[nameColumn] || item.name,
          item.price ?? null,
          item.offerPrice ?? null,
          item.description ?? null,
          productId,
        ]);
        await db.query(
          `INSERT INTO ${table} (${nameColumn}, price, offerPrice, description, productId) VALUES ?`,
          [values]
        );
      }
    };

    // Insert all services
    await Promise.all([
      insertService(parsedData.partypalace, "PartyPalace", "partypalace_name"),
      insertService(parsedData.musical, "Musical", "instrument_name"),
      insertService(parsedData.luxury, "Luxury", "luxury_name"),
      insertService(parsedData.entertainment, "Entertainment", "entertainment_name"),
      insertService(parsedData.meeting, "Meeting", "meeting_name"),
      insertService(parsedData.beautydecor, "BeautyDecor", "beauty_name"),
      insertService(parsedData.adventure, "Adventure", "adventure_name"),
      insertService(parsedData.cateringtent, "CateringTent", "catering_name"),
      insertService(parsedData.multimedia, "Multimedia", "multimedia_name"),
    ]);

    // Fetch the inserted product with full details
    const [productRows] = await db.execute(
      `SELECT 
        p.*, 
        d.id AS dist_id, d.district_name,
        c.id AS category_id, c.category_name,
        v.id AS business_id, v.venue_name, v.venue_address, v.contact_person, v.phone_number, v.email, v.pan_vat_number
       FROM Product p
       LEFT JOIN District d ON p.districtId = d.id
       LEFT JOIN Category c ON p.category_id = c.id
       LEFT JOIN Venue v ON p.businessId = v.id
       WHERE p.id = ?`,
      [productId]
    );

    const row = productRows[0];

    const product = {
      id: row.id,
      title: row.title,
      description: row.description,
      short_description: row.short_description,
      address: row.address,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      updated_at: row.updated_at,
      District: row.dist_id ? { id: row.dist_id, district_name: row.district_name } : null,
      Category: row.category_id ? { id: row.category_id, category_name: row.category_name } : null,
      Business: row.business_id
        ? {
            id: row.business_id,
            venue_name: row.venue_name,
            venue_address: row.venue_address,
            contact_person: row.contact_person,
            phone_number: row.phone_number,
            email: row.email,
            pan_vat_number: row.pan_vat_number,
          }
        : null,
      product_image: productImages.map(img => ({ url: img.url })),
      partypalace: parsedData.partypalace,
      musical: parsedData.musical,
      luxury: parsedData.luxury,
      entertainment: parsedData.entertainment,
      meeting: parsedData.meeting,
      beautydecor: parsedData.beautydecor,
      adventure: parsedData.adventure,
      cateringtent: parsedData.cateringtent,
      multimedia: parsedData.multimedia,
    };

    res.status(201).json({ success: true, message: "Product Created Successfully", product });
  } catch (error) {
    console.error("createProduct Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


//! Update Product
const updateProduct = async (req, res) => {
  const { id } = req.params;

  try {
    // Handle uploaded files (convert path to forward slashes)
    const uploadedFiles = req.files?.length
      ? req.files.map(file => ({ url: file.path.replace(/\\/g, "/") }))
      : [];

    // Handle existing images from body (preserve if unchanged)
    let existingImages = [];
    if (req.body.product_image) {
      const normalizeImage = img => {
        if (typeof img === "string") return { url: img };
        if (img?.url) return { url: typeof img.url === "object" ? img.url.url : img.url };
        return null;
      };

      if (Array.isArray(req.body.product_image)) {
        existingImages = req.body.product_image.map(normalizeImage).filter(Boolean);
      } else {
        const single = normalizeImage(req.body.product_image);
        existingImages = single ? [single] : [];
      }
    }

    // Merge uploaded + existing (without duplicates)
    const allImages = [...existingImages, ...uploadedFiles].filter(
      (img, index, self) => index === self.findIndex(t => t.url === img.url)
    );

    // Safely parse JSON-like fields (arrays of objects)
    const parseField = field => {
      try {
        return typeof field === "string" ? JSON.parse(field) : field || [];
      } catch {
        return [];
      }
    };

    // Prepare parsed data
    const parsedData = {
      title: req.body.title,
      description: req.body.description,
      short_description: req.body.short_description || req.body.title,
      address: req.body.address,
      category: parseInt(req.body.category, 10),
      location: parseInt(req.body.location, 10),
      business: parseInt(req.body.business, 10),
      is_active: ["true", true, "1", 1].includes(req.body.is_active),
      multimedia: parseField(req.body.multimedia),
      musical: parseField(req.body.musical),
      luxury: parseField(req.body.luxury),
      entertainment: parseField(req.body.entertainment),
      meeting: parseField(req.body.meeting),
      beautydecor: parseField(req.body.beautydecor),
      adventure: parseField(req.body.adventure),
      partypalace: parseField(req.body.partypalace),
      cateringtent: parseField(req.body.cateringtent),
    };

    // Bulk insert helper
    const bulkInsert = async (table, columns, rows) => {
      if (!rows || rows.length === 0) return;
      const placeholders = rows.map(() => `(${columns.map(() => "?").join(",")})`).join(",");
      const values = rows.flat();
      const sql = `INSERT INTO ${table} (${columns.join(",")}) VALUES ${placeholders}`;
      await db.execute(sql, values);
    };

    // Delete and re-insert related data conditionally
    const serviceTables = [
      "Multimedia",
      "Musical",
      "Luxury",
      "Entertainment",
      "Meeting",
      "BeautyDecor",
      "Adventure",
      "PartyPalace",
      "CateringTent",
    ];

    // Only delete and re-insert images if changed
    if (uploadedFiles.length > 0 || req.body.product_image) {
      await db.execute(`DELETE FROM ProductImage WHERE productId = ?`, [id]);
      if (allImages.length > 0) {
        const imgRows = allImages.map(img => [img.url, id]);
        await bulkInsert("ProductImage", ["url", "productId"], imgRows);
      }
    }

    // Delete old service rows
    await Promise.all(serviceTables.map(table => db.execute(`DELETE FROM ${table} WHERE productId = ?`, [id])));

    // Re-insert services
    const tableMap = {
      Multimedia: "multimedia_name",
      Musical: "instrument_name",
      Luxury: "luxury_name",
      Entertainment: "entertainment_name",
      Meeting: "meeting_name",
      BeautyDecor: "beauty_name",
      Adventure: "adventure_name",
      PartyPalace: "partypalace_name",
      CateringTent: "catering_name",
    };

    const insertService = async (data, table) => {
      if (!data || data.length === 0) return;

      const nameCol = tableMap[table];
      const validRows = data
        .filter(item => item[nameCol] || item.name)
        .map(item => [
          item[nameCol] || item.name,
          item.price ?? null,
          item.offerPrice ?? null,
          item.description ?? null,
          id,
        ]);

      if (validRows.length > 0) {
        await bulkInsert(
          table,
          [nameCol, "price", "offerPrice", "description", "productId"],
          validRows
        );
      }
    };

    await Promise.all(
      Object.keys(tableMap).map(table =>
        insertService(parsedData[table.toLowerCase()] || [], table)
      )
    );

    // Update main product info
    await db.execute(
      `UPDATE Product 
       SET title = ?, description = ?, short_description = ?, address = ?, 
           category_id = ?, districtId = ?, businessId = ?, 
           is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        parsedData.title,
        parsedData.description,
        parsedData.short_description,
        parsedData.address,
        parsedData.category,
        parsedData.location,
        parsedData.business,
        parsedData.is_active,
        id,
      ]
    );

    res.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("updateProduct Error:", error);
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