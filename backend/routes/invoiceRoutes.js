// ZENO — Invoice Generation (Feature: Invoice View)
// GET /api/invoices       → list invoices (role-filtered: renter/owner/admin)
// GET /api/invoices/:id   → single fully-populated invoice

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { protect } = require("../middleware/authMiddleware");

const toId = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * Build a MongoDB filter for the invoices collection based on the
 * logged-in user's role.
 *
 *  admin  → no filter (sees everything)
 *  owner  → invoices whose booking's slot belongs to one of their buildings
 *  renter → invoices where renterId matches their own _id
 */
async function buildFilter(user, db) {
  if (user.role === "admin") return {};

  if (user.role === "owner") {
    const buildings = await db
      .collection("buildings")
      .find({ ownerId: toId(user._id) }, { projection: { _id: 1 } })
      .toArray();

    const slots = await db
      .collection("parkingslots")
      .find(
        { buildingId: { $in: buildings.map((b) => b._id) } },
        { projection: { _id: 1 } }
      )
      .toArray();

    const bookings = await db
      .collection("bookings")
      .find(
        { slotId: { $in: slots.map((s) => s._id) } },
        { projection: { _id: 1 } }
      )
      .toArray();

    return { bookingId: { $in: bookings.map((b) => b._id) } };
  }

  // renter
  return { renterId: toId(user._id) };
}

