const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");

// @desc    Create a booking (reserve a slot) for the logged-in renter
// @route   POST /api/bookings
// @access  Private (renter, admin)
const createBooking = async (req, res) => {
  try {
    const { slotId, vehicleId, startTime, endTime } = req.body;

    if (!slotId || !startTime || !endTime) {
      return res.status(400).json({
        message: "Please provide slotId, startTime, and endTime.",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid startTime or endTime." });
    }

    if (start >= end) {
      return res.status(400).json({ message: "endTime must be after startTime." });
    }

    if (start < new Date(Date.now() - 5 * 60 * 1000)) {
      return res.status(400).json({ message: "startTime cannot be in the past." });
    }

    const slot = await Slot.findById(slotId);

    if (!slot) {
      return res.status(404).json({ message: "Slot not found." });
    }

    // Because a slot only carries a single status field (not a calendar of
    // time ranges), a slot can only be booked while it is "available".
    // This is what prevents double-booking the same slot.
    if (slot.status !== "available") {
      return res.status(409).json({
        message: `This slot is currently "${slot.status}" and cannot be booked.`,
      });
    }

    // Optional: make sure the vehicle (if provided) actually belongs to this renter
    if (vehicleId) {
      if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
        return res.status(400).json({ message: "Invalid vehicleId." });
      }
      const Vehicle = mongoose.models.Vehicle;
      if (Vehicle) {
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle || String(vehicle.userId) !== String(req.user._id)) {
          return res.status(403).json({
            message: "That vehicle is not registered to your account.",
          });
        }
      }
    }

    // Simple duration-based pricing: round up to the next full hour.
    const durationHours = Math.ceil((end - start) / (1000 * 60 * 60));
    const totalAmount = durationHours * (slot.pricePerHour || 0);

    const booking = await Booking.create({
      renterId: req.user._id,
      slotId: slot._id,
      vehicleId: vehicleId || null,
      startTime: start,
      endTime: end,
      status: "confirmed",
      totalAmount,
    });

    // Mark the slot as reserved so nobody else can book it
    slot.status = "reserved";
    await slot.save();

    return res.status(201).json({
      message: "Slot booked successfully.",
      booking,
      slot,
    });
  } catch (error) {
    console.error("createBooking error:", error);
    return res.status(500).json({ message: "Failed to create booking." });
  }
};

// @desc    Cancel a booking and free up the slot again
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (the renter who booked it, or admin)
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const isOwner = String(booking.renterId) === String(req.user._id);

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You do not have permission to cancel this booking.",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "This booking is already cancelled." });
    }

    booking.status = "cancelled";
    await booking.save();

    // Free the slot back up, as long as it wasn't deliberately deactivated
    const slot = await Slot.findById(booking.slotId);
    if (slot && slot.status !== "inactive") {
      slot.status = "available";
      await slot.save();
    }

    return res.status(200).json({
      message: "Booking cancelled.",
      booking,
    });
  } catch (error) {
    console.error("cancelBooking error:", error);
    return res.status(500).json({ message: "Failed to cancel booking." });
  }
};

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
      .populate({
        path: "slotId",
        populate: {
          path: "building"
        }
      })
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
  createBooking,
  cancelBooking,
};