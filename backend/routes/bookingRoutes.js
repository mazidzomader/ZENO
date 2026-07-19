const express = require("express");
const router = express.Router();

const {
  getMyBookingHistory,
} = require("../controllers/bookingController");

const {
  protect,
} = require("../middleware/authMiddleware");

// Logged-in renter's booking history
router.get("/history", protect, getMyBookingHistory);

module.exports = router;

