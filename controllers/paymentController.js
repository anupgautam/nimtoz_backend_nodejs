import axios from "axios";
import db from "../config/prisma.js"; // MySQL/Prisma connection
import { stripe } from "../config/stripe.js";

// Khalti keys (sandbox/test)
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
const KHALTI_PUBLIC_KEY = process.env.KHALTI_PUBLIC_KEY;

// ----------------------
// Khalti Payment
// ----------------------
export const initiateKhaltiPayment = async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;

    if (!eventId)
      return res.status(400).json({ success: false, message: "eventId required." });

    const [event] = await db.execute(
      `SELECT id, total_price FROM Event WHERE id = ?`,
      [eventId]
    );

    if (!event.length)
      return res.status(404).json({ success: false, message: "Event not found." });

    const amount = event[0].total_price; // in NPR

    // Insert pending payment
    await db.execute(
      `INSERT INTO Payment (eventId, payment_method, payment_status, amount)
       VALUES (?, 'KHALTI', 'PENDING', ?)`,
      [eventId, amount]
    );

    // Return data for frontend
    res.json({
      success: true,
      message: "Khalti payment initialized",
      data: {
        publicKey: KHALTI_PUBLIC_KEY,
        amount,
        productIdentity: `event_${eventId}`,
        productName: `Event #${eventId}`,
        eventId: eventId,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ----------------------
// Verify Khalti Payment
// ----------------------
export const verifyKhaltiPayment = async (req, res) => {
  try {
    const { token, amount, eventId } = req.body;
    if (!token || !amount || !eventId)
      return res.status(400).json({ success: false, message: "token, amount, eventId required" });

    // Khalti verification URL (sandbox)
    const response = await axios.post(
      "https://khalti.com/api/v2/payment/verify/",
      { token, amount: amount * 100 }, // convert to paisa
      { headers: { Authorization: `Key ${KHALTI_SECRET_KEY}` } }
    );

    if (response.data && response.data.idx) {
      await db.execute(
        `UPDATE Payment 
         SET payment_status='COMPLETED', pidx=?, transaction_id=?, amount=?
         WHERE eventId=?`,
        [response.data.idx, response.data.transaction_id, amount, eventId]
      );

      await db.execute(
        `UPDATE Event SET is_approved=TRUE WHERE id=?`,
        [eventId]
      );

      return res.json({ success: true, message: "Payment verified", khaltiData: response.data });
    }

    return res.status(400).json({ success: false, message: "Payment verification failed" });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
};

// ----------------------
// Stripe Payment
// ----------------------
export const createStripeSession = async (req, res) => {
  try {
    const { eventId, currency = "usd" } = req.body;
    const userId = req.user.id;

    if (!eventId) {
      return res.status(400).json({ success: false, message: "eventId is required." });
    }

    const [event] = await db.execute(
      `SELECT e.id, e.total_price, e.userId, u.email
       FROM Event e
       JOIN User u ON e.userId = u.id
       WHERE e.id = ?`,
      [eventId]
    );

    if (!event.length) return res.status(404).json({ success: false, message: "Event not found" });

    const amount = Number(event[0].total_price);
    const userEmail = event[0].email;
    const productName = `Event #${eventId}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency,
          product_data: { name: productName },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `http://localhost:1000/payment_status.html?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:1000/payment_status.html?status=failed`,
      customer_email: userEmail,
      client_reference_id: eventId,
    });

    res.json({ success: true, checkout_url: session.url });
  } catch (err) {
    console.error("Stripe session error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ------------------------
// Stripe Webhook
// ------------------------
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      const [existing] = await db.execute(
        `SELECT id FROM Payment WHERE transaction_id = ?`,
        [session.payment_intent]
      );

      if (!existing.length) {
        await db.execute(
          `INSERT INTO Payment 
            (eventId, payment_method, payment_status, amount, transaction_id, stripe_session_id)
           VALUES (?, 'STRIPE', 'COMPLETED', ?, ?, ?)`,
          [
            session.client_reference_id,
            session.amount_total / 100,
            session.payment_intent,
            session.id,
          ]
        );

        await db.execute(
          `UPDATE Event SET is_approved = TRUE WHERE id = ?`,
          [session.client_reference_id]
        );
      }

      console.log(`Payment stored for Event ID: ${session.client_reference_id}`);
    } catch (err) {
      console.error("DB error saving Stripe payment:", err.message);
    }
  }

  res.json({ received: true });
};
