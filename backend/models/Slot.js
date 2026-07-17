const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    building: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Building",
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    slotNumber: {
      type: String,
      required: true,
      trim: true,
    },

    floor: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["standard", "compact", "large", "handicap", "ev"],
      default: "standard",
    },

    dimensions: {
      length: { type: Number, required: true }, // in feet
      width: { type: Number, required: true },
    },

    pricePerHour: {
      type: Number,
      required: true,
      min: 0,
    },

    pricePerDay: {
      type: Number,
      min: 0,
    },

    pricePerMonth: {
      type: Number,
      min: 0,
    },

    status: {
      type: String,
      enum: ["available", "occupied", "reserved", "inactive"],
      default: "available",
    },
  },
  {
    timestamps: true,
  }
);

// Prevents the same owner from creating duplicate slot numbers in the same building
slotSchema.index({ building: 1, slotNumber: 1 }, { unique: true });

module.exports = mongoose.model("Slot", slotSchema, "parkingslots");