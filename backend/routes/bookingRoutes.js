const express = require("express");
const router = express.Router();

const {
  getMyBookingHistory,
  createBooking,
  cancelBooking,
} = require("../controllers/bookingController");

const {
  protect,
  authorize,
} = require("../middleware/authMiddleware");

// Logged-in renter's booking history
router.get("/history", protect, getMyBookingHistory);

// Create a new booking (reserve a slot)
router.post("/", protect, authorize("renter", "admin"), createBooking);

// Cancel a booking (frees the slot back up)
router.patch("/:id/cancel", protect, cancelBooking);

module.exports = router;