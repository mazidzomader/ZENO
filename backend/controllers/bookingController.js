const Booking = require("../models/Booking");

// @desc    Get booking history for the logged-in renter
// @route   GET /api/bookings/history
// @access  Private
const getMyBookingHistory = async (req, res) => {
  try {
    const filter = {
      renterId: req.user._id,
    };

    // Optional status filter
    const status = String(req.query.status || "").trim();

    if (status && status.toLowerCase() !== "all") {
      filter.status = status;
    }

    // Optional date filters
    const fromDate = req.query.from
      ? new Date(req.query.from)
      : null;

    const toDate = req.query.to
      ? new Date(req.query.to)
      : null;

    if (
      (fromDate && !Number.isNaN(fromDate.getTime())) ||
      (toDate && !Number.isNaN(toDate.getTime()))
    ) {
      filter.startTime = {};

      if (fromDate && !Number.isNaN(fromDate.getTime())) {
        filter.startTime.$gte = fromDate;
      }

      if (toDate && !Number.isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        filter.startTime.$lte = toDate;
      }
    }

    const bookings = await Booking.find(filter)
      .sort({
        startTime: -1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("getMyBookingHistory error:", error);

    return res.status(500).json({
      message: "Failed to load booking history.",
    });
  }
};

module.exports = {
  getMyBookingHistory,
};