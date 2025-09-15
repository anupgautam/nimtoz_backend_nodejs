import { locationSchema } from "../utils/validationSchema.js";
import { z } from 'zod'

import { prisma } from '../config/prisma.js'


//! Get All Locations
const getAllLocations = async (req, res) => {

    try {
        const { search, page = 1, limit = 10 } = req.query;

        const where = search
            ? {
                OR: [
                    { district_name: { contains: search.toLowerCase() } },
                ]
            }
            : {};

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const locations = await prisma.district.findMany({
            where,
            include: {
                products: {
                    select: {
                        id: true,
                        title: true,
                    }
                }
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take,
        });

        const totalCount = await prisma.district.count({ where });

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            locations
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//! Get Location by Id
const getLocationById = async (req, res) => {
    const { id } = req.params;
    try {
        const location = await prisma.district.findUnique({
            where: { id: Number(id) }
        })

        if (!location) return res.status(404).json({ error: `Location ${id} doesn't exist.` })

        res.json({ success: true, location })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Delete Location By Id
const deleteLocationById = async (req, res) => {
    const { id } = req.params;
    try {

        const location = await prisma.district.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ success: true, message: "Location Deleted" });
    } catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: `Location with ID ${id} does not exist` });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

//! Create new Location 
const createLocation = async (req, res) => {

    try {

        const validatedData = locationSchema.parse(req.body)

        const { district_name } = validatedData;

        const location = await prisma.district.create({
            data: {
                district_name: district_name,

            }
        })
        res.status(201).json({ success: true, location })
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

//! Update a Location
const updateLocation = async (req, res) => {
    const { id } = req.params;

    try {
        const validatedData = locationSchema.parse(req.body)

        const { district_name } = validatedData;

        const location = await prisma.district.update({
            where: { id: Number(id) },
            data: {
                district_name: district_name,
            }
        })

        if (!location) return res.status(404).json({ message: "Location not found" })

        res.status(200).json({ success: true, message: "Location Updated", location })
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
    getAllLocations,
    getLocationById,
    deleteLocationById,
    createLocation,
    updateLocation
}

