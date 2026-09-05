const express = require("express");
const router = express.Router();

const {
  getMyBookingHistory,
  createBooking,
  cancelBooking,
  checkAvailability,
  getSlotSchedule,
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

// Public — check whether a slot is free for a given time window, before
// showing/submitting the booking form.
router.get("/availability/:slotId", checkAvailability);

// Public — a slot's busy time ranges, for rendering a calendar in the UI.
router.get("/slot/:slotId/schedule", getSlotSchedule);

// Create a new booking (reserve a slot for a time range)
router.post("/", protect, authorize("renter", "admin"), createBooking);

// Cancel a booking (frees the slot back up)
router.patch("/:id/cancel", protect, cancelBooking);

module.exports = router;