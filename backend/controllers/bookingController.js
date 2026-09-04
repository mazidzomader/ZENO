const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const { createNotification } = require('../services/notificationService');
const { computeSlotPrice } = require("../utils/pricingEngine");

// @desc    Create a booking (reserve a slot) for the logged-in renter
// @route   POST /api/bookings
// @access  Private (renter, admin)
const createBooking = async (req, res) => {
  // Tracks whether we've already flipped the slot to "reserved", so we can
  // roll it back to "available" if anything fails after that point.
  let reservedSlot = null;

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

    // Fast, friendly early check. The real guard against double-booking is
    // the atomic findOneAndUpdate further down — this is just so a slot
    // that's obviously unavailable fails fast with a clear message.
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

    // ── DYNAMIC PRICING ──
    // Ask the pricing engine for the effective hourly rate at booking start
    // time — after every matching rule (slot type, floor, day/time window,
    // live demand) has been applied — instead of trusting the slot's flat
    // base pricePerHour. This is what connects Dynamic Pricing to what a
    // renter is actually charged.
    let pricingResult;
    try {
      pricingResult = await computeSlotPrice(slot, { unit: "hour", datetime: start });
    } catch (pricingError) {
      return res.status(400).json({ message: pricingError.message });
    }

    const durationHours = Math.ceil((end - start) / (1000 * 60 * 60));
    const totalAmount = Math.round(durationHours * pricingResult.finalPrice * 100) / 100;

    // ── ATOMIC RESERVATION ──
    // Re-check availability and flip status to "reserved" in a single
    // findOneAndUpdate. If two requests race for the same slot, only the
    // first one's update matches the { status: "available" } filter — the
    // second gets null back instead of silently double-booking the slot.
    reservedSlot = await Slot.findOneAndUpdate(
      { _id: slotId, status: "available" },
      { status: "reserved" },
      { new: true }
    );

    if (!reservedSlot) {
      return res.status(409).json({
        message: "This slot was just booked by someone else. Please choose another.",
      });
    }

    const booking = await Booking.create({
      renterId: req.user._id,
      slotId: slot._id,
      vehicleId: vehicleId || null,
      startTime: start,
      endTime: end,
      status: "pending", // awaiting payment — see routes/paymentRoutes.js
      totalAmount,
      pricingSnapshot: {
        unit: pricingResult.unit,
        basePrice: pricingResult.basePrice,
        effectiveHourlyRate: pricingResult.finalPrice,
        durationHours,
        appliedRules: pricingResult.appliedRules,
      },
    });

    await createNotification({
      userId: req.user._id,
      type: 'booking_confirmed',
      title: 'Booking Pending Payment',
      message: `You have successfully reserved slot ${reservedSlot.slotNumber} from ${start.toLocaleString()} to ${end.toLocaleString()}. Total: $${totalAmount}. Please complete payment.`,
      relatedId: booking._id,
      sendEmail: true,
    });

    return res.status(201).json({
      message: "Slot reserved successfully. Please complete payment to confirm your booking.",
      booking,
      slot: reservedSlot,
    });
  } catch (error) {
    console.error("createBooking error:", error);

    // Roll back the reservation if we'd already flipped the slot to
    // "reserved" but failed to finish creating the booking.
    if (reservedSlot) {
      await Slot.findByIdAndUpdate(reservedSlot._id, { status: "available" }).catch(() => {});
    }

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

    if (booking.status === "completed") {
      return res.status(400).json({
        message: "This booking has already been completed and cannot be cancelled.",
      });
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

// @desc    Get bookings for the logged-in owner's own slots — shows who has
//          booked each slot (renter name/email/phone, vehicle, time range).
//          Admins get bookings across every slot.
//          Optional filters: ?slot=<slotId>&building=<buildingId>&status=<status>
// @route   GET /api/bookings/owner
// @access  Private (owner, admin)
const getOwnerBookings = async (req, res) => {
  try {
    const { slot: slotIdParam, building: buildingIdParam, status } = req.query;

    // Figure out which slot IDs this requester is allowed to see bookings
    // for. Owners are restricted to slots they actually own; admins see
    // everything (optionally narrowed by the same building/slot filters).
    const slotFilter = {};
    if (req.user.role !== "admin") {
      slotFilter.owner = req.user._id;
    }
    if (buildingIdParam) {
      slotFilter.building = buildingIdParam;
    }
    if (slotIdParam) {
      slotFilter._id = slotIdParam;
    }

    const allowedSlots = await Slot.find(slotFilter).select("_id");
    const allowedSlotIds = allowedSlots.map((s) => s._id);

    if (slotIdParam && allowedSlotIds.length === 0) {
      // Either the slot doesn't exist, or it exists but isn't owned by this
      // requester — don't leak which, just say "not found".
      return res.status(404).json({ message: "Slot not found or not owned by you." });
    }

    const filter = { slotId: { $in: allowedSlotIds } };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate("renterId", "name email phone")
      .populate("vehicleId", "plateNumber type sizeClass")
      .populate({ path: "slotId", populate: { path: "building", select: "name address" } })
      .sort({ startTime: -1 });

    res.status(200).json({ count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyBookingHistory,
  createBooking,
  cancelBooking,
  getOwnerBookings,
};