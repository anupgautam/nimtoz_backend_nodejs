import express from "express";
import { getBookingByUserId } from "../../controllers/bookingController.js";
import { authenticateToken, authorizeRole } from "../../middleware/authentication.js";

const router = express.Router();

// GET bookings for a specific user
// URL: /mybookings/:userId
router.get("/:userId", authenticateToken, getBookingByUserId);

export default router;
