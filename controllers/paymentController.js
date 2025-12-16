import axios from "axios";
import db from "../config/prisma.js"; // MySQL pool

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ----------------------
// Initiate Khalti Payment
// ----------------------
export const initiateKhaltiPayment = async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) return res.status(400).json({ success: false, message: "eventId required" });

    // Fetch event details
    const [eventRows] = await db.execute(
      "SELECT id, total_price FROM Event WHERE id = ?",
      [eventId]
    );

    if (!eventRows.length) return res.status(404).json({ success: false, message: "Event not found" });

    const event = eventRows[0];

    if (!event.total_price || Number(event.total_price) <= 0) {
      return res.status(400).json({ success: false, message: "Event has no total price set" });
    }

    const amountInRupees = Number(event.total_price);
    const amountInPaisa = Math.round(amountInRupees * 100);

    const purchase_order_id = `event_${event.id}`;
    const purchase_order_name = `Event #${event.id}`;

    // Insert pending payment in your DB
    await db.execute(
      `INSERT INTO Payment (eventId, payment_method, payment_status, amount, pidx, transaction_id)
       VALUES (?, 'KHALTI', 'PENDING', ?, NULL, NULL)`,
      [eventId, amountInRupees]
    );

    // Prepare Khalti payload
    const payload = {
      return_url: `${FRONTEND_URL}/payment/success`,
      website_url: FRONTEND_URL,
      amount: amountInPaisa,
      purchase_order_id,
      purchase_order_name,
      customer_info: { name: "Guest User" },
      product_details: [
        {
          identity: purchase_order_id,
          name: purchase_order_name,
          total_price: amountInPaisa,
          quantity: 1,
          unit_price: amountInPaisa
        }
      ]
    };

    // Call Khalti dev API
    const response = await axios.post(
      "https://dev.khalti.com/api/v2/epayment/initiate/",
      payload,
      {
        headers: {
          Authorization: `Key ${KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json({
      success: true,
      message: "Khalti payment initialized",
      payment_url: response.data.payment_url,
      purchase_order_id,
      purchase_order_name,
      amount: amountInPaisa
    });

  } catch (error) {
    console.error("Initiate Khalti Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};

// ----------------------
// Verify Khalti Payment (Lookup)
// ----------------------
export const verifyKhaltiPayment = async (req, res) => {
  try {
    const { pidx, eventId } = req.body;

    if (!pidx || !eventId) {
      return res.status(400).json({ success: false, message: "pidx and eventId required" });
    }

    const response = await axios.post(
      "https://dev.khalti.com/api/v2/epayment/lookup/",
      { pidx },
      {
        headers: {
          Authorization: `Key ${KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = response.data;

    if (data.status === "Completed") {
      
      // Update Payment
      await db.execute(
        `UPDATE Payment
         SET payment_status='COMPLETED', pidx=?, transaction_id=?, amount=?
         WHERE eventId=?`,
        [data.pidx, data.transaction_id, data.total_amount / 100, eventId]
      );

      // Approve Event
      await db.execute(`UPDATE Event SET is_approved=TRUE WHERE id=?`, [eventId]);

      return res.json({ success: true, message: "Payment verified", data });
    } else {
      return res.status(400).json({ success: false, message: `Payment not completed, status: ${data.status}`, data });
    }

  } catch (err) {
    console.error("Verify Khalti Error:", err.response?.data || err.message);
    return res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
};
