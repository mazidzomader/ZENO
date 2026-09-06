const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { protect } = require("../middleware/authMiddleware");

/**
 * Builds a MongoDB query filter based on the logged-in user's role and the
 * collection being accessed.
 *
 * Roles:
 *   - admin  → sees everything (no filter)
 *   - owner  → sees everything (no filter; owner-scoped data handled elsewhere)
 *   - renter → only sees records that belong to them
 *
 * Ownership map for renter:
 *   Direct (renterId):  bookings, vehicles, invoices, subscriptions, reviews
 *   Via userId:         notifications
 *   Via bookingId:      payments, checkinouts, overstaypenalties, cancellationrefunds
 *   Own row only:       users
 *   Read-only / public: parkingslots, buildings, subscriptionplans, reports
 */
const buildFilter = async (collectionName, user, db) => {
  // Admins see everything
  if (user.role === "admin") {
    return {};
  }

  // Owners see everything except reviews which are scoped to their slots
  // Owners see everything except reviews and overstay penalties (which are scoped)
if (user.role === "owner") {
  // Reviews: only for their buildings
  if (collectionName === "reviews") {
    const buildings = await db
      .collection("buildings")
      .find({ ownerId: user._id }, { projection: { _id: 1 } })
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

  // Overstay penalties: only for their buildings
  if (collectionName === "overstaypenalties") {
    const buildings = await db
      .collection("buildings")
      .find({ ownerId: user._id }, { projection: { _id: 1 } })
      .toArray();
    const buildingIds = buildings.map((b) => b._id);

    const slots = await db
      .collection("parkingslots")
      .find({ buildingId: { $in: buildingIds } }, { projection: { _id: 1 } })
      .toArray();
    const slotIds = slots.map((s) => s._id);

    const bookings = await db
      .collection("bookings")
      .find({ slotId: { $in: slotIds } }, { projection: { _id: 1 } })
      .toArray();
    const bookingIds = bookings.map((b) => b._id);

    return { bookingId: { $in: bookingIds } };
  }

  return {}; // owners see everything else
}

  // Renter — apply per-collection ownership filters
  const userId = user._id;

  // Collections with a direct renterId field
  const renterIdCollections = [
    "bookings",
    "invoices",
    "subscriptions",
    "reviews"
  ];
  if (renterIdCollections.includes(collectionName)) {
    return { renterId: userId };
  }

  // Vehicles use userId
  if (collectionName === "vehicles") {
    return { userId: userId };
  }

  // Notifications keyed by userId
  if (collectionName === "notifications") {
    return { userId: userId };
  }

  // Users — renter sees only their own document
  if (collectionName === "users") {
    return { _id: userId };
  }

  // Collections linked to renter through their booking IDs
  const bookingLinkedCollections = [
    "payments",
    "checkinouts",
    "overstaypenalties",
    "cancellationrefunds",
  ];
  if (bookingLinkedCollections.includes(collectionName)) {
    // First, find all booking IDs belonging to this renter
    const renterBookings = await db
      .collection("bookings")
      .find({ renterId: userId }, { projection: { _id: 1 } })
      .toArray();
    const bookingIds = renterBookings.map((b) => b._id);
    return { bookingId: { $in: bookingIds } };
  }

  // Public / reference collections — renters can read but not personalised
  // (parkingslots, buildings, subscriptionplans, reports)
  return {};
};

// All DB collection routes are protected — a valid JWT is required
router.get("/:collection", protect, async (req, res) => {
  try {
    const collectionName = req.params.collection.toLowerCase();

    // Prelude is metadata-only, no auth filtering needed
    if (collectionName === "prelude") {
      return res.json([
        {
          ServerVersion: "8.3.4",
          ToolVersion: "100.17.0",
          Source: "prelude.json",
        },
      ]);
    }

    const db = mongoose.connection.db;

    // Confirm the collection exists in MongoDB
    const collections = await db.listCollections().toArray();
    const exists = collections.some(
      (col) => col.name.toLowerCase() === collectionName
    );

    if (!exists) {
      return res.json([]);
    }

    // Build role-aware filter and fetch only what this user is allowed to see
    const filter = await buildFilter(collectionName, req.user, db);
    const data = await db.collection(collectionName).find(filter).toArray();

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
