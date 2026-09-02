const mongoose = require("mongoose");

const buildingSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    totalFloors: {
      type: Number,
      required: true,
      min: 1,
    },

    location: {
      lat: {
        type: Number,
        required: false,
      },
      lng: {
        type: Number,
        required: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Building", buildingSchema);