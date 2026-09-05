const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const BookingSeries = require("../models/BookingSeries");
const Slot = require("../models/Slot");
const SlotBlackout = require("../models/SlotBlackout");
const { createNotification } = require("../services/notificationService");
const { computeSlotPrice } = require("../utils/pricingEngine");

// Kept in sync with the same constant in bookingController.js — a "live"
// booking that blocks other bookings from overlapping the same slot/time.
const ACTIVE_STATUSES = ["pending", "confirmed", "active"];

// Same payment window as a one-time booking (see bookingController.js) —
// each occurrence created here is a completely normal "pending" Booking
// and goes through the exact same Stripe / subscription-hours payment flow.
const PENDING_PAYMENT_MINUTES = 15;

// Hard ceiling on how many individual bookings one recurring request can
// create in a single call, so a bad/abusive date range can't hammer the DB.
// Must match MAX_OCCURRENCES in frontend/src/pages/bookings/BookSlot.jsx
const MAX_OCCURRENCES_PER_SERIES = 60;

const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// ── Attempts to book ONE occurrence of a recurring series ──────────────────
// Mirrors the validation + race-safe create-then-reverify flow used by
// createBooking() in bookingController.js, but never throws for an expected
// conflict — it returns a `reason` string instead, so one bad date doesn't
// abort the rest of the batch.
const bookOneOccurrence = async ({ slot, renterId, vehicleId, seriesId, start, end }) => {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { booking: null, reason: "invalid_time_range" };
  }

  if (start >= end) {
    return { booking: null, reason: "end_before_start" };
  }

  if (start < new Date(Date.now() - 5 * 60 * 1000)) {
    return { booking: null, reason: "in_the_past" };
  }

  const blackoutConflict = await SlotBlackout.findOne({
    slot: slot._id,
    startDate: { $lt: end },
    endDate: { $gt: start },
  });
  if (blackoutConflict) {
    return { booking: null, reason: "blackout_conflict" };
  }

  const overlap = await Booking.findOne({
    slotId: slot._id,
    status: { $in: ACTIVE_STATUSES },
    startTime: { $lt: end },
    endTime: { $gt: start },
  });
  if (overlap) {
    return { booking: null, reason: "already_booked" };
  }

  let pricingResult;
  try {
    pricingResult = await computeSlotPrice(slot, { unit: "hour", datetime: start });
  } catch (pricingError) {
    return { booking: null, reason: `pricing_error: ${pricingError.message}` };
  }

  const durationHours = Math.ceil((end - start) / (1000 * 60 * 60));
  const totalAmount = Math.round(durationHours * pricingResult.finalPrice * 100) / 100;

  const booking = await Booking.create({
    renterId,
    slotId: slot._id,
    vehicleId: vehicleId || null,
    seriesId,
    startTime: start,
    endTime: end,
    status: "pending",
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

  // Same optimistic create-then-reverify race guard as createBooking(): two
  // occurrences (or a totally unrelated booking) could have been inserted
  // for the same overlapping window between our check above and this
  // insert. First-created booking always wins.
  const rivals = await Booking.find({
    slotId: slot._id,
    status: { $in: ACTIVE_STATUSES },
    startTime: { $lt: end },
    endTime: { $gt: start },
    _id: { $ne: booking._id },
  }).select("_id createdAt");

  const iLost = rivals.some((rival) => {
    if (rival.createdAt.getTime() !== booking.createdAt.getTime()) {
      return rival.createdAt < booking.createdAt;
    }
    return rival._id.toString() < booking._id.toString();
  });

  if (iLost) {
    await Booking.findByIdAndDelete(booking._id);
    return { booking: null, reason: "lost_race_to_another_booking" };
  }

  return { booking, reason: null };
};

// @desc    Create a recurring booking series — e.g. "the same slot, every
//          weekday, 9am-6pm" — instead of booking one range at a time.
//          The client sends the fully-expanded list of occurrence
//          {startTime, endTime} instants (so each occurrence respects the
//          renter's own local wall-clock time exactly like a one-time
//          booking does); daysOfWeek/timeStart/timeEnd/seriesStartDate/
//          seriesEndDate are stored purely as descriptive metadata for the
//          UI. Conflicting dates (already booked, blacked out, in the past,
//          etc.) are automatically skipped rather than failing the whole
//          request.
// @route   POST /api/recurring-bookings
// @access  Private (renter, admin)
const createRecurringBooking = async (req, res) => {
  const createdBookingIds = [];
  let series = null;

  try {
    const {
      slotId,
      vehicleId,
      daysOfWeek,
      timeStart,
      timeEnd,
      seriesStartDate,
      seriesEndDate,
      occurrences,
    } = req.body;

    // ── BASIC INPUT VALIDATION ──
    if (!slotId) {
      return res.status(400).json({ message: "Please provide slotId." });
    }

    if (!Array.isArray(occurrences) || occurrences.length === 0) {
      return res.status(400).json({
        message:
          "Please provide a non-empty 'occurrences' array of {startTime, endTime} pairs.",
      });
    }

    if (occurrences.length > MAX_OCCURRENCES_PER_SERIES) {
      return res.status(400).json({
        message: `A recurring series can contain at most ${MAX_OCCURRENCES_PER_SERIES} occurrences. Please shorten the date range or select fewer days.`,
      });
    }

    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return res.status(400).json({
        message: "Please provide daysOfWeek as a non-empty array (0=Sunday .. 6=Saturday).",
      });
    }

    const cleanDaysOfWeek = [...new Set(daysOfWeek.map(Number))]
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      .sort((a, b) => a - b);

    if (cleanDaysOfWeek.length === 0) {
      return res.status(400).json({ message: "daysOfWeek must contain integers 0-6." });
    }

    if (!HHMM_REGEX.test(timeStart || "") || !HHMM_REGEX.test(timeEnd || "")) {
      return res.status(400).json({
        message: "timeStart and timeEnd must be in 24-hour HH:MM format.",
      });
    }

    const seriesStart = new Date(seriesStartDate);
    const seriesEnd = new Date(seriesEndDate);
    if (Number.isNaN(seriesStart.getTime()) || Number.isNaN(seriesEnd.getTime())) {
      return res.status(400).json({ message: "Invalid seriesStartDate or seriesEndDate." });
    }
    if (seriesStart > seriesEnd) {
      return res.status(400).json({ message: "seriesEndDate must be on or after seriesStartDate." });
    }

    // ── SLOT / VEHICLE VALIDATION (done once, not per-occurrence) ──
    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found." });
    }
    if (slot.status === "inactive") {
      return res.status(409).json({
        message: "This slot is currently inactive and cannot be booked.",
      });
    }

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

    // ── PARSE + SORT THE ACTUAL OCCURRENCE LIST ──
    const parsedOccurrences = occurrences
      .map((occ) => ({
        start: new Date(occ?.startTime),
        end: new Date(occ?.endTime),
      }))
      .sort((a, b) => a.start - b.start);

    // ── CREATE THE SERIES SHELL FIRST so every Booking below can reference it ──
    series = await BookingSeries.create({
      renterId: req.user._id,
      slotId: slot._id,
      vehicleId: vehicleId || null,
      daysOfWeek: cleanDaysOfWeek,
      timeStart,
      timeEnd,
      seriesStartDate: seriesStart,
      seriesEndDate: seriesEnd,
      status: "active",
      totalOccurrences: parsedOccurrences.length,
      occurrences: [],
    });

    // ── PROCESS EACH OCCURRENCE, EXACTLY LIKE A SINGLE createBooking() CALL ──
    const occurrenceResults = [];

    for (const { start, end } of parsedOccurrences) {
      const result = await bookOneOccurrence({
        slot,
        renterId: req.user._id,
        vehicleId: vehicleId || null,
        seriesId: series._id,
        start,
        end,
      });

      if (result.booking) {
        createdBookingIds.push(result.booking._id);
      }

      occurrenceResults.push({
        startTime: start,
        endTime: end,
        status: result.booking ? "booked" : "skipped",
        bookingId: result.booking ? result.booking._id : null,
        reason: result.reason || null,
      });
    }

    const bookedCount = occurrenceResults.filter((o) => o.status === "booked").length;
    const skippedCount = occurrenceResults.length - bookedCount;

    series.occurrences = occurrenceResults;
    series.bookedCount = bookedCount;
    series.skippedCount = skippedCount;
    await series.save();

    // One summary notification instead of one per occurrence — avoids
    // spamming the renter's inbox with dozens of separate emails.
    await createNotification({
      userId: req.user._id,
      type: "booking_confirmed",
      title: "Recurring Booking Processed",
      message: `Your recurring booking request for slot ${slot.slotNumber} produced ${bookedCount} reservation(s) awaiting payment${
        skippedCount > 0 ? ` and skipped ${skippedCount} date(s) due to conflicts` : ""
      }. Please complete payment for each reservation within ${PENDING_PAYMENT_MINUTES} minutes from the Payments page.`,
      relatedId: series._id,
      sendEmail: true,
    });

    if (bookedCount === 0) {
      return res.status(409).json({
        message:
          "None of the requested dates could be booked — every occurrence conflicted with an existing booking, a blackout window, or was invalid.",
        series,
      });
    }

    return res.status(201).json({
      message: `Recurring booking created: ${bookedCount} reservation(s) pending payment${
        skippedCount > 0 ? `, ${skippedCount} date(s) skipped due to conflicts` : ""
      }.`,
      series,
    });
  } catch (error) {
    console.error("createRecurringBooking error:", error);

    if (createdBookingIds.length > 0) {
      await Booking.deleteMany({ _id: { $in: createdBookingIds } }).catch(() => {});
    }
    if (series) {
      await BookingSeries.findByIdAndDelete(series._id).catch(() => {});
    }

    return res.status(500).json({ message: "Failed to create recurring booking." });
  }
};

