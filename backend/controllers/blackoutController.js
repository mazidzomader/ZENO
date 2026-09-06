const mongoose = require("mongoose");
const SlotBlackout = require("../models/SlotBlackout");
const Slot = require("../models/Slot");
const Building = require("../models/Building");
const Booking = require("../models/Booking");

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed", "active"];

// Only the slot's building owner (or an admin) may manage its blackouts
const canManageSlot = async (req, slot) => {
  if (req.user.role === "admin") return true;
  const building = await Building.findById(slot.building);
  return !!building && building.ownerId.toString() === req.user._id.toString();
};

// @desc    Schedule a future maintenance/blackout window on a slot. Unlike
//          deactivate (which takes a slot offline entirely, indefinitely),
//          this blocks bookings only for a specific date range — the slot
//          stays normally bookable outside that window.
// @route   POST /api/slots/:slotId/blackouts
// @access  Private (that slot's building owner, or admin)
const createBlackout = async (req, res) => {
  try {
    const { slotId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({ message: "Invalid slotId." });
    }

    const { startDate, endDate, reason } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Please provide startDate and endDate.",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid startDate or endDate." });
    }

    if (start >= end) {
      return res.status(400).json({ message: "endDate must be after startDate." });
    }

    if (end < new Date()) {
      return res.status(400).json({
        message: "endDate has already passed. Choose a current or future date range.",
      });
    }

    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ message: "Slot not found." });
    }

    if (!(await canManageSlot(req, slot))) {
      return res.status(403).json({
        message: "You do not have permission to schedule a blackout on this slot.",
      });
    }

    // Block if this range overlaps a live (pending/confirmed/active) booking
    // a renter is relying on — same overlap rule used everywhere else in
    // the app: existingStart < newEnd AND existingEnd > newStart.
    const conflictingBooking = await Booking.findOne({
      slotId: slot._id,
      status: { $in: ACTIVE_BOOKING_STATUSES },
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).select("startTime endTime status");

    if (conflictingBooking) {
      return res.status(409).json({
        message: `This slot has a booking (status: "${conflictingBooking.status}") from ${conflictingBooking.startTime.toLocaleString()} to ${conflictingBooking.endTime.toLocaleString()}, which overlaps the requested blackout window. Cancel or wait for it to end first.`,
      });
    }

    // Block if this range overlaps an existing blackout on the same slot
    const overlappingBlackout = await SlotBlackout.findOne({
      slot: slot._id,
      startDate: { $lt: end },
      endDate: { $gt: start },
    });

    if (overlappingBlackout) {
      return res.status(409).json({
        message: `This slot already has a scheduled blackout from ${overlappingBlackout.startDate.toLocaleString()} to ${overlappingBlackout.endDate.toLocaleString()} that overlaps this range.`,
      });
    }

    const blackout = await SlotBlackout.create({
      slot: slot._id,
      owner: slot.owner,
      startDate: start,
      endDate: end,
      reason: reason || "",
    });

    res.status(201).json({
      message: "Blackout scheduled successfully.",
      blackout,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List a slot's scheduled blackout windows. By default only
//          current/future ones are returned; ?includePast=true returns all.
// @route   GET /api/slots/:slotId/blackouts
// @access  Public
const getBlackoutsForSlot = async (req, res) => {
  try {
    const { slotId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({ message: "Invalid slotId." });
    }

    const filter = { slot: slotId };

    if (req.query.includePast !== "true") {
      filter.endDate = { $gte: new Date() };
    }

    const blackouts = await SlotBlackout.find(filter).sort({ startDate: 1 });

    res.status(200).json({ count: blackouts.length, blackouts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    List blackouts across all of the logged-in owner's slots
//          (admins get all). Optional filters: ?slot=&building=&includePast=
// @route   GET /api/blackouts/mine
// @access  Private (owner, admin)
const getMyBlackouts = async (req, res) => {
  try {
    const slotFilter = {};
    if (req.user.role !== "admin") {
      slotFilter.owner = req.user._id;
    }
    if (req.query.building) {
      slotFilter.building = req.query.building;
    }
    if (req.query.slot) {
      slotFilter._id = req.query.slot;
    }

    const allowedSlots = await Slot.find(slotFilter).select("_id");
    const allowedSlotIds = allowedSlots.map((s) => s._id);

    const filter = { slot: { $in: allowedSlotIds } };
    if (req.query.includePast !== "true") {
      filter.endDate = { $gte: new Date() };
    }

    const blackouts = await SlotBlackout.find(filter)
      .populate({
        path: "slot",
        select: "slotNumber floor building",
        populate: { path: "building", select: "name address" },
      })
      .sort({ startDate: 1 });

    res.status(200).json({ count: blackouts.length, blackouts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove a scheduled blackout (cancel it before it starts, or end
//          it early).
// @route   DELETE /api/blackouts/:id
// @access  Private (that slot's building owner, or admin)
const deleteBlackout = async (req, res) => {
  try {
    const blackout = await SlotBlackout.findById(req.params.id);

    if (!blackout) {
      return res.status(404).json({ message: "Blackout not found." });
    }

    const slot = await Slot.findById(blackout.slot);
    if (!slot) {
      return res.status(404).json({ message: "Associated slot not found." });
    }

    if (!(await canManageSlot(req, slot))) {
      return res.status(403).json({
        message: "You do not have permission to remove this blackout.",
      });
    }

    await blackout.deleteOne();

    res.status(200).json({ message: "Blackout removed successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBlackout,
  getBlackoutsForSlot,
  getMyBlackouts,
  deleteBlackout,
};