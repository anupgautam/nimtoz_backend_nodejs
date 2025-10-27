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

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
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
            `SELECT is_approved, is_rejected FROM Event 
       WHERE start_date >= ? AND start_date <= ?`,
            [monthStart, monthEnd]
        );

        const approvedCount = events.filter((e) => e.is_approved).length;
        const notApprovedCount = events.filter((e) => !e.is_approved && !e.is_rejected).length;

        monthsArray.push({
            month: format(currentMonth, "MMM"),
            approved: approvedCount,
            notApproved: notApprovedCount,
        });
    }

    return monthsArray;
}

//! Get All Bookings (with search & pagination)
const getAllBookings = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        let whereClause = "";
        let params = [];

        if (search) {
            const searchTerm = `%${search.toLowerCase()}%`;
            whereClause = `WHERE LOWER(c.category_name) LIKE ?`;
            params.push(searchTerm);
        }

        const countQuery = `
      SELECT COUNT(*) as total
      FROM Event e
      JOIN Product p ON e.productId = p.id
      JOIN Category c ON p.category_id = c.id
      ${whereClause}
    `;

        const [countResult] = await db.execute(countQuery, params);
        const totalCount = countResult[0].total;

        const bookingsQuery = `
      SELECT 
        e.*,
        u.id as user_id, u.firstname, u.lastname, u.email as user_email,
        p.title as product_title, p.address,
        c.category_name,
        pp.id as pp_id, pp.partypalace_name, pp.price as pp_price,
        ct.id as ct_id, ct.catering_name, ct.price as ct_price,
        adv.id as adv_id, adv.adventure_name, adv.price as adv_price,
        bd.id as bd_id, bd.beauty_name, bd.price as bd_price,
        m.id as m_id, m.meeting_name, m.price as m_price,
        ent.id as ent_id, ent.entertainment_name, ent.price as ent_price,
        lux.id as lux_id, lux.luxury_name, lux.price as lux_price,
        mus.id as mus_id, mus.instrument_name, mus.price as mus_price,
        mm.id as mm_id, mm.multimedia_name, mm.price as mm_price
      FROM Event e
      JOIN User u ON e.userId = u.id
      JOIN Product p ON e.productId = p.id
      JOIN Category c ON p.category_id = c.id
      LEFT JOIN EventPartyPalace epp ON e.id = epp.eventId
      LEFT JOIN PartyPalace pp ON epp.partyPalaceId = pp.id
      LEFT JOIN EventCateringTent ect ON e.id = ect.eventId
      LEFT JOIN CateringTent ct ON ect.cateringTentId = ct.id
      LEFT JOIN EventAdventure ea ON e.id = ea.eventId
      LEFT JOIN Adventure adv ON ea.adventureId = adv.id
      LEFT JOIN EventBeautyDecor ebd ON e.id = ebd.eventId
      LEFT JOIN BeautyDecor bd ON ebd.beautyDecorId = bd.id
      LEFT JOIN EventMeeting em ON e.id = em.eventId
      LEFT JOIN Meeting m ON em.meetingId = m.id
      LEFT JOIN EventEntertainment ee ON e.id = ee.eventId
      LEFT JOIN Entertainment ent ON ee.entertainmentId = ent.id
      LEFT JOIN EventLuxury el ON e.id = el.eventId
      LEFT JOIN Luxury lux ON el.luxuryId = lux.id
      LEFT JOIN EventMusical emus ON e.id = emus.eventId
      LEFT JOIN Musical mus ON emus.musicalId = mus.id
      LEFT JOIN EventMultimedia emm ON e.id = emm.eventId
      LEFT JOIN Multimedia mm ON emm.multimediaId = mm.id
      ${whereClause}
      ORDER BY e.updated_at DESC
      LIMIT ? OFFSET ?
    `;

        const [bookings] = await db.execute(bookingsQuery, [...params, take, offset]);

        // Group add-ons by event
        const groupedBookings = [];
        const map = new Map();

        bookings.forEach((row) => {
            const key = row.id;
            if (!map.has(key)) {
                map.set(key, {
                    ...row,
                    PartyPalace: [],
                    CateringTent: [],
                    Adventure: [],
                    BeautyDecor: [],
                    Meeting: [],
                    Entertainment: [],
                    Luxury: [],
                    Musical: [],
                    Multimedia: [],
                });
            }
            const booking = map.get(key);

            if (row.pp_id) booking.PartyPalace.push({ id: row.pp_id, partypalace_name: row.partypalace_name, price: row.pp_price });
            if (row.ct_id) booking.CateringTent.push({ id: row.ct_id, catering_name: row.catering_name, price: row.ct_price });
            if (row.adv_id) booking.Adventure.push({ id: row.adv_id, adventure_name: row.adventure_name, price: row.adv_price });
            if (row.bd_id) booking.BeautyDecor.push({ id: row.bd_id, beauty_name: row.beauty_name, price: row.bd_price });
            if (row.m_id) booking.Meeting.push({ id: row.m_id, meeting_name: row.meeting_name, price: row.m_price });
            if (row.ent_id) booking.Entertainment.push({ id: row.ent_id, entertainment_name: row.entertainment_name, price: row.ent_price });
            if (row.lux_id) booking.Luxury.push({ id: row.lux_id, luxury_name: row.luxury_name, price: row.lux_price });
            if (row.mus_id) booking.Musical.push({ id: row.mus_id, instrument_name: row.instrument_name, price: row.mus_price });
            if (row.mm_id) booking.Multimedia.push({ id: row.mm_id, multimedia_name: row.multimedia_name, price: row.mm_price });
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
    const { start_date, end_date, start_time, end_time, userId, productId, Hall, events, is_approved } = req.body;

    try {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const combinedStartTime = combineDateAndTime(start_date, start_time);
        const combinedEndTime = combineDateAndTime(end_date, end_time);

        const [[product]] = await db.execute(
            `SELECT p.title, c.category_name 
       FROM Product p 
       JOIN Category c ON p.category_id = c.id 
       WHERE p.id = ?`,
            [productId]
        );

        if (!product) {
            return res.status(404).json({ success: false, error: "Product not found" });
        }

        // Conflict: Approved event on same date
        const [[approvedConflict]] = await db.execute(
            `SELECT 1 FROM Event WHERE productId = ? AND is_approved = 1 
       AND start_date >= ? AND end_date <= ?`,
            [productId, startDate, endDate]
        );

        if (approvedConflict) {
            return res.status(409).json({ success: false, message: "Approved event exists on this date" });
        }

        // Conflict: Overlapping pending booking
        const [[overlap]] = await db.execute(
            `SELECT 1 FROM Event 
       WHERE productId = ? AND is_approved = 0 
       AND start_date < ? AND end_date > ?`,
            [productId, endDate, startDate]
        );

        if (overlap) {
            return res.status(409).json({
                success: false,
                message: `Booking overlaps with existing request from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
            });
        }

        // Insert Event
        const [eventResult] = await db.execute(
            `INSERT INTO Event 
       (start_date, end_date, start_time, end_time, userId, productId, is_approved, is_rejected, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
            [
                startDate,
                endDate,
                combinedStartTime,
                combinedEndTime,
                userId,
                productId,
                is_approved === true || is_approved === "true",
            ]
        );

        const eventId = eventResult.insertId;

        // Insert add-ons (dynamic)
        if (Hall && Array.isArray(Hall)) {
            const categoryKey = categoryMap[product.category_name.replace(/ & /g, "").replace(/\s/g, "")];
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

            const junctionTable = tableMap[categoryKey];
            if (junctionTable) {
                const values = Hall.map((id) => [eventId, id]).map(([e, i]) => `(?, ?)`).join(", ");
                await db.execute(
                    `INSERT INTO ${junctionTable} (eventId, ${categoryKey.toLowerCase()}Id) VALUES ${values}`,
                    Hall.flatMap((id) => [eventId, id])
                );
            }
        }

        // Insert event types
        if (events && Array.isArray(events)) {
            const values = events.map(() => `(?, ?)`).join(", ");
            await db.execute(
                `INSERT INTO EventEventType (eventId, eventTypeId) VALUES ${values}`,
                events.flatMap((e) => [eventId, e.id])
            );
        }

        // Send email to admin
        const [[user]] = await db.execute(`SELECT email FROM User WHERE id = ?`, [userId]);
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: "New Venue Booking Request",
            html: `
        <h1>New Booking Request</h1>
        <p><strong>User:</strong> ${user?.email}</p>
        <p><strong>Product:</strong> ${product.title}</p>
        <p><strong>From:</strong> ${startDate.toLocaleDateString()}</p>
        <p><strong>To:</strong> ${endDate.toLocaleDateString()}</p>
        <p>Please review in admin panel.</p>
      `,
        };

        await transporter.sendMail(mailOptions);

        const [newBooking] = await db.execute(`SELECT * FROM Event WHERE id = ?`, [eventId]);

        res.status(201).json({ success: true, booking: newBooking[0] });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, errors: error.errors.map((e) => e.message) });
        }
        res.status(500).json({ success: false, error: error.message });
    }
};

