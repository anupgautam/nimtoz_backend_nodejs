import express from "express";
import { createUser, deleteUserById, getAllUsers, getUserById, updateUser } from "../../controllers/registerController.js";
import { authenticateToken, authorizeRole } from "../../middleware/authentication.js";

const router = express.Router();

router.route('/')
    .get(authenticateToken, authorizeRole('ADMIN'), getAllUsers)
    .post(createUser)

router.route('/:id')
    .get(authenticateToken, authorizeRole('ADMIN'), getUserById)
    .put(authenticateToken, authorizeRole('ADMIN'), updateUser)
    .delete(authenticateToken, authorizeRole('ADMIN'), deleteUserById)

export default router;