// ── GET /api/invoices ────────────────────────────────────────────────────────
// Returns a lightweight list: _id, invoiceNumber, createdAt, amount
router.get("/", protect, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const filter = await buildFilter(req.user, db);
    const invoices = await db
      .collection("invoices")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    // Attach payment amount in parallel
    const result = await Promise.all(
      invoices.map(async (inv) => {
        const payment = inv.paymentId
          ? await db.collection("payments").findOne({ _id: inv.paymentId })
          : null;
        return {
          _id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          createdAt: inv.createdAt,
          amount: payment?.amount ?? null,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/invoices/dashboard-summary ──────────────────────────────────────
// Returns a aggregated dashboard summary for the logged-in user
router.get("/dashboard-summary", protect, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const userId = toId(req.user._id);

    if (req.user.role === "renter") {
      // 1. Determine active status
      const now = new Date();
      const activeBooking = await db.collection("bookings").findOne({
        renterId: userId,
        status: "confirmed",
        startTime: { $lte: now },
        endTime: { $gte: now }
      });
      const status = activeBooking ? "Parked" : "No active booking";

      // 2. Fetch user's vehicles
      const vehicles = await db.collection("vehicles").find({ renterId: userId }).toArray();

      // 3. Fetch reviews and calculate average rating
      const reviews = await db.collection("reviews").find({ renterId: userId }).toArray();
      const avgRating = reviews.length > 0
        ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
        : "N/A";

      // 4. Extra stats
      const totalInvoices = await db.collection("invoices").countDocuments({ renterId: userId });
      const totalBookings = await db.collection("bookings").countDocuments({ renterId: userId });

      const renterBookings = await db
        .collection("bookings")
        .find({ renterId: userId }, { projection: { _id: 1 } })
        .toArray();
      const bookingIds = renterBookings.map((b) => b._id);

      const payments = await db.collection("payments").find({
        bookingId: { $in: bookingIds },
        status: "success"
      }).toArray();
      const totalSpent = payments.reduce((acc, pay) => acc + pay.amount, 0);

      return res.json({
        role: "renter",
        status,
        vehicles: vehicles.map(v => ({ plateNumber: v.plateNumber, type: v.type, sizeClass: v.sizeClass })),
        avgRating,
        totalInvoices,
        totalBookings,
        totalSpent
      });
    }

    if (req.user.role === "owner") {
      // 1. Fetch buildings owned by this owner
      const buildings = await db.collection("buildings").find({ ownerId: userId }).toArray();
      const buildingIds = buildings.map((b) => b._id);

      // 2. Fetch slots in these buildings
      const slots = await db.collection("parkingslots").find({ buildingId: { $in: buildingIds } }).toArray();
      const slotIds = slots.map((s) => s._id);

      // 3. Fetch bookings for these slots
      const bookings = await db.collection("bookings").find({ slotId: { $in: slotIds } }).toArray();
      const bookingIds = bookings.map((b) => b._id);

      // 4. Fetch reviews for these bookings
      const reviews = await db.collection("reviews").find({ bookingId: { $in: bookingIds } }).toArray();

      // 5. Calculate average rating
      const avgRating = reviews.length > 0
        ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
        : "N/A";

      // 6. Calculate total earned from successful payments
      const payments = await db.collection("payments").find({
        bookingId: { $in: bookingIds },
        status: "success"
      }).toArray();
      const totalEarned = payments.reduce((acc, pay) => acc + pay.amount, 0);

      // 7. Get user profile data to return
      const userDoc = await db.collection("users").findOne({ _id: userId });

      // 8. Fetch the actual reviews details (limit 3) for owner reviews feed
      const recentReviews = [];
      const sortedReviews = [...reviews].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      for (const rev of sortedReviews.slice(0, 3)) {
        const b = bookings.find(b => b._id.toString() === rev.bookingId.toString());
        const s = b ? slots.find(s => s._id.toString() === b.slotId.toString()) : null;
        recentReviews.push({
          rating: rev.rating,
          comment: rev.comment,
          createdAt: rev.createdAt,
          slotNumber: s ? s.slotNumber : "Unknown"
        });
      }

      return res.json({
        role: "owner",
        avgRating,
        totalBuildings: buildings.length,
        totalSlots: slots.length,
        totalBookings: bookings.length,
        totalEarned,
        recentReviews,
        profile: {
          address: userDoc.address || "",
          coordinates: userDoc.coordinates || "",
          phone: userDoc.phone || "",
          ownerCode: userDoc.ownerCode || `OWNER-${userId.toString().slice(-6).toUpperCase()}`
        }
      });
    }

    // Fallback for admin
    return res.json({
      role: req.user.role,
      message: `${req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)} dashboard features coming soon.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/invoices/:id ────────────────────────────────────────────────────
// Returns a fully-populated invoice by joining across 6 collections
router.get("/:id", protect, async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const inv = await db
      .collection("invoices")
      .findOne({ _id: toId(req.params.id) });

    if (!inv) return res.status(404).json({ error: "Invoice not found." });

    // Renter can only view their own invoice
    if (
      req.user.role === "renter" &&
      String(inv.renterId) !== String(req.user._id)
    ) {
      return res.status(403).json({ error: "Access denied." });
    }

    // Parallel lookups for top-level refs — use $or for ObjectId/string resilience
    const tryId = (id) => {
      try { return toId(String(id)); } catch { return null; }
    };

    const [renter, payment, booking] = await Promise.all([
      inv.renterId
        ? db.collection("users").findOne(
            { $or: [{ _id: inv.renterId }, { _id: tryId(inv.renterId) }] },
            { projection: { password: 0, __v: 0 } }
          )
        : null,
      inv.paymentId
        ? db.collection("payments").findOne(
            { $or: [{ _id: inv.paymentId }, { _id: tryId(inv.paymentId) }] }
          )
        : null,
      inv.bookingId
        ? db.collection("bookings").findOne(
            { $or: [{ _id: inv.bookingId }, { _id: tryId(inv.bookingId) }] }
          )
        : null,
    ]);

    // Second-level lookups depend on booking — slot field is 'slotId' on bookings
    const slot = booking?.slotId
      ? await db.collection("parkingslots").findOne(
          { $or: [{ _id: booking.slotId }, { _id: tryId(booking.slotId) }] }
        )
      : null;

    const vehicle = booking
      ? await db.collection("vehicles").findOne(
          { $or: [{ renterId: inv.renterId }, { renterId: tryId(inv.renterId) }] }
        )
      : null;

    // Building depends on slot — field may be 'building' OR 'buildingId' depending on
    // how the slot was created (old seed uses buildingId, new data uses building).
    const buildingRef = slot?.building ?? slot?.buildingId ?? null;
    const building = buildingRef
      ? await db.collection("buildings").findOne(
          { $or: [{ _id: buildingRef }, { _id: tryId(String(buildingRef)) }] }
        )
      : null;

    // Owner can only view invoices that belong to their buildings
    if (
      req.user.role === "owner" &&
      building &&
      String(building.ownerId) !== String(req.user._id)
    ) {
      return res.status(403).json({ error: "Access denied." });
    }

    res.json({
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber,
      createdAt: inv.createdAt,
      renter: renter
        ? { name: renter.name, email: renter.email, phone: renter.phone }
        : null,
      vehicle: vehicle
        ? { plateNumber: vehicle.plateNumber, type: vehicle.type, sizeClass: vehicle.sizeClass }
        : null,
      slot: slot ? { slotNumber: slot.slotNumber, floor: slot.floor } : null,
      building: building
        ? { name: building.name, address: building.address }
        : null,
      booking: booking ? { startTime: booking.startTime } : null,
      payment: payment
        ? {
            amount: payment.amount,
            method: payment.method,
            transactionRef: payment.transactionRef,
            paidAt: payment.paidAt,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/invoices/:id ─────────────────────────────────────────────────
// Deletes an invoice from the database
router.delete("/:id", protect, async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const inv = await db
      .collection("invoices")
      .findOne({ _id: toId(req.params.id) });

    if (!inv) return res.status(404).json({ error: "Invoice not found." });

    // Renter can only delete their own invoices
    if (
      req.user.role === "renter" &&
      String(inv.renterId) !== String(req.user._id)
    ) {
      return res.status(403).json({ error: "Access denied." });
    }

    // Owner can only delete invoices that belong to their buildings
    if (req.user.role === "owner") {
      const booking = await db.collection("bookings").findOne({ _id: inv.bookingId });
      const slot = booking ? await db.collection("parkingslots").findOne({ _id: booking.slotId }) : null;
      const building = slot ? await db.collection("buildings").findOne({ _id: slot.buildingId }) : null;
      if (!building || String(building.ownerId) !== String(req.user._id)) {
        return res.status(403).json({ error: "Access denied." });
      }
    }

    await db.collection("invoices").deleteOne({ _id: toId(req.params.id) });
    res.json({ message: "Invoice deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
