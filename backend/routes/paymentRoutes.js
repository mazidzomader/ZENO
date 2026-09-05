// ZENO — Stripe Payment Gateway (Isolated Feature)
// This file is fully self-contained. It does NOT modify any other route, controller, or model.
//
// Endpoints:
//   GET  /api/payments/pending-bookings          → renter's unpaid pending bookings
//   POST /api/payments/create-checkout-session   → create Stripe Checkout session
//   POST /api/payments/verify-session            → verify payment + write DB + generate invoice
//   GET  /api/payments/status/:bookingId         → check if a booking has been paid

const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const mongoose = require("mongoose");
const { protect } = require("../middleware/authMiddleware");
const { createNotification } = require('../services/notificationService');

// Lazy Stripe initialization — deferred until first request so that
// dotenv.config() in server.js has already populated process.env.
let _stripe = null;
const getStripe = () => {
  if (!_stripe) _stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
};

// ── Helper ────────────────────────────────────────────────────────────────────
const toId = (id) => new mongoose.Types.ObjectId(String(id));

// Auto-incrementing invoice number helper
async function nextInvoiceNumber(db) {
  const last = await db
    .collection("invoices")
    .find({}, { projection: { invoiceNumber: 1 } })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();

  if (!last.length || !last[0].invoiceNumber) return "INV-2026-0001";

  const match = String(last[0].invoiceNumber).match(/(\d+)$/);
  const next = match ? parseInt(match[1], 10) + 1 : 1;
  return `INV-2026-${String(next).padStart(4, "0")}`;
}

