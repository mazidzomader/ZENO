// ZENO — Stripe Payment Gateway (Isolated Feature)
// This file is fully self-contained. It does NOT modify any other route, controller, or model.
//
// Endpoints:
//   GET  /api/payments/pending-bookings          → renter's unpaid pending bookings
//   POST /api/payments/create-checkout-session   → create Stripe Checkout session
//   POST /api/payments/verify-session            → verify payment + write DB + generate invoice
//   GET  /api/payments/status/:bookingId         → check if a booking has been paid
//   POST /api/payments/create-extend-session     → "Extend my stay" — create Stripe session for +N hours
//   POST /api/payments/verify-extend-session     → verify extension payment + push endTime out
//   POST /api/payments/create-bulk-checkout-session → pay every unpaid occurrence in a recurring series at once
//   POST /api/payments/verify-bulk-session       → verify bulk series payment + write DB + generate invoices

const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const mongoose = require("mongoose");
const { protect } = require("../middleware/authMiddleware");
const { createNotification } = require('../services/notificationService');
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const BookingSeries = require("../models/BookingSeries");
const { computeSlotPrice } = require("../utils/pricingEngine");

// Lazy Stripe initialization — deferred until first request so that
// dotenv.config() in server.js has already populated process.env.
let _stripe = null;
const getStripe = () => {
  if (!_stripe) _stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
};

// ── Helper ────────────────────────────────────────────────────────────────────
const toId = (id) => new mongoose.Types.ObjectId(String(id));

// Statuses that count as a "live" booking blocking a slot/time range.
// (Kept local to this file since paymentRoutes.js is meant to be self-contained.)
const ACTIVE_STATUSES = ["pending", "confirmed", "active"];

// Cap how many hours can be added in one "extend" action.
const MAX_EXTEND_HOURS = 6;

// Same payment window as a single booking (see recurringBookingController.js) —
// used to give a bulk-series checkout a single, fresh, synced deadline.
const PENDING_PAYMENT_MINUTES = 15;

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

