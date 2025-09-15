import express from "express"
import { getAllCounts } from "./dashboardController.js"
import { authenticateToken, authorizeRole } from "../../middleware/authentication.js";

const router = express.Router()

router.route('/')
    .get(authenticateToken, authorizeRole('ADMIN'), getAllCounts)

export default router;