//! Update Booking (Approve/Reject)
const updateBooking = async (req, res) => {
    const { id } = req.params;
    const { is_approved } = req.body;

    try {
        const approved = is_approved === true || is_approved === "true";

        const [result] = await db.execute(
            `UPDATE Event SET is_approved = ?, updated_at = NOW() WHERE id = ?`,
            [approved, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Booking not found" });
        }

        if (approved) {
            const [[booking]] = await db.execute(
                `SELECT e.*, u.email, p.title 
         FROM Event e 
         JOIN User u ON e.userId = u.id 
         JOIN Product p ON e.productId = p.id 
         WHERE e.id = ?`,
                [id]
            );

            // Fetch add-ons
            const addons = await Promise.all(
                Object.keys(tableMap).map(async (key) => {
                    const table = tableMap[key];
                    const [rows] = await db.execute(
                        `SELECT * FROM ${table} WHERE eventId = ?`,
                        [id]
                    );
                    return { key, rows };
                })
            );

            let productDetails = "";
            addons.forEach(({ key, rows }) => {
                if (rows.length > 0) {
                    productDetails += `<h3>${key}:</h3>`;
                    rows.forEach((r) => {
                        const nameField = Object.keys(r).find((k) => k.includes("name"));
                        const priceField = Object.keys(r).find((k) => k.includes("price"));
                        productDetails += `<p>${r[nameField]} - ${r[priceField]}</p>`;
                    });
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: booking.email,
                subject: "Booking Approved!",
                html: `
          <h1>Booking Approved</h1>
          <p><strong>Venue:</strong> ${booking.title}</p>
          <p><strong>From:</strong> ${new Date(booking.start_date).toLocaleDateString()}</p>
          <p><strong>To:</strong> ${new Date(booking.end_date).toLocaleDateString()}</p>
          ${productDetails}
          <p>Thank you!</p>
        `,
            };

            await transporter.sendMail(mailOptions);
        }

        res.json({ success: true, message: approved ? "Booking Approved" : "Booking Updated" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
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
};