// ── POST /api/payments/create-extend-session ──────────────────────────────────
// "Extend my stay" quick action, step 1 of 2.
// Checks the next N hours are free on the same slot, computes the extra cost
// via the same dynamic pricing engine used at booking time, and opens a
// Stripe Checkout session for just that extra amount.
// Body: { bookingId, hours }  (hours optional, defaults to 1, capped at MAX_EXTEND_HOURS)
router.post("/create-extend-session", protect, async (req, res) => {
  try {
    const { bookingId, hours: rawHours } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: "bookingId is required." });
    }

    const hours = Math.max(1, Math.min(MAX_EXTEND_HOURS, parseInt(rawHours, 10) || 1));

    const booking = await Booking.findOne({
      _id: toId(bookingId),
      renterId: toId(req.user._id),
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found or access denied." });
    }

    // Only a booking that's actually live right now (paid, or checked in)
    // makes sense to extend. Pending/cancelled/completed bookings don't.
    if (!["confirmed", "active"].includes(booking.status)) {
      return res.status(400).json({
        error: `Only confirmed or active bookings can be extended (current status: "${booking.status}").`,
      });
    }

    const currentEnd = new Date(booking.endTime);
    const newEnd = new Date(currentEnd.getTime() + hours * 60 * 60 * 1000);

    // Make sure nobody else has booked the slot for the extension window.
    const overlap = await Booking.findOne({
      slotId: booking.slotId,
      status: { $in: ACTIVE_STATUSES },
      _id: { $ne: booking._id },
      startTime: { $lt: newEnd },
      endTime: { $gt: currentEnd },
    });

    if (overlap) {
      return res.status(409).json({
        error: "This slot is already booked right after your current stay, so it can't be extended right now.",
      });
    }

    const slot = await Slot.findById(booking.slotId);
    if (!slot) {
      return res.status(404).json({ error: "Slot not found." });
    }

    // Same pricing engine used for regular bookings — dynamic pricing rules
    // (time-of-day/demand surcharges etc.) still apply to the extra hour(s).
    let pricingResult;
    try {
      pricingResult = await computeSlotPrice(slot, { unit: "hour", datetime: currentEnd });
    } catch (pricingError) {
      return res.status(400).json({ error: pricingError.message });
    }

    const extraAmount = Math.round(hours * pricingResult.finalPrice * 100) / 100;
    const amountInCents = Math.round(extraAmount * 100);

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `ZENO Parking — Extend Booking #${String(booking._id).slice(-6).toUpperCase()}`,
              description: `+${hours} hour(s) — new end time ${newEnd.toLocaleString()}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "extend",
        bookingId: String(booking._id),
        renterId: String(req.user._id),
        hours: String(hours),
        newEndTime: newEnd.toISOString(),
      },
      success_url: `${process.env.CLIENT_URL}/payment/extend-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/bookings/history`,
    });

    res.json({
      url: session.url,
      sessionId: session.id,
      extraAmount,
      newEndTime: newEnd,
      hours,
    });
  } catch (err) {
    console.error("create-extend-session error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/verify-extend-session ───────────────────────────────────
// "Extend my stay" quick action, step 2 of 2.
// Called from /payment/extend-success after the Stripe redirect.
// Idempotent, and re-checks the slot is still free before actually pushing
// endTime out (auto-refunds if someone else grabbed it in the meantime).
router.post("/verify-extend-session", protect, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required." });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return res.status(402).json({ error: "Payment has not been completed." });
    }

    if (session.metadata?.type !== "extend") {
      return res.status(400).json({ error: "This session is not an extension payment." });
    }

    const bookingId = session.metadata?.bookingId;
    const renterId = session.metadata?.renterId;
    const hours = parseInt(session.metadata?.hours, 10) || 1;
    const newEndTime = new Date(session.metadata?.newEndTime);

    if (!bookingId || !renterId || Number.isNaN(newEndTime.getTime())) {
      return res.status(400).json({ error: "Session metadata missing or invalid." });
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

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    // Re-check the slot is still free for the extension window — someone
    // could have booked it while the Stripe checkout was in progress.
    const overlap = await Booking.findOne({
      slotId: booking.slotId,
      status: { $in: ACTIVE_STATUSES },
      _id: { $ne: booking._id },
      startTime: { $lt: newEndTime },
      endTime: { $gt: booking.endTime },
    });

    if (overlap) {
      // Can't honor the extension — refund automatically.
      if (session.payment_intent?.id) {
        await getStripe().refunds.create({ payment_intent: session.payment_intent.id });
      }
      return res.status(409).json({
        error: "This slot was booked by someone else before your extension could be confirmed. You have been refunded.",
      });
    }

    const extraAmount = session.amount_total / 100;

    // ── 1. Insert payment record ──────────────────────────────────────────────
    const paymentDoc = {
      bookingId: toId(bookingId),
      renterId: toId(renterId),
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent?.id || null,
      amount: extraAmount,
      currency: session.currency.toUpperCase(),
      method: "card",
      type: "extension",
      transactionRef: session.payment_intent?.id || session.id,
      paidAt: new Date(),
      status: "paid",
    };

    const paymentResult = await db.collection("payments").insertOne(paymentDoc);
    const paymentId = paymentResult.insertedId;

    // ── 2. Push the booking's endTime out and bump totalAmount ────────────────
    const previousEnd = booking.endTime;
    booking.endTime = newEndTime;
    booking.totalAmount = Math.round((booking.totalAmount + extraAmount) * 100) / 100;
    booking.pricingSnapshot = {
      ...(booking.pricingSnapshot || {}),
      extensions: [
        ...((booking.pricingSnapshot && booking.pricingSnapshot.extensions) || []),
        {
          hours,
          extraAmount,
          extendedFrom: previousEnd,
          extendedTo: newEndTime,
          paidAt: new Date(),
        },
      ],
    };
    await booking.save();

    // ── 3. Auto-generate a supplemental invoice ────────────────────────────────
    const invoiceNumber = await nextInvoiceNumber(db);

    const invoiceDoc = {
      invoiceNumber,
      bookingId: toId(bookingId),
      renterId: toId(renterId),
      paymentId,
      note: `Stay extension: +${hours}hr, new end time ${newEndTime.toLocaleString()}`,
      createdAt: new Date(),
    };

    const invoiceResult = await db.collection("invoices").insertOne(invoiceDoc);

    res.json({
      success: true,
      alreadyProcessed: false,
      booking,
      payment: { ...paymentDoc, _id: paymentId },
      invoice: { ...invoiceDoc, _id: invoiceResult.insertedId },
    });

    await createNotification({
      userId: renterId,
      type: 'payment_receipt',
      title: 'Stay Extended',
      message: `Your booking has been extended by ${hours} hour(s), now until ${newEndTime.toLocaleString()}. Extra charge: $${extraAmount}.`,
      relatedId: bookingId,
      sendEmail: true,
    });
  } catch (err) {
    console.error("verify-extend-session error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/create-bulk-checkout-session ─────────────────────────────
// "Pay entire recurring series at once" — bundles every still-unpaid
// occurrence in a BookingSeries into ONE Stripe Checkout session (one line
// item per booking), instead of the renter paying each occurrence one by one.
// Body: { seriesId }
router.post("/create-bulk-checkout-session", protect, async (req, res) => {
  try {
    const { seriesId } = req.body;

    if (!seriesId) {
      return res.status(400).json({ error: "seriesId is required." });
    }
    if (!mongoose.Types.ObjectId.isValid(seriesId)) {
      return res.status(400).json({ error: "Invalid seriesId." });
    }

    const series = await BookingSeries.findOne({
      _id: toId(seriesId),
      renterId: toId(req.user._id),
    });

    if (!series) {
      return res.status(404).json({ error: "Recurring series not found or access denied." });
    }

    const bookingIds = series.occurrences
      .filter((o) => o.status === "booked" && o.bookingId)
      .map((o) => o.bookingId);

    if (bookingIds.length === 0) {
      return res.status(400).json({ error: "This series has no booked occurrences to pay for." });
    }

    const bookings = await Booking.find({
      _id: { $in: bookingIds },
      renterId: toId(req.user._id),
      status: "pending",
    }).sort({ startTime: 1 });

    if (bookings.length === 0) {
      return res.status(400).json({
        error: "There is nothing pending to pay for in this series — every occurrence is already paid, cancelled, or expired.",
      });
    }

    // Idempotency guard — exclude any occurrence that somehow already has a
    // payment record even though its status still reads "pending".
    const db = mongoose.connection.db;
    const existingPayments = await db
      .collection("payments")
      .find({ bookingId: { $in: bookings.map((b) => b._id) } }, { projection: { bookingId: 1 } })
      .toArray();
    const paidSet = new Set(existingPayments.map((p) => String(p.bookingId)));
    const payable = bookings.filter((b) => !paidSet.has(String(b._id)));

    if (payable.length === 0) {
      return res.status(400).json({ error: "Every occurrence in this series has already been paid." });
    }

    // Give the whole batch ONE synced payment window instead of each
    // occurrence's own (possibly different) expiresAt — so the renter has a
    // clean 15 minutes to complete a single checkout instead of racing
    // several independent countdowns.
    const newExpiry = new Date(Date.now() + PENDING_PAYMENT_MINUTES * 60 * 1000);
    await Booking.updateMany(
      { _id: { $in: payable.map((b) => b._id) } },
      { $set: { expiresAt: newExpiry } }
    );

    const line_items = payable.map((b) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: `ZENO Parking — Booking #${String(b._id).slice(-6).toUpperCase()}`,
          description: `${
            b.startTime ? new Date(b.startTime).toLocaleString() : "—"
          } → ${b.endTime ? new Date(b.endTime).toLocaleString() : "—"}`,
        },
        unit_amount: Math.round((b.totalAmount || 100) * 100),
      },
      quantity: 1,
    }));

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      metadata: {
        type: "bulk_series",
        seriesId: String(series._id),
        renterId: String(req.user._id),
      },
      success_url: `${process.env.CLIENT_URL}/payment/bulk-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/bookings/recurring`,
    });

    res.json({ url: session.url, sessionId: session.id, bookingCount: payable.length });
  } catch (err) {
    console.error("create-bulk-checkout-session error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/payments/verify-bulk-session ──────────────────────────────────────
// Called from the frontend /payment/bulk-success page after redirect.
// Idempotent — safe to call multiple times. Confirms every pending booking
// that was part of the bulk checkout and writes one invoice per booking,
// all sharing the same Stripe session/payment_intent.
router.post("/verify-bulk-session", protect, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required." });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    if (session.payment_status !== "paid") {
      return res.status(402).json({ error: "Payment has not been completed." });
    }

    if (session.metadata?.type !== "bulk_series") {
      return res.status(400).json({ error: "This session is not a bulk series payment." });
    }

    const seriesId = session.metadata?.seriesId;
    const renterId = session.metadata?.renterId;

    if (!seriesId || !renterId) {
      return res.status(400).json({ error: "Session metadata missing." });
    }

    const db = mongoose.connection.db;

    // Idempotency — if this session was already processed, return what was
    // created before instead of charging/writing anything twice.
    const existingPayments = await db
      .collection("payments")
      .find({ stripeSessionId: sessionId })
      .toArray();

    if (existingPayments.length > 0) {
      const existingInvoices = await db
        .collection("invoices")
        .find({ paymentId: { $in: existingPayments.map((p) => p._id) } })
        .toArray();

      return res.json({
        success: true,
        alreadyProcessed: true,
        payments: existingPayments,
        invoices: existingInvoices,
        count: existingPayments.length,
      });
    }

    const series = await BookingSeries.findById(seriesId);
    if (!series) {
      return res.status(404).json({ error: "Recurring series not found." });
    }

    const bookingIds = series.occurrences
      .filter((o) => o.status === "booked" && o.bookingId)
      .map((o) => o.bookingId);

    // Only bookings still "pending" get charged here — anything already
    // confirmed/cancelled/expired between checkout creation and this call
    // is left untouched.
    const bookings = await Booking.find({
      _id: { $in: bookingIds },
      status: "pending",
    });

    if (bookings.length === 0) {
      return res.status(400).json({
        error: "No pending bookings were found for this series — they may already have been processed.",
      });
    }

    const paymentDocs = [];
    const invoiceDocs = [];

    for (const booking of bookings) {
      // Each booking's totalAmount is exactly what its Stripe line item was
      // priced at when the session was created — totalAmount is never
      // edited after booking creation anywhere else in this app.
      const paymentDoc = {
        bookingId: booking._id,
        renterId: toId(renterId),
        seriesId: series._id,
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent?.id || null,
        amount: booking.totalAmount,
        currency: session.currency.toUpperCase(),
        method: "card",
        type: "bulk_series",
        transactionRef: session.payment_intent?.id || session.id,
        paidAt: new Date(),
        status: "paid",
      };
      const paymentResult = await db.collection("payments").insertOne(paymentDoc);
      const paymentId = paymentResult.insertedId;
      paymentDocs.push({ ...paymentDoc, _id: paymentId });

      await Booking.updateOne({ _id: booking._id }, { $set: { status: "confirmed" } });

      const invoiceNumber = await nextInvoiceNumber(db);
      const invoiceDoc = {
        invoiceNumber,
        bookingId: booking._id,
        renterId: toId(renterId),
        paymentId,
        seriesId: series._id,
        note: `Part of bulk payment for recurring series (${bookings.length} booking(s))`,
        createdAt: new Date(),
      };
      const invoiceResult = await db.collection("invoices").insertOne(invoiceDoc);
      invoiceDocs.push({ ...invoiceDoc, _id: invoiceResult.insertedId });
    }

    res.json({
      success: true,
      alreadyProcessed: false,
      payments: paymentDocs,
      invoices: invoiceDocs,
      count: paymentDocs.length,
    });

    const totalPaid = session.amount_total / 100;
    await createNotification({
      userId: renterId,
      type: "payment_receipt",
      title: "Recurring Series Paid",
      message: `Your payment of $${totalPaid.toFixed(2)} for ${bookings.length} booking(s) in your recurring series has been received. ${invoiceDocs.length} invoice(s) generated.`,
      relatedId: series._id,
      sendEmail: true,
    });

    // Notify the slot owner once, not per-occurrence.
    const slot = await db.collection("parkingslots").findOne({ _id: series.slotId });
    if (slot && slot.owner) {
      await createNotification({
        userId: slot.owner,
        type: "booking_confirmed",
        title: "Recurring Series Booking Confirmed",
        message: `${bookings.length} booking(s) on your slot ${slot.slotNumber} have been paid via a recurring series.`,
        relatedId: series._id,
        sendEmail: false,
      });
    }
  } catch (err) {
    console.error("verify-bulk-session error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;