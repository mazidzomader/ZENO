const express = require("express");
const router = express.Router();

const {
  getMyBookingHistory,
  createBooking,
  cancelBooking,
  getOwnerBookings,
} = require("../controllers/bookingController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// Logged-in renter's booking history
router.get("/history", protect, getMyBookingHistory);

// Logged-in owner's bookings — who has booked their slots (must come
// before any "/:id" style route so "owner" isn't swallowed as an id param)
router.get("/owner", protect, authorize("owner", "admin"), getOwnerBookings);

// Create a new booking (reserve a slot)
router.post("/", protect, authorize("renter", "admin"), createBooking);

// Cancel a booking (frees the slot back up)
router.patch("/:id/cancel", protect, cancelBooking);

module.exports = router;