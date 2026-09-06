const mongoose = require("mongoose");

const bookingSeriesSchema = new mongoose.Schema(
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

    // ── Descriptive pattern only ──
    // The authoritative record of what was actually requested/created lives
    // in `occurrences` below. These fields exist purely so the UI can show
    // a human-readable summary like "Mon-Fri, 09:00-18:00". Same convention
    // (daysOfWeek 0=Sun..6=Sat, HH:MM time strings) as models/PricingRule.js.
    daysOfWeek: {
      type: [Number],
      default: [],
    },

    timeStart: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
        message: "timeStart must be in HH:MM 24-hour format.",
      },
    },

    timeEnd: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
        message: "timeEnd must be in HH:MM 24-hour format.",
      },
    },

    seriesStartDate: {
      type: Date,
      default: null,
    },

    seriesEndDate: {
      type: Date,
      default: null,
    },

    // "active"    -> series still stands; occurrences can be individually
    //                cancelled via the normal PATCH /api/bookings/:id/cancel
    // "cancelled" -> the whole series was cancelled via cancelRecurringSeries
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
      index: true,
    },

    // Snapshot counts from the moment the series was created — how many of
    // the requested dates were actually booked vs skipped due to conflicts.
    // Individual occurrences may later be cancelled/expired on their own —
    // check the populated occurrences[].bookingId.status for live status.
    totalOccurrences: {
      type: Number,
      default: 0,
    },
    bookedCount: {
      type: Number,
      default: 0,
    },
    skippedCount: {
      type: Number,
      default: 0,
    },

    // One entry per requested occurrence date, in chronological order.
    occurrences: [
      {
        _id: false,
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
        // "booked"  -> a Booking document was successfully created (see bookingId)
        // "skipped" -> conflicted with something and no Booking was created (see reason)
        status: {
          type: String,
          enum: ["booked", "skipped"],
          required: true,
        },
        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Booking",
          default: null,
        },
        reason: {
          type: String,
          default: null,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

bookingSeriesSchema.index({ renterId: 1, status: 1, createdAt: -1 });

module.exports =
  mongoose.models.BookingSeries ||
  mongoose.model("BookingSeries", bookingSeriesSchema);