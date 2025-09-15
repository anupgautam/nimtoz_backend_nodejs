import nodemailer from 'nodemailer'
import { createBookingSchema } from "../utils/validationSchema.js";
import { addMonths, startOfMonth, endOfMonth, format } from 'date-fns';

import { z } from 'zod'

import { prisma } from '../config/prisma.js'

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
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
})

function combineDateAndTime(dateString, timeString) {
    if (!timeString) return null;

    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(dateString);

    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date;
}

async function getDashboardBookingStats() {
    const currentDate = new Date();
    const monthsArray = [];

    // Loop through the next 12 months
    for (let i = 0; i < 12; i++) {
        const currentMonth = addMonths(currentDate, i);
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        // Fetch events from the database for the current month
        const eventsInMonth = await prisma.event.findMany({
            where: {
                start_date: {
                    gte: monthStart,
                    lte: monthEnd,
                },
            },
        });

        // Count approved and not approved (not approved = !is_approved && !is_rejected)
        const approvedCount = eventsInMonth.filter(event => event.is_approved).length;
        const notApprovedCount = eventsInMonth.filter(event => !event.is_approved && !event.is_rejected).length;

        // Push the data into the array
        monthsArray.push({
            month: format(currentMonth, 'MMM'), // e.g., "Oct" for October
            approved: approvedCount,
            notApproved: notApprovedCount,
        });
    }

    return monthsArray;
}

