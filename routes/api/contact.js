import express from "express";
import { createContact, deleteContactById, getAllContacts, getContactsById, updateContact } from "../../controllers/contactController.js";
import { authenticateToken, authorizeRole } from "../../middleware/authentication.js";

const router = express.Router();

router.route('/')
    .get(authenticateToken, authorizeRole('ADMIN'), getAllContacts)
    .post(createContact)

router.route('/:id')
    .get(authenticateToken, authorizeRole('ADMIN'), getContactsById)
    .put(authenticateToken, authorizeRole('ADMIN'), updateContact)
    .delete(authenticateToken, authorizeRole('ADMIN'), deleteContactById)

export default router;
