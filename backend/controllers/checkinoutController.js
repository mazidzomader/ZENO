const mongoose = require('mongoose');
const CheckInOut = require('../models/CheckInOut');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const OverstayPenalty = require('../models/OverstayPenalty');
const { createNotification } = require('../services/notificationService');

// Helper to get the slot's hourly rate (or fallback to a default)
const getSlotHourlyRate = async (slotId) => {
  const slot = await Slot.findById(slotId);
  if (!slot) throw new Error('Slot not found');
  return slot.pricePerHour || 0;
};

// ── CHECK IN ──
exports.checkIn = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    // Verify booking belongs to this renter and is in 'confirmed' or 'active' status
    const booking = await Booking.findOne({
      _id: bookingId,
      renterId: userId,
      status: { $in: ['confirmed', 'active'] },
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or not eligible for check-in.' });
    }

    // Check if a check-in record already exists
    let record = await CheckInOut.findOne({ bookingId });
    if (record) {
      if (record.checkInTime) {
        return res.status(400).json({ error: 'Already checked in.' });
      }
      // Update existing record
      record.checkInTime = new Date();
      record.status = 'checked-in';
    } else {
      // Create new
      record = new CheckInOut({
        bookingId,
        checkInTime: new Date(),
        status: 'checked-in',
      });
    }
    await record.save();

    // Update booking status to 'active'
    await Booking.findByIdAndUpdate(bookingId, { status: 'active' });

    // ── SLOT STATUS SYNC ──
    // Move the slot from "reserved" (booked but renter not yet on-site) to
    // "occupied" (renter has physically checked in), so slot availability
    // reflects real-world occupancy.
    await Slot.findByIdAndUpdate(booking.slotId, { status: 'occupied' });

    res.status(200).json({ message: 'Check-in successful', record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ── CHECK OUT ──
exports.checkOut = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findOne({
      _id: bookingId,
      renterId: userId,
    });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Must have checked in first
    const record = await CheckInOut.findOne({ bookingId });
    if (!record || !record.checkInTime) {
      return res.status(400).json({ error: 'Must check in before checking out.' });
    }
    if (record.checkOutTime) {
      return res.status(400).json({ error: 'Already checked out.' });
    }

    const now = new Date();
    record.checkOutTime = now;
    record.status = 'checked-out';
    await record.save();

    // Update booking status to 'completed'
    await Booking.findByIdAndUpdate(bookingId, { status: 'completed' });

    // ── SLOT STATUS SYNC ──
    // Free the slot back up now that the renter has left, so it becomes
    // bookable again. Skip if an owner deliberately deactivated the slot
    // while the booking was in progress.
    const slotForRelease = await Slot.findById(booking.slotId);
    if (slotForRelease && slotForRelease.status !== 'inactive') {
      slotForRelease.status = 'available';
      await slotForRelease.save();
    }

    // ── OVERSTAY DETECTION ──
    const bookedEnd = new Date(booking.endTime);
    let penalty = null;
    let overstayMinutes = 0;

    if (now > bookedEnd) {
      overstayMinutes = Math.floor((now - bookedEnd) / (1000 * 60));
      // Get slot hourly rate
      const hourlyRate = await getSlotHourlyRate(booking.slotId);
      // Penalty rate: 1.5× hourly rate (can be made configurable later)
      const penaltyRate = hourlyRate * 1.5;
      const penaltyAmount = (overstayMinutes / 60) * penaltyRate;

      // Create OverstayPenalty record
      penalty = new OverstayPenalty({
        bookingId: booking._id,
        overstayDuration: overstayMinutes,
        penaltyAmount: Math.round(penaltyAmount * 100) / 100,
        penaltyRatePerHour: Math.round(penaltyRate * 100) / 100,
        notes: `Overstay of ${overstayMinutes} minutes beyond booked end time.`,
      });
      await penalty.save();

      const slot = await Slot.findById(booking.slotId);
      await createNotification({
        userId: userId,
        type: 'overstay_alert',
        title: 'Overstay Penalty Applied',
        message: `You checked out late from slot ${slot?.slotNumber || 'your booking'}. An additional penalty of $${penalty.penaltyAmount} has been added.`,
        relatedId: booking._id,
        sendEmail: true,
      });
    }

    res.status(200).json({
      message: 'Check-out successful',
      record,
      overstay: penalty
        ? { durationMinutes: overstayMinutes, penaltyAmount: penalty.penaltyAmount }
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET check‑in/out status for a booking ──
exports.getStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findOne({ _id: bookingId, renterId: userId });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const record = await CheckInOut.findOne({ bookingId });
    res.json(record || { bookingId, checkInTime: null, checkOutTime: null, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};