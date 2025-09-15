import { eventTypeSchema } from "../utils/validationSchema.js";


import { prisma } from '../config/prisma.js'


//! Get all EventType
const getAllEventTypes = async (req, res) => {

    try {
        const { search, page = 1, limit = 10 } = req.query;

        const where = search
            ? {
                OR: [
                    { title: { contains: search.toLowerCase() } },
                ]
            }
            : {};

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        const eventTypes = await prisma.eventType.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            skip,
            take,
        });

        const totalCount = await prisma.eventType.count({ where });

        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            eventTypes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//! Get EventType by Id
const getEventTypeById = async (req, res) => {
    const { id } = req.params;
    try {
        const eventType = await prisma.eventType.findUnique({
            where: { id: Number(id) }
        })

        if (!eventType) return res.status(404).json({ error: `Event Type ${id} doesn't exist.` })

        res.json({ success: true, eventType })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Delete EventType By Id
const deleteEventTypeById = async (req, res) => {
    const { id } = req.params;
    try {

        const eventType = await prisma.eventType.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ success: true, message: "Event Type Deleted" });
    } catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: `Event Type with ID ${id} does not exist` });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

//! Create new Event Type 
const createEventType = async (req, res) => {

    try {

        const validatedData = eventTypeSchema.parse(req.body)

        const { title } = validatedData;

        const eventType = await prisma.eventType.create({
            data: {
                title: title,

            }
        })
        res.status(201).json({ success: true, eventType })
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

//! Update an event Type 
const updateEventType = async (req, res) => {
    const { id } = req.params;

    try {
        const validatedData = eventTypeSchema.parse(req.body)

        const { title } = validatedData;

        const eventType = await prisma.eventType.update({
            where: { id: Number(id) },
            data: {
                title: title,
            }
        })

        if (!eventType) return res.status(404).json({ message: "Event Type not found" })

        res.status(200).json({ success: true, message: "EventType Updated", eventType })
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
    getAllEventTypes,
    getEventTypeById,
    deleteEventTypeById,
    createEventType,
    updateEventType
}
