const mongoose = require("mongoose");

const favouriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Slot",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// A renter can only bookmark the same slot once
favouriteSchema.index({ user: 1, slot: 1 }, { unique: true });

module.exports =
  mongoose.models.Favourite || mongoose.model("Favourite", favouriteSchema);