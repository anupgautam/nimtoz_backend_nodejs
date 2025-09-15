import express from "express";
import { forgotPassword } from "../../controllers/forgotPasswordController.js";

const router = express.Router();

router.route('/')
    .post(forgotPassword)

export default router;