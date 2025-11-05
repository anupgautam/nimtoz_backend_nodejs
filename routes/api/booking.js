import express from "express";
import {
  createBooking,
  deleteBookingById,
  getAllBookings,
  getBookingById,
  updateBooking,
  getBookingByUserId,
} from "../../controllers/bookingController.js";
import { authenticateToken, authorizeRole } from "../../middleware/authentication.js";

const router = express.Router();

// Admin & CRUD routes
router.route("/")
  .get(authenticateToken, authorizeRole("ADMIN"), getAllBookings)
  .post(authenticateToken, createBooking);

router.route("/:id")
  .get(authenticateToken, authorizeRole("ADMIN"), getBookingById)
  .patch(authenticateToken, authorizeRole("ADMIN"), updateBooking)
  .delete(authenticateToken, authorizeRole("ADMIN"), deleteBookingById);


export default router;
