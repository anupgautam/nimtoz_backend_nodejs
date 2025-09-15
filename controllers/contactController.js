import { databaseResponseTimeHistogram } from "../utils/metrics.js";
import { contactusSchema } from "../utils/validationSchema.js";
import { z } from 'zod'

import { prisma } from '../config/prisma.js'


//! Get All Business
const getAllContacts = async (req, res) => {
    const metricsLabels = {
        operation: 'getAllContacts'
    }
    const timer = databaseResponseTimeHistogram.startTimer();
    try {
        const { search, page = 1, limit = 10 } = req.query;

        const where = search
            ? {
                OR: [
                    { business_name: { contains: search.toLowerCase() } },
                ]
            }
            : {};

        const skip = (page - 1) * limit;
        const take = parseInt(limit);

        // Fetch the data with search, pagination, and ordering
        const contacts = await prisma.contactUs.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            skip,
            take,
        });

        // Get the total count of contacts (useful for pagination)
        const totalCount = await prisma.contactUs.count({ where });

        timer({ ...metricsLabels, success: true })
        res.json({
            success: true,
            totalCount,
            totalPages: Math.ceil(totalCount / take),
            currentPage: parseInt(page),
            contacts
        });
    } catch (error) {
        timer({ ...metricsLabels, success: false })
        res.status(500).json({ error: error.message });
    }
};

//! Get Contact Us by Id
const getContactsById = async (req, res) => {
    const { id } = req.params;
    try {
        const contact = await prisma.contactUs.findUnique({
            where: { id: Number(id) }
        })

        if (!contact) return res.status(404).json({ error: `Contact ${id} doesn't exist.` })

        res.json({ success: true, contact })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

//! Delete Contact By Id
const deleteContactById = async (req, res) => {
    const { id } = req.params;

    try {
        const contact = await prisma.contactUs.delete({
            where: { id: parseInt(id) },
        });

        res.status(200).json({ success: true, message: "Contact Deleted" });
    } catch (error) {
        if (error.code === 'P2025') {
            res.status(404).json({ error: `Contact with ID ${id} does not exist` });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

//! Create new Business 
const createContact = async (req, res) => {

    const metricsLabels = {
        operation: 'createContact'
    }
    const timer = databaseResponseTimeHistogram.startTimer();
    try {

        const validatedData = contactusSchema.parse(req.body)

        const { business_name, email, address, phone_number, contact_person } = validatedData;

        const alreadyExists = await prisma.contactUs.findUnique({
            where: { email: email }
        })
        if (alreadyExists) return res.status(404).json(`Email ${email} already exists`)

        const alreadyPhone = await prisma.contactUs.findUnique({
            where: { phone_number: phone_number }
        })
        if (alreadyPhone) return res.status(404).json(`Phone Number ${phone_number} already exists`)

        const contact = await prisma.contactUs.create({
            data: {
                email: email,
                business_name: business_name,
                address: address,
                phone_number: phone_number,
                contact_person: contact_person
            }
        })
        timer({ ...metricsLabels, success: true })
        res.status(201).json({ success: true, contact })
    } catch (error) {
        timer({ ...metricsLabels, success: false })
        // if (error instanceof z.ZodError) {
        //     return res.status(400).json({
        //         success: false,
        //         errors: error.errors.map((e) => e.message)
        //     });
        // }

        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map((err) => ({
                field: err.path.join('   .'),
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

//! Update a Contact
const updateContact = async (req, res) => {
    const { id } = req.params;

    try {
        const validatedData = contactusSchema.parse(req.body)

        const { business_name, email, address, phone_number, contact_person } = validatedData;

        const contact = await prisma.contactUs.update({
            where: { id: Number(id) },
            data: {
                email: email,
                business_name: business_name,
                address: address,
                phone_number: phone_number,
                contact_person: contact_person
            }
        })
        res.status(200).json({ success: true, message: "Contact Updated", contact })
    } catch (error) {

        if (error instanceof z.ZodError) {
            const errorMessages = error.errors.map((err) => ({
                field: err.path.join('   .'),
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

//! Count Business
// const countBusiness = async (req, res) => {
//     try {
//         const categoriesWithProductCount = await prisma.category.findMany({
//             select: {
//                 category_name: true,
//                 // _count: {
//                 //     select: {
//                 //         products: true,
//                 //     }
//                 // }
//             },
//             orderBy: {
//                 updatedAt: "desc"
//             }
//         });
//         res.status(200).json(categoriesWithProductCount)

//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// }

export {
    getAllContacts,
    getContactsById,
    deleteContactById,
    createContact,
    updateContact,
}