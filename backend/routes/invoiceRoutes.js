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

    // Parallel lookups for top-level refs
    const [renter, payment, booking] = await Promise.all([
      inv.renterId
        ? db
            .collection("users")
            .findOne({ _id: inv.renterId }, { projection: { password: 0, __v: 0 } })
        : null,
      inv.paymentId
        ? db.collection("payments").findOne({ _id: inv.paymentId })
        : null,
      inv.bookingId
        ? db.collection("bookings").findOne({ _id: inv.bookingId })
        : null,
    ]);

    // Second-level lookups depend on booking
    const [slot, vehicle] = booking
      ? await Promise.all([
          db.collection("parkingslots").findOne({ _id: booking.slotId }),
          db.collection("vehicles").findOne({ _id: booking.vehicleId }),
        ])
      : [null, null];

    // Building depends on slot
    const building = slot
      ? await db.collection("buildings").findOne({ _id: slot.buildingId })
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

module.exports = router;
