import express from "express";
import { createLocation, deleteLocationById, getAllLocations, getLocationById, updateLocation } from "../../controllers/locationController.js";
import { authenticateToken, authorizeRole } from "../../middleware/authentication.js";

const router = express.Router();

router.route('/')
    .get(getAllLocations)
    .post(authenticateToken, authorizeRole('ADMIN'), createLocation)

router.route('/:id')
    .get(authenticateToken, authorizeRole('ADMIN'), getLocationById)
    .put(authenticateToken, authorizeRole('ADMIN'), updateLocation)
    .delete(authenticateToken, authorizeRole('ADMIN'), deleteLocationById)

export default router;