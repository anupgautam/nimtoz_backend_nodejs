import nodemailer from "nodemailer";
import { createBookingSchema } from "../utils/validationSchema.js";
import { addMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { z } from "zod";
import db from "../config/prisma.js"; 

const categoryMap = {
    PartyPalace: "PartyPalace",
    CateringTent: "CateringTent",
    Adventure: "Adventure",
    BeautyDecor: "BeautyDecor",
    Meeting: "Meeting",
    Entertainment: "Entertainment",
    Luxury: "Luxury",
    Musical: "Musical",
    Multimedia: "Multimedia",
};

// const transporter = nodemailer.createTransport({
//     host: "smtp.gmail.com",
//     port: 587,
//     secure: false,
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//     },
// });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // must be App Password
  },
});

function combineDateAndTime(dateString, timeString) {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date(dateString);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

//! Dashboard Stats: Approved vs Pending per month
async function getDashboardBookingStats() {
    const currentDate = new Date();
    const monthsArray = [];

    for (let i = 0; i < 12; i++) {
        const currentMonth = addMonths(currentDate, i);
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        const [events] = await db.execute(
            `SELECT is_approved FROM Event 
       WHERE start_date >= ? AND start_date <= ?`,
            [monthStart, monthEnd]
        );

        const approvedCount = events.filter((e) => e.is_approved).length;
        const notApprovedCount = events.filter((e) => !e.is_approved).length;

        monthsArray.push({
            month: format(currentMonth, "MMM"),
            approved: approvedCount,
            notApproved: notApprovedCount,
        });
    }

    return monthsArray;
}

//! Get All Bookings (with search & pagination)
// ============================================
// FIXED getAllBookings Controller
// ============================================
const getAllBookings = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let whereClause = "";
    let params = [];

    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      whereClause = `WHERE LOWER(c.category_name) LIKE ? OR LOWER(p.title) LIKE ?`;
      params.push(searchTerm, searchTerm);
    }

    // Total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Event e
      JOIN Product p ON e.productId = p.id
      JOIN Category c ON p.category_id = c.id
      JOIN User u ON e.userId = u.id
      JOIN EventType et ON e.eventTypeId = et.id
      ${whereClause}
    `;
    const [countResult] = await db.execute(countQuery, params);
    const totalCount = countResult[0].total;

    // Fetch bookings with JUNCTION TABLE joins to get only selected services
    const bookingsQuery = `
      SELECT 
        e.id, e.start_date, e.end_date, e.start_time, e.end_time, e.is_approved, e.total_price,
        u.id as user_id, u.firstname, u.lastname, u.email as user_email,
        p.id as product_id, p.title as product_title, p.address,
        c.category_name,
        et.id as eventtype_id, et.title as eventtype_name,
        mm.id as mm_id, mm.multimedia_name, mm.price as mm_price, mm.offerPrice as mm_offerPrice,
        mus.id as mus_id, mus.instrument_name, mus.price as mus_price, mus.offerPrice as mus_offerPrice,
        lux.id as lux_id, lux.luxury_name, lux.price as lux_price, lux.offerPrice as lux_offerPrice,
        ent.id as ent_id, ent.entertainment_name, ent.price as ent_price, ent.offerPrice as ent_offerPrice,
        m.id as m_id, m.meeting_name, m.price as m_price, m.offerPrice as m_offerPrice,
        bd.id as bd_id, bd.beauty_name, bd.price as bd_price, bd.offerPrice as bd_offerPrice,
        adv.id as adv_id, adv.adventure_name, adv.price as adv_price, adv.offerPrice as adv_offerPrice,
        pp.id as pp_id, pp.partypalace_name, pp.price as pp_price, pp.offerPrice as pp_offerPrice,
        ct.id as ct_id, ct.catering_name, ct.price as ct_price, ct.offerPrice as ct_offerPrice
      FROM Event e
      JOIN User u ON e.userId = u.id
      JOIN Product p ON e.productId = p.id
      JOIN Category c ON p.category_id = c.id
      JOIN EventType et ON e.eventTypeId = et.id
      
      -- Join through junction tables to get ONLY selected services
      LEFT JOIN EventMultimedia emm ON emm.eventId = e.id
      LEFT JOIN Multimedia mm ON mm.id = emm.multimediaId
      
      LEFT JOIN EventMusical emus ON emus.eventId = e.id
      LEFT JOIN Musical mus ON mus.id = emus.musicalId
      
      LEFT JOIN EventLuxury elux ON elux.eventId = e.id
      LEFT JOIN Luxury lux ON lux.id = elux.luxuryId
      
      LEFT JOIN EventEntertainment eent ON eent.eventId = e.id
      LEFT JOIN Entertainment ent ON ent.id = eent.entertainmentId
      
      LEFT JOIN EventMeeting em ON em.eventId = e.id
      LEFT JOIN Meeting m ON m.id = em.meetingId
      
      LEFT JOIN EventBeautyDecor ebd ON ebd.eventId = e.id
      LEFT JOIN BeautyDecor bd ON bd.id = ebd.beautyDecorId
      
      LEFT JOIN EventAdventure eadv ON eadv.eventId = e.id
      LEFT JOIN Adventure adv ON adv.id = eadv.adventureId
      
      LEFT JOIN EventPartyPalace epp ON epp.eventId = e.id
      LEFT JOIN PartyPalace pp ON pp.id = epp.partyPalaceId
      
      LEFT JOIN EventCateringTent ect ON ect.eventId = e.id
      LEFT JOIN CateringTent ct ON ct.id = ect.cateringTentId
      
      ${whereClause}
      ORDER BY e.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const [bookings] = await db.execute(bookingsQuery, [...params, take, offset]);

    // Group services under each booking (remove duplicates)
    const groupedBookings = [];
    const map = new Map();

    bookings.forEach((row) => {
      const key = row.id;
      if (!map.has(key)) {
        map.set(key, {
          id: row.id,
          start_date: row.start_date,
          end_date: row.end_date,
          start_time: row.start_time,
          end_time: row.end_time,
          is_approved: row.is_approved,
          total_price: row.total_price,
          user: {
            id: row.user_id,
            firstname: row.firstname,
            lastname: row.lastname,
            email: row.user_email,
          },
          product: {
            id: row.product_id,
            title: row.product_title,
            address: row.address,
            category_name: row.category_name,
          },
          eventType: {
            id: row.eventtype_id,
            name: row.eventtype_name,
          },
          services: {
            Multimedia: [],
            Musical: [],
            Luxury: [],
            Entertainment: [],
            Meeting: [],
            BeautyDecor: [],
            Adventure: [],
            PartyPalace: [],
            CateringTent: [],
          },
        });
      }

      const booking = map.get(key);

      // Use Set to avoid duplicate service IDs
      const addUniqueService = (serviceArray, serviceData) => {
        if (serviceData.id && !serviceArray.find(s => s.id === serviceData.id)) {
          serviceArray.push(serviceData);
        }
      };

      if (row.mm_id) {
        addUniqueService(booking.services.Multimedia, {
          id: row.mm_id,
          name: row.multimedia_name,
          price: row.mm_price,
          offerPrice: row.mm_offerPrice
        });
      }
      if (row.mus_id) {
        addUniqueService(booking.services.Musical, {
          id: row.mus_id,
          name: row.instrument_name,
          price: row.mus_price,
          offerPrice: row.mus_offerPrice
        });
      }
      if (row.lux_id) {
        addUniqueService(booking.services.Luxury, {
          id: row.lux_id,
          name: row.luxury_name,
          price: row.lux_price,
          offerPrice: row.lux_offerPrice
        });
      }
      if (row.ent_id) {
        addUniqueService(booking.services.Entertainment, {
          id: row.ent_id,
          name: row.entertainment_name,
          price: row.ent_price,
          offerPrice: row.ent_offerPrice
        });
      }
      if (row.m_id) {
        addUniqueService(booking.services.Meeting, {
          id: row.m_id,
          name: row.meeting_name,
          price: row.m_price,
          offerPrice: row.m_offerPrice
        });
      }
      if (row.bd_id) {
        addUniqueService(booking.services.BeautyDecor, {
          id: row.bd_id,
          name: row.beauty_name,
          price: row.bd_price,
          offerPrice: row.bd_offerPrice
        });
      }
      if (row.adv_id) {
        addUniqueService(booking.services.Adventure, {
          id: row.adv_id,
          name: row.adventure_name,
          price: row.adv_price,
          offerPrice: row.adv_offerPrice
        });
      }
      if (row.pp_id) {
        addUniqueService(booking.services.PartyPalace, {
          id: row.pp_id,
          name: row.partypalace_name,
          price: row.pp_price,
          offerPrice: row.pp_offerPrice
        });
      }
      if (row.ct_id) {
        addUniqueService(booking.services.CateringTent, {
          id: row.ct_id,
          name: row.catering_name,
          price: row.ct_price,
          offerPrice: row.ct_offerPrice
        });
      }
    });

    map.forEach((val) => groupedBookings.push(val));

    res.json({
      success: true,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: parseInt(page),
      bookings: groupedBookings,
    });
  } catch (error) {
    console.error("getAllBookings error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ============================================
// UPDATED createBooking - NO CHANGES NEEDED
// ============================================
// Your createBooking is already correct!
// Just make sure frontend sends data like this:

/*
Frontend should send:
{
  "start_date": "2025-11-12",
  "end_date": "2025-11-12",
  "userId": 1,
  "productId": 32,
  "eventTypeId": 1,
  "services": {
    "BeautyDecor": [11]  // Array of selected service IDs
  }
}

NOT like this:
{
  "Hall": ["11"]  // Wrong - this is what your frontend currently sends
}
*/

//! Get Bookings for Logged-in User (My Bookings)
const getBookingByUserId = async (req, res) => {
  const { userId } = req.params;

  if (parseInt(userId) !== req.user.id && req.user.role !== "ADMIN") {
    return res.status(403).json({ success: false, error: "Not authorized" });
  }

  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM Event WHERE userId = ?`,
      [userId]
    );
    const totalCount = countResult[0].total;

    // Fetch bookings with junction tables to get only selected services
    const [bookings] = await db.execute(
      `
      SELECT 
        e.id, e.start_date, e.end_date, e.start_time, e.end_time, e.is_approved, e.total_price,
        p.id as product_id, p.title as product_title, p.address,
        c.category_name,
        et.id as eventtype_id, et.title as eventtype_name,
        mm.id as mm_id, mm.multimedia_name, mm.price as mm_price, mm.offerPrice as mm_offerPrice,
        mus.id as mus_id, mus.instrument_name, mus.price as mus_price, mus.offerPrice as mus_offerPrice,
        lux.id as lux_id, lux.luxury_name, lux.price as lux_price, lux.offerPrice as lux_offerPrice,
        ent.id as ent_id, ent.entertainment_name, ent.price as ent_price, ent.offerPrice as ent_offerPrice,
        m.id as m_id, m.meeting_name, m.price as m_price, m.offerPrice as m_offerPrice,
        bd.id as bd_id, bd.beauty_name, bd.price as bd_price, bd.offerPrice as bd_offerPrice,
        adv.id as adv_id, adv.adventure_name, adv.price as adv_price, adv.offerPrice as adv_offerPrice,
        pp.id as pp_id, pp.partypalace_name, pp.price as pp_price, pp.offerPrice as pp_offerPrice,
        ct.id as ct_id, ct.catering_name, ct.price as ct_price, ct.offerPrice as ct_offerPrice
      FROM Event e
      JOIN Product p ON e.productId = p.id
      JOIN Category c ON p.category_id = c.id
      JOIN EventType et ON e.eventTypeId = et.id
      
      LEFT JOIN EventMultimedia emm ON emm.eventId = e.id
      LEFT JOIN Multimedia mm ON mm.id = emm.multimediaId
      
      LEFT JOIN EventMusical emus ON emus.eventId = e.id
      LEFT JOIN Musical mus ON mus.id = emus.musicalId
      
      LEFT JOIN EventLuxury elux ON elux.eventId = e.id
      LEFT JOIN Luxury lux ON lux.id = elux.luxuryId
      
      LEFT JOIN EventEntertainment eent ON eent.eventId = e.id
      LEFT JOIN Entertainment ent ON ent.id = eent.entertainmentId
      
      LEFT JOIN EventMeeting em ON em.eventId = e.id
      LEFT JOIN Meeting m ON m.id = em.meetingId
      
      LEFT JOIN EventBeautyDecor ebd ON ebd.eventId = e.id
      LEFT JOIN BeautyDecor bd ON bd.id = ebd.beautyDecorId
      
      LEFT JOIN EventAdventure eadv ON eadv.eventId = e.id
      LEFT JOIN Adventure adv ON adv.id = eadv.adventureId
      
      LEFT JOIN EventPartyPalace epp ON epp.eventId = e.id
      LEFT JOIN PartyPalace pp ON pp.id = epp.partyPalaceId
      
      LEFT JOIN EventCateringTent ect ON ect.eventId = e.id
      LEFT JOIN CateringTent ct ON ct.id = ect.cateringTentId
      
      WHERE e.userId = ?
      ORDER BY e.updated_at DESC
      LIMIT ? OFFSET ?
      `,
      [userId, take, offset]
    );

    // Group services under each booking (remove duplicates)
    const groupedBookings = [];
    const map = new Map();

    bookings.forEach((row) => {
      const key = row.id;
      if (!map.has(key)) {
        map.set(key, {
          id: row.id,
          start_date: row.start_date,
          end_date: row.end_date,
          start_time: row.start_time,
          end_time: row.end_time,
          is_approved: row.is_approved,
          total_price: row.total_price,
          product: {
            id: row.product_id,
            title: row.product_title,
            address: row.address,
            category_name: row.category_name,
          },
          eventType: {
            id: row.eventtype_id,
            name: row.eventtype_name,
          },
          services: {
            Multimedia: [],
            Musical: [],
            Luxury: [],
            Entertainment: [],
            Meeting: [],
            BeautyDecor: [],
            Adventure: [],
            PartyPalace: [],
            CateringTent: [],
          },
        });
      }

      const booking = map.get(key);

      const addUniqueService = (serviceArray, serviceData) => {
        if (serviceData.id && !serviceArray.find((s) => s.id === serviceData.id)) {
          serviceArray.push(serviceData);
        }
      };

      if (row.mm_id) addUniqueService(booking.services.Multimedia, { id: row.mm_id, name: row.multimedia_name, price: row.mm_price, offerPrice: row.mm_offerPrice });
      if (row.mus_id) addUniqueService(booking.services.Musical, { id: row.mus_id, name: row.instrument_name, price: row.mus_price, offerPrice: row.mus_offerPrice });
      if (row.lux_id) addUniqueService(booking.services.Luxury, { id: row.lux_id, name: row.luxury_name, price: row.lux_price, offerPrice: row.lux_offerPrice });
      if (row.ent_id) addUniqueService(booking.services.Entertainment, { id: row.ent_id, name: row.entertainment_name, price: row.ent_price, offerPrice: row.ent_offerPrice });
      if (row.m_id) addUniqueService(booking.services.Meeting, { id: row.m_id, name: row.meeting_name, price: row.m_price, offerPrice: row.m_offerPrice });
      if (row.bd_id) addUniqueService(booking.services.BeautyDecor, { id: row.bd_id, name: row.beauty_name, price: row.bd_price, offerPrice: row.bd_offerPrice });
      if (row.adv_id) addUniqueService(booking.services.Adventure, { id: row.adv_id, name: row.adventure_name, price: row.adv_price, offerPrice: row.adv_offerPrice });
      if (row.pp_id) addUniqueService(booking.services.PartyPalace, { id: row.pp_id, name: row.partypalace_name, price: row.pp_price, offerPrice: row.pp_offerPrice });
      if (row.ct_id) addUniqueService(booking.services.CateringTent, { id: row.ct_id, name: row.catering_name, price: row.ct_price, offerPrice: row.ct_offerPrice });
    });

    map.forEach((val) => groupedBookings.push(val));

    res.json({
      success: true,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: parseInt(page),
      bookings: groupedBookings,
    });
  } catch (error) {
    console.error("getBookingByUserId error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


//! Dashboard Stats Endpoint
const getBookingStats = async (req, res) => {
    try {
        const stats = await getDashboardBookingStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Get Booking by ID
const getBookingById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(
            `SELECT e.*, u.email as user_email, p.title as product_title, c.category_name
       FROM Event e
       JOIN User u ON e.userId = u.id
       JOIN Product p ON e.productId = p.id
       JOIN Category c ON p.category_id = c.id
       WHERE e.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: `Booking ${id} doesn't exist` });
        }

        res.json({ success: true, booking: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Delete Booking
const deleteBookingById = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(`DELETE FROM Event WHERE id = ?`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: `Booking with ID ${id} does not exist` });
        }
        res.json({ success: true, message: "Booking Deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Create Booking
const createBooking = async (req, res) => {
  const {
    start_date,
    end_date,
    start_time,
    end_time,
    userId,
    productId,
    eventTypeId,
    events,
    selectedServices = {},
  } = req.body;

  try {
    const finalEventTypeId = eventTypeId || (events && events[0]?.id);
    if (!start_date || !end_date || !userId || !productId || !finalEventTypeId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const combinedStartTime = combineDateAndTime(start_date, start_time);
    const combinedEndTime = combineDateAndTime(end_date, end_time);

    // 🔹 AUTO APPROVAL LOGIC (ONLY CHANGE)
    const isApproved = req.user.role === "ADMIN" ? 1 : 0;

    // ✅ Verify product exists
    const [[product]] = await db.execute(
      `SELECT p.title, c.category_name
       FROM Product p
       JOIN Category c ON p.category_id = c.id
       WHERE p.id = ?`,
      [productId]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // ❌ Conflict check (approved)
    const [[approvedConflict]] = await db.execute(
      `SELECT 1 FROM Event
       WHERE productId = ?
         AND is_approved = 1
         AND start_date <= ?
         AND end_date >= ?`,
      [productId, endDate, startDate]
    );

    if (approvedConflict) {
      return res.status(409).json({
        success: false,
        message: "An approved booking already exists on this date",
      });
    }

    // ❌ Conflict check (pending)
    const [[pendingConflict]] = await db.execute(
      `SELECT 1 FROM Event
       WHERE productId = ?
         AND is_approved = 0
         AND start_date < ?
         AND end_date > ?`,
      [productId, endDate, startDate]
    );

    if (pendingConflict) {
      return res.status(409).json({
        success: false,
        message: "Booking overlaps with an existing pending request",
      });
    }

    // 🧾 INSERT EVENT
    const [eventResult] = await db.execute(
      `INSERT INTO Event
       (start_date, end_date, start_time, end_time, userId, productId, eventTypeId, is_approved, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        startDate,
        endDate,
        combinedStartTime,
        combinedEndTime,
        userId,
        productId,
        finalEventTypeId,
        isApproved, // ✅ ADMIN → 1, others → 0
      ]
    );

    const eventId = eventResult.insertId;

    // 🔗 SERVICE TABLE MAPPING
    const serviceTables = [
      { table: "Multimedia", column: "multimediaId", nameColumn: "multimedia_name" },
      { table: "Musical", column: "musicalId", nameColumn: "instrument_name" },
      { table: "Luxury", column: "luxuryId", nameColumn: "luxury_name" },
      { table: "Entertainment", column: "entertainmentId", nameColumn: "entertainment_name" },
      { table: "Meeting", column: "meetingId", nameColumn: "meeting_name" },
      { table: "BeautyDecor", column: "beautyDecorId", nameColumn: "beauty_name" },
      { table: "Adventure", column: "adventureId", nameColumn: "adventure_name" },
      { table: "PartyPalace", column: "partyPalaceId", nameColumn: "partypalace_name" },
      { table: "CateringTent", column: "cateringTentId", nameColumn: "catering_name" },
    ];

    let totalPrice = 0;
    const servicesResult = {};

    for (const { table, column, nameColumn } of serviceTables) {
      const selectedIds = selectedServices[table] || [];
      if (!selectedIds.length) continue;

      const placeholders = selectedIds.map(() => "?").join(",");
      const [services] = await db.execute(
        `SELECT id, price, offerPrice, ${nameColumn} AS name
         FROM ${table}
         WHERE id IN (${placeholders}) AND productId = ?`,
        [...selectedIds, productId]
      );

      for (const s of services) {
        totalPrice += (s.price || 0) - (s.offerPrice || 0);
      }

      const junctionTable = `Event${table}`;
      const values = services.map(() => `(?, ?)`).join(",");
      const params = services.flatMap((s) => [eventId, s.id]);

      await db.execute(
        `INSERT INTO ${junctionTable} (eventId, ${column}) VALUES ${values}`,
        params
      );

      servicesResult[table] = services;
    }

    // 💰 Update total price
    await db.execute(
      `UPDATE Event SET total_price = ?, updated_at = NOW() WHERE id = ?`,
      [totalPrice, eventId]
    );

    return res.status(201).json({
      success: true,
      bookingId: eventId,
      is_approved: isApproved,
    });

  } catch (error) {
    console.error("createBooking error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


//! Update Booking (Approve/Reject)
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved } = req.body;

    // Update booking approval status
    const [result] = await db.execute(
      `UPDATE Event SET is_approved = ? WHERE id = ?`,
      [is_approved, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Fetch booking + user info for potential email notification
    const [bookingRows] = await db.execute(
      `SELECT e.id, e.is_approved, e.total_price, e.start_date, e.end_date, 
              u.email AS user_email, u.firstname, u.lastname,
              p.title AS product_title
       FROM Event e
       JOIN User u ON e.userId = u.id
       JOIN Product p ON e.productId = p.id
       WHERE e.id = ?`,
      [id]
    );

    const booking = bookingRows[0];

    // 🟢 Optional Email Notification
    try {
      // Only try sending email if credentials exist
      if (process.env.EMAIL && process.env.PASSWORD) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
          },
        });

        const mailOptions = {
          from: process.env.EMAIL,
          to: booking.user_email,
          subject: `Booking ${is_approved ? "Approved" : "Updated"} - ${booking.product_title}`,
          text: `
Hello ${booking.firstname},

Your booking for "${booking.product_title}" has been ${
            is_approved ? "approved ✅" : "updated"
          }.

Booking Details:
- Booking ID: ${booking.id}
- Total Price: Rs. ${booking.total_price}
- Date: ${new Date(booking.start_date).toDateString()} to ${new Date(
            booking.end_date
          ).toDateString()}

Thank you for using our service!
          `,
        };

        await transporter.sendMail(mailOptions);
      } else {
        console.warn("⚠️ Email credentials not found — skipping email send.");
      }
    } catch (mailError) {
      console.error("Email send failed:", mailError.message);
    }

    return res.json({
      success: true,
      message: "Booking updated successfully",
      booking: booking,
    });
  } catch (error) {
    console.error("updateBooking error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const tableMap = {
    PartyPalace: "EventPartyPalace",
    CateringTent: "EventCateringTent",
    Adventure: "EventAdventure",
    BeautyDecor: "EventBeautyDecor",
    Meeting: "EventMeeting",
    Entertainment: "EventEntertainment",
    Luxury: "EventLuxury",
    Musical: "EventMusical",
    Multimedia: "EventMultimedia",
};

export {
    getAllBookings,
    getBookingById,
    getBookingStats,
    deleteBookingById,
    createBooking,
    updateBooking,
    getBookingByUserId
};