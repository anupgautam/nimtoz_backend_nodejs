import express from "express";
import { createEventType, deleteEventTypeById, getAllEventTypes, getEventTypeById, updateEventType } from "../../controllers/eventTypeController.js";
import { authenticateToken, authorizeRole } from "../../middleware/authentication.js";

const router = express.Router();

router.route('/')
    .get(getAllEventTypes)
    .post(authenticateToken, authorizeRole('ADMIN'), createEventType)

router.route("/:id")
    .get(authenticateToken, authorizeRole('ADMIN'),getEventTypeById)
    .put(authenticateToken, authorizeRole('ADMIN'),updateEventType)
    .delete(authenticateToken, authorizeRole('ADMIN'),deleteEventTypeById)

export default router;