// ZENO — Ratings & Reviews System (Feature: Booking Reviews)
// GET /api/reviews/bookings  →  Get user-exclusive bookings with populated reviews
// POST /api/reviews          →  Create a review (0.25 step validation, read-only post-creation)

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { protect } = require("../middleware/authMiddleware");

const toId = (id) => new mongoose.Types.ObjectId(String(id));

// ── GET /api/reviews/bookings ────────────────────────────────────────────────
router.get("/bookings", protect, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const userId = toId(req.user._id);

    // Fetch all bookings for the logged-in renter
    const bookings = await db
      .collection("bookings")
      .find({ renterId: userId })
      .sort({ startTime: -1 })
      .toArray();

    // Map and populate slot, building, and review data for each booking
    const result = await Promise.all(
      bookings.map(async (bk) => {
        // Fetch review if exists
        const review = await db.collection("reviews").findOne({ bookingId: bk._id });

        // Fetch parking slot details
        const slot = bk.slotId
          ? await db.collection("parkingslots").findOne({ _id: bk.slotId })
          : null;

        // Fetch building details
        const building = slot?.buildingId
          ? await db.collection("buildings").findOne({ _id: slot.buildingId })
          : null;

        return {
          _id: bk._id,
          startTime: bk.startTime,
          endTime: bk.endTime,
          status: bk.status,
          totalAmount: bk.totalAmount,
          slotNumber: slot?.slotNumber ?? "—",
          buildingName: building?.name ?? "—",
          review: review
            ? {
                _id: review._id,
                rating: review.rating,
                comment: review.comment,
                ownerResponse: review.ownerResponse || null,
                createdAt: review.createdAt,
              }
            : null,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/reviews ────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { bookingId, rating, comment } = req.body;
    const userId = toId(req.user._id);

    if (!bookingId) {
      return res.status(400).json({ error: "Booking ID is required." });
    }

    // 1. Validate booking existence and ownership
    const booking = await db
      .collection("bookings")
      .findOne({ _id: toId(bookingId), renterId: userId });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found or access denied." });
    }

    // 2. Validate that it is not already reviewed (strict read-only post-creation)
    const existingReview = await db.collection("reviews").findOne({ bookingId: toId(bookingId) });
    if (existingReview) {
      return res.status(400).json({ error: "This booking has already been reviewed." });
    }

    // 3. Validate rating constraints (0.25 interval, 0.0 to 5.0)
    const numRating = parseFloat(rating);
    if (isNaN(numRating) || numRating < 0 || numRating > 5) {
      return res.status(400).json({ error: "Rating must be between 0 and 5." });
    }

    // Check if rating is in 0.25 intervals (e.g. 4.25, 3.5, 2.0)
    // Using a tolerance check for floating-point inaccuracies
    const precisionCheck = (numRating * 100) % 25;
    if (precisionCheck !== 0) {
      return res.status(400).json({ error: "Rating must be in 0.25 star intervals (e.g. 4.25, 4.5, 4.75)." });
    }

    // 4. Create and insert review record
    const newReview = {
      _id: new mongoose.Types.ObjectId(),
      bookingId: toId(bookingId),
      renterId: userId,
      rating: numRating,
      comment: comment || "",
      ownerResponse: null,
      createdAt: new Date(),
    };

    await db.collection("reviews").insertOne(newReview);

    res.status(201).json({
      message: "Review submitted successfully.",
      review: newReview,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
