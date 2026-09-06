const Booking = require("../models/Booking");
const { createNotification } = require("../services/notificationService");

// Finds every "pending" booking whose payment window (expiresAt, set in
// bookingController.js at creation time) has passed, cancels it, and
// notifies the renter. Meant to be run on an interval from server.js.
//
// The update uses { status: "pending" } as part of its filter so that if a
// payment completes (Stripe webhook / use-hours) in the same instant this
// sweep runs, whichever one flips the status first wins — we never
// overwrite an already-confirmed booking.
const expirePendingBookings = async () => {
  const now = new Date();

  const expired = await Booking.find({
    status: "pending",
    expiresAt: { $ne: null, $lte: now },
  }).select("_id renterId slotId startTime endTime");

  if (expired.length === 0) return;

  for (const booking of expired) {
    try {
      const result = await Booking.updateOne(
        { _id: booking._id, status: "pending" },
        { $set: { status: "cancelled", cancelReason: "expired_unpaid" } }
      );

      // If matchedCount is 0, someone else (a payment) already changed the
      // status between our find() and this update — skip notifying.
      if (result.matchedCount === 0) continue;

      await createNotification({
        userId: booking.renterId,
        type: "booking_expired",
        title: "Booking Expired — Payment Window Passed",
        message: `Your reservation for slot starting ${new Date(
          booking.startTime
        ).toLocaleString()} was cancelled because payment wasn't completed in time. The slot has been released and is available again.`,
        relatedId: booking._id,
        sendEmail: true,
      });
    } catch (err) {
      console.error(`[booking-expiry] Failed to expire booking ${booking._id}:`, err.message);
    }
  }

  console.log(`[booking-expiry] Expired ${expired.length} unpaid booking(s).`);
};

module.exports = { expirePendingBookings };