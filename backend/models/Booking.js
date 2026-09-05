const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    renterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
      index: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    startTime: {
      type: Date,
      required: true,
      index: true,
    },

    endTime: {
      type: Date,
      required: true,
    },

    // pending    -> booking created, awaiting payment
    // confirmed  -> payment received (see routes/paymentRoutes.js)
    // active     -> renter has checked in (see checkinoutController.js)
    // completed  -> renter has checked out
    // cancelled  -> cancelled by renter/admin before completion
    //
    // Only "pending" | "confirmed" | "active" count as "live" bookings that
    // block other bookings from overlapping the same slot/time range.
    status: {
      type: String,
      enum: ["pending", "confirmed", "active", "completed", "cancelled"],
      default: "pending",
      index: true,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    // Snapshot of how totalAmount was calculated at booking time, so the
    // renter/owner can see exactly which dynamic pricing rules applied
    // even if those rules are edited or deleted later.
    pricingSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "bookings",
  }
);

// Speeds up the overlap-check query used by createBooking / checkAvailability:
// "find live bookings on this slot whose range intersects [start, end)".
bookingSchema.index({ slotId: 1, status: 1, startTime: 1, endTime: 1 });

module.exports =
  mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);