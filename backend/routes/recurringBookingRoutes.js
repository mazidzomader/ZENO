const express = require("express");
const router = express.Router();

const {
  createRecurringBooking,
  getMyRecurringBookings,
  getRecurringBookingDetail,
  cancelRecurringSeries,
} = require("../controllers/recurringBookingController");

const { protect, authorize } = require("../middleware/authMiddleware");

// Logged-in renter's recurring booking series (must come before "/:id" so
// "my" isn't swallowed as an id param — same pattern as bookingRoutes.js)
router.get("/my", protect, getMyRecurringBookings);

// Create a new recurring booking series (e.g. "every weekday, 9am-6pm")
router.post("/", protect, authorize("renter", "admin"), createRecurringBooking);

// Get one series with its full occurrence breakdown
router.get("/:id", protect, getRecurringBookingDetail);

// Cancel an entire series (all of its future/live bookings)
router.patch("/:id/cancel", protect, cancelRecurringSeries);

module.exports = router;