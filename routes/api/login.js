import express from "express";
import { loginUser } from "../../controllers/loginController.js";

const router = express.Router();

router.route('/')
    .post(loginUser)

export default router;