// @desc    List the logged-in renter's recurring booking series
// @route   GET /api/recurring-bookings/my
// @access  Private
const getMyRecurringBookings = async (req, res) => {
  try {
    const series = await BookingSeries.find({ renterId: req.user._id })
      .populate({ path: "slotId", populate: { path: "building", select: "name address" } })
      .populate({ path: "occurrences.bookingId", select: "status startTime endTime totalAmount" })
      .sort({ createdAt: -1 });

    res.status(200).json({ count: series.length, series });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get one recurring series with its full occurrence breakdown
// @route   GET /api/recurring-bookings/:id
// @access  Private (the renter who owns it, or admin)
const getRecurringBookingDetail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid series id." });
    }

    const series = await BookingSeries.findById(id)
      .populate({ path: "slotId", populate: { path: "building", select: "name address" } })
      .populate({ path: "occurrences.bookingId", select: "status startTime endTime totalAmount" });

    if (!series) {
      return res.status(404).json({ message: "Recurring booking series not found." });
    }

    const isOwner = String(series.renterId) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "You do not have permission to view this series." });
    }

    res.status(200).json({ series });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel an entire recurring series — cancels every occurrence that
//          is still pending/confirmed/active (frees the slot for any that
//          were currently checked in) and marks the series itself cancelled.
//          Already-cancelled or already-completed occurrences are left as-is.
// @route   PATCH /api/recurring-bookings/:id/cancel
// @access  Private (the renter who owns it, or admin)
const cancelRecurringSeries = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid series id." });
    }

    const series = await BookingSeries.findById(id);
    if (!series) {
      return res.status(404).json({ message: "Recurring booking series not found." });
    }

    const isOwner = String(series.renterId) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "You do not have permission to cancel this series." });
    }

    if (series.status === "cancelled") {
      return res.status(400).json({ message: "This recurring series is already cancelled." });
    }

    const bookingIds = series.occurrences
      .filter((o) => o.status === "booked" && o.bookingId)
      .map((o) => o.bookingId);

    const bookings = await Booking.find({
      _id: { $in: bookingIds },
      status: { $in: ACTIVE_STATUSES },
    });

    let cancelledCount = 0;
    let slotFreed = false;

    for (const booking of bookings) {
      const wasActive = booking.status === "active";
      booking.status = "cancelled";
      booking.cancelReason = "recurring_series_cancelled";
      await booking.save();
      cancelledCount += 1;

      if (wasActive && !slotFreed) {
        const slot = await Slot.findById(booking.slotId);
        if (slot && slot.status !== "inactive") {
          slot.status = "available";
          await slot.save();
        }
        slotFreed = true;
      }
    }

    series.status = "cancelled";
    await series.save();

    return res.status(200).json({
      message: `Recurring series cancelled. ${cancelledCount} booking(s) cancelled.`,
      series,
    });
  } catch (error) {
    console.error("cancelRecurringSeries error:", error);
    return res.status(500).json({ message: "Failed to cancel recurring series." });
  }
};

module.exports = {
  createRecurringBooking,
  getMyRecurringBookings,
  getRecurringBookingDetail,
  cancelRecurringSeries,
};