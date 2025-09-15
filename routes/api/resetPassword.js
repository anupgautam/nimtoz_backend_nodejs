import express from "express";
import { resetPassword } from "../../controllers/resetPasswordController.js";

const router = express.Router();

router.route('/')
    .post(resetPassword)

export default router;