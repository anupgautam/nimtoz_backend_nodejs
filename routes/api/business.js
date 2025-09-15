import express from "express";
import { createBusiness, deleteBusinessById, getAllBusinesses, getBusinessById, updateBusiness } from "../../controllers/businessController.js";
import { authenticateToken, authorizeRole } from "../../middleware/authentication.js";

const router = express.Router();

router.route('/')
    .get(authenticateToken, authorizeRole('ADMIN'), getAllBusinesses)
    .post(authenticateToken, authorizeRole('ADMIN'), createBusiness)

router.route('/:id')
    .get(authenticateToken, authorizeRole('ADMIN'), getBusinessById)
    .put(authenticateToken, authorizeRole('ADMIN'), updateBusiness)
    .delete(authenticateToken, authorizeRole('ADMIN'), deleteBusinessById)

export default router;