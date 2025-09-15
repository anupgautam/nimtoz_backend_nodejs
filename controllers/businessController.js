import { venueSchema } from "../utils/validationSchema.js";
import { z } from 'zod'

import { prisma } from '../config/prisma.js'


//! Get All Business
const getAllBusinesses = async (req, res) => {

    try {
        const { search, page = 1, limit = 10 } = req.query;

        const where = search
            ? {
                OR: [
                    { venue_name: { contains: search.toLowerCase() } },
                    { venue_address: { contains: search.toLowerCase() } },
                    { contact_person: { contains: search.toLowerCase() } },
                    { phone_number: { contains: search.toLowerCase() } },
                    { email: { contains: search.toLowerCase() } },
                    { pan_vat_number: { contains: search.toLowerCase() } },
                ]
            }
            : {};

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const businesses = await prisma.venue.findMany({
            where,
            include:{
                products:true
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take,
        });

        const totalCount = await prisma.venue.count({ where });

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            businesses
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//! Get Business by Id
const getBusinessById = async (req, res) => {
    const { id } = req.params;
    try {
        const business = await prisma.venue.findUnique({
            where: { id: Number(id) }
        })

        if (!business) return res.status(404).json({ error: `Business ${id} doesn't exist.` })

        res.json({ success: true, business })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Delete Business By Id
const deleteBusinessById = async (req, res) => {
    const { id } = req.params;
    try {

        const business = await prisma.venue.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ success: true, message: "Business Deleted" });
    } catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: `Business with ID ${id} does not exist` });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

//! Create new Business 
const createBusiness = async (req, res) => {

    try {

        const validatedData = venueSchema.parse(req.body)

        const { venue_name, email, venue_address, phone_number, contact_person, pan_vat_number, active } = validatedData;

        const business = await prisma.venue.create({
            data: {
                venue_name: venue_name,
                venue_address: venue_address,
                contact_person: contact_person,
                phone_number: phone_number,
                email: email,
                pan_vat_number: pan_vat_number,
                active: active
            }
        })
        res.status(201).json({ success: true, business })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                errors: error.errors.map((e) => e.message)
            });
        }
        res.status(400).json({ error: error.message });
    }
}

//! Update a Business
const updateBusiness = async (req, res) => {
    const { id } = req.params;

    try {
        const validatedData = venueSchema.parse(req.body)

        const { venue_name, email, venue_address, phone_number, contact_person, pan_vat_number, active } = validatedData;

        const business = await prisma.venue.update({
            where: { id: Number(id) },
            data: {
                venue_name: venue_name,
                venue_address: venue_address,
                phone_number: phone_number,
                email: email,
                pan_vat_number: pan_vat_number,
                contact_person: contact_person,
                active: active
            }
        })

        if(!business) return res.status(404).json({message:"Business not found"})
            
        res.status(200).json({ success: true, message: "Business Updated", business })
    } catch (error) {

        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message // Custom error message
            }));
            return res.status(400).json({
                success: false,
                errors: errorMessages
            });
        }
        res.status(400).json({ error: error.message });
    }
}

export {
    getAllBusinesses,
    getBusinessById,
    deleteBusinessById,
    createBusiness,
    updateBusiness,
}