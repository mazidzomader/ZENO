// ZENO — Subscription Plans (Isolated Feature)
// This file is fully self-contained. Does NOT modify any other route, controller, or model.
//
// Endpoints:
//   GET  /api/subscriptions/plans          → 3 hardcoded plan definitions
//   GET  /api/subscriptions/my             → renter's active subscription (or null)
//   POST /api/subscriptions/subscribe      → create Stripe Checkout Session (mode: subscription)
//   POST /api/subscriptions/verify         → verify session → insert subscription record
//   POST /api/subscriptions/cancel         → cancel at period end in Stripe + mark in DB
//   POST /api/subscriptions/use-hours      → deduct hours for a booking, confirm it, generate invoice

const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const mongoose = require("mongoose");
const { protect } = require("../middleware/authMiddleware");

// ── Lazy Stripe init (same pattern as paymentRoutes) ─────────────────────────
let _stripe = null;
const getStripe = () => {
  if (!_stripe) _stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
};

// ── Hardcoded Plans ───────────────────────────────────────────────────────────
const PLANS = {
  basic: {
    id: "basic",
    name: "Basic",
    hours: 20,
    priceUsd: 9.99,
    lookupKey: "zeno_basic_monthly",
    description: "Great for occasional parkers",
    perks: ["20 hours/month", "Any available slot", "Cancel anytime"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    hours: 50,
    priceUsd: 19.99,
    lookupKey: "zeno_pro_monthly",
    description: "For regular daily commuters",
    perks: ["50 hours/month", "Any available slot", "Priority support", "Cancel anytime"],
  },
  premium: {
    id: "premium",
    name: "Premium",
    hours: 100,
    priceUsd: 34.99,
    lookupKey: "zeno_premium_monthly",
    description: "For power users and teams",
    perks: ["100 hours/month", "Any available slot", "Priority support", "Invoice history", "Cancel anytime"],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const toId = (id) => new mongoose.Types.ObjectId(String(id));

// Find an existing Stripe Price by lookup_key, or create it (idempotent)
async function getOrCreateStripePrice(plan) {
  const stripe = getStripe();
  const list = await stripe.prices.list({ lookup_keys: [plan.lookupKey], active: true });
  if (list.data.length > 0) return list.data[0];

  const product = await stripe.products.create({
    name: `ZENO ${plan.name} Plan`,
    description: plan.description,
  });

  return stripe.prices.create({
    unit_amount: Math.round(plan.priceUsd * 100),
    currency: "usd",
    recurring: { interval: "month" },
    product: product.id,
    lookup_key: plan.lookupKey,
  });
}

// Auto-incrementing invoice number (same logic as paymentRoutes — isolated copy)
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

// ── GET /api/subscriptions/plans ──────────────────────────────────────────────
router.get("/plans", (req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

// ── GET /api/subscriptions/my ─────────────────────────────────────────────────
// Returns the renter's active (or cancelling) subscription, or null
router.get("/my", protect, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const sub = await db.collection("subscriptions").findOne(
      { renterId: toId(req.user._id), status: "active" },
      { sort: { createdAt: -1 } }
    );
    res.json({ subscription: sub || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscriptions/subscribe ────────────────────────────────────────
// Creates a Stripe Checkout Session in subscription mode
router.post("/subscribe", protect, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];
    if (!plan) return res.status(400).json({ error: "Invalid plan ID." });

    const db = mongoose.connection.db;

    // Check if renter already has this exact plan active
    const currentSub = await db.collection("subscriptions").findOne({
      renterId: toId(req.user._id),
      status: { $in: ["active", "cancelling"] },
    });
    if (currentSub?.planId === planId && currentSub?.status === "active") {
      return res.status(400).json({ error: "You already have this plan active." });
    }

    // Find or create Stripe Price (idempotent)
    const stripePrice = await getOrCreateStripePrice(plan);

    // Reuse existing Stripe Customer if renter has subscribed before
    const existingStripeCustomerId = currentSub?.stripeCustomerId || null;

    const sessionParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      metadata: {
        planId,
        renterId: String(req.user._id),
      },
      success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/subscription/cancel`,
    };

    // Attach existing customer so Stripe doesn't create a duplicate
    if (existingStripeCustomerId) {
      sessionParams.customer = existingStripeCustomerId;
    }

    const session = await getStripe().checkout.sessions.create(sessionParams);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("subscribe error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscriptions/verify ───────────────────────────────────────────
// Called from /subscription/success page. Idempotent.
router.post("/verify", protect, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId is required." });

    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (!session.subscription || session.subscription.status !== "active") {
      return res.status(402).json({ error: "Subscription is not active." });
    }

    const planId = session.metadata?.planId;
    const renterId = session.metadata?.renterId;
    if (!planId || !renterId) {
      return res.status(400).json({ error: "Session metadata missing." });
    }

    const db = mongoose.connection.db;

    // Idempotency — return if already recorded
    const existing = await db.collection("subscriptions").findOne({
      stripeSubscriptionId: session.subscription.id,
    });
    if (existing) {
      return res.json({ success: true, alreadyProcessed: true, subscription: existing });
    }

    // Cancel any previously active subscription in Stripe + DB
    const oldSub = await db.collection("subscriptions").findOne({
      renterId: toId(renterId),
      status: "active",
    });
    if (oldSub?.stripeSubscriptionId) {
      try {
        await getStripe().subscriptions.cancel(oldSub.stripeSubscriptionId);
      } catch (_) { /* already cancelled */ }
      await db.collection("subscriptions").updateOne(
        { _id: oldSub._id },
        { $set: { status: "cancelled" } }
      );
    }

    const plan = PLANS[planId];
    const stripeSub = session.subscription;

    const subDoc = {
      renterId: toId(renterId),
      planId,
      planName: plan.name,
      stripeCustomerId:
        typeof session.customer === "string" ? session.customer : session.customer?.id,
      stripeSubscriptionId: stripeSub.id,
      status: "active",
      hoursTotal: plan.hours,
      hoursUsed: 0,
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      createdAt: new Date(),
    };

    const result = await db.collection("subscriptions").insertOne(subDoc);
    res.json({ success: true, alreadyProcessed: false, subscription: { ...subDoc, _id: result.insertedId } });
  } catch (err) {
    console.error("verify error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscriptions/cancel ───────────────────────────────────────────
// Cancels immediately — user reverts to no subscription state
router.post("/cancel", protect, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const sub = await db.collection("subscriptions").findOne({
      renterId: toId(req.user._id),
      status: "active",
    });

    if (!sub) return res.status(404).json({ error: "No active subscription found." });

    // Cancel immediately in Stripe
    try {
      await getStripe().subscriptions.cancel(sub.stripeSubscriptionId);
    } catch (err) {
      console.warn("Stripe cancel failed or already cancelled:", err.message);
    }

    // Mark as 'cancelled' immediately
    await db.collection("subscriptions").updateOne(
      { _id: sub._id },
      { $set: { status: "cancelled" } }
    );

    res.json({
      success: true,
      message: "Subscription cancelled successfully. You can now subscribe to a new plan.",
    });
  } catch (err) {
    console.error("cancel error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscriptions/use-hours ────────────────────────────────────────
// Deducts hours from the subscription to pay for a pending booking
router.post("/use-hours", protect, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ error: "bookingId is required." });

    const db = mongoose.connection.db;

    // Get active subscription
    const sub = await db.collection("subscriptions").findOne({
      renterId: toId(req.user._id),
      status: "active",
    });
    if (!sub) return res.status(400).json({ error: "No active subscription. Please subscribe first." });

    const hoursRemaining = parseFloat((sub.hoursTotal - sub.hoursUsed).toFixed(2));

    // Get the pending booking
    const booking = await db.collection("bookings").findOne({
      _id: toId(bookingId),
      renterId: toId(req.user._id),
      status: "pending",
    });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found or already paid." });
    }

    // Calculate booking duration in hours
    const durationMs = new Date(booking.endTime) - new Date(booking.startTime);
    const durationH = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

    if (durationH <= 0) {
      return res.status(400).json({ error: "Booking has invalid start/end times." });
    }

    if (hoursRemaining < durationH) {
      return res.status(400).json({
        error: `Not enough hours. You have ${hoursRemaining}h remaining but this booking needs ${durationH}h. Please Pay Now or re-subscribe.`,
        hoursRemaining,
        hoursNeeded: durationH,
      });
    }

    // ── 1. Deduct hours from subscription ────────────────────────────────────
    await db.collection("subscriptions").updateOne(
      { _id: sub._id },
      { $inc: { hoursUsed: durationH } }
    );

    // ── 2. Confirm the booking ────────────────────────────────────────────────
    await db.collection("bookings").updateOne(
      { _id: toId(bookingId) },
      { $set: { status: "confirmed" } }
    );

    // ── 3. Generate invoice ───────────────────────────────────────────────────
    const invoiceNumber = await nextInvoiceNumber(db);
    const invoiceDoc = {
      invoiceNumber,
      bookingId: toId(bookingId),
      renterId: toId(req.user._id),
      paymentId: null,
      paymentMethod: "subscription",
      subscriptionId: sub._id,
      hoursDeducted: durationH,
      createdAt: new Date(),
    };
    const invoiceResult = await db.collection("invoices").insertOne(invoiceDoc);

    res.json({
      success: true,
      hoursDeducted: durationH,
      hoursRemaining: parseFloat((hoursRemaining - durationH).toFixed(2)),
      invoice: { ...invoiceDoc, _id: invoiceResult.insertedId },
    });
  } catch (err) {
    console.error("use-hours error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
