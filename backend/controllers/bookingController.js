const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Slot = require("../models/Slot");
const SlotBlackout = require("../models/SlotBlackout");
const { createNotification } = require('../services/notificationService');
const { computeSlotPrice } = require("../utils/pricingEngine");

// Only these statuses represent a "live" booking that blocks other bookings
// from overlapping the same slot/time range.
const ACTIVE_STATUSES = ["pending", "confirmed", "active"];

// How long a renter has to pay (via Stripe or subscription hours) before an
// unpaid "pending" booking is automatically cancelled and the slot is freed
// again. Enforced by the sweep in utils/bookingExpiry.js.
const PENDING_PAYMENT_MINUTES = 15;

// @desc    Create a booking (reserve a slot) for the logged-in renter
// @route   POST /api/bookings
// @access  Private (renter, admin)
const createBooking = async (req, res) => {
  // Tracks the booking doc so we can roll it back if a race is lost, or if
  // anything fails after it's been created.
  let createdBooking = null;

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

    // "inactive" is the only slot.status that blocks booking outright now —
    // it means the owner has deliberately taken the slot offline. Every
    // other case (including whether the slot is currently "occupied" right
    // this second) is decided purely by whether the requested time range
    // overlaps an existing live booking, checked below.
        if (slot.status === "inactive") {
      return res.status(409).json({
        message: "This slot is currently inactive and cannot be booked.",
      });
    }

    // ── BLACKOUT CHECK ──
    // Owners can schedule a future maintenance/blackout window on a slot
    // (see blackoutController.js) without deactivating it entirely. Block
    // this booking if its range overlaps any scheduled blackout.
    const blackoutConflict = await SlotBlackout.findOne({
      slot: slot._id,
      startDate: { $lt: end },
      endDate: { $gt: start },
    });

    if (blackoutConflict) {
      return res.status(409).json({
        message: `This slot is scheduled for maintenance from ${blackoutConflict.startDate.toLocaleString()} to ${blackoutConflict.endDate.toLocaleString()}${blackoutConflict.reason ? ` (${blackoutConflict.reason})` : ""}. Please choose a different time or slot.`,
      });
    }

    // Optional: make sure the vehicle (if provided) actually belongs to this renter



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

    // ── TIME-BASED AVAILABILITY CHECK ──
    // A slot can hold many bookings as long as their [startTime, endTime)
    // windows never overlap. Two ranges overlap iff
    // existingStart < newEnd AND existingEnd > newStart.
    // Only "live" bookings count — cancelled/completed ones never block.
    const overlap = await Booking.findOne({
      slotId,
      status: { $in: ACTIVE_STATUSES },
      startTime: { $lt: end },
      endTime: { $gt: start },
    });

    if (overlap) {
      return res.status(409).json({
        message:
          "This slot is already booked for part or all of that time range. Please choose a different time or slot.",
      });
    }

    // ── DYNAMIC PRICING ──
    // Ask the pricing engine for the effective hourly rate at booking start
    // time — after every matching rule (slot type, floor, day/time window,
    // live demand) has been applied — instead of trusting the slot's flat
    // base pricePerHour.
    let pricingResult;
    try {
      pricingResult = await computeSlotPrice(slot, { unit: "hour", datetime: start });
    } catch (pricingError) {
      return res.status(400).json({ message: pricingError.message });
    }

    const durationHours = Math.ceil((end - start) / (1000 * 60 * 60));
    const totalAmount = Math.round(durationHours * pricingResult.finalPrice * 100) / 100;

    // ── CREATE, THEN RE-VERIFY (race-safe without needing a DB transaction) ──
    // We already checked for overlaps above, but two requests can race
    // between that check and this insert. MongoDB has no built-in way to
    // enforce "no overlapping ranges" as a unique index, so instead we
    // create the booking optimistically, then immediately re-check for any
    // other live overlapping booking. If one exists and it was created
    // first (earlier createdAt, or a smaller _id as a tie-breaker), we roll
    // this one back — first-created booking always wins.
    createdBooking = await Booking.create({
      renterId: req.user._id,
      slotId: slot._id,
      vehicleId: vehicleId || null,
      startTime: start,
      endTime: end,
      status: "pending", // awaiting payment — see routes/paymentRoutes.js
      totalAmount,
      expiresAt: new Date(Date.now() + PENDING_PAYMENT_MINUTES * 60 * 1000),
      pricingSnapshot: {
        unit: pricingResult.unit,
        basePrice: pricingResult.basePrice,
        effectiveHourlyRate: pricingResult.finalPrice,
        durationHours,
        appliedRules: pricingResult.appliedRules,
      },
    });

    const rivals = await Booking.find({
      slotId,
      status: { $in: ACTIVE_STATUSES },
      startTime: { $lt: end },
      endTime: { $gt: start },
      _id: { $ne: createdBooking._id },
    }).select("_id createdAt");

    const iLost = rivals.some((rival) => {
      if (rival.createdAt.getTime() !== createdBooking.createdAt.getTime()) {
        return rival.createdAt < createdBooking.createdAt;
      }
      return rival._id.toString() < createdBooking._id.toString();
    });

    if (iLost) {
      await Booking.findByIdAndDelete(createdBooking._id);
      createdBooking = null;
      return res.status(409).json({
        message:
          "This slot was just booked by someone else for an overlapping time. Please choose another time or slot.",
      });
    }

    // Note: slot.status is NOT touched here. It only reflects physical,
    // real-time presence, which changes via check-in/check-out
    // (checkinoutController.js) or an owner deactivating the slot.

    await createNotification({
      userId: req.user._id,
      type: 'booking_confirmed',
      title: 'Booking Pending Payment',
      message: `You have successfully reserved slot ${slot.slotNumber} from ${start.toLocaleString()} to ${end.toLocaleString()}. Total: $${totalAmount}. Please complete payment within ${PENDING_PAYMENT_MINUTES} minutes or this reservation will be released.`,
      relatedId: createdBooking._id,
      sendEmail: true,
    });

    return res.status(201).json({
      message: "Slot reserved successfully. Please complete payment to confirm your booking.",
      booking: createdBooking,
      slot,
    });
  } catch (error) {
    console.error("createBooking error:", error);

    if (createdBooking) {
      await Booking.findByIdAndDelete(createdBooking._id).catch(() => {});
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

    // If the renter had already physically checked in (booking.status ===
    // "active", which is what flips slot.status to "occupied" in
    // checkinoutController.js), cancelling here is really "force-ending an
    // in-progress stay" — so free the slot's real-world status too.
    // For "pending"/"confirmed" bookings, slot.status was never touched by
    // booking creation (see createBooking above), so there's nothing to revert.
    const wasActive = booking.status === "active";

    booking.status = "cancelled";
    await booking.save();

    if (wasActive) {
      const slot = await Slot.findById(booking.slotId);
      if (slot && slot.status !== "inactive") {
        slot.status = "available";
        await slot.save();
      }
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

// @desc    Check whether a slot is free for a given time window — call this
//          from the frontend before showing/submitting the booking form.
// @route   GET /api/bookings/availability/:slotId?start=ISO&end=ISO
// @access  Public
const checkAvailability = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { start: startParam, end: endParam } = req.query;

    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({ message: "Invalid slotId." });
    }

    if (!startParam || !endParam) {
      return res.status(400).json({ message: "Please provide start and end query params." });
    }

    const start = new Date(startParam);
    const end = new Date(endParam);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid start or end datetime." });
    }

    if (start >= end) {
      return res.status(400).json({ message: "end must be after start." });
    }

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found." });
    }

        if (slot.status === "inactive") {
      return res.status(200).json({
        available: false,
        reason: "This slot is currently inactive.",
      });
    }

    const blackoutConflict = await SlotBlackout.findOne({
      slot: slot._id,
      startDate: { $lt: end },
      endDate: { $gt: start },
    });

    if (blackoutConflict) {
      return res.status(200).json({
        available: false,
        reason: `This slot is scheduled for maintenance from ${blackoutConflict.startDate.toLocaleString()} to ${blackoutConflict.endDate.toLocaleString()}${blackoutConflict.reason ? ` (${blackoutConflict.reason})` : ""}.`,
      });
    }

    

    const conflict = await Booking.findOne({
      slotId,
      status: { $in: ACTIVE_STATUSES },
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).select("startTime endTime status");

    if (conflict) {
      return res.status(200).json({
        available: false,
        reason: "This time range overlaps an existing booking.",
        conflict: {
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          status: conflict.status,
        },
      });
    }

    return res.status(200).json({ available: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List a slot's live/upcoming bookings in a date range, so the
//          frontend can render a "busy times" calendar before someone
//          submits a booking request. Never exposes renter identity.
// @route   GET /api/bookings/slot/:slotId/schedule?from=ISO&to=ISO
// @access  Public
const getSlotSchedule = async (req, res) => {
  try {
    const { slotId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({ message: "Invalid slotId." });
    }

    const filter = {
      slotId,
      status: { $in: ACTIVE_STATUSES },
    };

    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    if (from && !Number.isNaN(from.getTime())) {
      filter.endTime = { $gt: from };
    }
    if (to && !Number.isNaN(to.getTime())) {
      filter.startTime = { ...(filter.startTime || {}), $lt: to };
    }

    const bookings = await Booking.find(filter)
      .select("startTime endTime status")
      .sort({ startTime: 1 });

    res.status(200).json({ count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    const status = String(req.query.status || "").trim();

    if (status && status.toLowerCase() !== "all") {
      filter.status = status;
    }

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
  checkAvailability,
  getSlotSchedule,
  getOwnerBookings,
};