import express from "express"
import { createBooking, deleteBookingById, getAllBookings, getBookingById, updateBooking } from "../../controllers/bookingController.js"
import { authenticateToken, authorizeRole } from "../../middleware/authentication.js"

const router = express.Router()

router.route("/")
    .get(authenticateToken, authorizeRole('ADMIN'), getAllBookings)
    .post(createBooking)

router.route("/:id")
    .get(authenticateToken, authorizeRole('ADMIN'), getBookingById)
    .put(authenticateToken, authorizeRole('ADMIN'), updateBooking)
    .delete(authenticateToken, authorizeRole('ADMIN'), deleteBookingById)

export default router;