//! Get All Bookings
const getAllBookings = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;

        const where = search
            ? {
                OR: [
                    { category_name: { contains: search.toLowerCase() } },
                ]
            }
            : {};

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        // Fetch the data with search, pagination, and ordering
        const bookings = await prisma.event.findMany({
            include: {
                User: true,
                Product: true,
                PartyPalace: true,
                CateringTent: true,
                Adventure: true,
                BeautyDecor: true,
                Meeting: true,
                Entertainment: true,
                Luxury: true,
                Musical: true,
                Multimedia: true
            },
            where,
            orderBy: { updatedAt: 'desc' },
            skip,
            take,
        });

        // Get the total count of bookings (useful for pagination)
        const totalCount = await prisma.event.count({ where });

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            bookings
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//! Bookings dashboard ko count 
const getBookingStats = async (req, res) => {
    try {
        const bookingStats = await getDashboardBookingStats();

        if (!bookingStats)
            return res.status(404).json({ message: "Booking not found" })

        res.status(200).json(bookingStats)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Get Booking by Id
const getBookingById = async (req, res) => {
    const { id } = req.params;
    try {
        const booking = await prisma.event.findUnique({
            where: { id: parseInt(id) }
        })

        if (!booking) return res.status(404).json({ error: `Booking ${id} doesn't exist` })
        res.json({ success: true, booking });

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Delete Booking By Id
const deleteBookingById = async (req, res) => {
    const { id } = req.params;

    try {

        const booking = await prisma.event.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ success: true, message: "Booking Deleted" });
    } catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: `Booking with ID ${id} does not exist` });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

//! Create Booking
const createBooking = async (req, res) => {

    const { start_date, end_date, start_time, end_time, userId, productId, Hall, events, is_approved } = req.body
    try {
        // const validatedData = createBookingSchema.parse(req.body)

        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const combinedStartTime = combineDateAndTime(start_date, start_time);
        const combinedEndTime = combineDateAndTime(end_date, end_time);

        const product = await prisma.product.findUnique({
            where: {
                id: productId,
            },
            select: { category: { select: { category_name: true } }, title: true }
        });

        if (!product || !product.category) {
            return res.json({ error: 'Product or category not found' }, { status: 404 });
        }

        let categorySpecificData = {};
        switch (product.category.category_name) {
            case 'Party Palace':
                categorySpecificData = {
                    PartyPalace: { connect: Hall.map((hallId) => ({ id: parseInt(hallId) })) }
                };
                break;
            case 'Multimedia':
                categorySpecificData = {
                    Multimedia: { connect: Hall.map((hallId) => ({ id: parseInt(hallId) })) }
                };
                break;
            case 'Musical':
                categorySpecificData = {
                    Musical: { connect: Hall.map((hallId) => ({ id: parseInt(hallId) })) }
                };
                break;
            case 'Luxury':
                categorySpecificData = {
                    Luxury: { connect: Hall.map((hallId) => ({ id: parseInt(hallId) })) }
                };
                break;
            case 'Meeting':
                categorySpecificData = {
                    Meeting: { connect: Hall.map((hallId) => ({ id: parseInt(hallId) })) }
                };
                break;
            case 'Adventure':
                categorySpecificData = {
                    Adventure: { connect: Hall.map((hallId) => ({ id: parseInt(hallId) })) }
                };
                break;
            case 'Entertainment':
                categorySpecificData = {
                    Entertainment: { connect: Hall.map((hallId) => ({ id: parseInt(hallId) })) }
                };
                break;
            case 'Catering & Tent':
                categorySpecificData = {
                    CateringTent: { connect: Hall.map((hallId) => ({ id: parseInt(hallId) })) }
                };
                break;
            case 'Beauty & Decor':
                categorySpecificData = {
                    BeautyDecor: { connect: Hall.map((hallId) => ({ id: parseInt(hallId) })) }
                };
                break;
            default:
                categorySpecificData = {
                    Hall: { connect: Hall.map((hallId) => ({ id: parseInt(hallId) })) }
                };
        }

        // let categorySpecificData = {};
        // const categoryKey = categoryMap[product.category.category_name.replace(/\s/g, '')];

        // if (categoryKey && Hall && Array.isArray(Hall)) {
        //     categorySpecificData[categoryKey] = {
        //         connect: Hall.map((hallId) => ({ id: parseInt(hallId) })),
        //     };
        // } else {
        //     // Handle fallback or errors for missing/invalid data
        //     console.error("Invalid category or hall data");
        //     return res.status(400).json({ error: "Invalid category or hall data" });
        // }

        const approvedEvent = await prisma.event.findFirst({
            where: {
                productId: productId,
                is_approved: true,
                start_date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        if (approvedEvent) {
            return res.json(
                { message: 'Booking not allowed: An approved event exists on this date.' },
                { status: 409 }
            );
        }

        const overlappingBooking = await prisma.event.findFirst({
            where: {
                productId: productId,
                is_approved: false,
                OR: [
                    {
                        start_date: {
                            lt: endDate,
                        },
                        end_date: {
                            gt: startDate,
                        },
                    },
                ],
            },
        });

        if (overlappingBooking) {
            const startDateFormatted = new Date(startDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            const endDateFormatted = new Date(endDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });

            const startTimeFormatted = combinedStartTime;
            const endTimeFormatted = combinedEndTime;

            return res.status(409).json(`Booking already exists from ${startDateFormatted} to ${endDateFormatted}`);
        }

        //! Dynamic category wise product 
        const newBooking = await prisma.event.create({
            data: {
                start_date: startDate,
                end_date: endDate,
                start_time: combinedStartTime,
                end_time: combinedEndTime,
                userId: parseInt(userId),
                productId: parseInt(productId),
                is_approved: is_approved ?? false,
                is_rejected: false,
                ...categorySpecificData,
            },
        });

        await prisma.eventEventType.createMany({
            data: events.map((event) => ({
                eventId: newBooking.id,
                eventTypeId: parseInt(event.id),
            })),
        });

        const user = await prisma.user.findUnique({
            where: {
                id: parseInt(userId),
            },
            select: {
                email: true,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 'New Venue Booking Request',
            text: 'You have received a new venue booking request.',
            html: `
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            background-color: #f4f4f4;
                        }
                        .container {
                            background-color: #fff;
                            padding: 20px;
                            border-radius: 5px;
                            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        }
                        h1 {
                            color: #333;
                        }
                        .details {
                            margin-top: 20px;
                        }
                        .details th {
                            text-align: left;
                            padding: 5px;
                        }
                        .details td {
                            padding: 5px;
                        }
                        .footer {
                            margin-top: 20px;
                            font-size: 12px;
                            color: #777;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>New Venue Booking Request</h1>
                        <p>You have received a new booking request. Here are the details:</p>
                        <table class="details">
                            <tr>
                                <th>Start Date:</th>
                                <td>${newBooking.start_date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            })}</td>
                            </tr>
                            <tr>
                                <th>End Date:</th>
                                <td>${newBooking.end_date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            })}</td>
                            </tr>
                    <tr>
                    <th>User Name: </th>
                        <td> ${user?.email}</td>
                            </tr>
                            <tr>
                            <th>Product Name: </th>
                                <td> ${product?.title} </td>
                                    </tr>
                                    </table>
                                    <p> Please review and approve the booking at your earliest convenience.</p>
                                        <div class="footer">
                                            <p>Thank you! </p>
                                                </div>
                                                </div>
                                                </body>
                                                </html>
                                                    `,
        };

        await transporter.sendMail(mailOptions);

        return res.status(201).json({ booking: newBooking, success: true });

    }
    catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message)
            });
        }
        return res.status(500).json({ success: false, message: 'Error creating booking', error: error });
    }
}

//! Update Booking 
const updateBooking = async (req, res) => {

    const { id } = req.params;
    const { is_approved } = req.body
    // console.log(req.body)

    // const is_approved = req.body.is_approved === 'true' ? "true" : "false";

    try {
        const updatedBooking = await prisma.event.update({
            where: {
                id: Number(id)
            },
            data: {
                is_approved: is_approved
            },
            include: {
                Product: true,
                PartyPalace: true,
                CateringTent: true,
                Adventure: true,
                BeautyDecor: true,
                Meeting: true,
                Entertainment: true,
                Luxury: true,
                Musical: true,
                Multimedia: true
            },

        });

        if (is_approved) {
            // Fetch the user's email using the userId from the booking
            const user = await prisma.user.findUnique({
                where: {
                    id: updatedBooking.userId // Assuming userId is a field in the Event model
                },
                select: {
                    email: true
                }
            });

            // Extracting category-based product titles and prices
            let productDetails = '';

            if (updatedBooking.PartyPalace.length) {
                productDetails += `<h3>Party Palace:</h3>`;
                updatedBooking.PartyPalace.forEach(item => {
                    productDetails += `<p>Title: ${item.partypalace_name}, Price: ${item.price}</p>`;
                });
            }

            if (updatedBooking.CateringTent.length) {
                productDetails += `<h3>Catering Tent:</h3>`;
                updatedBooking.CateringTent.forEach(item => {
                    productDetails += `<p>Title: ${item.catering_name}, Price: ${item.price}</p>`;
                });
            }
            if (updatedBooking.Adventure.length) {
                productDetails += `<h3>Adventure:</h3>`;
                updatedBooking.Adventure.forEach(item => {
                    productDetails += `<p>Title: ${item.adventure_name}, Price: ${item.price}</p>`;
                });
            }

            if (updatedBooking.BeautyDecor.length) {
                productDetails += `<h3>Beauty & Decoration:</h3>`;
                updatedBooking.BeautyDecor.forEach(item => {
                    productDetails += `<p>Title: ${item.beauty_name}, Price: ${item.price}</p>`;
                });
            }
            if (updatedBooking.Meeting.length) {
                productDetails += `<h3>Meeting:</h3>`;
                updatedBooking.Meeting.forEach(item => {
                    productDetails += `<p>Title: ${item.meeting_name}, Price: ${item.price}</p>`;
                });
            }

            if (updatedBooking.Entertainment.length) {
                productDetails += `<h3>Entertainment:</h3>`;
                updatedBooking.Entertainment.forEach(item => {
                    productDetails += `<p>Title: ${item.entertainment_name}, Price: ${item.price}</p>`;
                });
            }
            if (updatedBooking.Luxury.length) {
                productDetails += `<h3>Luxury:</h3>`;
                updatedBooking.Luxury.forEach(item => {
                    productDetails += `<p>Title: ${item.luxury_name}, Price: ${item.price}</p>`;
                });
            }

            if (updatedBooking.Musical.length) {
                productDetails += `<h3>Musical Items:</h3>`;
                updatedBooking.Musical.forEach(item => {
                    productDetails += `<p>Title: ${item.instrument_name}, Price: ${item.price}</p>`;
                });
            }
            if (updatedBooking.Multimedia.length) {
                productDetails += `<h3>Multimedia:</h3>`;
                updatedBooking.Multimedia.forEach(item => {
                    productDetails += `<p>Title: ${item.multimedia_name}, Price: ${item.price}</p>`;
                });
            }

            if (user) {

                // const hallNames = updatedBooking.Hall.map(hall => hall.hall_capacity).join(", ");

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: 'Booking Approved',
                    html: `
                        <h1>Your Booking Has Been Approved!</h1>
                        <p>Your booking for the event has been approved. Here are the details:</p>
                        <p><strong>Product Name:</strong> ${updatedBooking.Product.title}</p>
                        <p><strong>Status:</strong> Approved</p>
                        <p>${productDetails}</p>
                        <p><strong>Start Date:</strong> ${updatedBooking.start_date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    })}</p>
                        <p><strong>End Date:</strong> ${updatedBooking.end_date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    })}</p>
                        <p>Thank you for choosing us!</p>
                    `,
                };

                await transporter.sendMail(mailOptions);
            }
        }
        // revalidatePath('/dashboard/venue')
        return res.status(200).json({ success: true, error: false, message: "Booking Approved" })
    }
    catch (err) {
        return res.status(500).json({ success: false, error: "Internal Server Error" })
    }
}

export {
    getAllBookings,
    getBookingById,
    getBookingStats,
    deleteBookingById,
    createBooking,
    updateBooking
}