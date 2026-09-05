const mongoose = require("mongoose");

const slotBlackoutSchema = new mongoose.Schema(
  {
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // The blocked window — no booking may be created if its [startTime,
    // endTime) range overlaps this. Same inclusive-start/exclusive-end
    // convention used by Booking elsewhere in the app.
    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // Optional note for the owner's own reference (e.g. "Repainting",
    // "Reserved for Tenant 4B", "Elevator repair").
    reason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Speeds up "does this slot have a blackout overlapping [start, end)?"
slotBlackoutSchema.index({ slot: 1, startDate: 1, endDate: 1 });

module.exports =
  mongoose.models.SlotBlackout ||
  mongoose.model("SlotBlackout", slotBlackoutSchema);