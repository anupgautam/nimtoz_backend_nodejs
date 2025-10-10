import express from 'express';
import { addOrUpdateRating, deleteRating, getProductOverallRating, getProductRatings } from "../../controllers/productRatingController.js";
import { authenticateToken, authorizeRole } from '../../middleware/authentication.js';


const router = express.Router();



router.route('/')
    .get(getProductOverallRating)
    .post(authenticateToken, authorizeRole('USER'), addOrUpdateRating)

router.route('/:id')
    .get(getProductRatings)
    .delete(authenticateToken, authorizeRole('ADMIN', 'USER'), deleteRating)

export default router;