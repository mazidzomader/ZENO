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
      ref: "ParkingSlot",
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

    status: {
      type: String,
      index: true,
    },

    totalAmount: {
      type: Number,
      default: 0,
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