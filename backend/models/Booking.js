const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    renterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      index: true,
    },

    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    startTime: {
      type: Date,
      index: true,
    },

    endTime: {
      type: Date,
    },

    // pending    -> booking created, slot reserved, awaiting payment
    // confirmed  -> payment received (see routes/paymentRoutes.js)
    // active     -> renter has checked in (see checkinoutController.js)
    // completed  -> renter has checked out
    // cancelled  -> cancelled by renter/admin before completion
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

module.exports =
  mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);