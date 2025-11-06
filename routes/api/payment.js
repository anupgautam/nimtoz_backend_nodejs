import express from "express";
import { authenticateToken } from "../../middleware/authentication.js";
import {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  createStripeSession,
  stripeWebhook
} from "../../controllers/paymentController.js";

const router = express.Router();

// Khalti
// Initiate Khalti payment (user must be logged in)
router.post("/khalti/initiate", authenticateToken, initiateKhaltiPayment);

// Verify Khalti payment
router.post("/khalti/verify", authenticateToken, verifyKhaltiPayment);

// Stripe
router.post("/stripe/create_session", authenticateToken, createStripeSession);

// **Webhook endpoint** (no auth; Stripe calls this)
router.post("/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);

export default router;