// ── GET /api/payments/pending-bookings ────────────────────────────────────────
// Returns the renter's own bookings that are still "pending" (unpaid)
router.get("/pending-bookings", protect, async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const bookings = await db
      .collection("bookings")
      .find({
        renterId: toId(req.user._id),
        status: "pending",
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Check which ones already have a payment (idempotency)
    const paid = await db
      .collection("payments")
      .find(
        { bookingId: { $in: bookings.map((b) => b._id) } },
        { projection: { bookingId: 1 } }
      )
      .toArray();

    const paidSet = new Set(paid.map((p) => String(p.bookingId)));

    // Filter out already-paid ones (status may lag behind)
    const unpaid = bookings.filter((b) => !paidSet.has(String(b._id)));

    res.json({ bookings: unpaid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payments/status/:bookingId ───────────────────────────────────────
// Checks whether a specific booking has an associated payment record
router.get("/status/:bookingId", protect, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const payment = await db.collection("payments").findOne({
      bookingId: toId(req.params.bookingId),
    });

    res.json({ paid: !!payment, payment: payment || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/create-checkout-session ────────────────────────────────
// Creates a Stripe Checkout Session for a given bookingId
router.post("/create-checkout-session", protect, async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: "bookingId is required." });
    }

    const db = mongoose.connection.db;

    // Fetch the booking — ensure it belongs to the requester
    const booking = await db.collection("bookings").findOne({
      _id: toId(bookingId),
      renterId: toId(req.user._id),
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found or access denied." });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ error: `Booking is already "${booking.status}". Only pending bookings can be paid.` });
    }

    // The payment window may have just passed (see utils/bookingExpiry.js).
    // Block starting a new checkout session for a booking that's about to
    // be (or already was) auto-cancelled.
    if (booking.expiresAt && new Date(booking.expiresAt) <= new Date()) {
      return res.status(410).json({
        error: "This booking's payment window has expired. The slot has been released — please book again.",
      });
    }

    // Check for existing payment (idempotency guard)
    const existing = await db.collection("payments").findOne({
      bookingId: toId(bookingId),
    });
    if (existing) {
      return res.status(400).json({ error: "This booking has already been paid." });
    }

    // Amount in the smallest currency unit (cents for USD)
    // totalAmount is stored as a raw number in the booking
    const amountInCents = Math.round((booking.totalAmount || 100) * 100);

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `ZENO Parking — Booking #${String(booking._id).slice(-6).toUpperCase()}`,
              description: `Slot: ${booking.slotId ? String(booking.slotId).slice(-6) : "N/A"} | ${
                booking.startTime
                  ? new Date(booking.startTime).toLocaleString()
                  : "—"
              } → ${
                booking.endTime
                  ? new Date(booking.endTime).toLocaleString()
                  : "—"
              }`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: String(booking._id),
        renterId: String(req.user._id),
      },
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("create-checkout-session error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/verify-session ────────────────────────────────────────
// Called from the frontend /payment/success page after redirect.
// Idempotent — safe to call multiple times (checks for existing payment first).
router.post("/verify-session", protect, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required." });
    }

    // Retrieve session from Stripe
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return res.status(402).json({ error: "Payment has not been completed." });
    }

    const bookingId = session.metadata?.bookingId;
    const renterId = session.metadata?.renterId;

    if (!bookingId || !renterId) {
      return res.status(400).json({ error: "Session metadata missing." });
    }

    const db = mongoose.connection.db;

    // Idempotency — return existing payment if already recorded
    const existingPayment = await db
      .collection("payments")
      .findOne({ stripeSessionId: sessionId });

    if (existingPayment) {
      const existingInvoice = await db
        .collection("invoices")
        .findOne({ paymentId: existingPayment._id });

      return res.json({
        success: true,
        alreadyProcessed: true,
        payment: existingPayment,
        invoice: existingInvoice,
      });
    }

    // ── 1. Insert payment record ──────────────────────────────────────────────
    const paymentDoc = {
      bookingId: toId(bookingId),
      renterId: toId(renterId),
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent?.id || null,
      amount: session.amount_total / 100,        // back to dollars/units
      currency: session.currency.toUpperCase(),
      method: "card",
      transactionRef: session.payment_intent?.id || session.id,
      paidAt: new Date(),
      status: "paid",
    };

    const paymentResult = await db.collection("payments").insertOne(paymentDoc);
    const paymentId = paymentResult.insertedId;

    // ── 2. Update booking status → "confirmed" ────────────────────────────────
    await db.collection("bookings").updateOne(
      { _id: toId(bookingId) },
      { $set: { status: "confirmed" } }
    );

    // ── 3. Auto-generate invoice ──────────────────────────────────────────────
    const invoiceNumber = await nextInvoiceNumber(db);

    const invoiceDoc = {
      invoiceNumber,
      bookingId: toId(bookingId),
      renterId: toId(renterId),
      paymentId,
      createdAt: new Date(),
    };

    const invoiceResult = await db.collection("invoices").insertOne(invoiceDoc);

    res.json({
      success: true,
      alreadyProcessed: false,
      payment: { ...paymentDoc, _id: paymentId },
      invoice: { ...invoiceDoc, _id: invoiceResult.insertedId },
    });

    await createNotification({
      userId: renterId,
      type: 'payment_receipt',
      title: 'Payment Confirmed',
      message: `Your payment of $${session.amount_total / 100} for booking #${String(bookingId).slice(-6)} has been received. Invoice ${invoiceNumber} is available.`,
      relatedId: bookingId,
      sendEmail: true,
    });
    // Also notify the slot owner
    const bookingDoc = await db.collection('bookings').findOne({ _id: toId(bookingId) });
    const slot = await db.collection('parkingslots').findOne({ _id: bookingDoc?.slotId });
    if (slot && slot.owner) {
      await createNotification({
        userId: slot.owner,
        type: 'booking_confirmed',
        title: 'New Booking Confirmed',
        message: `Your slot ${slot.slotNumber} has been booked by ${req.user.name || 'a renter'}.`,
        relatedId: bookingId,
        sendEmail: false, // no email for owner to reduce spam
      });
    }
  } catch (err) {
    console.error("verify-session error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
