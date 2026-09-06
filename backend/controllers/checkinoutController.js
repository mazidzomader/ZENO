const CheckInOut = require('../models/CheckInOut');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const OverstayPenalty = require('../models/OverstayPenalty');
const { createNotification } = require('../services/notificationService');

// Helper to get the slot's hourly rate (or fallback to a default)
const getSlotHourlyRate = async (slotId) => {
  const slot = await Slot.findById(slotId).lean();
  if (!slot) throw new Error('Slot not found');
  return slot.pricePerHour || 0;
};

// Update only the slot status. Using updateOne avoids re-validating old seeded
// slot documents that may not contain newer required fields such as dimensions.
const setSlotStatus = async (slotId, status) => {
  if (!slotId) return;
  await Slot.updateOne(
    { _id: slotId, status: { $ne: 'inactive' } },
    { $set: { status } }
  );
};

// ── CHECK IN ──
exports.checkIn = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findOne({
      _id: bookingId,
      renterId: userId,
      status: { $in: ['confirmed', 'active'] },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or not eligible for check-in.' });
    }

    let record = await CheckInOut.findOne({ bookingId });

    // Idempotent recovery: if a previous request recorded the timestamp but
    // failed later while updating a legacy slot, finish the related status
    // updates and return success instead of trapping the user in a loop.
    if (record?.checkInTime) {
      await Booking.updateOne({ _id: bookingId }, { $set: { status: 'active' } });
      await setSlotStatus(booking.slotId, 'occupied');
      return res.status(200).json({ message: 'Already checked in.', record });
    }

    if (record) {
      record.checkInTime = new Date();
      record.status = 'checked-in';
    } else {
      record = new CheckInOut({
        bookingId,
        checkInTime: new Date(),
        status: 'checked-in',
      });
    }

    await record.save();
    await Booking.updateOne({ _id: bookingId }, { $set: { status: 'active' } });
    await setSlotStatus(booking.slotId, 'occupied');

    return res.status(200).json({ message: 'Check-in successful', record });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
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

    const record = await CheckInOut.findOne({ bookingId });
    if (!record || !record.checkInTime) {
      return res.status(400).json({ error: 'Must check in before checking out.' });
    }

    // Recovery for the exact failure you hit: the timestamp/booking may have
    // been saved before legacy Slot validation failed. Finish the slot release
    // and return success.
    if (record.checkOutTime) {
      await Booking.updateOne({ _id: bookingId }, { $set: { status: 'completed' } });
      await setSlotStatus(booking.slotId, 'available');
      return res.status(200).json({
        message: 'Check-out already recorded successfully',
        record,
        overstay: null,
      });
    }

    const now = new Date();
    record.checkOutTime = now;
    record.status = 'checked-out';
    await record.save();

    await Booking.updateOne({ _id: bookingId }, { $set: { status: 'completed' } });
    await setSlotStatus(booking.slotId, 'available');

    // Existing Feature 10 overstay behaviour is preserved. It is kept after
    // the Feature 9 state changes so check-out tracking itself is reliable.
    const bookedEnd = new Date(booking.endTime);
    let penalty = null;
    let overstayMinutes = 0;

    if (now > bookedEnd) {
      overstayMinutes = Math.floor((now - bookedEnd) / (1000 * 60));
      const hourlyRate = await getSlotHourlyRate(booking.slotId);
      const penaltyRate = hourlyRate * 1.5;
      const penaltyAmount = (overstayMinutes / 60) * penaltyRate;

      penalty = new OverstayPenalty({
        bookingId: booking._id,
        overstayDuration: overstayMinutes,
        penaltyAmount: Math.round(penaltyAmount * 100) / 100,
        penaltyRatePerHour: Math.round(penaltyRate * 100) / 100,
        notes: `Overstay of ${overstayMinutes} minutes beyond booked end time.`,
        paid: false,
      });
      await penalty.save();

      const slot = await Slot.findById(booking.slotId).lean();
      await createNotification({
        userId,
        type: 'overstay_alert',
        title: 'Overstay Penalty Applied',
        message: `You checked out late from slot ${slot?.slotNumber || 'your booking'}. An additional penalty of $${penalty.penaltyAmount} has been added.`,
        relatedId: booking._id,
        sendEmail: true,
      });
    }

    return res.status(200).json({
      message: 'Check-out successful',
      record,
      overstay: penalty
        ? { durationMinutes: overstayMinutes, penaltyAmount: penalty.penaltyAmount }
        : null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

// ── GET check-in/out status for a booking ──
exports.getStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findOne({ _id: bookingId, renterId: userId });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const record = await CheckInOut.findOne({ bookingId });
    return res.json(
      record || {
        bookingId,
        checkInTime: null,
        checkOutTime: null,
        status: 'pending',
      }
    );
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
